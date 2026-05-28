// src/components/pages/Puestos.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Search, Plus, Briefcase, Building2, X,
  AlertCircle, Edit, Trash2, ChevronDown, Users,
} from "lucide-react";

const DEPTOS = [
  "Fabricación",
  "Acondicionamiento",
  "Control De Calidad",
  "Aseguramiento De Calidad",
  "Validación",
  "Sistema De Calidad",
  "Desarrollo",
  "Mantenimiento",
  "Logística",
  "Almacén",
  "Recursos Humanos",
  "Seguridad E Higiene",
  "Contraloría",
  "Dirección",
  "Ventas",
  "Ingeniería De Empaque",
  "Compras",
  "Auditoría",
  "Otros",
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
  // Buscar coincidencia parcial
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

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [puestosRes, empsRes] = await Promise.all([
      supabase.from("puestos").select("*").order("nombre"),
      supabase.from("empleados").select("puesto_id").eq("activo", true),
    ]);

    const lista = puestosRes.data || [];
    setPuestos(lista);

    // Contar empleados por puesto
    const counts = {};
    (empsRes.data || []).forEach(e => {
      if (e.puesto_id) counts[e.puesto_id] = (counts[e.puesto_id] || 0) + 1;
    });
    setEmpCount(counts);
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm({ nombre: "", departamento: DEPTOS[0], descripcion: "", activo: true });
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
    setErrorMsg("");
    setShowModal(true);
  }

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

    let error;
    if (editingId) {
      ({ error } = await supabase.from("puestos").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("puestos").insert(payload));
    }

    if (error) { setErrorMsg("Error: " + error.message); setSaving(false); return; }
    setShowModal(false);
    setSaving(false);
    fetchData();
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

  // Deptos únicos en los datos
  const deptosEnDatos = ["Todos", ...new Set(puestos.map(p => p.departamento).filter(Boolean).sort())];

  const filtered = puestos.filter(p => {
    const matchSearch = `${p.nombre} ${p.departamento} ${p.descripcion || ""}`
      .toLowerCase().includes(searchTerm.toLowerCase());
    const matchDepto = filterDepto === "Todos" || p.departamento === filterDepto;
    return matchSearch && matchDepto;
  });

  // Agrupar por departamento para la vista
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

      {/* Header */}
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

      {/* Stat cards por depto */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12 }}>
        {Object.entries(grouped).slice(0, 6).map(([depto, list]) => {
          const s = getDeptoStyle(depto);
          const empTotal = list.reduce((sum, p) => sum + (empCount[p.id] || 0), 0);
          return (
            <div key={depto} style={{
              ...cardBase, padding: "16px",
              borderLeft: `4px solid ${s.color}`,
              cursor: "pointer",
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

      {/* Filtros */}
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

      {/* Lista agrupada por departamento */}
      {Object.entries(grouped).map(([depto, lista]) => {
        const s = getDeptoStyle(depto);
        return (
          <div key={depto}>
            {/* Encabezado departamento */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: s.color }} />
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>{depto}</h2>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                backgroundColor: s.bg, color: s.color,
              }}>{lista.length} puestos</span>
              <div style={{ flex: 1, height: 1, backgroundColor: "#e5e7eb" }} />
            </div>

            {/* Cards de puestos */}
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
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}
                  >
                    {/* Top row */}
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
                      {/* Badge activo/inactivo */}
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 999, flexShrink: 0,
                        backgroundColor: p.activo !== false ? "#dcfce7" : "#f1f5f9",
                        color: p.activo !== false ? "#15803d" : "#94a3b8",
                      }}>
                        {p.activo !== false ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    {/* Empleados count */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                      <Users size={12} color="#94a3b8" />
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {empCnt === 0 ? "Sin empleados asignados" : `${empCnt} empleado${empCnt > 1 ? "s" : ""}`}
                      </span>
                    </div>

                    {/* Actions */}
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

      {/* ====== MODAL ====== */}
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
        backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 480,
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