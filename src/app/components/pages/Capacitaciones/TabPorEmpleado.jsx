// src/components/pages/capacitaciones/TabPorEmpleado.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../../../../lib/supabaseClient.js";
import {
  Search, Calendar, Building2, Hash, Briefcase,
  X, Plus, Trash2, AlertCircle, CheckCircle2, Clock,
  Award, User,
} from "lucide-react";

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtDate(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d + "T12:00:00");
    return `${String(dt.getDate()).padStart(2,'0')}-${MESES[dt.getMonth()]}-${String(dt.getFullYear()).slice(2)}`;
  } catch { return d; }
}

export default function TabPorEmpleado() {
  const [empleados, setEmpleados] = useState([]);
  const [allCaps, setAllCaps] = useState([]);
  const [query, setQuery] = useState("");
  const [showDrop, setShowDrop] = useState(false);
  const [empSel, setEmpSel] = useState(null);
  const [caps, setCaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterAno, setFilterAno] = useState("Todos");
  const [filterEstado, setFilterEstado] = useState("Todos"); // Todos | Pendientes | Completadas | Historial
  const inputRef = useRef(null);

  // Modal de agregar capacitación manual
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCapId, setSelectedCapId] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("empleados").select("clave, nombre, puesto, depto, fec_ingreso, puesto_id").eq("activo", true).order("nombre"),
      supabase.from("capacitaciones").select("id, nombre, codigo").order("nombre"),
    ]).then(([empRes, capRes]) => {
      setEmpleados(empRes.data || []);
      setAllCaps(capRes.data || []);
    });
  }, []);

  const empFiltrados = useMemo(() => {
    if (!query.trim()) return empleados.slice(0, 8);
    const q = query.toLowerCase();
    return empleados.filter(e =>
      e.nombre.toLowerCase().includes(q) || e.clave.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [empleados, query]);

  async function seleccionar(emp) {
    setEmpSel(emp);
    setQuery(emp.nombre);
    setShowDrop(false);
    setFilterAno("Todos");
    setFilterEstado("Todos");
    setLoading(true);
    const { data } = await supabase
      .from("calificaciones")
      .select("*")
      .eq("emp_clave", emp.clave)
      .order("fecha_capacitacion", { ascending: false })
      .order("created_at", { ascending: false });
    setCaps(data || []);
    setLoading(false);
  }

  function limpiar() {
    setEmpSel(null); setQuery(""); setCaps([]);
    setFilterAno("Todos"); setFilterEstado("Todos");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  // Recargar caps del empleado seleccionado
  async function refresh() {
    if (!empSel) return;
    const { data } = await supabase
      .from("calificaciones").select("*")
      .eq("emp_clave", empSel.clave)
      .order("fecha_capacitacion", { ascending: false })
      .order("created_at", { ascending: false });
    setCaps(data || []);
  }

  async function handleAddManual() {
    setErrorMsg("");
    if (!selectedCapId) { setErrorMsg("Selecciona una capacitación."); return; }
    const cap = allCaps.find(c => c.id === parseInt(selectedCapId));
    if (!cap) return;

    // Verificar que el empleado no la tenga ya activa
    const yaTiene = caps.some(c => c.capacitacion_id === cap.id && c.activa);
    if (yaTiene) {
      setErrorMsg("Este empleado ya tiene esa capacitación activa.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("calificaciones").insert({
      emp_clave: empSel.clave,
      capacitacion_id: cap.id,
      nombre_capacitacion: cap.nombre,
      codigo_capacitacion: cap.codigo || "",
      completado: false,
      origen: "manual",
      puesto_id_origen: null,
      activa: true,
    });
    if (error) { setErrorMsg("Error: " + error.message); setSaving(false); return; }

    setShowAddModal(false);
    setSelectedCapId("");
    setSaving(false);
    refresh();
  }

  async function handleDelete(cap) {
    if (!confirm(`¿Eliminar "${cap.nombre_capacitacion}" del historial de ${empSel.nombre}?`)) return;
    await supabase.from("calificaciones").delete().eq("id", cap.id);
    refresh();
  }

  // Filtros aplicados
  const capsFiltradas = useMemo(() => {
    return caps.filter(c => {
      if (filterAno !== "Todos" && String(c.ano) !== String(filterAno)) return false;
      if (filterEstado === "Pendientes" && (c.completado || !c.activa)) return false;
      if (filterEstado === "Completadas" && (!c.completado || !c.activa)) return false;
      if (filterEstado === "Historial" && c.activa) return false;
      return true;
    });
  }, [caps, filterAno, filterEstado]);

  const anos = useMemo(() => {
    const set = new Set(caps.map(c => c.ano).filter(Boolean));
    return ["Todos", ...Array.from(set).sort((a,b) => b - a)];
  }, [caps]);

  const stats = useMemo(() => ({
    total: caps.length,
    pendientes: caps.filter(c => !c.completado && c.activa).length,
    completadas: caps.filter(c => c.completado && c.activa).length,
    historial: caps.filter(c => !c.activa).length,
  }), [caps]);

  const cardBase = {
    backgroundColor: "#fff", borderRadius: 16,
    border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Buscador */}
      <div style={{ ...cardBase, padding: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", display: "block", marginBottom: 8 }}>
          Buscar empleado por nombre o clave
        </label>
        <div style={{ position: "relative" }}>
          <Search size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", zIndex: 1 }} />
          <input ref={inputRef} type="text"
            placeholder="Escribe nombre o número de empleado..."
            value={query}
            onChange={e => { setQuery(e.target.value); setShowDrop(true); if (empSel) { setEmpSel(null); setCaps([]); } }}
            onFocus={() => setShowDrop(true)}
            style={{
              width: "100%", paddingLeft: 42, paddingRight: empSel ? 40 : 16,
              paddingTop: 12, paddingBottom: 12,
              backgroundColor: "#f8fafc",
              border: "2px solid " + (empSel ? "#7c3aed" : "#e5e7eb"),
              borderRadius: 12, fontSize: 14, outline: "none", boxSizing: "border-box",
            }} />
          {empSel && (
            <button onClick={limpiar} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", padding: 4 }}>
              <X size={16} color="#94a3b8" />
            </button>
          )}
          {showDrop && !empSel && empFiltrados.length > 0 && (
            <div style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
              backgroundColor: "#fff", borderRadius: 12, border: "1px solid #e5e7eb",
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)", overflow: "hidden", maxHeight: 280, overflowY: "auto",
            }}>
              {empFiltrados.map(e => (
                <div key={e.clave} onMouseDown={() => seleccionar(e)}
                  style={{ padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={el => el.currentTarget.style.backgroundColor = "#faf8ff"}
                  onMouseLeave={el => el.currentTarget.style.backgroundColor = "transparent"}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                    background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 11, fontWeight: 700,
                  }}>
                    {e.nombre.split(" ").slice(0,2).map(w => w[0]).join("")}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>{e.nombre}</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{e.clave} · {e.puesto || "Sin puesto"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ficha empleado + stats */}
      {empSel && (
        <div style={{ ...cardBase, overflow: "hidden" }}>
          <div style={{ height: 6, background: "linear-gradient(90deg,#7c3aed,#ec4899)" }} />
          <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{
              width: 50, height: 50, borderRadius: 14, flexShrink: 0,
              background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: 16, fontWeight: 800,
            }}>
              {empSel.nombre.split(" ").slice(0,2).map(w => w[0]).join("")}
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e1b4b", margin: 0 }}>{empSel.nombre}</h2>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
                {[
                  { icon: Hash, text: empSel.clave },
                  { icon: Briefcase, text: empSel.puesto || "—" },
                  { icon: Building2, text: empSel.depto || "—" },
                  { icon: Calendar, text: `Ingreso: ${empSel.fec_ingreso || "—"}` },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <item.icon size={12} color="#94a3b8" />
                    <span style={{ fontSize: 12, color: "#475569" }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              {[
                { label: "Total", value: stats.total, color: "#7c3aed" },
                { label: "Pendientes", value: stats.pendientes, color: "#f59e0b" },
                { label: "Completadas", value: stats.completadas, color: "#10b981" },
                { label: "Historial", value: stats.historial, color: "#94a3b8" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 10, color: "#94a3b8", margin: "3px 0 0" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros + botón agregar */}
      {empSel && !loading && caps.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["Todos", "Pendientes", "Completadas", "Historial"].map(e => (
              <button key={e} onClick={() => setFilterEstado(e)} style={{
                padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: filterEstado === e ? "2px solid #7c3aed" : "2px solid #e5e7eb",
                backgroundColor: filterEstado === e ? "#7c3aed" : "#fff",
                color: filterEstado === e ? "#fff" : "#475569",
              }}>{e}</button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, backgroundColor: "#e5e7eb" }} />

          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Año:</span>
          {anos.map(a => (
            <button key={a} onClick={() => setFilterAno(a)} style={{
              padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
              border: filterAno === a ? "2px solid #7c3aed" : "2px solid #e5e7eb",
              backgroundColor: filterAno === a ? "#7c3aed" : "#fff",
              color: filterAno === a ? "#fff" : "#475569",
            }}>{a === "Todos" ? "Todos" : a}</button>
          ))}

          <button onClick={() => { setShowAddModal(true); setErrorMsg(""); setSelectedCapId(""); }}
            style={{
              marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", backgroundColor: "#10b981", color: "#fff",
              border: "none", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
              boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
            }}>
            <Plus size={14} />Agregar Capacitación
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 160 }}>
          <div style={{ width: 32, height: 32, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Tabla */}
      {empSel && !loading && capsFiltradas.length > 0 && (
        <div style={{ ...cardBase, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  {["Estado", "Fecha", "Folio", "Capacitación", "Origen", "Calificación", "Responsable", ""].map(h => (
                    <th key={h} style={tableTh}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {capsFiltradas.map(cap => {
                  let estadoBadge;
                  if (!cap.activa) estadoBadge = { txt: "Historial", color: "#94a3b8", bg: "#f1f5f9" };
                  else if (cap.completado) estadoBadge = { txt: "Completada", color: "#10b981", bg: "#ecfdf5" };
                  else estadoBadge = { txt: "Pendiente", color: "#f59e0b", bg: "#fffbeb" };

                  const origenBadge = cap.origen === "puesto"
                    ? { txt: "Puesto", color: "#7c3aed", bg: "#f5f3ff" }
                    : { txt: "Manual", color: "#ec4899", bg: "#fdf2f8" };

                  let calif = "—";
                  if (cap.calificacion_numerica !== null && cap.calificacion_numerica !== undefined) {
                    calif = cap.calificacion_numerica;
                  } else if (cap.cumple !== null && cap.cumple !== undefined) {
                    calif = cap.cumple ? "Cumple" : "No Cumple";
                  } else if (cap.satisfactorio !== null && cap.satisfactorio !== undefined) {
                    calif = cap.satisfactorio ? "Satisfact." : "No Satisf.";
                  }

                  return (
                    <tr key={cap.id} style={{ borderBottom: "1px solid #f1f5f9" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#faf8ff"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                      <td style={tableTd}>
                        <span style={{ ...pillStyle, color: estadoBadge.color, backgroundColor: estadoBadge.bg }}>
                          {estadoBadge.txt}
                        </span>
                      </td>
                      <td style={{ ...tableTd, fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>
                        {fmtDate(cap.fecha_capacitacion)}
                      </td>
                      <td style={{ ...tableTd, fontFamily: "monospace", fontSize: 11, color: "#7c3aed", whiteSpace: "nowrap" }}>
                        {cap.codigo_capacitacion || "—"}
                      </td>
                      <td style={{ ...tableTd, maxWidth: 320 }}>
                        <p style={{ fontSize: 13, color: "#1e1b4b", margin: 0, fontWeight: 500, lineHeight: 1.3 }}>
                          {cap.nombre_capacitacion}
                        </p>
                      </td>
                      <td style={tableTd}>
                        <span style={{ ...pillStyle, color: origenBadge.color, backgroundColor: origenBadge.bg }}>
                          {origenBadge.txt}
                        </span>
                      </td>
                      <td style={{ ...tableTd, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>
                        {calif}
                      </td>
                      <td style={{ ...tableTd, fontSize: 12, color: "#64748b" }}>
                        {cap.responsable_capacitacion || "—"}
                      </td>
                      <td style={tableTd}>
                        <button onClick={() => handleDelete(cap)} style={btnIcon("#ef4444")}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {empSel && !loading && caps.length === 0 && (
        <div style={{ ...cardBase, padding: "48px 0", textAlign: "center", color: "#94a3b8" }}>
          <Award size={44} style={{ margin: "0 auto 12px", opacity: 0.25 }} />
          <p style={{ fontSize: 14, margin: 0 }}>Este empleado no tiene capacitaciones registradas.</p>
          <button onClick={() => { setShowAddModal(true); setErrorMsg(""); setSelectedCapId(""); }}
            style={{
              marginTop: 16, padding: "8px 16px", backgroundColor: "#10b981", color: "#fff",
              border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
            <Plus size={14} style={{ display: "inline", marginRight: 6 }} />Agregar primera capacitación
          </button>
        </div>
      )}

      {!empSel && (
        <div style={{ ...cardBase, padding: "56px 0", textAlign: "center", color: "#94a3b8" }}>
          <User size={44} style={{ margin: "0 auto 14px", opacity: 0.2 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "#475569", margin: "0 0 6px 0" }}>
            Busca un empleado para ver su historial
          </p>
          <p style={{ fontSize: 13, margin: 0 }}>
            Escribe el nombre o número de clave en el buscador
          </p>
        </div>
      )}

      {/* MODAL AGREGAR */}
      {showAddModal && empSel && (
        <ModalShell title="Agregar Capacitación Manual" onClose={() => setShowAddModal(false)}>
          <div style={{ padding: 12, backgroundColor: "#f5f3ff", borderRadius: 10, marginBottom: 14 }}>
            <p style={{ fontSize: 11, color: "#5b21b6", margin: 0 }}>
              Empleado: <b>{empSel.nombre}</b> ({empSel.clave})
            </p>
          </div>

          <Field label="Capacitación a asignar *">
            <select value={selectedCapId} onChange={e => setSelectedCapId(e.target.value)} style={inputStyle}>
              <option value="">Seleccionar capacitación...</option>
              {allCaps.map(c => (
                <option key={c.id} value={c.id}>
                  {c.codigo ? `[${c.codigo}] ` : ""}{c.nombre}
                </option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: "#64748b", marginTop: 8, lineHeight: 1.4 }}>
              Se asignará como <b>pendiente</b>. La fecha, calificación y responsable se llenan al completarla
              desde la pestaña "Pendientes / Activas".
            </p>
          </Field>

          {errorMsg && <ErrorBanner msg={errorMsg} />}

          <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
            <button onClick={() => setShowAddModal(false)} style={btnCancel}>Cancelar</button>
            <button onClick={handleAddManual} disabled={saving} style={btnPrimary}>
              {saving ? "Asignando..." : "Asignar"}
            </button>
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
        backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 500,
        boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
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
      color: "#b91c1c", fontSize: 12, fontWeight: 500, marginTop: 10,
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
const btnPrimary = {
  flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#fff",
  backgroundColor: "#7c3aed", border: "none", borderRadius: 12, cursor: "pointer",
};
const btnCancel = {
  flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#475569",
  border: "2px solid #d1d5db", borderRadius: 12, backgroundColor: "#fff", cursor: "pointer",
};
const btnIcon = (color) => ({
  padding: "6px 10px",
  backgroundColor: color === "#ef4444" ? "#fef2f2" : "#f5f3ff",
  color: color, border: `1px solid ${color}22`,
  borderRadius: 8, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
});