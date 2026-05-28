// src/components/pages/Asignaciones.jsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Search, Plus, X, AlertCircle, CheckCircle2,
  Clock, AlertTriangle, Filter, ChevronDown,
  User, BookOpen, Calendar, CheckSquare, Square,
  ClipboardList, Building2, Trash2,
} from "lucide-react";

// ── Helpers de estatus ──────────────────────────────────────
function calcEstatus(row) {
  if (row.completado) return "completado";
  if (!row.fecha_limite) return "en_curso";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(row.fecha_limite);
  limite.setHours(0, 0, 0, 0);
  if (limite < hoy) return "vencido";
  const diff = (limite - hoy) / 86400000;
  if (diff <= 15) return "proximo";
  return "en_curso";
}

const ESTATUS_CFG = {
  completado: { label: "Completado",      color: "#10b981", bg: "#ecfdf5", icon: CheckCircle2 },
  en_curso:   { label: "En Curso",        color: "#3b82f6", bg: "#eff6ff", icon: Clock },
  proximo:    { label: "Próximo a Vencer",color: "#f59e0b", bg: "#fffbeb", icon: AlertTriangle },
  vencido:    { label: "Vencido",         color: "#ef4444", bg: "#fef2f2", icon: AlertTriangle },
};

function EstatusBadge({ row }) {
  const est = calcEstatus(row);
  const cfg = ESTATUS_CFG[est];
  const Icon = cfg.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
      backgroundColor: cfg.bg, color: cfg.color, whiteSpace: "nowrap",
    }}>
      <Icon size={11} />{cfg.label}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Componente principal ────────────────────────────────────
