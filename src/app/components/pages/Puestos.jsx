// src/components/pages/Puestos.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Search, Plus, Briefcase, Building2, X,
  AlertCircle, Edit, Trash2, ChevronDown, Users, BookCheck,
} from "lucide-react";

const DEPTOS = [
  "Fabricación", "Acondicionamiento", "Control De Calidad", "Aseguramiento De Calidad",
  "Validación", "Sistema De Calidad", "Desarrollo", "Mantenimiento", "Logística",
  "Almacén", "Recursos Humanos", "Seguridad E Higiene", "Contraloría", "Dirección",
  "Ventas", "Ingeniería De Empaque", "Compras", "Auditoría", "Otros",
];

const DEPTO_COLORS = {
  "Fabricación":            { color: "#3b82f6", bg: "#eff6ff" },
  "Acondicionamiento":      { color: "#06b6d4", bg: "#ecfeff" },
  "Control De Calidad":     { color: "#10b981", bg: "#ecfdf5" },
  "Aseguramiento De Calidad":{ color: "#059669", bg: "#d1fae5" },
  "Validación":             { color: "#8b5cf6", bg: "#f5f3ff" },
  "Sistema De Calidad":     { color: "#6366f1", bg: "#eef2ff" },
  "Desarrollo":             { color: "#f59e0b", bg: "#fffbeb" },
  "Mantenimiento":          { color: "#f97316", bg: "#fff7ed" },
  "Logística":              { color: "#0ea5e9", bg: "#f0f9ff" },
  "Almacén":                { color: "#64748b", bg: "#f8fafc" },
  "Recursos Humanos":       { color: "#ec4899", bg: "#fdf2f8" },
  "Seguridad E Higiene":    { color: "#ef4444", bg: "#fef2f2" },
  "Contraloría":            { color: "#475569", bg: "#f1f5f9" },
  "Dirección":              { color: "#1e1b4b", bg: "#eef2ff" },
  "Ventas":                 { color: "#d97706", bg: "#fefce8" },
  "Ingeniería De Empaque":  { color: "#7c3aed", bg: "#faf5ff" },
  "Compras":                { color: "#0891b2", bg: "#ecfeff" },
  "Auditoría":              { color: "#b45309", bg: "#fef3c7" },
  "Otros":                  { color: "#94a3b8", bg: "#f8fafc" },
};

function getDeptoStyle(depto) {
  if (!depto) return { color: "#94a3b8", bg: "#f8fafc" };
  const key = Object.keys(DEPTO_COLORS).find(k =>
    depto.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(depto.toLowerCase())
  );
  return DEPTO_COLORS[key] || { color: "#7c3aed", bg: "#f5f3ff" };
}

