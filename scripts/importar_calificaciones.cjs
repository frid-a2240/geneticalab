// Reconcilia la tabla `empleados` contra el Excel de RH y siembra la tabla
// `calificaciones` (1 fila por empleado) con los datos de seguimiento.
//
// Requiere haber corrido primero scripts/schema.sql en el SQL Editor de Supabase.
//
// Uso:
//   node scripts/importar_calificaciones.cjs            -> dry run (no escribe nada)
//   node scripts/importar_calificaciones.cjs --apply     -> aplica los cambios de verdad

const path = require("path");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const EXCEL_PATH = path.join(
  __dirname,
  "..",
  "2026 RH COMPLETO Control digital de calificaciones2.xlsx"
);
const SHEET_NAME = "20025";
const HEADER_ROW_INDEX = 6; // fila 7 del excel (0-indexed) trae los encabezados
const APPLY = process.argv.includes("--apply");

const supabase = createClient(
  "https://cvkwmnirizycmciqnaok.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2a3dtbmlyaXp5Y21jaXFuYW9rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUwMjQ4NCwiZXhwIjoyMDkzMDc4NDg0fQ.J9GgHk34AJRuGOfUohf4p2kMbQU-uhTctK_MiNtIypc"
);

function excelDateToISO(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 20000 || n > 60000) return null; // fuera de rango razonable (~1954-2064)
  const ms = Math.round((n - 25569) * 86400 * 1000); // 25569 = dias entre 1899-12-30 y 1970-01-01
  const d = new Date(ms);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

const MESES_ES = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11 };

function esNoAplica(raw) {
  const s = String(raw).trim().toLowerCase();
  return s === "n.a" || s === "n.a." || s === "n/a" || s === "na";
}

