import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Award,
  Users,
  TrendingUp,
  Building2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const ESTATUS_COLORS = {
  realizada: "#3b82f6",
  proxima_vencer: "#f59e0b",
  vencida: "#ef4444",
  en_tiempo: "#10b981",
};

export default function DashboardCalificaciones() {
  const [datos, setDatos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [empRes, calRes] = await Promise.all([
      supabase.from("empleados").select("clave, nombre, puesto, depto"),
      supabase.from("calificaciones_empleado").select("*"),
    ]);
    setEmpleados(empRes.data || []);
    setDatos(calRes.data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid #7c3aed",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const empMap = {};
  empleados.forEach((e) => (empMap[e.clave] = e));

  // Conteos generales
  const totalRegistros = datos.length;
  const enTiempo = datos.filter((d) => d.estatus_anual === "en_tiempo").length;
  const proximasVencer = datos.filter((d) => d.estatus_anual === "proxima_vencer").length;
  const vencidas = datos.filter((d) => d.estatus_anual === "vencida").length;
  const realizadas = datos.filter((d) => d.estatus_anual === "realizada").length;
  const sinRegistro = empleados.length - totalRegistros;

  // Datos para pie chart
  const pieData = [
    { name: "En Tiempo", value: enTiempo, color: "#10b981" },
    { name: "Próximas a Vencer", value: proximasVencer, color: "#f59e0b" },
    { name: "Vencidas", value: vencidas, color: "#ef4444" },
    { name: "Realizadas", value: realizadas, color: "#3b82f6" },
  ].filter((d) => d.value > 0);

  // Datos por departamento
  const deptoMap = {};
  datos.forEach((d) => {
    const emp = empMap[d.emp_clave];
    const depto = emp?.depto || "Sin depto";
    if (!deptoMap[depto]) {
      deptoMap[depto] = { realizada: 0, proxima_vencer: 0, vencida: 0, en_tiempo: 0 };
    }
    deptoMap[depto][d.estatus_anual]++;
  });

  const barData = Object.entries(deptoMap)
    .map(([depto, counts]) => ({
      depto: depto.length > 18 ? depto.slice(0, 16) + "…" : depto,
      "En Tiempo": counts.en_tiempo,
      "Próximas": counts.proxima_vencer,
      "Vencidas": counts.vencida,
      "Realizadas": counts.realizada,
    }))
    .sort((a, b) => b["Vencidas"] - a["Vencidas"]);

  // Documentación completada
  const conRecepcion = datos.filter((d) => d.recepcion_entrega).length;
  const conDescriptivo = datos.filter((d) => d.descriptivo_puesto).length;
  const conMatriz = datos.filter((d) => d.matriz_capacitacion).length;
  const conEval90 = datos.filter((d) => d.eval_90_realizada).length;

  const docData = [
    { name: "Ev. 90 Días", completado: conEval90, pendiente: totalRegistros - conEval90 },
    { name: "Recepción", completado: conRecepcion, pendiente: totalRegistros - conRecepcion },
    { name: "Descriptivo", completado: conDescriptivo, pendiente: totalRegistros - conDescriptivo },
    { name: "Matriz Cap.", completado: conMatriz, pendiente: totalRegistros - conMatriz },
  ];

  // Empleados vencidos (para lista)
  const vencidosList = datos
    .filter((d) => d.estatus_anual === "vencida")
    .map((d) => ({
      ...d,
      empleado: empMap[d.emp_clave],
    }))
    .sort((a, b) => (a.fecha_anual || "").localeCompare(b.fecha_anual || ""));

  // Próximos a vencer
  const proximosList = datos
    .filter((d) => d.estatus_anual === "proxima_vencer")
    .map((d) => ({
      ...d,
      empleado: empMap[d.emp_clave],
    }))
    .sort((a, b) => (a.fecha_anual || "").localeCompare(b.fecha_anual || ""));

  const cardBase = {
    backgroundColor: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  };

  const pctSafe = (n, total) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>
          Dashboard de Calificaciones
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
          Resumen del estatus de calificaciones de personal
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        {[
          {
            label: "En Tiempo",
            value: enTiempo,
            icon: CheckCircle,
            bg: "linear-gradient(135deg, #10b981, #059669)",
            shadow: "0 6px 20px rgba(16,185,129,0.3)",
          },
          {
            label: "Próximas a Vencer",
            value: proximasVencer,
            icon: AlertTriangle,
            bg: "linear-gradient(135deg, #f59e0b, #d97706)",
            shadow: "0 6px 20px rgba(245,158,11,0.3)",
          },
          {
            label: "Vencidas",
            value: vencidas,
            icon: Clock,
            bg: "linear-gradient(135deg, #ef4444, #dc2626)",
            shadow: "0 6px 20px rgba(239,68,68,0.3)",
          },
          {
            label: "Realizadas",
            value: realizadas,
            icon: Award,
            bg: "linear-gradient(135deg, #3b82f6, #2563eb)",
            shadow: "0 6px 20px rgba(59,130,246,0.3)",
          },
          {
            label: "Sin Registro",
            value: sinRegistro,
            icon: Users,
            bg: "linear-gradient(135deg, #64748b, #475569)",
            shadow: "0 6px 20px rgba(100,116,139,0.3)",
          },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={i}
              style={{
                position: "relative",
                overflow: "hidden",
                borderRadius: 14,
                padding: "20px 20px",
                background: s.bg,
                color: "#fff",
                boxShadow: s.shadow,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.75)",
                  margin: 0,
                }}
              >
                {s.label}
              </p>
              <p style={{ fontSize: 30, fontWeight: 800, margin: "6px 0 0 0", lineHeight: 1 }}>
                {s.value}
              </p>
              <Icon
                size={48}
                style={{
                  position: "absolute",
                  right: -4,
                  bottom: -6,
                  color: "rgba(255,255,255,0.15)",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Por Departamento */}
        <div style={{ ...cardBase, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>
            Estatus por Departamento
          </h3>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 20px 0" }}>
            Distribución de calificaciones por área
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis
                type="category"
                dataKey="depto"
                tick={{ fontSize: 10, fill: "#64748b" }}
                width={120}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              />
              <Bar dataKey="En Tiempo" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Próximas" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Vencidas" stackId="a" fill="#ef4444" />
              <Bar dataKey="Realizadas" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div style={{ ...cardBase, padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>
            Distribución General
          </h3>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 20px 0" }}>
            {totalRegistros} registros totales
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={105}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Documentación Progress */}
      <div style={{ ...cardBase, padding: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: "#1e1b4b", margin: "0 0 4px 0" }}>
          Avance de Documentación
        </h3>
        <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 20px 0" }}>
          Porcentaje de empleados que han completado cada documento
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {docData.map((doc) => {
            const pct = pctSafe(doc.completado, totalRegistros);
            return (
              <div
                key={doc.name}
                style={{
                  padding: 20,
                  backgroundColor: "#f8fafc",
                  borderRadius: 14,
                  border: "1px solid #e5e7eb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>
                    {doc.name}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed" }}>{pct}%</span>
                </div>
                <div
                  style={{
                    width: "100%",
                    backgroundColor: "#e2e8f0",
                    borderRadius: 999,
                    height: 10,
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: 10,
                      borderRadius: 999,
                      background:
                        pct === 100
                          ? "#10b981"
                          : pct >= 50
                          ? "linear-gradient(90deg, #7c3aed, #a855f7)"
                          : pct > 0
                          ? "#f59e0b"
                          : "#e2e8f0",
                      transition: "width 0.5s ease",
                    }}
                  />
                </div>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "8px 0 0 0" }}>
                  {doc.completado} de {totalRegistros}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Listas: Vencidas y Próximas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Vencidas */}
        <div style={{ ...cardBase, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                backgroundColor: "#fef2f2",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Clock size={16} color="#ef4444" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>
                Calificaciones Vencidas
              </h3>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0 0" }}>
                {vencidosList.length} empleados requieren atención
              </p>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 320 }}>
            {vencidosList.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                <CheckCircle
                  size={32}
                  style={{ margin: "0 auto 8px", opacity: 0.3 }}
                />
                Sin calificaciones vencidas
              </div>
            ) : (
              vencidosList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 20px",
                    borderBottom: "1px solid #f8fafc",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      backgroundColor: "#fef2f2",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#ef4444",
                      flexShrink: 0,
                    }}
                  >
                    {item.empleado?.nombre
                      ?.split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("") || "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#1e293b",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.empleado?.nombre || item.emp_clave}
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        margin: "2px 0 0 0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.empleado?.depto} · {item.observaciones || "Sin observaciones"}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      color: "#ef4444",
                      backgroundColor: "#fef2f2",
                      padding: "3px 10px",
                      borderRadius: 99,
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {item.fecha_anual || "Sin fecha"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Próximas a Vencer */}
        <div style={{ ...cardBase, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div
            style={{
              padding: "18px 20px",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                backgroundColor: "#fffbeb",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={16} color="#f59e0b" />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>
                Próximas a Vencer
              </h3>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0 0" }}>
                {proximosList.length} empleados por vencer
              </p>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 320 }}>
            {proximosList.length === 0 ? (
              <div
                style={{
                  padding: 32,
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 13,
                }}
              >
                <CheckCircle
                  size={32}
                  style={{ margin: "0 auto 8px", opacity: 0.3 }}
                />
                Sin calificaciones próximas a vencer
              </div>
            ) : (
              proximosList.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: "12px 20px",
                    borderBottom: "1px solid #f8fafc",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      backgroundColor: "#fffbeb",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#d97706",
                      flexShrink: 0,
                    }}
                  >
                    {item.empleado?.nombre
                      ?.split(" ")
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("") || "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#1e293b",
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.empleado?.nombre || item.emp_clave}
                    </p>
                    <p
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        margin: "2px 0 0 0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.empleado?.depto} · Aniversario {item.numero_aniversario}°
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      color: "#92400e",
                      backgroundColor: "#fffbeb",
                      padding: "3px 10px",
                      borderRadius: 99,
                      flexShrink: 0,
                      fontWeight: 600,
                    }}
                  >
                    {item.fecha_anual || "Sin fecha"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}