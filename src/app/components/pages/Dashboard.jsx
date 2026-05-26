//dashboard.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import { Users, BookOpen, ClipboardCheck, TrendingUp, CheckCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#7c3aed", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316"];

export default function Dashboard() {
  const [stats, setStats] = useState({ empleados: 0, cursos: 0, capacitaciones: 0, asignaciones: 0 });
  const [porDepto, setPorDepto] = useState([]);
  const [porGrupo, setPorGrupo] = useState([]);
  const [porEstado, setPorEstado] = useState([]);
  const [recientes, setRecientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const [empRes, curRes, capRes, asigRes] = await Promise.all([
        supabase.from("empleados").select("clave", { count: "exact", head: true }),
        supabase.from("cursos").select("id", { count: "exact", head: true }),
        supabase.from("capacitaciones").select("id", { count: "exact", head: true }),
        supabase.from("asignaciones_cap").select("emp_clave", { count: "exact", head: true }).eq("cap_eliminada", false),
      ]);
      setStats({ empleados: empRes.count || 0, cursos: curRes.count || 0, capacitaciones: capRes.count || 0, asignaciones: asigRes.count || 0 });

      const { data: allCaps } = await supabase
        .from("asignaciones_cap")
        .select("*, capacitaciones ( nombre, curso_id, cursos ( nombre, categoria ) )")
        .eq("cap_eliminada", false);
      const { data: allEmps } = await supabase.from("empleados").select("clave, nombre, depto");

      const empMap = {};
      (allEmps || []).forEach((e) => (empMap[e.clave] = e));

      const deptoMap = {};
      (allCaps || []).forEach((a) => {
        const depto = empMap[a.emp_clave]?.depto || "Sin depto";
        if (!deptoMap[depto]) deptoMap[depto] = { total: 0, completadas: 0 };
        deptoMap[depto].total++;
        if (a.completado) deptoMap[depto].completadas++;
      });
      setPorDepto(Object.entries(deptoMap).map(([name, d]) => ({
        depto: name.length > 14 ? name.slice(0, 12) + "…" : name,
        avance: d.total > 0 ? Math.round((d.completadas / d.total) * 100) : 0,
      })));

      const grupoMap = {};
      (allCaps || []).forEach((a) => {
        const grupo = a.capacitaciones?.cursos?.nombre || "Sin grupo";
        if (!grupoMap[grupo]) grupoMap[grupo] = { total: 0, completadas: 0 };
        grupoMap[grupo].total++;
        if (a.completado) grupoMap[grupo].completadas++;
      });
      setPorGrupo(Object.entries(grupoMap).map(([name, d], i) => ({
        name, completadas: d.completadas, total: d.total, fill: COLORS[i % COLORS.length],
      })));

      const completados = (allCaps || []).filter((a) => a.completado).length;
      const pendientes = (allCaps || []).filter((a) => !a.completado).length;
      setPorEstado([
        { name: "Completados", value: completados, color: "#10b981" },
        { name: "Pendientes", value: pendientes, color: "#7c3aed" },
      ]);

      setRecientes((allCaps || []).filter((a) => a.completado).slice(-6).reverse().map((a) => ({
        empleado: empMap[a.emp_clave]?.nombre || a.emp_clave,
        accion: a.nombre_cap_snap || a.capacitaciones?.nombre,
        mes: a.mes,
      })));
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

  const statCards = [
    { label: "Empleados", value: stats.empleados, icon: Users, bg: "linear-gradient(135deg, #7c3aed, #5b21b6)", shadow: "0 8px 24px rgba(124,58,237,0.3)" },
    { label: "Grupos de Cursos", value: stats.cursos, icon: BookOpen, bg: "linear-gradient(135deg, #10b981, #059669)", shadow: "0 8px 24px rgba(16,185,129,0.3)" },
    { label: "Capacitaciones", value: stats.capacitaciones, icon: ClipboardCheck, bg: "linear-gradient(135deg, #ec4899, #db2777)", shadow: "0 8px 24px rgba(236,72,153,0.3)" },
    { label: "Asignaciones", value: stats.asignaciones, icon: TrendingUp, bg: "linear-gradient(135deg, #f59e0b, #d97706)", shadow: "0 8px 24px rgba(245,158,11,0.3)" },
  ];

  const cardBase = { backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>Resumen general del sistema de capacitación</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} style={{
              position: "relative", overflow: "hidden", borderRadius: 16, padding: 24,
              background: stat.bg, color: "#fff", boxShadow: stat.shadow,
              transition: "transform 0.2s", cursor: "default",
            }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-3px)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
            >
              <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.8)", margin: 0 }}>{stat.label}</p>
              <p style={{ fontSize: 32, fontWeight: 800, margin: "6px 0 0 0", lineHeight: 1 }}>{stat.value}</p>
              <Icon size={72} style={{ position: "absolute", right: -8, bottom: -12, color: "rgba(255,255,255,0.15)" }} />
            </div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ ...cardBase, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>Avance por Departamento</h3>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 20px 0" }}>Porcentaje de capacitaciones completadas</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={porDepto} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#94a3b8" }} unit="%" />
              <YAxis type="category" dataKey="depto" tick={{ fontSize: 11, fill: "#64748b" }} width={110} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(val) => [`${val}%`, "Avance"]} />
              <Bar dataKey="avance" radius={[0, 6, 6, 0]} maxBarSize={22}>
                {porDepto.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardBase, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>Estado General</h3>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 20px 0" }}>Completados vs Pendientes</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={porEstado} cx="50%" cy="50%" innerRadius={70} outerRadius={105} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {porEstado.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Legend verticalAlign="bottom" iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
        <div style={{ ...cardBase, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>Avance por Grupo de Curso</h3>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 20px 0" }}>Completadas vs total</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={porGrupo}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="completadas" name="Completadas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
              <Bar dataKey="total" name="Total" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ ...cardBase, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #f1f5f9" }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>Actividad Reciente</h3>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0 0" }}>Capacitaciones completadas</p>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {recientes.map((act, i) => (
              <div key={i} style={{ padding: "14px 20px", borderBottom: "1px solid #f8fafc", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 28, height: 28, backgroundColor: "#ecfdf5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                  <CheckCircle size={14} color="#10b981" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.empleado}</p>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "3px 0 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{act.accion}</p>
                </div>
                <span style={{ fontSize: 10, color: "#94a3b8", backgroundColor: "#f8fafc", padding: "3px 10px", borderRadius: 99, flexShrink: 0 }}>{act.mes}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}