// La columna "Cierre de Matriz" viene siempre como texto tipo "22/abr/2024", no como fecha excel.
function parseFechaTexto(raw) {
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})\/([a-zA-Zá-úÁ-Ú]{3,4}|\d{1,2})\/(\d{2}|\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1], 10);
  const monRaw = m[2];
  const yyRaw = m[3];
  let month;
  if (/^\d+$/.test(monRaw)) {
    month = parseInt(monRaw, 10) - 1;
  } else {
    const key = monRaw.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").slice(0, 3);
    if (!(key in MESES_ES)) return null;
    month = MESES_ES[key];
  }
  let year = parseInt(yyRaw, 10);
  if (yyRaw.length === 2) year += 2000;
  if (dd < 1 || dd > 31 || month < 0 || month > 11) return null;
  const d = new Date(Date.UTC(year, month, dd));
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function normalizarPuesto(s) {
  if (!s) return "";
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function leerExcel() {
  const wb = XLSX.readFile(EXCEL_PATH);
  const ws = wb.Sheets[SHEET_NAME];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  const data = rows.slice(HEADER_ROW_INDEX + 1).filter((r) => r[0] !== "" && r[0] !== undefined);

  const anomalias = [];
  const empleadosExcel = [];
  const calificacionesExcel = [];

  for (const r of data) {
    const clave = String(r[0]).trim();
    const nombre = String(r[1] || "").trim();

    const fecIngreso = excelDateToISO(r[2]);
    if (r[2] && !fecIngreso) anomalias.push(`${clave} (${nombre}): F. Ingreso inválida -> "${r[2]}"`);

    const fecCambioPuesto = excelDateToISO(r[3]);
    if (r[3] && !fecCambioPuesto) anomalias.push(`${clave} (${nombre}): F. Ingreso Capacitacion/Cambio de Puesto inválida -> "${r[3]}"`);

    const puesto = String(r[4] || "").trim();
    const depto = String(r[5] || "").trim();

    const cierreMatriz = parseFechaTexto(r[6]);
    if (r[6] && !cierreMatriz && !esNoAplica(r[6])) anomalias.push(`${clave} (${nombre}): Cierre de Matriz no parseable -> "${r[6]}"`);

    const fechaEntrega90 = excelDateToISO(r[7]);
    if (r[7] && !fechaEntrega90 && !esNoAplica(r[7])) anomalias.push(`${clave} (${nombre}): Fecha entrega 90 dias inválida -> "${r[7]}"`);

    const fechaReal90 = excelDateToISO(r[9]);
    if (r[9] && !fechaReal90 && !esNoAplica(r[9])) anomalias.push(`${clave} (${nombre}): Fecha real 90 dias inválida -> "${r[9]}"`);

    const entrega2025 = excelDateToISO(r[10]);
    if (r[10] && !entrega2025 && !esNoAplica(r[10])) anomalias.push(`${clave} (${nombre}): Entrega 2025 inválida -> "${r[10]}"`);

    const fechaReal2025 = excelDateToISO(r[12]);
    if (r[12] && !fechaReal2025 && !esNoAplica(r[12])) anomalias.push(`${clave} (${nombre}): Fecha real 2025 inválida -> "${r[12]}"`);

    const entrega2026 = excelDateToISO(r[13]);
    if (r[13] && !entrega2026 && !esNoAplica(r[13])) anomalias.push(`${clave} (${nombre}): Entrega 2026 inválida -> "${r[13]}"`);

    const fechaReal2026 = excelDateToISO(r[15]);
    if (r[15] && !fechaReal2026 && !esNoAplica(r[15])) anomalias.push(`${clave} (${nombre}): Fecha real 2026 inválida -> "${r[15]}"`);

    const entrega2027 = excelDateToISO(r[16]);
    if (r[16] && !entrega2027 && !esNoAplica(r[16])) anomalias.push(`${clave} (${nombre}): Entrega 2027 inválida -> "${r[16]}"`);

    const fechaReal2027 = excelDateToISO(r[18]);
    if (r[18] && !fechaReal2027 && !esNoAplica(r[18])) anomalias.push(`${clave} (${nombre}): Fecha real 2027 inválida -> "${r[18]}"`);

    const observaciones = String(r[19] || "").trim() || null;
    const rh = String(r[20] || "").trim() || null;

    empleadosExcel.push({
      clave,
      nombre,
      puesto,
      depto,
      fec_ingreso: fecIngreso,
      fec_cambio_puesto: fecCambioPuesto,
      activo: true,
    });

    calificacionesExcel.push({
      emp_clave: clave,
      cierre_matriz: cierreMatriz,
      fecha_entrega_90dias: fechaEntrega90,
      fecha_real_90dias: fechaReal90,
      entrega_2025: entrega2025,
      fecha_real_2025: fechaReal2025,
      entrega_2026: entrega2026,
      fecha_real_2026: fechaReal2026,
      entrega_2027: entrega2027,
      fecha_real_2027: fechaReal2027,
      observaciones,
      rh,
    });
  }

  return { empleadosExcel, calificacionesExcel, anomalias };
}

async function main() {
  console.log(APPLY ? "=== MODO APLICAR (se van a escribir cambios) ===" : "=== DRY RUN (no se escribe nada, usa --apply para aplicar) ===");

  const { empleadosExcel, calificacionesExcel, anomalias } = leerExcel();
  console.log(`Excel: ${empleadosExcel.length} empleados leidos.`);

  const excelByClave = new Map(empleadosExcel.map((e) => [e.clave, e]));

  const { data: actuales, error: errActuales } = await supabase
    .from("empleados")
    .select("clave, nombre, puesto, depto");
  if (errActuales) throw errActuales;

  const conservar = [];
  const borrar = [];
  for (const emp of actuales) {
    const enExcel = excelByClave.get(emp.clave);
    if (enExcel && normalizarPuesto(enExcel.puesto) === normalizarPuesto(emp.puesto)) {
      conservar.push(emp.clave);
    } else {
      borrar.push(emp.clave);
    }
  }

  const conservarSet = new Set(conservar);
  const insertar = empleadosExcel.filter((e) => !conservarSet.has(e.clave));

  console.log(`Se conservan tal cual: ${conservar.length}`);
  console.log(`Se borran (no estan en el excel, o su puesto no coincide): ${borrar.length}`);
  console.log(`Se insertan desde el excel: ${insertar.length}`);
  console.log(`Total final esperado en empleados: ${conservar.length + insertar.length} (debe ser 126)`);

  if (anomalias.length) {
    console.log(`\nAnomalias de fechas en el excel (${anomalias.length}), quedaron como null:`);
    anomalias.forEach((a) => console.log("  - " + a));
  }

  if (!APPLY) {
    console.log("\nDry run terminado. Revisa el resumen de arriba y corre con --apply para ejecutar de verdad.");
    return;
  }

  if (borrar.length) {
    for (let i = 0; i < borrar.length; i += 200) {
      const lote = borrar.slice(i, i + 200);
      const { error } = await supabase.from("empleados").delete().in("clave", lote);
      if (error) throw error;
    }
    console.log(`Borrados ${borrar.length} empleados.`);
  }

  if (insertar.length) {
    for (let i = 0; i < insertar.length; i += 100) {
      const lote = insertar.slice(i, i + 100);
      const { error } = await supabase.from("empleados").insert(lote);
      if (error) throw error;
    }
    console.log(`Insertados ${insertar.length} empleados nuevos.`);
  }

  for (let i = 0; i < calificacionesExcel.length; i += 100) {
    const lote = calificacionesExcel.slice(i, i + 100);
    const { error } = await supabase.from("calificaciones").upsert(lote, { onConflict: "emp_clave" });
    if (error) throw error;
  }
  console.log(`Sembradas/actualizadas ${calificacionesExcel.length} filas en calificaciones.`);

  console.log("\nListo.");
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
