// src/components/pages/Calificaciones.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Search, Award, Calendar, Building2, Hash,
  BookOpen, CheckCircle2, Clock, TrendingUp,
  ChevronDown, X, AlertCircle, User, Briefcase,
} from "lucide-react";

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtDate(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d + "T12:00:00");
    return `${String(dt.getDate()).padStart(2,'0')}-${MESES[dt.getMonth()]}-${String(dt.getFullYear()).slice(2)}`;
  } catch { return d; }
}

function califColor(c) {
  if (c === null || c === undefined || c === "") return { color:"#94a3b8", bg:"#f8fafc", label:"—" };
  const s = String(c).toLowerCase();
  if (s.includes("cumple") || s.includes("satisf")) return { color:"#10b981", bg:"#ecfdf5", label: String(c) };
  const n = parseFloat(c);
  if (isNaN(n)) return { color:"#64748b", bg:"#f8fafc", label: String(c) };
  if (n >= 9)  return { color:"#10b981", bg:"#ecfdf5", label: n % 1 === 0 ? String(n) : n.toFixed(1) };
  if (n >= 8)  return { color:"#3b82f6", bg:"#eff6ff", label: n.toFixed(1) };
  if (n >= 7)  return { color:"#f59e0b", bg:"#fffbeb", label: n.toFixed(1) };
  return         { color:"#ef4444", bg:"#fef2f2", label: n.toFixed(1) };
}

