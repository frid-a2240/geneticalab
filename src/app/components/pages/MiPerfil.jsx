//MiPerfil.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import { Briefcase, Calendar, BookOpen, CheckCircle, Clock, Award, TrendingUp } from "lucide-react";

export default function MiPerfil() {
  const [empleado, setEmpleado] = useState(null);
  const [asignaciones, setAsignaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const claveActual = "EMP-001";

  useEffect(() => { fetchPerfil(); }, []);

  async function fetchPerfil() {
    setLoading(true);
    try {
      const { data: emp } = await supabase.from("empleados").select("*").eq("clave", claveActual).single();
      setEmpleado(emp);
      const { data: caps } = await supabase
        .from("asignaciones_cap")
        .select("*, capacitaciones ( id, nombre, codigo, curso_id, cursos ( id, nombre, categoria ) )")
        .eq("emp_clave", claveActual).eq("cap_eliminada", false);
      setAsignaciones(caps || []);
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

  if (!empleado) return <p style={{ color: "#64748b" }}>No se encontró el empleado.</p>;

  const totalCaps = asignaciones.length;
  const completadas = asignaciones.filter((a) => a.completado).length;
  const porcentaje = totalCaps > 0 ? Math.round((completadas / totalCaps) * 100) : 0;

  const porGrupo = {};
  asignaciones.forEach((a) => {
    const grupo = a.capacitaciones?.cursos?.nombre || "Sin grupo";
    if (!porGrupo[grupo]) porGrupo[grupo] = { total: 0, completadas: 0, caps: [] };
    porGrupo[grupo].total++;
    if (a.completado) porGrupo[grupo].completadas++;
    porGrupo[grupo].caps.push(a);
  });

  const cardBase = { backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };

  const statsItems = [
    { label: "Clave", value: empleado.clave, icon: Award, color: "#7c3aed" },
    { label: "Capacitaciones", value: totalCaps, icon: BookOpen, color: "#6366f1" },
    { label: "Completadas", value: completadas, icon: CheckCircle, color: "#10b981" },
    { label: "Avance Global", value: `${porcentaje}%`, icon: TrendingUp, color: "#f59e0b" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Mi Perfil</h1>
        <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>Información personal y avance en capacitaciones</p>
      </div>

      {/* Header Card */}
      <div style={{ ...cardBase, overflow: "hidden" }}>
        {/* Gradient Header */}
        <div style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)", padding: "36px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div style={{
              width: 80, height: 80, background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 26, fontWeight: 700, boxShadow: "0 8px 24px rgba(124,58,237,0.4)", flexShrink: 0,
            }}>
              {empleado.nombre?.charAt(0)}{empleado.nombre?.split(" ")[1]?.charAt(0) || ""}
            </div>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>{empleado.nombre}</h2>
              <p style={{ color: "#c4b5fd", fontSize: 14, marginTop: 6 }}>{empleado.puesto}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 14, fontSize: 12, color: "#cbd5e1" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Briefcase size={14} />{empleado.depto}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Calendar size={14} />Ingreso: {empleado.fec_ingreso}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
          {statsItems.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} style={{ padding: "20px 24px", borderRight: i < 3 ? "1px solid #f1f5f9" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Icon size={15} color={stat.color} />
                  <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>{stat.label}</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>{stat.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ ...cardBase, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>Progreso General</h3>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#7c3aed" }}>{porcentaje}%</span>
        </div>
        <div style={{ width: "100%", backgroundColor: "#f1f5f9", borderRadius: 999, height: 14 }}>
          <div className="progress-animated" style={{
            width: `${porcentaje}%`, height: 14, borderRadius: 999,
            background: "linear-gradient(90deg, #7c3aed, #ec4899)",
            boxShadow: "0 2px 8px rgba(124,58,237,0.35)",
          }} />
        </div>
        <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 10 }}>{completadas} de {totalCaps} capacitaciones completadas</p>
      </div>

      {/* Cursos por Grupo */}
      <div>
        <h3 style={{ fontSize: 18, fontWeight: 600, color: "#1e1b4b", margin: "0 0 16px 0" }}>Mis Cursos por Grupo</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {Object.entries(porGrupo).map(([grupo, data]) => {
            const pct = Math.round((data.completadas / data.total) * 100);
            return (
              <div key={grupo} style={{ ...cardBase, padding: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>{grupo}</h4>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: "4px 14px", borderRadius: 999,
                    backgroundColor: pct === 100 ? "#ecfdf5" : pct > 0 ? "#f5f3ff" : "#f8fafc",
                    color: pct === 100 ? "#059669" : pct > 0 ? "#7c3aed" : "#94a3b8",
                  }}>{pct}%</span>
                </div>

                <div style={{ width: "100%", backgroundColor: "#f1f5f9", borderRadius: 999, height: 6, marginBottom: 18 }}>
                  <div className="progress-animated" style={{
                    width: `${pct}%`, height: 6, borderRadius: 999,
                    backgroundColor: pct === 100 ? "#10b981" : "#7c3aed",
                  }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.caps.map((cap) => (
                    <div key={cap.cap_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                      {cap.completado
                        ? <CheckCircle size={16} color="#10b981" style={{ flexShrink: 0 }} />
                        : <Clock size={16} color="#d1d5db" style={{ flexShrink: 0 }} />
                      }
                      <span style={{
                        fontSize: 14, lineHeight: 1.4,
                        color: cap.completado ? "#94a3b8" : "#334155",
                        textDecoration: cap.completado ? "line-through" : "none",
                      }}>
                        {cap.nombre_cap_snap || cap.capacitaciones?.nombre}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}