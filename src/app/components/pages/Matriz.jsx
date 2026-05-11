//matriz.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { Download, Filter } from "lucide-react";

export default function Matriz() {
  const [empleados, setEmpleados] = useState([]);
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchMatriz(); }, []);

  async function fetchMatriz() {
    setLoading(true);
    try {
      const [empRes, capRes, asigRes] = await Promise.all([
        supabase.from("empleados").select("clave, nombre, depto").order("clave"),
        supabase.from("capacitaciones").select("id, nombre, codigo, curso_id, cursos ( nombre )").order("id"),
        supabase.from("asignaciones_cap").select("emp_clave, cap_id, completado").eq("cap_eliminada", false),
      ]);
      setEmpleados(empRes.data || []);
      setCapacitaciones(capRes.data || []);
      setAsignaciones(asigRes.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        <div style={{ width: 36, height: 36, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Agrupar por grupo de curso
  const grupos = {};
  capacitaciones.forEach((cap) => {
    const grupoNombre = cap.cursos?.nombre || "Sin grupo";
    if (!grupos[grupoNombre]) grupos[grupoNombre] = [];
    grupos[grupoNombre].push(cap);
  });

  // Crear mapa de asignaciones: emp_clave -> cap_id -> completado
  const asigMap = {};
  asignaciones.forEach((a) => {
    if (!asigMap[a.emp_clave]) asigMap[a.emp_clave] = {};
    asigMap[a.emp_clave][a.cap_id] = a.completado;
  });

  const grupoNames = Object.keys(grupos);

  // Calcular porcentaje por empleado
  function getEmpleadoStats(emp) {
    const empAsig = asigMap[emp.clave] || {};
    const total = Object.keys(empAsig).length;
    const completadas = Object.values(empAsig).filter(Boolean).length;
    return { total, completadas, pct: total > 0 ? Math.round((completadas / total) * 100) : 0 };
  }

  // Calcular porcentaje por grupo por empleado
  function getGrupoStatus(empClave, caps) {
    let total = 0;
    let completadas = 0;
    caps.forEach((cap) => {
      if (asigMap[empClave]?.[cap.id] !== undefined) {
        total++;
        if (asigMap[empClave][cap.id]) completadas++;
      }
    });
    return { total, completadas, pct: total > 0 ? Math.round((completadas / total) * 100) : null };
  }

  function getPctColor(pct) {
    if (pct === null) return { bg: "#f8fafc", color: "#cbd5e1", text: "—" };
    if (pct === 100) return { bg: "#10b981", color: "#fff", text: `${pct}%` };
    if (pct >= 50) return { bg: "#3b82f6", color: "#fff", text: `${pct}%` };
    if (pct > 0) return { bg: "#f59e0b", color: "#fff", text: `${pct}%` };
    return { bg: "#ef4444", color: "#fff", text: `${pct}%` };
  }

  const cardBase = { backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };

  // Stats globales
  const totalAsig = asignaciones.length;
  const totalCompletadas = asignaciones.filter((a) => a.completado).length;
  const globalPct = totalAsig > 0 ? Math.round((totalCompletadas / totalAsig) * 100) : 0;

  // Mejor grupo
  let bestGrupo = { name: "—", pct: 0 };
  let worstGrupo = { name: "—", pct: 100 };
  grupoNames.forEach((gn) => {
    let t = 0, c = 0;
    empleados.forEach((emp) => {
      const s = getGrupoStatus(emp.clave, grupos[gn]);
      t += s.total; c += s.completadas;
    });
    const p = t > 0 ? Math.round((c / t) * 100) : 0;
    if (p > bestGrupo.pct) bestGrupo = { name: gn, pct: p };
    if (p < worstGrupo.pct && t > 0) worstGrupo = { name: gn, pct: p };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Matriz de Competencias</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            Avance de capacitaciones por empleado y grupo — datos en tiempo real
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
            border: "1px solid #d1d5db", backgroundColor: "#fff", borderRadius: 12,
            fontSize: 13, fontWeight: 500, color: "#475569", cursor: "pointer",
          }}>
            <Filter size={16} /><span>Filtrar</span>
          </button>
          <button style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 18px",
            backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: 12,
            fontSize: 13, fontWeight: 500, cursor: "pointer", boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
          }}>
            <Download size={16} /><span>Exportar</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ ...cardBase, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1e1b4b", margin: "0 0 12px 0" }}>Niveles de Avance</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          {[
            { color: "#10b981", label: "100% — Completo" },
            { color: "#3b82f6", label: "50-99% — Avanzado" },
            { color: "#f59e0b", label: "1-49% — En progreso" },
            { color: "#ef4444", label: "0% — Sin avance" },
            { color: "#f8fafc", label: "— No asignado", border: true },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6, backgroundColor: item.color,
                border: item.border ? "1px solid #e2e8f0" : "none",
              }} />
              <span style={{ fontSize: 12, color: "#475569" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Matrix Table */}
      <div style={{ ...cardBase, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                <th style={{
                  padding: "16px 20px", textAlign: "left", fontSize: 12, fontWeight: 600,
                  color: "#475569", position: "sticky", left: 0, backgroundColor: "#f8fafc",
                  zIndex: 10, borderBottom: "2px solid #e5e7eb", minWidth: 200,
                }}>
                  Empleado
                </th>
                {grupoNames.map((g, i) => (
                  <th key={i} style={{
                    padding: "16px 14px", textAlign: "center", fontSize: 11, fontWeight: 600,
                    color: "#475569", borderBottom: "2px solid #e5e7eb", minWidth: 100,
                    borderLeft: "1px solid #f1f5f9",
                  }}>
                    {g}
                  </th>
                ))}
                <th style={{
                  padding: "16px 14px", textAlign: "center", fontSize: 12, fontWeight: 700,
                  color: "#1e1b4b", borderBottom: "2px solid #e5e7eb", borderLeft: "2px solid #e5e7eb",
                  minWidth: 90, backgroundColor: "#f5f3ff",
                }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((emp, empIdx) => {
                const empStats = getEmpleadoStats(emp);
                const totalColor = getPctColor(empStats.total > 0 ? empStats.pct : null);

                return (
                  <tr key={emp.clave}
                    style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#faf8ff"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <td style={{
                      padding: "14px 20px", position: "sticky", left: 0,
                      backgroundColor: "#fff", zIndex: 10, borderRight: "1px solid #f1f5f9",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 10,
                          backgroundColor: "#f5f3ff", color: "#7c3aed",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, flexShrink: 0,
                        }}>
                          {emp.nombre.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>{emp.nombre}</p>
                          <p style={{ fontSize: 10, color: "#94a3b8", margin: "2px 0 0 0" }}>{emp.depto}</p>
                        </div>
                      </div>
                    </td>

                    {grupoNames.map((gn, gi) => {
                      const status = getGrupoStatus(emp.clave, grupos[gn]);
                      const c = getPctColor(status.pct);
                      return (
                        <td key={gi} style={{ padding: "10px 8px", textAlign: "center", borderLeft: "1px solid #f1f5f9" }}>
                          <div style={{
                            width: 48, height: 48, borderRadius: 10, margin: "0 auto",
                            backgroundColor: c.bg, color: c.color,
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            fontWeight: 700, fontSize: 13,
                            boxShadow: status.pct !== null ? `0 2px 8px ${c.bg}50` : "none",
                            transition: "transform 0.15s", cursor: status.pct !== null ? "default" : "default",
                            border: status.pct === null ? "1px solid #e5e7eb" : "none",
                          }}
                            onMouseEnter={(e) => { if (status.pct !== null) e.currentTarget.style.transform = "scale(1.1)"; }}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                          >
                            <span>{c.text}</span>
                            {status.pct !== null && (
                              <span style={{ fontSize: 8, opacity: 0.85, marginTop: 1 }}>
                                {status.completadas}/{status.total}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    <td style={{ padding: "10px 8px", textAlign: "center", borderLeft: "2px solid #e5e7eb", backgroundColor: "#faf8ff" }}>
                      <div style={{
                        backgroundColor: totalColor.bg, color: totalColor.color,
                        fontWeight: 700, fontSize: 14, padding: "10px 16px", borderRadius: 10,
                        display: "inline-block", minWidth: 56,
                        boxShadow: empStats.total > 0 ? `0 2px 8px ${totalColor.bg}50` : "none",
                      }}>
                        {empStats.total > 0 ? `${empStats.pct}%` : "—"}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "Grupo con Mayor Avance", value: bestGrupo.name, sub: `Promedio: ${bestGrupo.pct}%`, color: "#10b981" },
          { label: "Grupo con Menor Avance", value: worstGrupo.name, sub: `Promedio: ${worstGrupo.pct}%`, color: "#f97316" },
          { label: "Avance General", value: `${globalPct}%`, sub: `${totalCompletadas} de ${totalAsig} completadas`, color: "#7c3aed" },
        ].map((stat, i) => (
          <div key={i} style={{ ...cardBase, padding: 24 }}>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 10px 0" }}>{stat.label}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: stat.color, margin: 0 }}>{stat.value}</p>
            <p style={{ fontSize: 12, color: "#64748b", margin: "6px 0 0 0" }}>{stat.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}