export default function Puestos() {
  const [puestos, setPuestos] = useState([]);
  const [empCount, setEmpCount] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepto, setFilterDepto] = useState("Todos");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    nombre: "", departamento: "", descripcion: "", activo: true,
  });

  const [allCaps, setAllCaps] = useState([]);
  const [puestoCaps, setPuestoCaps] = useState([]);
  const [capsToAdd, setCapsToAdd] = useState([]);
  const [capsToRemove, setCapsToRemove] = useState([]);
  const [loadingCaps, setLoadingCaps] = useState(false);

  // ====== NUEVO: estado del buscador de capacitaciones ======
  const [capSearch, setCapSearch] = useState("");
  const [showCapDropdown, setShowCapDropdown] = useState(false);
  const capSearchRef = useRef(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [puestosRes, empsRes, capsRes] = await Promise.all([
      supabase.from("puestos").select("*").order("nombre"),
      supabase.from("empleados").select("puesto_id").eq("activo", true),
      supabase.from("capacitaciones").select("id, nombre, codigo").order("nombre"),
    ]);
    const lista = puestosRes.data || [];
    setPuestos(lista);
    setAllCaps(capsRes.data || []);
    const counts = {};
    (empsRes.data || []).forEach(e => {
      if (e.puesto_id) counts[e.puesto_id] = (counts[e.puesto_id] || 0) + 1;
    });
    setEmpCount(counts);
    setLoading(false);
  }

  async function loadPuestoCaps(puestoId) {
    setLoadingCaps(true);
    const { data } = await supabase
      .from("matriz_puesto")
      .select("id, capacitacion_id, capacitaciones(id, nombre, codigo)")
      .eq("puesto_id", puestoId);
    setPuestoCaps(data || []);
    setCapsToAdd([]);
    setCapsToRemove([]);
    setLoadingCaps(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ nombre: "", departamento: DEPTOS[0], descripcion: "", activo: true });
    setPuestoCaps([]); setCapsToAdd([]); setCapsToRemove([]);
    setCapSearch(""); setShowCapDropdown(false);
    setErrorMsg("");
    setShowModal(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({
      nombre: p.nombre || "",
      departamento: p.departamento || "",
      descripcion: p.descripcion || "",
      activo: p.activo !== false,
    });
    setCapSearch(""); setShowCapDropdown(false);
    setErrorMsg("");
    setShowModal(true);
    loadPuestoCaps(p.id);
  }

  // ====== NUEVO: agregar cap desde el buscador ======
  function handleAddCapFromSearch(cap) {
    const yaEsta = puestoCaps.some(pc => pc.capacitacion_id === cap.id && !capsToRemove.includes(pc.id))
      || capsToAdd.some(c => c.id === cap.id);
    if (yaEsta) return;
    setCapsToAdd([...capsToAdd, cap]);
    setCapSearch("");
    setShowCapDropdown(false);
    // Volver a enfocar input para seguir buscando
    setTimeout(() => capSearchRef.current?.focus(), 50);
  }

  function handleRemoveCapLocal(item) {
    if (item.matriz_id) {
      setCapsToRemove([...capsToRemove, item.matriz_id]);
    } else {
      setCapsToAdd(capsToAdd.filter(c => c.id !== item.cap_id));
    }
  }

  const capsParaMostrar = [
    ...puestoCaps
      .filter(pc => !capsToRemove.includes(pc.id))
      .map(pc => ({
        matriz_id: pc.id, cap_id: pc.capacitacion_id,
        nombre: pc.capacitaciones?.nombre, codigo: pc.capacitaciones?.codigo,
        esNueva: false,
      })),
    ...capsToAdd.map(c => ({
      matriz_id: null, cap_id: c.id,
      nombre: c.nombre, codigo: c.codigo, esNueva: true,
    })),
  ];

  // Filtro de búsqueda — exclude las ya agregadas
  const capsBusquedaResultado = useMemo(() => {
    if (!capSearch.trim()) return [];
    const q = capSearch.toLowerCase();
    const yaAsignadasIds = new Set([
      ...puestoCaps.filter(pc => !capsToRemove.includes(pc.id)).map(pc => pc.capacitacion_id),
      ...capsToAdd.map(c => c.id),
    ]);
    return allCaps
      .filter(c => !yaAsignadasIds.has(c.id))
      .filter(c =>
        (c.nombre || "").toLowerCase().includes(q) ||
        (c.codigo || "").toLowerCase().includes(q)
      )
      .slice(0, 20); // máximo 20 resultados
  }, [capSearch, allCaps, puestoCaps, capsToAdd, capsToRemove]);

  async function handleSave() {
    setErrorMsg("");
    if (!form.nombre.trim()) { setErrorMsg("El nombre del puesto es obligatorio."); return; }
    if (!form.departamento.trim()) { setErrorMsg("El departamento es obligatorio."); return; }
    setSaving(true);

    const payload = {
      nombre: form.nombre.trim(),
      departamento: form.departamento.trim(),
      descripcion: form.descripcion.trim(),
      activo: form.activo,
    };

    try {
      let puestoIdFinal = editingId;

      if (editingId) {
        const { error } = await supabase.from("puestos").update(payload).eq("id", editingId);
        if (error) throw new Error("Error al actualizar puesto: " + error.message);
      } else {
        const { data, error } = await supabase.from("puestos").insert(payload).select().single();
        if (error) throw new Error("Error al crear puesto: " + error.message);
        puestoIdFinal = data.id;
      }

      if (editingId) {
        if (capsToRemove.length > 0) {
          const capsRemovidas = puestoCaps
            .filter(pc => capsToRemove.includes(pc.id))
            .map(pc => pc.capacitacion_id);

          const { error: errDel } = await supabase
            .from("matriz_puesto").delete().in("id", capsToRemove);
          if (errDel) throw new Error("Error al quitar caps: " + errDel.message);

          if (capsRemovidas.length > 0) {
            const { data: emps } = await supabase
              .from("empleados").select("clave").eq("puesto_id", puestoIdFinal);
            const claves = (emps || []).map(e => e.clave);
            if (claves.length > 0) {
              const { error: errDelCalif } = await supabase
                .from("calificaciones").delete()
                .in("emp_clave", claves)
                .in("capacitacion_id", capsRemovidas)
                .eq("completado", false)
                .eq("origen", "puesto")
                .eq("puesto_id_origen", puestoIdFinal);
              if (errDelCalif) throw new Error("Error al borrar pendientes: " + errDelCalif.message);
            }
          }
        }

        if (capsToAdd.length > 0) {
          const inserts = capsToAdd.map(c => ({
            puesto_id: puestoIdFinal,
            capacitacion_id: c.id,
            obligatoria: true,
          }));
          const { error: errIns } = await supabase.from("matriz_puesto").insert(inserts);
          if (errIns) throw new Error("Error al agregar caps: " + errIns.message);

          const { data: emps } = await supabase
            .from("empleados").select("clave").eq("puesto_id", puestoIdFinal).eq("activo", true);

          if (emps && emps.length > 0) {
            const califInserts = [];
            for (const emp of emps) {
              for (const cap of capsToAdd) {
                califInserts.push({
                  emp_clave: emp.clave,
                  capacitacion_id: cap.id,
                  nombre_capacitacion: cap.nombre,
                  codigo_capacitacion: cap.codigo || "",
                  completado: false,
                  origen: "puesto",
                  puesto_id_origen: puestoIdFinal,
                  activa: true,
                });
              }
            }
            if (califInserts.length > 0) {
              const { error: errCalif } = await supabase.from("calificaciones").insert(califInserts);
              if (errCalif) throw new Error("Error al replicar a empleados: " + errCalif.message);
            }
          }
        }
      }

      setShowModal(false);
      setSaving(false);
      fetchData();
    } catch (err) {
      setErrorMsg(err.message);
      setSaving(false);
    }
  }

  async function handleDelete(p) {
    const count = empCount[p.id] || 0;
    if (count > 0) {
      alert(`No se puede eliminar: hay ${count} empleado(s) con este puesto.\nPrimero reasigna o da de baja a esos empleados.`);
      return;
    }
    if (!confirm(`¿Eliminar el puesto "${p.nombre}"?`)) return;
    await supabase.from("puestos").delete().eq("id", p.id);
    fetchData();
  }

  async function handleToggleActivo(p) {
    await supabase.from("puestos").update({ activo: !p.activo }).eq("id", p.id);
    fetchData();
  }

  const deptosEnDatos = ["Todos", ...new Set(puestos.map(p => p.departamento).filter(Boolean).sort())];

  const filtered = puestos.filter(p => {
    const matchSearch = `${p.nombre} ${p.departamento} ${p.descripcion || ""}`
      .toLowerCase().includes(searchTerm.toLowerCase());
    const matchDepto = filterDepto === "Todos" || p.departamento === filterDepto;
    return matchSearch && matchDepto;
  });

  const grouped = filtered.reduce((acc, p) => {
    const d = p.departamento || "Sin Departamento";
    if (!acc[d]) acc[d] = [];
    acc[d].push(p);
    return acc;
  }, {});

  const cardBase = {
    backgroundColor: "#fff", borderRadius: 16,
    border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
      <div style={{ width: 36, height: 36, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const totalActivos = puestos.filter(p => p.activo !== false).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Puestos</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            {totalActivos} puestos activos · {Object.keys(grouped).length} departamentos
          </p>
        </div>
        <button onClick={openCreate} style={btnPrimaryHeader}>
          <Plus size={18} /><span>Nuevo Puesto</span>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12 }}>
        {Object.entries(grouped).slice(0, 6).map(([depto, list]) => {
          const s = getDeptoStyle(depto);
          const empTotal = list.reduce((sum, p) => sum + (empCount[p.id] || 0), 0);
          return (
            <div key={depto} style={{
              ...cardBase, padding: "16px",
              borderLeft: `4px solid ${s.color}`, cursor: "pointer",
            }} onClick={() => setFilterDepto(depto === filterDepto ? "Todos" : depto)}>
              <p style={{ fontSize: 11, fontWeight: 700, color: s.color, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {depto.length > 18 ? depto.slice(0, 16) + "…" : depto}
              </p>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#1e1b4b", margin: "4px 0 0 0" }}>{list.length}</p>
              <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0 0" }}>{empTotal} empleados</p>
            </div>
          );
        })}
      </div>

      <div style={{ ...cardBase, padding: 20 }}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input type="text" placeholder="Buscar puesto o departamento..."
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={searchInput} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>Departamento:</span>
          {deptosEnDatos.map(d => (
            <button key={d} onClick={() => setFilterDepto(d)} style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: filterDepto === d ? "2px solid #7c3aed" : "2px solid #e5e7eb",
              backgroundColor: filterDepto === d ? "#7c3aed" : "#fff",
              color: filterDepto === d ? "#fff" : "#475569",
              cursor: "pointer", whiteSpace: "nowrap",
            }}>{d}</button>
          ))}
        </div>
      </div>

      {Object.entries(grouped).map(([depto, lista]) => {
        const s = getDeptoStyle(depto);
        return (
          <div key={depto}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: s.color }} />
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>{depto}</h2>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                backgroundColor: s.bg, color: s.color,
              }}>{lista.length} puestos</span>
              <div style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 12, marginBottom: 8 }}>
              {lista.map(p => {
                const empCnt = empCount[p.id] || 0;
                return (
                  <div key={p.id} style={{
                    ...cardBase, padding: 20,
                    borderLeft: `4px solid ${p.activo !== false ? s.color : "#cbd5e1"}`,
                    opacity: p.activo !== false ? 1 : 0.6,
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", margin: 0, lineHeight: 1.3 }}>
                          {p.nombre}
                        </p>
                        {p.descripcion && (
                          <p style={{ fontSize: 11, color: "#94a3b8", margin: "4px 0 0 0", lineHeight: 1.4 }}>
                            {p.descripcion.length > 60 ? p.descripcion.slice(0, 58) + "…" : p.descripcion}
                          </p>
                        )}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, flexShrink: 0,
                        backgroundColor: p.activo !== false ? "#dcfce7" : "#f1f5f9",
                        color: p.activo !== false ? "#15803d" : "#94a3b8",
                      }}>
                        {p.activo !== false ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                      <Users size={12} color="#94a3b8" />
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {empCnt === 0 ? "Sin empleados asignados" : `${empCnt} empleado${empCnt > 1 ? "s" : ""}`}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 6, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                      <button onClick={() => openEdit(p)} style={btnIcon("#7c3aed")}>
                        <Edit size={12} /><span>Editar</span>
                      </button>
                      <button onClick={() => handleToggleActivo(p)} style={btnIcon(p.activo !== false ? "#f59e0b" : "#10b981")}>
                        {p.activo !== false ? "Desactivar" : "Activar"}
                      </button>
                      <button onClick={() => handleDelete(p)} style={btnIcon("#ef4444")}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
          <Briefcase size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14, margin: 0 }}>No se encontraron puestos.</p>
        </div>
      )}

      {showModal && (
        <ModalShell title={editingId ? "Editar Puesto" : "Nuevo Puesto"} onClose={() => setShowModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <Field label="Nombre del puesto *">
              <input type="text" value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Operador De Fabricación A"
                style={inputStyle} />
            </Field>

            <Field label="Departamento *">
              <div style={{ position: "relative" }}>
                <select value={form.departamento}
                  onChange={e => setForm({ ...form, departamento: e.target.value })}
                  style={{ ...inputStyle, appearance: "none", paddingRight: 36 }}>
                  <option value="">Seleccionar...</option>
                  {DEPTOS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown size={15} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
              </div>
            </Field>

            <Field label="Descripción (opcional)">
              <textarea value={form.descripcion}
                onChange={e => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Breve descripción del puesto..."
                rows={3}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
            </Field>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id="activo" checked={form.activo}
                onChange={e => setForm({ ...form, activo: e.target.checked })}
                style={{ width: 16, height: 16, accentColor: "#7c3aed" }} />
              <label htmlFor="activo" style={{ fontSize: 13, color: "#475569", fontWeight: 500, cursor: "pointer" }}>
                Puesto activo
              </label>
            </div>

            {/* ====== Capacitaciones del puesto (con BUSCADOR nuevo) ====== */}
            {editingId && (
              <div style={{
                marginTop: 8, padding: 16, borderRadius: 12,
                backgroundColor: "#faf8ff", border: "1px solid #e9e5ff",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <BookCheck size={16} color="#7c3aed" />
                  <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>
                    Capacitaciones de este puesto
                  </h4>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                    backgroundColor: "#7c3aed", color: "#fff",
                  }}>{capsParaMostrar.length}</span>
                </div>

                {/* ====== BUSCADOR con autocomplete ====== */}
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <Search size={15} style={{
                    position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                    color: "#94a3b8", zIndex: 1,
                  }} />
                  <input
                    ref={capSearchRef}
                    type="text"
                    value={capSearch}
                    onChange={e => { setCapSearch(e.target.value); setShowCapDropdown(true); }}
                    onFocus={() => setShowCapDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCapDropdown(false), 200)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && capsBusquedaResultado.length > 0) {
                        e.preventDefault();
                        handleAddCapFromSearch(capsBusquedaResultado[0]);
                      } else if (e.key === "Escape") {
                        setCapSearch(""); setShowCapDropdown(false);
                      }
                    }}
                    placeholder="Escribe código o nombre para buscar capacitación..."
                    style={{
                      width: "100%", paddingLeft: 36, paddingRight: 36, paddingTop: 9, paddingBottom: 9,
                      backgroundColor: "#fff", border: "2px solid #e5e7eb",
                      borderRadius: 10, fontSize: 12, outline: "none", boxSizing: "border-box",
                    }}
                  />
                  {capSearch && (
                    <button type="button"
                      onClick={() => { setCapSearch(""); capSearchRef.current?.focus(); }}
                      style={{
                        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                        background: "none", border: "none", cursor: "pointer", padding: 2,
                      }}>
                      <X size={14} color="#94a3b8" />
                    </button>
                  )}

                  {/* Dropdown de resultados */}
                  {showCapDropdown && capSearch.trim() && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                      backgroundColor: "#fff", borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      maxHeight: 240, overflowY: "auto",
                    }}>
                      {capsBusquedaResultado.length === 0 ? (
                        <div style={{ padding: "10px 14px", fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
                          {capSearch.trim() ? "Sin coincidencias o ya están todas asignadas." : "Empieza a escribir..."}
                        </div>
                      ) : (
                        capsBusquedaResultado.map((cap, idx) => (
                          <div key={cap.id}
                            onMouseDown={() => handleAddCapFromSearch(cap)}
                            style={{
                              padding: "8px 12px", cursor: "pointer",
                              borderBottom: idx < capsBusquedaResultado.length - 1 ? "1px solid #f1f5f9" : "none",
                              transition: "background 0.1s",
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = "#faf8ff"}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}>
                            <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                              {cap.codigo && (
                                <span style={{
                                  fontSize: 10, fontFamily: "monospace", color: "#7c3aed",
                                  fontWeight: 700, flexShrink: 0,
                                }}>
                                  [{cap.codigo}]
                                </span>
                              )}
                              <span style={{ fontSize: 12, color: "#1e1b4b", lineHeight: 1.3 }}>
                                {cap.nombre}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                      {capsBusquedaResultado.length === 20 && (
                        <div style={{
                          padding: "6px 12px", fontSize: 10, color: "#94a3b8",
                          textAlign: "center", borderTop: "1px solid #f1f5f9",
                          backgroundColor: "#fafafa",
                        }}>
                          Mostrando 20 resultados — refina la búsqueda
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p style={{ fontSize: 10, color: "#64748b", margin: "0 0 10px 4px" }}>
                  💡 Escribe para buscar, click o Enter para agregar
                </p>

                {/* Lista de caps ya agregadas */}
                {loadingCaps ? (
                  <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: 12 }}>
                    Cargando...
                  </p>
                ) : capsParaMostrar.length === 0 ? (
                  <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", padding: 12 }}>
                    Sin capacitaciones asignadas a este puesto.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
                    {capsParaMostrar.map((c, i) => (
                      <div key={`${c.cap_id}-${i}`} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px", backgroundColor: "#fff",
                        border: c.esNueva ? "1px dashed #10b981" : "1px solid #e5e7eb",
                        borderRadius: 8,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 12, color: "#1e1b4b", fontWeight: 500 }}>
                            {c.nombre}
                          </p>
                          <p style={{ margin: 0, fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>
                            {c.codigo || "—"} {c.esNueva && <span style={{ color: "#10b981" }}>· nueva (sin guardar)</span>}
                          </p>
                        </div>
                        <button type="button" onClick={() => handleRemoveCapLocal(c)}
                          style={{
                            padding: 6, backgroundColor: "#fef2f2", color: "#ef4444",
                            border: "1px solid #fecaca", borderRadius: 6, cursor: "pointer",
                          }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p style={{ fontSize: 10, color: "#64748b", margin: "10px 0 0 0", lineHeight: 1.4 }}>
                  Al guardar: las capacitaciones nuevas se asignarán automáticamente a todos los empleados de este puesto.
                  Las que quites se borrarán solo de los empleados que aún no las han completado.
                </p>
              </div>
            )}

            {!editingId && (
              <div style={{ padding: 10, backgroundColor: "#fffbeb", borderRadius: 8, border: "1px solid #fde68a" }}>
                <p style={{ fontSize: 11, color: "#92400e", margin: 0 }}>
                  💡 Primero crea el puesto. Después podrás editarlo para asignarle capacitaciones.
                </p>
              </div>
            )}

            {errorMsg && <ErrorBanner msg={errorMsg} />}

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button onClick={() => setShowModal(false)} style={btnCancel}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={btnPrimary}>
                {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear Puesto"}
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
        backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 540,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
          position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1,
          borderRadius: "20px 20px 0 0",
        }}>
          <h3 style={{ fontWeight: 700, color: "#1e1b4b", margin: 0, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{ padding: 6, border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
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
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 14px", backgroundColor: "#fef2f2",
      border: "1px solid #fecaca", borderRadius: 10,
      color: "#b91c1c", fontSize: 12, fontWeight: 500,
    }}>
      <AlertCircle size={14} />{msg}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "10px 12px",
  backgroundColor: "#f8fafc", border: "2px solid #e5e7eb",
  borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box",
};
const searchInput = {
  width: "100%", paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
  backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12,
  fontSize: 14, outline: "none", boxSizing: "border-box",
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
const btnIcon = (color) => ({
  display: "flex", alignItems: "center", gap: 4,
  padding: "5px 10px", fontSize: 11, fontWeight: 600,
  backgroundColor: color === "#ef4444" ? "#fef2f2" : color === "#f59e0b" ? "#fffbeb" : color === "#10b981" ? "#ecfdf5" : "#f5f3ff",
  color, border: `1px solid ${color}22`,
  borderRadius: 7, cursor: "pointer",
});