export default function Calificaciones() {
  const [empleados, setEmpleados] = useState([]);
  const [query, setQuery]         = useState("");
  const [showDrop, setShowDrop]   = useState(false);
  const [empSel, setEmpSel]       = useState(null);
  const [caps, setCaps]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [filterAno, setFilterAno] = useState("Todos");
  const inputRef = useRef(null);
  const [editando, setEditando]   = useState(null);
  const [editCalif, setEditCalif] = useState("");
  const [editCapac, setEditCapac] = useState("");
  const [editFecha, setEditFecha] = useState("");
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    supabase.from("empleados")
      .select("clave, nombre, puesto, depto, fec_ingreso, jefe_directo")
      .eq("activo", true).order("nombre")
      .then(({ data }) => setEmpleados(data || []));
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
    setEditando(null);
    setLoading(true);
    const { data } = await supabase
      .from("matriz_empleado")
      .select("*")
      .eq("emp_clave", emp.clave)
      .eq("cap_eliminada", false)
      .order("fecha_capacitacion", { ascending: true });
    setCaps(data || []);
    setLoading(false);
  }

  function limpiar() {
    setEmpSel(null); setQuery(""); setCaps([]);
    setFilterAno("Todos"); setEditando(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const anos = useMemo(() => {
    const set = new Set(caps.map(c => c.ano).filter(Boolean));
    return ["Todos", ...Array.from(set).sort((a, b) => b - a)];
  }, [caps]);

  const capsFiltradas = useMemo(() =>
    filterAno === "Todos" ? caps : caps.filter(c => String(c.ano) === String(filterAno))
  , [caps, filterAno]);

  const porAno = useMemo(() => {
    const map = {};
    capsFiltradas.forEach(c => {
      const a = c.ano || c.fecha_capacitacion?.slice(0, 4) || "—";
      if (!map[a]) map[a] = [];
      map[a].push(c);
    });
    return map;
  }, [capsFiltradas]);

  const stats = useMemo(() => {
    const nums = caps.map(c => c.calificacion_numerica).filter(n => n !== null && n !== undefined);
    return {
      total:       caps.length,
      completadas: caps.filter(c => c.completado).length,
      pendientes:  caps.filter(c => !c.completado).length,
      promedio:    nums.length ? (nums.reduce((a,b) => a+b,0)/nums.length).toFixed(1) : "—",
    };
  }, [caps]);

  async function guardarCalif(id) {
    setSaving(true);
    const payload = {};
    const n = parseFloat(editCalif);
    if (!isNaN(n) && editCalif !== "") payload.calificacion_numerica = n;
    else if (editCalif.toLowerCase() === "cumple") payload.cumple = true;
    else if (editCalif.toLowerCase() === "no cumple") payload.cumple = false;
    if (editCapac) payload.responsable_capacitacion = editCapac;
    if (editFecha) payload.fecha_capacitacion = editFecha;
    if (Object.keys(payload).length > 0) payload.completado = true;
    await supabase.from("matriz_empleado").update(payload).eq("id", id);
    setSaving(false);
    setEditando(null);
    const { data } = await supabase.from("matriz_empleado").select("*")
      .eq("emp_clave", empSel.clave).eq("cap_eliminada", false)
      .order("fecha_capacitacion", { ascending: true });
    setCaps(data || []);
  }

  const cardBase = { backgroundColor:"#fff", borderRadius:16, border:"1px solid #e5e7eb", boxShadow:"0 1px 4px rgba(0,0,0,0.06)" };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <div>
        <h1 style={{ fontSize:24, fontWeight:700, color:"#1e1b4b", margin:0 }}>Calificaciones</h1>
        <p style={{ fontSize:14, color:"#64748b", marginTop:4 }}>Historial de capacitaciones por empleado</p>
      </div>

      {/* Buscador */}
      <div style={{ ...cardBase, padding:20 }}>
        <label style={{ fontSize:12, fontWeight:600, color:"#475569", display:"block", marginBottom:8 }}>
          Buscar empleado por nombre o clave
        </label>
        <div style={{ position:"relative" }}>
          <Search size={17} style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#94a3b8", zIndex:1 }} />
          <input ref={inputRef} type="text"
            placeholder="Escribe nombre o número de empleado..."
            value={query}
            onChange={e => { setQuery(e.target.value); setShowDrop(true); if (empSel) { setEmpSel(null); setCaps([]); } }}
            onFocus={() => setShowDrop(true)}
            style={{
              width:"100%", paddingLeft:42, paddingRight: empSel ? 40 : 16,
              paddingTop:12, paddingBottom:12,
              backgroundColor:"#f8fafc",
              border:"2px solid " + (empSel ? "#7c3aed" : "#e5e7eb"),
              borderRadius:12, fontSize:14, outline:"none", boxSizing:"border-box",
            }}
          />
          {empSel && (
            <button onClick={limpiar} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", border:"none", background:"none", cursor:"pointer", padding:4 }}>
              <X size={16} color="#94a3b8" />
            </button>
          )}
          {showDrop && !empSel && empFiltrados.length > 0 && (
            <div style={{
              position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:50,
              backgroundColor:"#fff", borderRadius:12, border:"1px solid #e5e7eb",
              boxShadow:"0 8px 24px rgba(0,0,0,0.1)", overflow:"hidden", maxHeight:280, overflowY:"auto",
            }}>
              {empFiltrados.map(e => (
                <div key={e.clave} onMouseDown={() => seleccionar(e)}
                  style={{ padding:"10px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid #f1f5f9" }}
                  onMouseEnter={el => el.currentTarget.style.backgroundColor = "#faf8ff"}
                  onMouseLeave={el => el.currentTarget.style.backgroundColor = "transparent"}
                >
                  <div style={{
                    width:34, height:34, borderRadius:10, flexShrink:0,
                    background:"linear-gradient(135deg,#7c3aed,#5b21b6)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    color:"#fff", fontSize:11, fontWeight:700,
                  }}>
                    {e.nombre.split(" ").slice(0,2).map(w => w[0]).join("")}
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:"#1e1b4b", margin:0 }}>{e.nombre}</p>
                    <p style={{ fontSize:11, color:"#94a3b8", margin:0 }}>{e.clave} · {e.puesto}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ficha empleado */}
      {empSel && (
        <div style={{ ...cardBase, overflow:"hidden" }}>
          <div style={{ height:6, background:"linear-gradient(90deg,#7c3aed,#ec4899)" }} />
          <div style={{ padding:20, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            <div style={{
              width:50, height:50, borderRadius:14, flexShrink:0,
              background:"linear-gradient(135deg,#7c3aed,#5b21b6)",
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"#fff", fontSize:16, fontWeight:800,
            }}>
              {empSel.nombre.split(" ").slice(0,2).map(w => w[0]).join("")}
            </div>
            <div style={{ flex:1, minWidth:180 }}>
              <h2 style={{ fontSize:16, fontWeight:800, color:"#1e1b4b", margin:0 }}>{empSel.nombre}</h2>
              <div style={{ display:"flex", gap:14, flexWrap:"wrap", marginTop:6 }}>
                {[
                  { icon:Hash,      text: empSel.clave },
                  { icon:Briefcase, text: empSel.puesto || "—" },
                  { icon:Building2, text: empSel.depto || "—" },
                  { icon:Calendar,  text: `Ingreso: ${empSel.fec_ingreso || "—"}` },
                ].map((item, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <item.icon size={12} color="#94a3b8" />
                    <span style={{ fontSize:12, color:"#475569" }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:"flex", gap:16 }}>
              {[
                { label:"Total",       value:stats.total,       color:"#7c3aed" },
                { label:"Completadas", value:stats.completadas, color:"#10b981" },
                { label:"Pendientes",  value:stats.pendientes,  color:"#f59e0b" },
                { label:"Promedio",    value:stats.promedio,    color:"#3b82f6" },
              ].map((s,i) => (
                <div key={i} style={{ textAlign:"center" }}>
                  <p style={{ fontSize:20, fontWeight:800, color:s.color, margin:0, lineHeight:1 }}>{s.value}</p>
                  <p style={{ fontSize:10, color:"#94a3b8", margin:"3px 0 0" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtro año */}
      {empSel && !loading && caps.length > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:"#94a3b8", fontWeight:600 }}>Año:</span>
          {anos.map(a => (
            <button key={a} onClick={() => setFilterAno(a)} style={{
              padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer",
              border: filterAno === a ? "2px solid #7c3aed" : "2px solid #e5e7eb",
              backgroundColor: filterAno === a ? "#7c3aed" : "#fff",
              color: filterAno === a ? "#fff" : "#475569",
            }}>{a === "Todos" ? "Todos" : a}</button>
          ))}
          <span style={{ fontSize:12, color:"#94a3b8", marginLeft:"auto" }}>{capsFiltradas.length} capacitaciones</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:160 }}>
          <div style={{ width:32, height:32, border:"3px solid #7c3aed", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Tablas por año */}
      {empSel && !loading && capsFiltradas.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {Object.keys(porAno).sort((a,b) => b - a).map(ano => {
            const listAno = porAno[ano];
            const nums = listAno.map(c => c.calificacion_numerica).filter(n => n !== null && n !== undefined);
            const promAno = nums.length ? (nums.reduce((a,b) => a+b,0)/nums.length).toFixed(1) : "—";
            return (
              <div key={ano} style={{ ...cardBase, overflow:"hidden" }}>
                <div style={{ padding:"12px 20px", background:"linear-gradient(135deg,#7c3aed,#5b21b6)", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:15, fontWeight:800, color:"#fff" }}>{ano}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:"#fff", backgroundColor:"rgba(255,255,255,0.2)", padding:"2px 10px", borderRadius:999 }}>
                    {listAno.length} caps
                  </span>
                  <span style={{ fontSize:11, fontWeight:600, color:"#fff", backgroundColor:"rgba(255,255,255,0.2)", padding:"2px 10px", borderRadius:999 }}>
                    Prom: {promAno}
                  </span>
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
                    <thead>
                      <tr style={{ backgroundColor:"#f8fafc" }}>
                        {["#","Fecha","Folio","Nombre de la Capacitación","Calificación","Responsable",""].map(h => (
                          <th key={h} style={tableTh}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {listAno.map((cap, idx) => {
                        const editMode = editando === cap.id;
                        const califVal = cap.calificacion_numerica ?? (
                          cap.cumple !== null && cap.cumple !== undefined ? (cap.cumple ? "Cumple" : "No Cumple") :
                          cap.satisfactorio !== null && cap.satisfactorio !== undefined ? (cap.satisfactorio ? "Satisfactorio" : "No Satisfactorio") : null
                        );
                        const cs = califColor(califVal);
                        return (
                          <tr key={cap.id}
                            style={{ borderBottom:"1px solid #f1f5f9", backgroundColor: editMode ? "#faf8ff" : "transparent" }}
                            onMouseEnter={e => { if (!editMode) e.currentTarget.style.backgroundColor = "#faf8ff"; }}
                            onMouseLeave={e => { if (!editMode) e.currentTarget.style.backgroundColor = "transparent"; }}
                          >
                            <td style={{ ...tableTd, fontSize:11, color:"#94a3b8", textAlign:"center", width:36 }}>{idx+1}</td>
                            <td style={{ ...tableTd, whiteSpace:"nowrap", fontSize:12 }}>
                              {editMode
                                ? <input type="date" value={editFecha} onChange={e => setEditFecha(e.target.value)} style={{ ...inputSmall, width:130 }} />
                                : <span style={{ color:"#64748b" }}>{fmtDate(cap.fecha_capacitacion || cap.fecha_asignacion)}</span>
                              }
                            </td>
                            <td style={{ ...tableTd, fontFamily:"monospace", fontSize:11, color:"#7c3aed", whiteSpace:"nowrap" }}>
                              {cap.codigo_cap_snap || "—"}
                            </td>
                            <td style={{ ...tableTd, maxWidth:320 }}>
                              <p style={{ fontSize:13, color:"#1e1b4b", margin:0, fontWeight:500, lineHeight:1.3 }}>{cap.nombre_cap_snap}</p>
                              {!cap.completado && <span style={{ fontSize:10, color:"#f59e0b", fontWeight:600 }}>⏳ Pendiente</span>}
                            </td>
                            <td style={{ ...tableTd, textAlign:"center", whiteSpace:"nowrap" }}>
                              {editMode
                                ? <input type="text" value={editCalif} onChange={e => setEditCalif(e.target.value)} placeholder="0-10" style={{ ...inputSmall, width:80 }} />
                                : <span style={{ display:"inline-block", fontSize:13, fontWeight:800, padding:"3px 12px", borderRadius:8, backgroundColor:cs.bg, color:cs.color, minWidth:40 }}>{cs.label}</span>
                              }
                            </td>
                            <td style={{ ...tableTd, fontSize:12, color:"#64748b", whiteSpace:"nowrap" }}>
                              {editMode
                                ? <input type="text" value={editCapac} onChange={e => setEditCapac(e.target.value)} placeholder="Capacitador" style={{ ...inputSmall, width:120 }} />
                                : cap.responsable_capacitacion || "—"
                              }
                            </td>
                            <td style={{ ...tableTd, whiteSpace:"nowrap" }}>
                              {editMode ? (
                                <div style={{ display:"flex", gap:6 }}>
                                  <button onClick={() => guardarCalif(cap.id)} disabled={saving}
                                    style={{ ...btnSmall, backgroundColor:"#ecfdf5", color:"#10b981", border:"1px solid #a7f3d0" }}>
                                    {saving ? "…" : "✓"}
                                  </button>
                                  <button onClick={() => setEditando(null)}
                                    style={{ ...btnSmall, backgroundColor:"#f8fafc", color:"#94a3b8", border:"1px solid #e2e8f0" }}>
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button onClick={() => {
                                  setEditando(cap.id);
                                  setEditCalif(cap.calificacion_numerica !== null && cap.calificacion_numerica !== undefined ? String(cap.calificacion_numerica) : "");
                                  setEditCapac(cap.responsable_capacitacion || "");
                                  setEditFecha(cap.fecha_capacitacion || "");
                                }} style={{ ...btnSmall, backgroundColor:"#f5f3ff", color:"#7c3aed", border:"1px solid #e9e5ff" }}>
                                  Editar
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {empSel && !loading && caps.length === 0 && (
        <div style={{ ...cardBase, padding:"48px 0", textAlign:"center", color:"#94a3b8" }}>
          <Award size={44} style={{ margin:"0 auto 12px", opacity:0.25 }} />
          <p style={{ fontSize:14, margin:0 }}>Este empleado no tiene capacitaciones registradas.</p>
        </div>
      )}

      {!empSel && !loading && (
        <div style={{ ...cardBase, padding:"56px 0", textAlign:"center", color:"#94a3b8" }}>
          <Search size={44} style={{ margin:"0 auto 14px", opacity:0.2 }} />
          <p style={{ fontSize:15, fontWeight:600, color:"#475569", margin:"0 0 6px 0" }}>Busca un empleado para ver sus calificaciones</p>
          <p style={{ fontSize:13, margin:0 }}>Escribe el nombre o número de clave en el buscador</p>
        </div>
      )}
    </div>
  );
}

const tableTh = {
  padding:"11px 14px", textAlign:"left", fontSize:11, fontWeight:700,
  color:"#64748b", textTransform:"uppercase", letterSpacing:"0.04em",
  borderBottom:"2px solid #e5e7eb", whiteSpace:"nowrap",
};
const tableTd = { padding:"11px 14px", fontSize:13, color:"#475569", verticalAlign:"middle" };
const inputSmall = {
  padding:"6px 10px", backgroundColor:"#f8fafc", border:"2px solid #7c3aed",
  borderRadius:8, fontSize:12, outline:"none", boxSizing:"border-box",
};
const btnSmall = { padding:"5px 10px", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:600 };