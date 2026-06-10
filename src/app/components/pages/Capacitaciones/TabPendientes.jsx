// src/components/pages/capacitaciones/TabPendientes.jsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../../lib/supabaseClient.js";
import {
  Search, ClipboardList, CheckCircle2, X,
  AlertCircle, Filter, ChevronDown, ChevronRight,
} from "lucide-react";

export default function TabPendientes() {
  const [pendientes, setPendientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepto, setFilterDepto] = useState("Todos");
  const [filterOrigen, setFilterOrigen] = useState("Todos");
  const [expanded, setExpanded] = useState({}); // {clave: bool}

  // Modal de completar
  const [showModal, setShowModal] = useState(false);
  const [capActual, setCapActual] = useState(null);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split("T")[0],
    calificacion: "",
    tipoCalif: "numerica", // numerica | cumple | satisfactorio
    cumple: true,
    satisfactorio: true,
    responsable: "",
    observaciones: "",
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [pendRes, empRes] = await Promise.all([
      supabase.from("calificaciones")
        .select("*")
        .eq("completado", false)
        .eq("activa", true)
        .order("created_at", { ascending: false }),
      supabase.from("empleados")
        .select("clave, nombre, puesto, depto")
        .eq("activo", true),
    ]);
    setPendientes(pendRes.data || []);
    setEmpleados(empRes.data || []);
    setLoading(false);
  }

  // Agrupar pendientes por empleado
  const empMap = useMemo(() => {
    const m = {};
    empleados.forEach(e => { m[e.clave] = e; });
    return m;
  }, [empleados]);

  const grouped = useMemo(() => {
    const g = {};
    pendientes.forEach(p => {
      if (filterOrigen !== "Todos" && p.origen !== filterOrigen.toLowerCase()) return;
      if (!g[p.emp_clave]) g[p.emp_clave] = [];
      g[p.emp_clave].push(p);
    });
    return g;
  }, [pendientes, filterOrigen]);

  // Empleados con pendientes, aplicando búsqueda y filtro de depto
  const empleadosConPendientes = useMemo(() => {
    return Object.keys(grouped)
      .map(clave => ({ ...empMap[clave], clave, pendientes: grouped[clave] }))
      .filter(e => {
        if (!e.nombre) return false; // empleado no encontrado en map (probable inactivo)
        const matchSearch = !searchTerm.trim() ||
          e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.clave.toLowerCase().includes(searchTerm.toLowerCase());
        const matchDepto = filterDepto === "Todos" || e.depto === filterDepto;
        return matchSearch && matchDepto;
      })
      .sort((a, b) => b.pendientes.length - a.pendientes.length);
  }, [grouped, empMap, searchTerm, filterDepto]);

  const deptos = useMemo(() => {
    const set = new Set(empleados.map(e => e.depto).filter(Boolean));
    return ["Todos", ...Array.from(set).sort()];
  }, [empleados]);

  function openComplete(cap) {
    setCapActual(cap);
    setForm({
      fecha: new Date().toISOString().split("T")[0],
      calificacion: "",
      tipoCalif: "numerica",
      cumple: true,
      satisfactorio: true,
      responsable: "",
      observaciones: "",
    });
    setErrorMsg("");
    setShowModal(true);
  }

  async function handleComplete() {
    setErrorMsg("");
    if (!form.fecha) { setErrorMsg("La fecha es obligatoria."); return; }

    const payload = {
      completado: true,
      fecha_capacitacion: form.fecha,
      responsable_capacitacion: form.responsable.trim(),
      observaciones: form.observaciones.trim(),
      ano: parseInt(form.fecha.slice(0, 4)),
      updated_at: new Date().toISOString(),
    };

    if (form.tipoCalif === "numerica") {
      const n = parseFloat(form.calificacion);
      if (isNaN(n) || n < 0 || n > 10) {
        setErrorMsg("Calificación numérica debe ser entre 0 y 10.");
        return;
      }
      payload.calificacion_numerica = n;
    } else if (form.tipoCalif === "cumple") {
      payload.cumple = form.cumple;
    } else if (form.tipoCalif === "satisfactorio") {
      payload.satisfactorio = form.satisfactorio;
    }

    setSaving(true);
    const { error } = await supabase
      .from("calificaciones").update(payload).eq("id", capActual.id);

    if (error) { setErrorMsg("Error: " + error.message); setSaving(false); return; }

    setShowModal(false);
    setSaving(false);
    fetchData();
  }

  function toggleExpand(clave) {
    setExpanded(prev => ({ ...prev, [clave]: !prev[clave] }));
  }

  const cardBase = {
    backgroundColor: "#fff", borderRadius: 16,
    border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        <div style={{ width: 36, height: 36, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const totalPendientes = pendientes.length;
  const totalEmpleados = empleadosConPendientes.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        <div style={{
          borderRadius: 14, padding: "20px 24px",
          background: "linear-gradient(135deg, #f59e0b, #d97706)",
          color: "#fff", boxShadow: "0 6px 20px rgba(245,158,11,0.3)",
        }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.85)", margin: 0 }}>
            Capacitaciones Pendientes
          </p>
          <p style={{ fontSize: 32, fontWeight: 800, margin: "6px 0 0 0", lineHeight: 1 }}>
            {totalPendientes}
          </p>
        </div>
        <div style={{
          borderRadius: 14, padding: "20px 24px",
          background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
          color: "#fff", boxShadow: "0 6px 20px rgba(124,58,237,0.3)",
        }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.85)", margin: 0 }}>
            Empleados con Pendientes
          </p>
          <p style={{ fontSize: 32, fontWeight: 800, margin: "6px 0 0 0", lineHeight: 1 }}>
            {totalEmpleados}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ ...cardBase, padding: 20 }}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input type="text" placeholder="Buscar empleado por nombre o clave..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%", paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
              backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12,
              fontSize: 14, outline: "none", boxSizing: "border-box",
            }} />
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={14} color="#94a3b8" />
            <select value={filterDepto} onChange={e => setFilterDepto(e.target.value)} style={selectFilter}>
              {deptos.map(d => <option key={d} value={d}>{d === "Todos" ? "Todos los deptos" : d}</option>)}
            </select>
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: "#e5e7eb" }} />

          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Origen:</span>
          {["Todos", "Puesto", "Manual"].map(o => (
            <button key={o} onClick={() => setFilterOrigen(o)} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
              border: filterOrigen === o ? "2px solid #7c3aed" : "2px solid #e5e7eb",
              backgroundColor: filterOrigen === o ? "#7c3aed" : "#fff",
              color: filterOrigen === o ? "#fff" : "#475569",
            }}>{o}</button>
          ))}
        </div>
      </div>

      {/* Lista de empleados expandibles */}
      {empleadosConPendientes.length === 0 ? (
        <div style={{ ...cardBase, padding: "48px 0", textAlign: "center", color: "#94a3b8" }}>
          <ClipboardList size={44} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14, margin: 0 }}>
            {totalPendientes === 0
              ? "🎉 No hay capacitaciones pendientes"
              : "Ningún empleado coincide con los filtros."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {empleadosConPendientes.map(emp => {
            const isOpen = expanded[emp.clave];
            return (
              <div key={emp.clave} style={{ ...cardBase, overflow: "hidden" }}>
                {/* Header del empleado */}
                <div onClick={() => toggleExpand(emp.clave)} style={{
                  padding: "14px 18px", display: "flex", alignItems: "center", gap: 12,
                  cursor: "pointer", backgroundColor: isOpen ? "#faf8ff" : "#fff",
                  transition: "background 0.15s",
                }}>
                  {isOpen ? <ChevronDown size={18} color="#7c3aed" /> : <ChevronRight size={18} color="#94a3b8" />}

                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>
                    {emp.nombre.split(" ").slice(0,2).map(w => w[0]).join("")}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>
                      {emp.nombre}
                    </p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0 0" }}>
                      {emp.clave} · {emp.puesto || "Sin puesto"} · {emp.depto || "—"}
                    </p>
                  </div>

                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
                    backgroundColor: "#fef3c7", color: "#92400e",
                  }}>
                    {emp.pendientes.length} pendiente{emp.pendientes.length > 1 ? "s" : ""}
                  </span>
                </div>

                {/* Lista expandida */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid #f1f5f9" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f8fafc" }}>
                          {["Folio", "Capacitación", "Origen", "Asignada", ""].map(h => (
                            <th key={h} style={tableTh}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {emp.pendientes.map(cap => {
                          const origenBadge = cap.origen === "puesto"
                            ? { txt: "Puesto", color: "#7c3aed", bg: "#f5f3ff" }
                            : { txt: "Manual", color: "#ec4899", bg: "#fdf2f8" };
                          return (
                            <tr key={cap.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ ...tableTd, fontFamily: "monospace", fontSize: 11, color: "#7c3aed" }}>
                                {cap.codigo_capacitacion || "—"}
                              </td>
                              <td style={{ ...tableTd, fontSize: 13, color: "#1e1b4b", fontWeight: 500, maxWidth: 380 }}>
                                {cap.nombre_capacitacion}
                              </td>
                              <td style={tableTd}>
                                <span style={{ ...pillStyle, color: origenBadge.color, backgroundColor: origenBadge.bg }}>
                                  {origenBadge.txt}
                                </span>
                              </td>
                              <td style={{ ...tableTd, fontSize: 11, color: "#94a3b8" }}>
                                {cap.created_at ? new Date(cap.created_at).toLocaleDateString() : "—"}
                              </td>
                              <td style={tableTd}>
                                <button onClick={() => openComplete(cap)} style={{
                                  display: "flex", alignItems: "center", gap: 4,
                                  padding: "6px 10px", backgroundColor: "#10b981", color: "#fff",
                                  border: "none", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                                }}>
                                  <CheckCircle2 size={12} />Completar
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL COMPLETAR */}
      {showModal && capActual && (
        <ModalShell title="Marcar como Completada" onClose={() => setShowModal(false)}>
          <div style={{ padding: 12, backgroundColor: "#f5f3ff", borderRadius: 10, marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "#5b21b6", margin: 0 }}>
              Empleado: <b>{empMap[capActual.emp_clave]?.nombre || capActual.emp_clave}</b>
            </p>
            <p style={{ fontSize: 13, color: "#1e1b4b", margin: "6px 0 0 0", fontWeight: 600 }}>
              {capActual.nombre_capacitacion}
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Field label="Fecha de la capacitación *">
              <input type="date" value={form.fecha}
                onChange={e => setForm({ ...form, fecha: e.target.value })}
                style={inputStyle} />
            </Field>

            <Field label="Tipo de calificación">
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  { k: "numerica", l: "Numérica" },
                  { k: "cumple", l: "Cumple/No" },
                  { k: "satisfactorio", l: "Satisfact./No" },
                ].map(t => (
                  <button key={t.k} onClick={() => setForm({ ...form, tipoCalif: t.k })} style={{
                    flex: 1, padding: "8px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                    border: form.tipoCalif === t.k ? "2px solid #7c3aed" : "2px solid #e5e7eb",
                    backgroundColor: form.tipoCalif === t.k ? "#7c3aed" : "#fff",
                    color: form.tipoCalif === t.k ? "#fff" : "#475569",
                  }}>{t.l}</button>
                ))}
              </div>
            </Field>

            {form.tipoCalif === "numerica" && (
              <Field label="Calificación (0 - 10) *">
                <input type="number" min="0" max="10" step="0.1" value={form.calificacion}
                  onChange={e => setForm({ ...form, calificacion: e.target.value })}
                  placeholder="Ej: 9.5" style={inputStyle} />
              </Field>
            )}

            {form.tipoCalif === "cumple" && (
              <Field label="Resultado *">
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setForm({ ...form, cumple: true })} style={{
                    flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: form.cumple ? "2px solid #10b981" : "2px solid #e5e7eb",
                    backgroundColor: form.cumple ? "#10b981" : "#fff",
                    color: form.cumple ? "#fff" : "#475569",
                  }}>✓ Cumple</button>
                  <button onClick={() => setForm({ ...form, cumple: false })} style={{
                    flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: !form.cumple ? "2px solid #ef4444" : "2px solid #e5e7eb",
                    backgroundColor: !form.cumple ? "#ef4444" : "#fff",
                    color: !form.cumple ? "#fff" : "#475569",
                  }}>✗ No Cumple</button>
                </div>
              </Field>
            )}

            {form.tipoCalif === "satisfactorio" && (
              <Field label="Resultado *">
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setForm({ ...form, satisfactorio: true })} style={{
                    flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: form.satisfactorio ? "2px solid #10b981" : "2px solid #e5e7eb",
                    backgroundColor: form.satisfactorio ? "#10b981" : "#fff",
                    color: form.satisfactorio ? "#fff" : "#475569",
                  }}>✓ Satisfactorio</button>
                  <button onClick={() => setForm({ ...form, satisfactorio: false })} style={{
                    flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: !form.satisfactorio ? "2px solid #ef4444" : "2px solid #e5e7eb",
                    backgroundColor: !form.satisfactorio ? "#ef4444" : "#fff",
                    color: !form.satisfactorio ? "#fff" : "#475569",
                  }}>✗ No Satisfactorio</button>
                </div>
              </Field>
            )}

            <Field label="Responsable / Capacitador">
              <input type="text" value={form.responsable}
                onChange={e => setForm({ ...form, responsable: e.target.value })}
                placeholder="Nombre del capacitador" style={inputStyle} />
            </Field>

            <Field label="Observaciones (opcional)">
              <textarea value={form.observaciones}
                onChange={e => setForm({ ...form, observaciones: e.target.value })}
                rows={2}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
            </Field>

            {errorMsg && <ErrorBanner msg={errorMsg} />}

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button onClick={() => setShowModal(false)} style={btnCancel}>Cancelar</button>
              <button onClick={handleComplete} disabled={saving} style={{ ...btnPrimary, backgroundColor: "#10b981" }}>
                {saving ? "Guardando..." : "Marcar Completada"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

/* ===== Helpers ===== */
function ModalShell({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 520,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
          position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1,
        }}>
          <h3 style={{ fontWeight: 700, color: "#1e1b4b", margin: 0, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ padding: 6, border: "none", background: "none", cursor: "pointer" }}>
            <X size={20} color="#94a3b8" />
          </button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
function ErrorBanner({ msg }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
      backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
      color: "#b91c1c", fontSize: 12, fontWeight: 500,
    }}>
      <AlertCircle size={14} />{msg}
    </div>
  );
}

const tableTh = {
  padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
  borderBottom: "2px solid #e5e7eb", whiteSpace: "nowrap",
};
const tableTd = { padding: "11px 14px", fontSize: 13, color: "#475569", verticalAlign: "middle" };
const pillStyle = {
  display: "inline-block", fontSize: 10, fontWeight: 700,
  padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap",
};
const inputStyle = {
  width: "100%", padding: "10px 12px", backgroundColor: "#f8fafc",
  border: "2px solid #e5e7eb", borderRadius: 10,
  fontSize: 13, outline: "none", boxSizing: "border-box",
};
const selectFilter = {
  fontSize: 13, backgroundColor: "#f8fafc", border: "2px solid #e5e7eb",
  borderRadius: 10, padding: "8px 14px", outline: "none", cursor: "pointer",
  fontWeight: 500, color: "#475569",
};
const btnPrimary = {
  flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#fff",
  backgroundColor: "#7c3aed", border: "none", borderRadius: 12, cursor: "pointer",
};
const btnCancel = {
  flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#475569",
  border: "2px solid #d1d5db", borderRadius: 12, backgroundColor: "#fff", cursor: "pointer", 
};