export default function Asignaciones() {
  const [asignaciones, setAsignaciones] = useState([]);
  const [empleados, setEmpleados]       = useState([]);
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [loading, setLoading]           = useState(true);

  // Filtros lista principal
  const [search, setSearch]             = useState("");
  const [filterEstatus, setFilterEstatus] = useState("todos");
  const [filterDepto, setFilterDepto]   = useState("Todos");

  // Modal asignar
  const [showModal, setShowModal]       = useState(false);
  const [empSearch, setEmpSearch]       = useState("");
  const [empSeleccionado, setEmpSeleccionado] = useState(null);
  const [capSearch, setCapSearch]       = useState("");
  const [capsSeleccionadas, setCapsSeleccionadas] = useState({}); // id -> true
  const [fechaLimite, setFechaLimite]   = useState("");
  const [mesProgramado, setMesProgramado] = useState("");
  const [responsable, setResponsable]   = useState("");
  const [saving, setSaving]             = useState(false);
  const [errorMsg, setErrorMsg]         = useState("");

  // Modal confirmar completado
  const [confirmRow, setConfirmRow]     = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [asigRes, empRes, capRes] = await Promise.all([
      supabase
        .from("matriz_empleado")
        .select("*, empleados(clave, nombre, puesto, depto)")
        .eq("cap_eliminada", false)
        .order("created_at", { ascending: false }),
      supabase.from("empleados").select("clave, nombre, puesto, depto").eq("activo", true).order("nombre"),
      supabase.from("capacitaciones").select("id, nombre, codigo, tipo_capacitacion, cursos(nombre)").order("nombre"),
    ]);
    setAsignaciones(asigRes.data || []);
    setEmpleados(empRes.data || []);
    setCapacitaciones(capRes.data || []);
    setLoading(false);
  }

  // ── Filtrado lista ───────────────────────────────────────
  const deptos = useMemo(() => ["Todos", ...new Set(
    asignaciones.map(a => a.empleados?.depto).filter(Boolean).sort()
  )], [asignaciones]);

  const filtered = useMemo(() => asignaciones.filter(a => {
    const txt = `${a.empleados?.nombre || ""} ${a.empleados?.clave || ""} ${a.nombre_cap_snap || ""}`.toLowerCase();
    const matchSearch = txt.includes(search.toLowerCase());
    const est = calcEstatus(a);
    const matchEstatus = filterEstatus === "todos" || est === filterEstatus;
    const matchDepto = filterDepto === "Todos" || a.empleados?.depto === filterDepto;
    return matchSearch && matchEstatus && matchDepto;
  }), [asignaciones, search, filterEstatus, filterDepto]);

  // ── Estadísticas rápidas ─────────────────────────────────
  const stats = useMemo(() => ({
    total:      asignaciones.length,
    completado: asignaciones.filter(a => calcEstatus(a) === "completado").length,
    en_curso:   asignaciones.filter(a => calcEstatus(a) === "en_curso").length,
    proximo:    asignaciones.filter(a => calcEstatus(a) === "proximo").length,
    vencido:    asignaciones.filter(a => calcEstatus(a) === "vencido").length,
  }), [asignaciones]);

  // ── Modal: empleados filtrados ───────────────────────────
  const empFiltrados = useMemo(() => {
    if (!empSearch.trim()) return empleados.slice(0, 8);
    const q = empSearch.toLowerCase();
    return empleados.filter(e =>
      e.nombre.toLowerCase().includes(q) || e.clave.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [empleados, empSearch]);

  // ── Modal: capacitaciones filtradas ─────────────────────
  const capsFiltradas = useMemo(() => {
    if (!capSearch.trim()) return capacitaciones;
    const q = capSearch.toLowerCase();
    return capacitaciones.filter(c =>
      c.nombre.toLowerCase().includes(q) || (c.codigo || "").toLowerCase().includes(q)
    );
  }, [capacitaciones, capSearch]);

  function openModal() {
    setEmpSearch(""); setEmpSeleccionado(null);
    setCapSearch(""); setCapsSeleccionadas({});
    setFechaLimite(""); setMesProgramado(""); setResponsable("");
    setErrorMsg("");
    setShowModal(true);
  }

  function toggleCap(id) {
    setCapsSeleccionadas(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const capsElegidas = capacitaciones.filter(c => capsSeleccionadas[c.id]);

  async function handleGuardar() {
    setErrorMsg("");
    if (!empSeleccionado) { setErrorMsg("Selecciona un empleado."); return; }
    if (capsElegidas.length === 0) { setErrorMsg("Selecciona al menos una capacitación."); return; }

    setSaving(true);
    const rows = capsElegidas.map(cap => ({
      emp_clave: empSeleccionado.clave,
      capacitacion_id: cap.id,
      nombre_cap_snap: cap.nombre,
      codigo_cap_snap: cap.codigo || "",
      tipo_capacitacion_snap: cap.tipo_capacitacion,
      tipo_aceptacion_snap: cap.tipo_aceptacion || "numerico",
      fecha_asignacion: new Date().toISOString().split("T")[0],
      fecha_limite: fechaLimite || null,
      mes_programado: mesProgramado || "",
      responsable_capacitacion: responsable.trim(),
      completado: false,
      cap_eliminada: false,
      ano: new Date().getFullYear(),
    }));

    const { error } = await supabase.from("matriz_empleado").insert(rows);
    if (error) { setErrorMsg("Error: " + error.message); setSaving(false); return; }

    setShowModal(false);
    setSaving(false);
    fetchAll();
  }

  async function handleCompletar(row) {
    await supabase.from("matriz_empleado")
      .update({ completado: true, fecha_capacitacion: new Date().toISOString().split("T")[0] })
      .eq("id", row.id);
    setConfirmRow(null);
    fetchAll();
  }

  async function handleEliminar(row) {
    if (!confirm(`¿Eliminar la asignación "${row.nombre_cap_snap}"?`)) return;
    await supabase.from("matriz_empleado").update({ cap_eliminada: true }).eq("id", row.id);
    fetchAll();
  }

  const cardBase = { backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Asignaciones</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            {stats.total} asignaciones registradas
          </p>
        </div>
        <button onClick={openModal} style={btnPrimaryHeader}>
          <Plus size={18} /><span>Nueva Asignación</span>
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12 }}>
        {[
          { key: "todos",     label: "Total",           value: stats.total,      color: "#7c3aed", bg: "linear-gradient(135deg,#7c3aed,#5b21b6)" },
          { key: "completado",label: "Completadas",     value: stats.completado, color: "#10b981", bg: "linear-gradient(135deg,#10b981,#059669)" },
          { key: "en_curso",  label: "En Curso",        value: stats.en_curso,   color: "#3b82f6", bg: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
          { key: "proximo",   label: "Próx. a Vencer",  value: stats.proximo,    color: "#f59e0b", bg: "linear-gradient(135deg,#f59e0b,#d97706)" },
          { key: "vencido",   label: "Vencidas",        value: stats.vencido,    color: "#ef4444", bg: "linear-gradient(135deg,#ef4444,#dc2626)" },
        ].map(s => (
          <div key={s.key} onClick={() => setFilterEstatus(s.key)}
            style={{
              borderRadius: 14, padding: "18px 20px", cursor: "pointer",
              background: filterEstatus === s.key ? s.bg : "#fff",
              color: filterEstatus === s.key ? "#fff" : "#1e1b4b",
              border: filterEstatus === s.key ? "none" : "1px solid #e5e7eb",
              boxShadow: filterEstatus === s.key ? `0 6px 20px ${s.color}44` : "0 1px 4px rgba(0,0,0,0.06)",
              transition: "all 0.2s",
            }}>
            <p style={{ fontSize: 11, fontWeight: 600, margin: 0, opacity: 0.75 }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, margin: "4px 0 0 0", lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ ...cardBase, padding: 20 }}>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <Search size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input type="text" placeholder="Buscar por empleado, clave o capacitación..."
            value={search} onChange={e => setSearch(e.target.value)} style={searchInput} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Filter size={14} color="#94a3b8" />
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Departamento:</span>
          <div style={{ position: "relative" }}>
            <select value={filterDepto} onChange={e => setFilterDepto(e.target.value)} style={selectStyle}>
              {deptos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ ...cardBase, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                {["Empleado", "Departamento", "Capacitación", "Fecha Límite", "Estatus", "Acciones"].map(h => (
                  <th key={h} style={tableTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => (
                <tr key={row.id}
                  style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = "#faf8ff"}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                >
                  {/* Empleado */}
                  <td style={tableTd}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                        background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: 11, fontWeight: 700,
                      }}>
                        {(row.empleados?.nombre || "?").split(" ").slice(0,2).map(w => w[0]).join("")}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", margin: 0, whiteSpace: "nowrap" }}>
                          {row.empleados?.nombre || row.emp_clave}
                        </p>
                        <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>
                          {row.emp_clave} · {row.empleados?.puesto || "—"}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Depto */}
                  <td style={{ ...tableTd, fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                    {row.empleados?.depto || "—"}
                  </td>

                  {/* Capacitación */}
                  <td style={{ ...tableTd, maxWidth: 280 }}>
                    <p style={{ fontSize: 13, color: "#1e1b4b", margin: 0, fontWeight: 500 }}>
                      {row.nombre_cap_snap}
                    </p>
                    {row.codigo_cap_snap && (
                      <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0 0", fontFamily: "monospace" }}>
                        {row.codigo_cap_snap}
                      </p>
                    )}
                  </td>

                  {/* Fecha límite */}
                  <td style={{ ...tableTd, fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <Calendar size={12} color="#94a3b8" />
                      {fmtDate(row.fecha_limite)}
                    </div>
                  </td>

                  {/* Estatus */}
                  <td style={tableTd}>
                    <EstatusBadge row={row} />
                  </td>

                  {/* Acciones */}
                  <td style={tableTd}>
                    <div style={{ display: "flex", gap: 6 }}>
                      {!row.completado && (
                        <button onClick={() => setConfirmRow(row)}
                          style={{ ...btnIconSm, backgroundColor: "#ecfdf5", color: "#10b981", border: "1px solid #a7f3d0" }}
                          title="Marcar como completado">
                          <CheckCircle2 size={13} />
                        </button>
                      )}
                      <button onClick={() => handleEliminar(row)}
                        style={{ ...btnIconSm, backgroundColor: "#fef2f2", color: "#ef4444", border: "1px solid #fecaca" }}
                        title="Eliminar asignación">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
            <ClipboardList size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No se encontraron asignaciones.</p>
          </div>
        )}
      </div>

      {/* ====== MODAL NUEVA ASIGNACIÓN ====== */}
      {showModal && (
        <div style={overlayStyle}>
          <div style={{
            backgroundColor: "#fff", borderRadius: 24, width: "100%", maxWidth: 680,
            maxHeight: "92vh", display: "flex", flexDirection: "column",
            boxShadow: "0 32px 64px rgba(0,0,0,0.25)",
          }}>
            {/* Header modal */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
              borderRadius: "24px 24px 0 0",
            }}>
              <div>
                <h3 style={{ fontWeight: 700, color: "#1e1b4b", margin: 0, fontSize: 18 }}>Nueva Asignación</h3>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0 0" }}>
                  {capsElegidas.length > 0 ? `${capsElegidas.length} capacitación(es) seleccionada(s)` : "Selecciona empleado y capacitaciones"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ padding: 6, border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <X size={20} color="#94a3b8" />
              </button>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>

              {/* PASO 1: Buscar empleado */}
              <div>
                <label style={labelStyle}>
                  <User size={14} /> Empleado *
                </label>

                {empSeleccionado ? (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", backgroundColor: "#f5f3ff",
                    border: "2px solid #7c3aed", borderRadius: 12,
                  }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>{empSeleccionado.nombre}</p>
                      <p style={{ fontSize: 12, color: "#7c3aed", margin: "2px 0 0 0" }}>
                        {empSeleccionado.clave} · {empSeleccionado.puesto} · {empSeleccionado.depto}
                      </p>
                    </div>
                    <button onClick={() => { setEmpSeleccionado(null); setEmpSearch(""); }}
                      style={{ padding: 4, border: "none", background: "none", cursor: "pointer" }}>
                      <X size={16} color="#7c3aed" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ position: "relative", marginBottom: 8 }}>
                      <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                      <input type="text" placeholder="Buscar por nombre o clave..."
                        value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: 36 }} autoFocus />
                    </div>
                    {empFiltrados.length > 0 && (
                      <div style={{
                        border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden",
                        maxHeight: 200, overflowY: "auto",
                      }}>
                        {empFiltrados.map(e => (
                          <div key={e.clave} onClick={() => { setEmpSeleccionado(e); setEmpSearch(""); }}
                            style={{
                              padding: "10px 14px", cursor: "pointer",
                              borderBottom: "1px solid #f1f5f9",
                              display: "flex", alignItems: "center", gap: 10,
                              transition: "background 0.1s",
                            }}
                            onMouseEnter={el => el.currentTarget.style.backgroundColor = "#faf8ff"}
                            onMouseLeave={el => el.currentTarget.style.backgroundColor = "transparent"}
                          >
                            <div style={{
                              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                              background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              color: "#fff", fontSize: 10, fontWeight: 700,
                            }}>
                              {e.nombre.split(" ").slice(0,2).map(w => w[0]).join("")}
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>{e.nombre}</p>
                              <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{e.clave} · {e.puesto}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PASO 2: Capacitaciones */}
              <div>
                <label style={labelStyle}>
                  <BookOpen size={14} /> Capacitaciones *
                  {capsElegidas.length > 0 && (
                    <span style={{
                      marginLeft: 8, fontSize: 11, fontWeight: 700,
                      backgroundColor: "#7c3aed", color: "#fff",
                      padding: "2px 8px", borderRadius: 999,
                    }}>{capsElegidas.length} seleccionadas</span>
                  )}
                </label>

                <div style={{ position: "relative", marginBottom: 8 }}>
                  <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input type="text" placeholder="Filtrar capacitaciones..."
                    value={capSearch} onChange={e => setCapSearch(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 36 }} />
                </div>

                <div style={{
                  border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden",
                  maxHeight: 240, overflowY: "auto",
                }}>
                  {capsFiltradas.map(c => {
                    const sel = !!capsSeleccionadas[c.id];
                    return (
                      <div key={c.id} onClick={() => toggleCap(c.id)}
                        style={{
                          padding: "10px 14px", cursor: "pointer",
                          borderBottom: "1px solid #f1f5f9",
                          display: "flex", alignItems: "center", gap: 10,
                          backgroundColor: sel ? "#f5f3ff" : "transparent",
                          transition: "background 0.1s",
                        }}>
                        <div style={{ flexShrink: 0, color: sel ? "#7c3aed" : "#cbd5e1" }}>
                          {sel ? <CheckSquare size={17} /> : <Square size={17} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: sel ? 600 : 400, color: sel ? "#1e1b4b" : "#475569", margin: 0 }}>
                            {c.nombre}
                          </p>
                          {c.codigo && (
                            <p style={{ fontSize: 11, color: "#94a3b8", margin: "1px 0 0 0", fontFamily: "monospace" }}>
                              {c.codigo}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {capsFiltradas.length === 0 && (
                    <p style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: 13 }}>
                      No se encontraron capacitaciones.
                    </p>
                  )}
                </div>
              </div>

              {/* PASO 3: Detalles */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}><Calendar size={14} /> Fecha Límite</label>
                  <input type="date" value={fechaLimite} onChange={e => setFechaLimite(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Mes Programado</label>
                  <input type="month" value={mesProgramado} onChange={e => setMesProgramado(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Responsable de Capacitación</label>
                <input type="text" placeholder="Nombre del capacitador o responsable"
                  value={responsable} onChange={e => setResponsable(e.target.value)} style={inputStyle} />
              </div>

              {errorMsg && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 14px", backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca", borderRadius: 10,
                  color: "#b91c1c", fontSize: 12, fontWeight: 500,
                }}>
                  <AlertCircle size={14} />{errorMsg}
                </div>
              )}
            </div>

            {/* Footer modal */}
            <div style={{
              padding: "16px 24px", borderTop: "1px solid #e5e7eb",
              display: "flex", gap: 12,
              borderRadius: "0 0 24px 24px",
            }}>
              <button onClick={() => setShowModal(false)} style={btnCancel}>Cancelar</button>
              <button onClick={handleGuardar} disabled={saving} style={btnPrimary}>
                {saving ? "Guardando..." : `Asignar${capsElegidas.length > 1 ? ` (${capsElegidas.length})` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL CONFIRMAR COMPLETADO ====== */}
      {confirmRow && (
        <div style={overlayStyle}>
          <div style={{
            backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 400,
            padding: 28, boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", backgroundColor: "#ecfdf5",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
              }}>
                <CheckCircle2 size={28} color="#10b981" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1e1b4b", margin: "0 0 6px 0" }}>
                ¿Marcar como Completada?
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                <strong>{confirmRow.empleados?.nombre || confirmRow.emp_clave}</strong>
              </p>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0 0" }}>
                {confirmRow.nombre_cap_snap}
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmRow(null)} style={btnCancel}>Cancelar</button>
              <button onClick={() => handleCompletar(confirmRow)}
                style={{ ...btnPrimary, backgroundColor: "#10b981", boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Estilos ─────────────────────────────────────────────── */

const overlayStyle = {
  position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
  backdropFilter: "blur(4px)", zIndex: 50,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};

const labelStyle = {
  display: "flex", alignItems: "center", gap: 5,
  fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6,
};

const inputStyle = {
  width: "100%", padding: "10px 12px",
  backgroundColor: "#f8fafc", border: "2px solid #e5e7eb",
  borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box",
};

const searchInput = {
  width: "100%", paddingLeft: 42, paddingRight: 16, paddingTop: 11, paddingBottom: 11,
  backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12,
  fontSize: 14, outline: "none", boxSizing: "border-box",
};

const selectStyle = {
  fontSize: 13, backgroundColor: "#f8fafc", border: "2px solid #e5e7eb",
  borderRadius: 10, padding: "8px 32px 8px 12px", outline: "none", cursor: "pointer",
  fontWeight: 500, color: "#475569", appearance: "none",
};

const tableTh = {
  padding: "13px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
  borderBottom: "2px solid #e5e7eb", whiteSpace: "nowrap",
};

const tableTd = { padding: "12px 16px", fontSize: 13, color: "#475569", verticalAlign: "middle" };

const btnIconSm = {
  padding: "6px 8px", borderRadius: 8, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
};

const btnPrimaryHeader = {
  display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
  backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: 12,
  fontSize: 14, fontWeight: 500, cursor: "pointer",
  boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
};

const btnPrimary = {
  flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#fff",
  backgroundColor: "#7c3aed", border: "none", borderRadius: 12,
  cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
};

const btnCancel = {
  flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#475569",
  border: "2px solid #d1d5db", borderRadius: 12, backgroundColor: "#fff",
  cursor: "pointer",
};



