// src/lib/calificaciones.js
// Reglas compartidas de vencimiento de calificaciones (tabla, calendario y notificaciones).
import { supabase } from "./supabaseClient.js";

export const PERIODOS = [
  { key: "90dias", label: "90 días",     entrega: "fecha_entrega_90dias", real: "fecha_real_90dias" },
  { key: "2025",   label: "Anual 2025",  entrega: "entrega_2025",         real: "fecha_real_2025" },
  { key: "2026",   label: "Anual 2026",  entrega: "entrega_2026",         real: "fecha_real_2026" },
  { key: "2027",   label: "Anual 2027",  entrega: "entrega_2027",         real: "fecha_real_2027" },
];

export const DIAS_AVISO = 30;

// Fecha local de hoy en formato YYYY-MM-DD (no UTC, para que no cambie de día en la tarde)
export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Días entre hoy y una fecha ISO (negativo = ya pasó)
export function diasRestantes(fechaISO) {
  const hoy = new Date(hoyISO() + "T00:00:00");
  const fecha = new Date(fechaISO + "T00:00:00");
  return Math.round((fecha - hoy) / 86400000);
}

// Estatus de una fecha de entrega: E (entregada) / P (próxima a vencer) / V (vencida) / null (sin dato/vigente)
export function calcularEstatus(entregaISO, realISO) {
  if (realISO) return "E";
  if (!entregaISO) return null;
  const diffDias = diasRestantes(entregaISO);
  if (diffDias < 0) return "V";
  if (diffDias <= DIAS_AVISO) return "P";
  return null;
}

export const ESTATUS_INFO = {
  E: { label: "Entregada",        color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
  P: { label: "Próxima a Vencer", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  V: { label: "Vencida",          color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
  // Fecha de entrega futura, fuera de la ventana de aviso
  F: { label: "Programada",       color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
};

// Carga empleados + calificaciones y los convierte en una lista plana de vencimientos
// (un evento por empleado y periodo que tenga fecha de entrega).
export async function cargarVencimientos() {
  const [{ data: empleados, error: errEmp }, { data: califs, error: errCalif }] = await Promise.all([
    supabase.from("empleados").select("clave, nombre, puesto, depto"),
    supabase.from("calificaciones").select("*"),
  ]);
  if (errEmp || errCalif) throw errEmp || errCalif;

  const empByClave = new Map((empleados || []).map((e) => [e.clave, e]));
  const eventos = [];
  for (const c of califs || []) {
    const emp = empByClave.get(c.emp_clave);
    if (!emp) continue;
    for (const p of PERIODOS) {
      const fecha = c[p.entrega];
      if (!fecha) continue;
      eventos.push({
        id: `${c.emp_clave}-${p.key}`,
        clave: c.emp_clave,
        nombre: emp.nombre,
        puesto: emp.puesto,
        depto: emp.depto,
        periodo: p.label,
        fecha,
        fechaReal: c[p.real] || null,
        estatus: calcularEstatus(fecha, c[p.real] || null) || "F",
        dias: diasRestantes(fecha),
      });
    }
  }
  eventos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return eventos;
}
