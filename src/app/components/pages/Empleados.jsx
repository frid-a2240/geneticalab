//empleados.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { Search, Plus, Briefcase, Calendar, Building2 } from "lucide-react";

const DEPTO_GRADIENTS = {
  "Producción": "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  "Control de Calidad": "linear-gradient(135deg, #10b981, #059669)",
  "Mantenimiento": "linear-gradient(135deg, #f59e0b, #d97706)",
  "Recursos Humanos": "linear-gradient(135deg, #8b5cf6, #6d28d9)",
  "Almacén": "linear-gradient(135deg, #06b6d4, #0891b2)",
  "Seguridad y Medio Ambiente": "linear-gradient(135deg, #ec4899, #db2777)",
  "Dirección": "linear-gradient(135deg, #475569, #1e293b)",
  "Administración": "linear-gradient(135deg, #6366f1, #4f46e5)",
};

export default function Empleados() {
  const [empleados, setEmpleados] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepto, setFilterDepto] = useState("Todos");
  const [deptos, setDeptos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchEmpleados(); }, []);

  async function fetchEmpleados() {
    setLoading(true);
    const { data } = await supabase.from("empleados").select("*").order("clave");
    if (data) {
      setEmpleados(data);
      setDeptos([...new Set(data.map((e) => e.depto).filter(Boolean))]);
    }
    setLoading(false);
  }

  const filtered = empleados.filter((emp) => {
    const matchSearch = `${emp.nombre} ${emp.clave} ${emp.puesto}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (filterDepto === "Todos" || emp.depto === filterDepto);
  });

  function getInitials(nombre) {
    const parts = nombre.split(" ");
    return (parts[0]?.[0] || "") + (parts[2]?.[0] || parts[1]?.[0] || "");
  }

  const cardBase = { backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        <div style={{ width: 36, height: 36, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Empleados</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>{empleados.length} empleados registrados</p>
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
          backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: 12,
          fontSize: 14, fontWeight: 500, cursor: "pointer", boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
        }}>
          <Plus size={18} /><span>Nuevo Empleado</span>
        </button>
      </div>

      {/* Filters */}
      <div style={{ ...cardBase, padding: 20 }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input type="text" placeholder="Buscar por nombre, clave o puesto..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%", paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
              backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12,
              fontSize: 14, outline: "none", boxSizing: "border-box",
            }}
            onFocus={(e) => { e.target.style.borderColor = "#7c3aed"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)"; }}
            onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
          />
        </div>

        {/* Department Filter Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Todos", ...deptos].map((d) => (
            <button key={d} onClick={() => setFilterDepto(d)} style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              border: filterDepto === d ? "2px solid #7c3aed" : "2px solid #e5e7eb",
              backgroundColor: filterDepto === d ? "#7c3aed" : "#fff",
              color: filterDepto === d ? "#fff" : "#475569",
              cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
            }}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {filtered.map((emp) => {
          const gradient = DEPTO_GRADIENTS[emp.depto] || "linear-gradient(135deg, #64748b, #475569)";
          return (
            <div key={emp.clave} style={{
              ...cardBase, overflow: "hidden",
              transition: "transform 0.2s, box-shadow 0.2s", cursor: "default",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}
            >
              {/* Colored Header */}
              <div style={{ height: 56, background: gradient, position: "relative" }}>
                <span style={{
                  position: "absolute", top: 10, right: 12, fontSize: 10, fontFamily: "monospace",
                  fontWeight: 600, color: "rgba(255,255,255,0.85)", backgroundColor: "rgba(255,255,255,0.2)",
                  padding: "3px 10px", borderRadius: 6, backdropFilter: "blur(4px)",
                }}>{emp.clave}</span>
              </div>

              {/* Avatar + Content */}
              <div style={{ padding: "0 20px 20px 20px", position: "relative" }}>
                {/* Avatar overlapping header */}
                <div style={{
                  width: 48, height: 48, backgroundColor: "#fff", borderRadius: 14,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)", border: "3px solid #fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", top: -24, marginBottom: -12,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, background: gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {getInitials(emp.nombre)}
                  </span>
                </div>

                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", margin: "0 0 14px 0", lineHeight: 1.3 }}>
                  {emp.nombre}
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { icon: Briefcase, text: emp.puesto },
                    { icon: Building2, text: emp.depto },
                    { icon: Calendar, text: emp.fec_ingreso },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569" }}>
                      <item.icon size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
          <Search size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>No se encontraron empleados.</p>
        </div>
      )}
    </div>
  );
}