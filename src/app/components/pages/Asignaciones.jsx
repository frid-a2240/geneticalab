//asignaciones.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { Search, Plus, CheckCircle, Clock, X, UserPlus, Filter } from "lucide-react";

export default function Asignaciones() {
  const [asignaciones, setAsignaciones] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepto, setFilterDepto] = useState("Todos");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [deptos, setDeptos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newEmpClave, setNewEmpClave] = useState("");
  const [newCursoId, setNewCursoId] = useState("");
  const [newCapId, setNewCapId] = useState("");
  const [newMes, setNewMes] = useState("");
  const [capsDelCurso, setCapsDelCurso] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [empRes, curRes, capRes, asigRes] = await Promise.all([
      supabase.from("empleados").select("*").order("nombre"),
      supabase.from("cursos").select("*").order("id"),
      supabase.from("capacitaciones").select("*").order("id"),
      supabase.from("asignaciones_cap").select("*").eq("cap_eliminada", false).order("emp_clave"),
    ]);
    setEmpleados(empRes.data || []);
    setCursos(curRes.data || []);
    setCapacitaciones(capRes.data || []);
    setAsignaciones(asigRes.data || []);
    setDeptos([...new Set((empRes.data || []).map((e) => e.depto).filter(Boolean))]);
    setLoading(false);
  }

  useEffect(() => {
    if (newCursoId) {
      setCapsDelCurso(capacitaciones.filter((c) => c.curso_id === parseInt(newCursoId)));
      setNewCapId("");
    } else { setCapsDelCurso([]); }
  }, [newCursoId, capacitaciones]);

  async function handleAsignar() {
    if (!newEmpClave || !newCapId) return;
    setSaving(true);
    const cap = capacitaciones.find((c) => c.id === parseInt(newCapId));
    const { error } = await supabase.from("asignaciones_cap").upsert({
      emp_clave: newEmpClave, cap_id: parseInt(newCapId), mes: newMes,
      completado: false, cap_eliminada: false, nombre_cap_snap: cap?.nombre || "",
    });
    if (!error) { setShowModal(false); setNewEmpClave(""); setNewCursoId(""); setNewCapId(""); setNewMes(""); fetchData(); }
    setSaving(false);
  }

  const empMap = {}; empleados.forEach((e) => (empMap[e.clave] = e));
  const capMap = {}; capacitaciones.forEach((c) => (capMap[c.id] = c));
  const cursoMap = {}; cursos.forEach((c) => (cursoMap[c.id] = c));

  const filteredAsig = asignaciones.filter((a) => {
    const emp = empMap[a.emp_clave];
    const cap = capMap[a.cap_id];
    const grupo = cap ? cursoMap[cap.curso_id] : null;
    const searchStr = `${emp?.nombre || ""} ${a.nombre_cap_snap || cap?.nombre || ""} ${grupo?.nombre || ""}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase())
      && (filterDepto === "Todos" || emp?.depto === filterDepto)
      && (filterEstado === "Todos" || (filterEstado === "Completado" ? a.completado : !a.completado));
  });

  const cardBase = { backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        <div style={{ width: 36, height: 36, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Stats rápidos
  const totalCompletadas = asignaciones.filter((a) => a.completado).length;
  const totalPendientes = asignaciones.length - totalCompletadas;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Asignaciones</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>{asignaciones.length} capacitaciones asignadas</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
          backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: 12,
          fontSize: 14, fontWeight: 500, cursor: "pointer", boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
        }}>
          <UserPlus size={18} /><span>Nueva Asignación</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "Total Asignaciones", value: asignaciones.length, bg: "linear-gradient(135deg, #7c3aed, #5b21b6)", shadow: "0 6px 20px rgba(124,58,237,0.3)" },
          { label: "Completadas", value: totalCompletadas, bg: "linear-gradient(135deg, #10b981, #059669)", shadow: "0 6px 20px rgba(16,185,129,0.3)" },
          { label: "Pendientes", value: totalPendientes, bg: "linear-gradient(135deg, #f59e0b, #d97706)", shadow: "0 6px 20px rgba(245,158,11,0.3)" },
        ].map((s, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "20px 24px", background: s.bg, color: "#fff", boxShadow: s.shadow }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.75)", margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, margin: "4px 0 0 0" }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...cardBase, padding: 20 }}>
        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input type="text" placeholder="Buscar por empleado, capacitación o grupo..."
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

        {/* Filter Row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {/* Departamento */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={15} color="#94a3b8" />
            <select value={filterDepto} onChange={(e) => setFilterDepto(e.target.value)}
              style={{
                fontSize: 13, backgroundColor: "#f8fafc", border: "2px solid #e5e7eb",
                borderRadius: 10, padding: "8px 14px", outline: "none", cursor: "pointer",
                fontWeight: 500, color: "#475569",
              }}
              onFocus={(e) => e.target.style.borderColor = "#7c3aed"}
              onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
            >
              <option value="Todos">Todos los departamentos</option>
              {deptos.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 28, backgroundColor: "#e5e7eb" }} />

          {/* Estado pills */}
          <div style={{ display: "flex", gap: 8 }}>
            {["Todos", "Completado", "Pendiente"].map((est) => (
              <button key={est} onClick={() => setFilterEstado(est)} style={{
                padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                border: filterEstado === est ? "2px solid #7c3aed" : "2px solid #e5e7eb",
                backgroundColor: filterEstado === est ? "#7c3aed" : "#fff",
                color: filterEstado === est ? "#fff" : "#475569",
                cursor: "pointer", transition: "all 0.2s",
              }}>
                {est}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...cardBase, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                {["Empleado", "Departamento", "Grupo", "Capacitación", "Mes", "Estado"].map((h) => (
                  <th key={h} style={{
                    padding: "14px 20px",
                    textAlign: h === "Estado" ? "center" : "left",
                    fontSize: 11, fontWeight: 700, color: "#64748b",
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    borderBottom: "2px solid #e5e7eb",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAsig.map((a) => {
                const emp = empMap[a.emp_clave];
                const cap = capMap[a.cap_id];
                const grupo = cap ? cursoMap[cap.curso_id] : null;
                return (
                  <tr key={`${a.emp_clave}-${a.cap_id}`}
                    style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#faf8ff"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 34, height: 34, backgroundColor: "#f5f3ff", borderRadius: 10,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, color: "#7c3aed", flexShrink: 0,
                        }}>
                          {emp?.nombre?.split(" ").slice(0, 2).map((w) => w[0]).join("") || "?"}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", margin: 0, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {emp?.nombre || a.emp_clave}
                          </p>
                          <p style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace", margin: "3px 0 0 0" }}>{a.emp_clave}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#475569" }}>{emp?.depto || "—"}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600, color: "#334155",
                        backgroundColor: "#f1f5f9", padding: "4px 12px", borderRadius: 8,
                        border: "1px solid #e5e7eb",
                      }}>{grupo?.nombre || "—"}</span>
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#334155", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {a.nombre_cap_snap || cap?.nombre || "—"}
                    </td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#64748b" }}>{a.mes || "—"}</td>
                    <td style={{ padding: "14px 20px", textAlign: "center" }}>
                      {a.completado ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 12, fontWeight: 600, color: "#047857",
                          backgroundColor: "#ecfdf5", padding: "6px 14px", borderRadius: 999,
                          border: "1px solid #a7f3d0",
                        }}>
                          <CheckCircle size={13} />Completado
                        </span>
                      ) : (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 12, fontWeight: 600, color: "#92400e",
                          backgroundColor: "#fffbeb", padding: "6px 14px", borderRadius: 999,
                          border: "1px solid #fde68a",
                        }}>
                          <Clock size={13} />Pendiente
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredAsig.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
            <Search size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No se encontraron asignaciones con ese criterio.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 440,
            boxShadow: "0 24px 48px rgba(0,0,0,0.2)", animation: "scaleIn 0.2s ease-out",
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
            }}>
              <div>
                <h3 style={{ fontWeight: 700, color: "#1e1b4b", margin: 0, fontSize: 18 }}>Nueva Asignación</h3>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0 0" }}>Asigna una capacitación a un empleado</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{
                padding: 6, border: "none", background: "none", cursor: "pointer",
                borderRadius: 8, transition: "background 0.2s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f1f5f9"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <X size={20} color="#94a3b8" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
              {[
                { label: "Empleado", value: newEmpClave, onChange: setNewEmpClave, options: [{ v: "", l: "Seleccionar empleado..." }, ...empleados.map((e) => ({ v: e.clave, l: `${e.nombre} — ${e.depto}` }))] },
                { label: "Grupo de Curso", value: newCursoId, onChange: setNewCursoId, options: [{ v: "", l: "Seleccionar grupo..." }, ...cursos.map((c) => ({ v: c.id, l: c.nombre }))] },
                { label: "Capacitación", value: newCapId, onChange: setNewCapId, disabled: !newCursoId, options: [{ v: "", l: newCursoId ? "Seleccionar capacitación..." : "Primero selecciona un grupo" }, ...capsDelCurso.map((c) => ({ v: c.id, l: `${c.nombre} (${c.codigo})` }))] },
                { label: "Mes", value: newMes, onChange: setNewMes, options: [{ v: "", l: "Seleccionar mes..." }, ...["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"].map((m) => ({ v: m, l: m }))] },
              ].map((field) => (
                <div key={field.label}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>{field.label}</label>
                  <select value={field.value} onChange={(e) => field.onChange(e.target.value)} disabled={field.disabled}
                    style={{
                      width: "100%", backgroundColor: "#f8fafc",
                      border: "2px solid #e5e7eb", borderRadius: 12,
                      padding: "12px 14px", fontSize: 13, outline: "none",
                      opacity: field.disabled ? 0.5 : 1, cursor: field.disabled ? "not-allowed" : "pointer",
                      boxSizing: "border-box",
                    }}
                    onFocus={(e) => { if (!field.disabled) e.target.style.borderColor = "#7c3aed"; }}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  >
                    {field.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: "flex", gap: 12, padding: "18px 24px",
              borderTop: "1px solid #e5e7eb", backgroundColor: "#f8fafc",
              borderRadius: "0 0 20px 20px",
            }}>
              <button onClick={() => setShowModal(false)} style={{
                flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#475569",
                border: "2px solid #d1d5db", borderRadius: 12, backgroundColor: "#fff",
                cursor: "pointer", transition: "all 0.2s",
              }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#94a3b8"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#d1d5db"}
              >
                Cancelar
              </button>
              <button onClick={handleAsignar} disabled={!newEmpClave || !newCapId || saving} style={{
                flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#fff",
                backgroundColor: "#7c3aed", border: "none", borderRadius: 12, cursor: "pointer",
                opacity: (!newEmpClave || !newCapId || saving) ? 0.5 : 1,
                boxShadow: "0 4px 14px rgba(124,58,237,0.3)", transition: "all 0.2s",
              }}
                onMouseEnter={(e) => { if (!saving) e.currentTarget.style.backgroundColor = "#6d28d9"; }}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#7c3aed"}
              >
                {saving ? "Guardando..." : "Asignar Capacitación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}