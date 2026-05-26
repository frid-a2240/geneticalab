// src/app/components/pages/CargasMasivas.jsx
import { useState, useRef } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2,
  Users, Briefcase, BookOpen, History, ClipboardCheck, Grid,
  ChevronDown, ChevronUp, X, RotateCcw, Play,
} from "lucide-react";
import * as XLSX from "xlsx";

// =========================================================
// CONFIGURACIÓN DE LAS 6 CARGAS
// =========================================================

const CARGAS = [
  {
    id: "puestos",
    titulo: "1. Puestos",
    icon: Briefcase,
    color: "#3b82f6",
    archivo: "puestos_catalogo.xlsx",
    descripcion: "68 puestos únicos → tabla puestos",
    hoja: "Puestos",
  },
  {
    id: "empleados",
    titulo: "2. Empleados",
    icon: Users,
    color: "#10b981",
    archivo: "empleados_limpio.xlsx",
    descripcion: "275 empleados activos + bajas → tabla empleados",
    hoja: "Activos",
  },
  {
    id: "capacitaciones",
    titulo: "3. Capacitaciones",
    icon: BookOpen,
    color: "#f59e0b",
    archivo: "capacitaciones_catalogo.xlsx",
    descripcion: "2,740 capacitaciones únicas → tabla capacitaciones",
    hoja: "Capacitaciones",
  },
  {
    id: "historial",
    titulo: "4. Historial",
    icon: History,
    color: "#ec4899",
    archivo: "historial_capacitaciones.xlsx",
    descripcion: "11,034 calificaciones históricas → tabla matriz_empleado",
    hoja: "Historial",
  },
  {
    id: "matriz_puesto",
    titulo: "5. Matriz Puesto",
    icon: Grid,
    color: "#8b5cf6",
    archivo: "matriz_operador_produccion_c.xlsx",
    descripcion: "36 capacitaciones del puesto Operador Producción C → tabla matriz_puesto",
    hoja: "Matriz del Puesto",
  },
  {
    id: "seguimiento",
    titulo: "6. Seguimiento Anual",
    icon: ClipboardCheck,
    color: "#06b6d4",
    archivo: "seguimiento_anual.xlsx",
    descripcion: "121 seguimientos anuales → tabla calificacion_anual",
    hoja: "Seguimiento Anual",
  },
];

// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================

export default function CargasMasivas() {
  const [cargas, setCargas] = useState(
    CARGAS.reduce((acc, c) => {
      acc[c.id] = {
        archivo: null,
        datos: null,
        estado: "pendiente", // pendiente | leyendo | listo | cargando | completado | error
        progreso: 0,
        resumen: null,
        errores: [],
        expanded: false,
      };
      return acc;
    }, {})
  );

  function updateCarga(id, updates) {
    setCargas((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...updates },
    }));
  }

  // ================= LEER EXCEL =================

  async function handleFileSelect(cargaId, file) {
    updateCarga(cargaId, {
      archivo: file,
      estado: "leyendo",
      errores: [],
      resumen: null,
      progreso: 0,
    });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const config = CARGAS.find((c) => c.id === cargaId);

      // Buscar hoja por nombre o usar la primera
      let sheetName = config.hoja;
      if (!workbook.SheetNames.includes(sheetName)) {
        sheetName = workbook.SheetNames[0];
      }

      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

      updateCarga(cargaId, {
        datos: rows,
        estado: "listo",
        resumen: { totalFilas: rows.length, hoja: sheetName },
      });
    } catch (err) {
      updateCarga(cargaId, {
        estado: "error",
        errores: ["Error al leer el archivo: " + err.message],
      });
    }
  }

  // ================= CARGAR A SUPABASE =================

  async function ejecutarCarga(cargaId) {
    const carga = cargas[cargaId];
    if (!carga.datos || carga.datos.length === 0) return;

    updateCarga(cargaId, { estado: "cargando", progreso: 0, errores: [] });

    try {
      switch (cargaId) {
        case "puestos":
          await cargarPuestos(carga.datos, cargaId);
          break;
        case "empleados":
          await cargarEmpleados(carga.datos, cargaId);
          break;
        case "capacitaciones":
          await cargarCapacitaciones(carga.datos, cargaId);
          break;
        case "historial":
          await cargarHistorial(carga.datos, cargaId);
          break;
        case "matriz_puesto":
          await cargarMatrizPuesto(carga.datos, cargaId);
          break;
        case "seguimiento":
          await cargarSeguimiento(carga.datos, cargaId);
          break;
      }
    } catch (err) {
      updateCarga(cargaId, {
        estado: "error",
        errores: (prev) => [...(Array.isArray(prev) ? prev : []), "Error general: " + err.message],
      });
    }
  }

  // =========================================================
  // FUNCIONES DE CARGA POR TIPO
  // =========================================================

  async function cargarPuestos(rows, cargaId) {
    const errores = [];
    let insertados = 0;
    const total = rows.length;

    for (let i = 0; i < total; i++) {
      const r = rows[i];
      if (!r.nombre) { errores.push(`Fila ${i + 2}: sin nombre`); continue; }

      const payload = {
        nombre: String(r.nombre).trim(),
        departamento: r.departamento ? String(r.departamento).trim() : null,
        reporta_a: r.reporta_a ? String(r.reporta_a).trim() : null,
        edad_minima: r.edad_minima ? String(r.edad_minima).trim() : null,
        sexo: r.sexo ? String(r.sexo).trim() : "Indistinto",
        escolaridad: r.escolaridad ? String(r.escolaridad).trim() : null,
        conocimientos: r.conocimientos ? String(r.conocimientos).trim() : null,
        experiencia: r.experiencia ? String(r.experiencia).trim() : null,
        habilidades: r.habilidades ? String(r.habilidades).trim() : null,
        objetivo_puesto: r.objetivo_puesto ? String(r.objetivo_puesto).trim() : null,
        activo: true,
      };

      const { error } = await supabase.from("puestos").upsert(payload, { onConflict: "nombre" });
      if (error) errores.push(`Fila ${i + 2} (${r.nombre}): ${error.message}`);
      else insertados++;

      updateCarga(cargaId, { progreso: Math.round(((i + 1) / total) * 100) });
    }

    updateCarga(cargaId, {
      estado: errores.length > 0 && insertados === 0 ? "error" : "completado",
      errores,
      resumen: { totalFilas: total, insertados, errores: errores.length },
    });
  }

  async function cargarEmpleados(rows, cargaId) {
    const errores = [];
    let insertados = 0;
    const total = rows.length;

    // Necesitamos el mapeo puesto nombre -> id
    const { data: puestosDB } = await supabase.from("puestos").select("id, nombre");
    const puestoMap = {};
    (puestosDB || []).forEach((p) => { puestoMap[p.nombre.toLowerCase()] = p.id; });

    for (let i = 0; i < total; i++) {
      const r = rows[i];
      if (!r.clave) { errores.push(`Fila ${i + 2}: sin clave`); continue; }

      const clave = String(r.clave).trim();
      const puestoNombre = r.puesto ? String(r.puesto).trim() : "";
      const puestoId = puestoMap[puestoNombre.toLowerCase()] || null;

      const payload = {
        clave: clave,
        nombre: r.nombre ? String(r.nombre).trim() : "",
        puesto: puestoNombre,
        puesto_id: puestoId,
        depto: r.depto ? String(r.depto).trim() : null,
        fec_ingreso: formatDate(r.fec_ingreso),
        email: r.email ? String(r.email).trim() : null,
        jefe_directo: r.jefe_directo ? String(r.jefe_directo).trim() : null,
        activo: true,
      };

      const { error } = await supabase.from("empleados").upsert(payload, { onConflict: "clave" });
      if (error) errores.push(`Fila ${i + 2} (${clave}): ${error.message}`);
      else insertados++;

      if ((i + 1) % 10 === 0 || i === total - 1) {
        updateCarga(cargaId, { progreso: Math.round(((i + 1) / total) * 100) });
      }
    }

    updateCarga(cargaId, {
      estado: errores.length > 0 && insertados === 0 ? "error" : "completado",
      errores,
      resumen: { totalFilas: total, insertados, errores: errores.length },
    });
  }

  async function cargarCapacitaciones(rows, cargaId) {
    const errores = [];
    let insertados = 0;
    const total = rows.length;

    // Cargar en lotes de 50
    const BATCH = 50;
    for (let i = 0; i < total; i += BATCH) {
      const lote = rows.slice(i, i + BATCH);
      const payloads = lote.map((r, idx) => {
        if (!r.nombre) {
          errores.push(`Fila ${i + idx + 2}: sin nombre`);
          return null;
        }
        return {
          nombre: String(r.nombre).trim(),
          codigo: r.codigo ? String(r.codigo).trim() : null,
          codigo_documento: r.codigo_documento ? String(r.codigo_documento).trim() : null,
          tipo_capacitacion: parseInt(r.tipo_capacitacion) || 2,
          tipo_aceptacion: r.tipo_aceptacion || "numerico",
          duracion_horas: parseFloat(r.duracion_horas) || 0,
        };
      }).filter(Boolean);

      if (payloads.length > 0) {
        const { error, data } = await supabase.from("capacitaciones").upsert(payloads, { onConflict: "nombre" });
        if (error) errores.push(`Lote ${Math.floor(i / BATCH) + 1}: ${error.message}`);
        else insertados += payloads.length;
      }

      updateCarga(cargaId, { progreso: Math.round(Math.min(i + BATCH, total) / total * 100) });
    }

    updateCarga(cargaId, {
      estado: errores.length > 0 && insertados === 0 ? "error" : "completado",
      errores,
      resumen: { totalFilas: total, insertados, errores: errores.length },
    });
  }

  async function cargarHistorial(rows, cargaId) {
    const errores = [];
    let insertados = 0;
    const total = rows.length;

    // Cargar en lotes de 100
    const BATCH = 100;
    for (let i = 0; i < total; i += BATCH) {
      const lote = rows.slice(i, i + BATCH);
      const payloads = lote.map((r) => {
        if (!r.emp_clave || !r.nombre_cap) return null;
        return {
          emp_clave: String(r.emp_clave).trim(),
          nombre_cap_snap: String(r.nombre_cap).trim(),
          codigo_cap_snap: r.codigo_cap ? String(r.codigo_cap).trim() : "",
          fecha_capacitacion: formatDate(r.fecha_capacitacion),
          calificacion_numerica: r.calificacion_numerica != null ? parseFloat(r.calificacion_numerica) : null,
          cumple: r.cumple === "TRUE" || r.cumple === true ? true : r.cumple === "FALSE" || r.cumple === false ? false : null,
          satisfactorio: r.satisfactorio === "TRUE" || r.satisfactorio === true ? true : r.satisfactorio === "FALSE" || r.satisfactorio === false ? false : null,
          tipo_aceptacion_snap: r.tipo_aceptacion || "numerico",
          responsable_capacitacion: r.responsable ? String(r.responsable).trim() : "",
          ano: parseInt(r.ano) || new Date().getFullYear(),
          completado: r.completado === "TRUE" || r.completado === true,
          cap_eliminada: false,
        };
      }).filter(Boolean);

      if (payloads.length > 0) {
        const { error } = await supabase.from("matriz_empleado").insert(payloads);
        if (error) errores.push(`Lote ${Math.floor(i / BATCH) + 1}: ${error.message}`);
        else insertados += payloads.length;
      }

      updateCarga(cargaId, { progreso: Math.round(Math.min(i + BATCH, total) / total * 100) });
    }

    updateCarga(cargaId, {
      estado: errores.length > 0 && insertados === 0 ? "error" : "completado",
      errores,
      resumen: { totalFilas: total, insertados, errores: errores.length },
    });
  }

  async function cargarMatrizPuesto(rows, cargaId) {
    const errores = [];
    let insertados = 0;
    const total = rows.length;

    // Buscar puesto_id
    const puestoNombre = rows[0]?.puesto || "Operador de Producción C";
    const { data: puestoDB } = await supabase
      .from("puestos")
      .select("id")
      .ilike("nombre", puestoNombre)
      .limit(1);

    if (!puestoDB || puestoDB.length === 0) {
      updateCarga(cargaId, {
        estado: "error",
        errores: [`No se encontró el puesto "${puestoNombre}" en la base de datos. Carga los puestos primero (paso 1).`],
      });
      return;
    }

    const puestoId = puestoDB[0].id;

    // Buscar capacitaciones
    const { data: capsDB } = await supabase.from("capacitaciones").select("id, nombre");

    // Función para normalizar: quitar tildes, minúsculas, solo primeros 35 chars
    function normNombre(s) {
      if (!s) return "";
      return s.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .slice(0, 35);
    }

    // Crear mapa normalizado
    const capMap = {};
    (capsDB || []).forEach((c) => {
      capMap[normNombre(c.nombre)] = c.id;
    });

    for (let i = 0; i < total; i++) {
      const r = rows[i];
      if (!r.capacitacion) { errores.push(`Fila ${i + 2}: sin capacitación`); continue; }

      const capNorm = normNombre(r.capacitacion);
      let capId = capMap[capNorm];

      // Si no hay match exacto normalizado, buscar el que más se parece
      if (!capId) {
        let bestId = null;
        let bestScore = 0;
        for (const [key, id] of Object.entries(capMap)) {
          // Contar caracteres en común
          let score = 0;
          const minLen = Math.min(key.length, capNorm.length);
          for (let j = 0; j < minLen; j++) {
            if (key[j] === capNorm[j]) score++;
            else break; // cortar al primer mismatch
          }
          if (score > bestScore && score >= 20) {
            bestScore = score;
            bestId = id;
          }
        }
        capId = bestId;
      }

      if (!capId) {
        errores.push(`Fila ${i + 2}: capacitación no encontrada → "${String(r.capacitacion).slice(0, 60)}..."`);
        continue;
      }

      const payload = {
        puesto_id: puestoId,
        capacitacion_id: capId,
        etapa: String(r.etapa || "COMPLEMENTARIA").toUpperCase(),
        orden: parseInt(r.orden) || i + 1,
        obligatoria: true,
      };

      const { error } = await supabase.from("matriz_puesto").upsert(payload, {
        onConflict: "puesto_id,capacitacion_id",
      });
      if (error) errores.push(`Fila ${i + 2}: ${error.message}`);
      else insertados++;

      updateCarga(cargaId, { progreso: Math.round(((i + 1) / total) * 100) });
    }

    updateCarga(cargaId, {
      estado: errores.length > 0 && insertados === 0 ? "error" : "completado",
      errores,
      resumen: { totalFilas: total, insertados, errores: errores.length },
    });
  }

  async function cargarSeguimiento(rows, cargaId) {
    const errores = [];
    let insertados = 0;
    const total = rows.length;

    for (let i = 0; i < total; i++) {
      const r = rows[i];
      if (!r.emp_clave) { errores.push(`Fila ${i + 2}: sin clave`); continue; }

      const clave = String(r.emp_clave).trim();
      const fecIngresoCap = formatDate(r.fec_ingreso_cap);
      const fecCierreMatriz = formatDate(r.fec_cierre_matriz);
      const numAniv = parseInt(r.numero_aniversario) || 1;

      // Calcular fec_anual en el frontend (como la DB no puede hacerlo GENERATED)
      let fecAnual = null;
      const fechaBase = fecCierreMatriz || fecIngresoCap;
      if (fechaBase) {
        const base = new Date(fechaBase);
        // Si hay fecha de cierre de matriz, usamos esa; si no, fec_ingreso_cap + 90 días
        const referencia = fecCierreMatriz
          ? base
          : new Date(base.getTime() + 90 * 24 * 60 * 60 * 1000);
        referencia.setFullYear(referencia.getFullYear() + numAniv);
        fecAnual = referencia.toISOString().split("T")[0];
      }

      const payload = {
        emp_clave: clave,
        ano: parseInt(r.ano) || 2026,
        fec_ingreso_empresa: formatDate(r.fec_ingreso_empresa),
        fec_ingreso_cap: fecIngresoCap,
        fec_cierre_matriz: fecCierreMatriz,
        numero_aniversario: numAniv,
        fec_anual: fecAnual,
        estatus: r.estatus || "en_tiempo",
        recepcion_entrega: r.recepcion_entrega || "pendiente",
        descriptivo_entregado: r.descriptivo_entregado || "NO",
        matriz_entregada: r.matriz_entregada || "NO",
        observacion_seguimiento: r.observacion_seguimiento ? String(r.observacion_seguimiento).trim() : null,
        observaciones: r.observacion_seguimiento ? String(r.observacion_seguimiento).trim() : null,
      };

      const { error } = await supabase
        .from("calificacion_anual")
        .upsert(payload, { onConflict: "emp_clave,ano" });

      if (error) errores.push(`Fila ${i + 2} (${clave}): ${error.message}`);
      else insertados++;

      if ((i + 1) % 5 === 0 || i === total - 1) {
        updateCarga(cargaId, { progreso: Math.round(((i + 1) / total) * 100) });
      }
    }

    updateCarga(cargaId, {
      estado: errores.length > 0 && insertados === 0 ? "error" : "completado",
      errores,
      resumen: { totalFilas: total, insertados, errores: errores.length },
    });
  }

  // =========================================================
  // UTILIDADES
  // =========================================================

  function formatDate(val) {
    if (!val) return null;
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, "0");
      const d = String(val.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    if (typeof val === "string") {
      const s = val.trim();
      // Ya es YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
      // Intentar parsear
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, "0");
        const d = String(parsed.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    }
    if (typeof val === "number") {
      // Serial date de Excel
      const base = new Date(1899, 11, 30);
      const date = new Date(base.getTime() + val * 24 * 60 * 60 * 1000);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  // =========================================================
  // RENDER
  // =========================================================

  const totalCompletados = Object.values(cargas).filter((c) => c.estado === "completado").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>
          Cargas Masivas
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
          Sube los 6 archivos Excel en orden para poblar el sistema. Progreso: {totalCompletados}/6
        </p>
      </div>

      {/* Barra de progreso general */}
      <div style={{
        height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${(totalCompletados / 6) * 100}%`,
          background: "linear-gradient(90deg, #7c3aed, #ec4899)",
          borderRadius: 4, transition: "width 0.5s ease",
        }} />
      </div>

      {/* Cards de carga */}
      {CARGAS.map((config) => {
        const carga = cargas[config.id];
        const Icon = config.icon;
        const prevCompleto = config.id === "puestos"
          ? true
          : cargas[CARGAS[CARGAS.indexOf(config) - 1].id].estado === "completado";

        return (
          <div key={config.id} style={{
            backgroundColor: "#fff", borderRadius: 16,
            border: `2px solid ${carga.estado === "completado" ? "#a7f3d0" : carga.estado === "error" ? "#fecaca" : "#e5e7eb"}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            opacity: prevCompleto || carga.estado !== "pendiente" ? 1 : 0.6,
            transition: "all 0.3s",
          }}>
            {/* Header de la card */}
            <div
              onClick={() => updateCarga(config.id, { expanded: !carga.expanded })}
              style={{
                padding: "18px 24px", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  backgroundColor: carga.estado === "completado" ? "#ecfdf5"
                    : carga.estado === "error" ? "#fef2f2" : config.color + "15",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {carga.estado === "completado" ? (
                    <CheckCircle size={22} color="#10b981" />
                  ) : carga.estado === "error" ? (
                    <AlertCircle size={22} color="#ef4444" />
                  ) : carga.estado === "cargando" ? (
                    <Loader2 size={22} color={config.color} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <Icon size={22} color={config.color} />
                  )}
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>
                    {config.titulo}
                  </h3>
                  <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0 0" }}>
                    {config.descripcion}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Estado */}
                {carga.estado === "completado" && carga.resumen && (
                  <span style={{
                    padding: "4px 12px", backgroundColor: "#ecfdf5", color: "#047857",
                    fontSize: 11, fontWeight: 700, borderRadius: 999,
                  }}>
                    ✓ {carga.resumen.insertados} cargados
                  </span>
                )}
                {carga.estado === "listo" && (
                  <span style={{
                    padding: "4px 12px", backgroundColor: "#eff6ff", color: "#1d4ed8",
                    fontSize: 11, fontWeight: 700, borderRadius: 999,
                  }}>
                    {carga.resumen?.totalFilas} filas listas
                  </span>
                )}
                {carga.estado === "cargando" && (
                  <span style={{
                    padding: "4px 12px", backgroundColor: "#f5f3ff", color: "#7c3aed",
                    fontSize: 11, fontWeight: 700, borderRadius: 999,
                  }}>
                    {carga.progreso}%
                  </span>
                )}

                {carga.expanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
              </div>
            </div>

            {/* Barra de progreso individual */}
            {carga.estado === "cargando" && (
              <div style={{ padding: "0 24px 6px 24px" }}>
                <div style={{ height: 4, backgroundColor: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${carga.progreso}%`,
                    backgroundColor: config.color, transition: "width 0.3s ease",
                  }} />
                </div>
              </div>
            )}

            {/* Contenido expandido */}
            {carga.expanded && (
              <div style={{
                padding: "0 24px 20px 24px",
                borderTop: "1px solid #f1f5f9",
                marginTop: 4,
              }}>
                <div style={{ paddingTop: 16 }}>
                  {/* Input de archivo */}
                  <FileDropZone
                    cargaId={config.id}
                    expectedFile={config.archivo}
                    onFileSelect={(file) => handleFileSelect(config.id, file)}
                    estado={carga.estado}
                    archivo={carga.archivo}
                  />

                  {/* Botón de cargar */}
                  {carga.estado === "listo" && (
                    <button
                      onClick={() => ejecutarCarga(config.id)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        gap: 8, width: "100%", padding: 14, marginTop: 14,
                        backgroundColor: config.color, color: "#fff",
                        border: "none", borderRadius: 12, fontSize: 14,
                        fontWeight: 600, cursor: "pointer",
                        boxShadow: `0 4px 14px ${config.color}40`,
                      }}
                    >
                      <Play size={16} />
                      Cargar {carga.resumen?.totalFilas} filas a Supabase
                    </button>
                  )}

                  {/* Botón de reiniciar */}
                  {(carga.estado === "completado" || carga.estado === "error") && (
                    <button
                      onClick={() => updateCarga(config.id, {
                        archivo: null, datos: null, estado: "pendiente",
                        progreso: 0, resumen: null, errores: [],
                      })}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        gap: 6, width: "100%", padding: 12, marginTop: 14,
                        backgroundColor: "#f8fafc", color: "#475569",
                        border: "2px solid #e5e7eb", borderRadius: 12,
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      <RotateCcw size={14} />
                      Reiniciar esta carga
                    </button>
                  )}

                  {/* Resumen de resultado */}
                  {carga.estado === "completado" && carga.resumen && (
                    <div style={{
                      marginTop: 14, padding: 14, backgroundColor: "#ecfdf5",
                      borderRadius: 10, border: "1px solid #a7f3d0",
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#047857", margin: 0 }}>
                        ✓ Carga completada
                      </p>
                      <p style={{ fontSize: 12, color: "#065f46", margin: "6px 0 0 0" }}>
                        {carga.resumen.insertados} de {carga.resumen.totalFilas} filas cargadas exitosamente.
                        {carga.resumen.errores > 0 && ` ${carga.resumen.errores} con errores.`}
                      </p>
                    </div>
                  )}

                  {/* Errores */}
                  {carga.errores.length > 0 && (
                    <div style={{
                      marginTop: 14, padding: 14, backgroundColor: "#fef2f2",
                      borderRadius: 10, border: "1px solid #fecaca",
                      maxHeight: 200, overflowY: "auto",
                    }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", margin: "0 0 8px 0" }}>
                        {carga.errores.length} error(es):
                      </p>
                      {carga.errores.slice(0, 20).map((e, i) => (
                        <p key={i} style={{ fontSize: 11, color: "#991b1b", margin: "2px 0", fontFamily: "monospace" }}>
                          {e}
                        </p>
                      ))}
                      {carga.errores.length > 20 && (
                        <p style={{ fontSize: 11, color: "#991b1b", fontStyle: "italic" }}>
                          ...y {carga.errores.length - 20} errores más
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// =========================================================
// COMPONENTE: Zona de drop de archivos
// =========================================================

function FileDropZone({ cargaId, expectedFile, onFileSelect, estado, archivo }) {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onFileSelect(file);
  }

  function handleChange(e) {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }

  if (estado === "cargando" || estado === "completado") {
    return (
      <div style={{
        padding: 14, backgroundColor: estado === "completado" ? "#ecfdf5" : "#f5f3ff",
        borderRadius: 10, border: `1px solid ${estado === "completado" ? "#a7f3d0" : "#e9e5ff"}`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <FileSpreadsheet size={18} color={estado === "completado" ? "#10b981" : "#7c3aed"} />
        <span style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}>
          {archivo?.name || expectedFile}
        </span>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        padding: 28, textAlign: "center", cursor: "pointer",
        borderRadius: 12, transition: "all 0.2s",
        border: dragActive ? "2px dashed #7c3aed" : "2px dashed #d1d5db",
        backgroundColor: dragActive ? "#f5f3ff" : "#fafafa",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleChange}
        style={{ display: "none" }}
      />
      <Upload size={28} color={dragActive ? "#7c3aed" : "#94a3b8"} style={{ margin: "0 auto 10px" }} />
      <p style={{ fontSize: 13, color: "#475569", margin: 0, fontWeight: 600 }}>
        {archivo ? archivo.name : `Arrastra o haz clic para subir`}
      </p>
      <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0 0" }}>
        Archivo esperado: <strong>{expectedFile}</strong>
      </p>
    </div>
  );
}