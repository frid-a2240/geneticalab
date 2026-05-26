// src/app/components/pages/Capacitaciones.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Search, Plus, BookOpen, X, AlertCircle,
  Edit, Trash2, FileText, Hash, Award
} from "lucide-react";

const TIPOS_CAPACITACION = {
  1: { label: "Lectura", color: "#3b82f6", bg: "#eff6ff" },
  2: { label: "Clase", color: "#10b981", bg: "#ecfdf5" },
  3: { label: "Video", color: "#f59e0b", bg: "#fffbeb" },
  4: { label: "Práctica", color: "#ec4899", bg: "#fdf2f8" },
  5: { label: "Cap. Continua", color: "#8b5cf6", bg: "#f5f3ff" },
};

const TIPOS_ACEPTACION = {
  numerico: { label: "Numérica (0-10)", color: "#7c3aed", bg: "#f5f3ff" },
  cumple: { label: "Cumple / No Cumple", color: "#059669", bg: "#ecfdf5" },
  satisfactorio: { label: "Satisfactorio / No", color: "#d97706", bg: "#fffbeb" },
};

export default function Capacitaciones() {
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCurso, setFilterCurso] = useState("Todos");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    nombre: "", codigo: "", curso_id: "",
    tipo_capacitacion: 1, tipo_aceptacion: "numerico",
    codigo_documento: "", duracion_horas: 0,
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [capRes, cursosRes] = await Promise.all([
      supabase.from("capacitaciones").select("*, cursos(id, nombre, categoria)").order("id"),
      supabase.from("cursos").select("*").order("nombre"),
    ]);
    setCapacitaciones(capRes.data || []);
    setCursos(cursosRes.data || []);
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      nombre: "", codigo: "", curso_id: cursos[0]?.id || "",
      tipo_capacitacion: 1, tipo_aceptacion: "numerico",
      codigo_documento: "", duracion_horas: 0,
    });
    setErrorMsg("");
    setShowModal(true);
  }

  function openEdit(cap) {
    setEditingId(cap.id);
    setForm({
      nombre: cap.nombre || "",
      codigo: cap.codigo || "",
      curso_id: cap.curso_id || "",
      tipo_capacitacion: cap.tipo_capacitacion || 1,
      tipo_aceptacion: cap.tipo_aceptacion || "numerico",
      codigo_documento: cap.codigo_documento || "",
      duracion_horas: cap.duracion_horas || 0,
    });
    setErrorMsg("");
    setShowModal(true);
  }

  async function handleSave() {
    setErrorMsg("");
    if (!form.nombre.trim() || !form.curso_id) {
      setErrorMsg("Nombre y grupo son obligatorios.");
      return;
    }
    setSaving(true);

    const payload = {
      nombre: form.nombre.trim(),
      codigo: form.codigo.trim(),
      curso_id: parseInt(form.curso_id),
      tipo_capacitacion: parseInt(form.tipo_capacitacion),
      tipo_aceptacion: form.tipo_aceptacion,
      codigo_documento: form.codigo_documento.trim(),
      duracion_horas: parseFloat(form.duracion_horas) || 0,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("capacitaciones").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("capacitaciones").insert(payload));
    }

    if (error) {
      setErrorMsg("Error: " + error.message);
      setSaving(false);
      return;
    }

    setShowModal(false);
    setSaving(false);
    fetchData();
  }

  async function handleDelete(cap) {
    if (!confirm(`¿Eliminar la capacitación "${cap.nombre}"? Esto puede afectar matrices de puestos.`)) return;
    const { error } = await supabase.from("capacitaciones").delete().eq("id", cap.id);
    if (error) {
      alert("Error: " + error.message);
      return;
    }
    fetchData();
  }

  const filtered = capacitaciones.filter((c) => {
    const matchSearch = `${c.nombre} ${c.codigo} ${c.codigo_documento || ""}`
      .toLowerCase().includes(searchTerm.toLowerCase());
    const matchCurso = filterCurso === "Todos" || c.curso_id === parseInt(filterCurso);
    const matchTipo = filterTipo === "Todos" || c.tipo_capacitacion === parseInt(filterTipo);
    return matchSearch && matchCurso && matchTipo;
  });

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Capacitaciones</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            {capacitaciones.length} capacitaciones registradas
          </p>
        </div>
        <button onClick={openCreate} style={btnPrimaryHeader}>
          <Plus size={18} /><span>Nueva Capacitación</span>
        </button>
      </div>

      {/* Filters */}
      <div style={{ ...cardBase, padding: 20 }}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input type="text" placeholder="Buscar por nombre, código o documento..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInput} />
        </div>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <select value={filterCurso} onChange={(e) => setFilterCurso(e.target.value)} style={selectFilter}>
            <option value="Todos">Todos los grupos</option>
            {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>

          <div style={{ width: 1, height: 28, backgroundColor: "#e5e7eb" }} />

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <PillFilter active={filterTipo === "Todos"} onClick={() => setFilterTipo("Todos")} label="Todos los tipos" />
            {Object.entries(TIPOS_CAPACITACION).map(([k, v]) => (
              <PillFilter key={k} active={filterTipo === k}
                onClick={() => setFilterTipo(k)} label={v.label} color={v.color} />
            ))}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ ...cardBase, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                {["Código", "Capacitación", "Grupo", "Tipo", "Aceptación", "Documento", "Acciones"].map((h) => (
                  <th key={h} style={tableTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((cap) => {
                const tipo = TIPOS_CAPACITACION[cap.tipo_capacitacion] || TIPOS_CAPACITACION[1];
                const acept = TIPOS_ACEPTACION[cap.tipo_aceptacion] || TIPOS_ACEPTACION.numerico;
                return (
                  <tr key={cap.id}
                    style={{ borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#faf8ff"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <td style={{ ...tableTd, fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>
                      {cap.codigo || "—"}
                    </td>
                    <td style={{ ...tableTd, fontSize: 13, color: "#1e1b4b", fontWeight: 500, maxWidth: 350 }}>
                      {cap.nombre}
                    </td>
                    <td style={{ ...tableTd, fontSize: 12, color: "#475569" }}>
                      {cap.cursos?.nombre || "—"}
                    </td>
                    <td style={tableTd}>
                      <span style={{ ...pillStyle, color: tipo.color, backgroundColor: tipo.bg }}>
                        {cap.tipo_capacitacion} · {tipo.label}
                      </span>
                    </td>
                    <td style={tableTd}>
                      <span style={{ ...pillStyle, color: acept.color, backgroundColor: acept.bg }}>
                        {acept.label}
                      </span>
                    </td>
                    <td style={{ ...tableTd, fontSize: 11, fontFamily: "monospace", color: "#64748b" }}>
                      {cap.codigo_documento || "—"}
                    </td>
                    <td style={tableTd}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => openEdit(cap)} style={btnIcon("#7c3aed")}>
                          <Edit size={13} />
                        </button>
                        <button onClick={() => handleDelete(cap)} style={btnIcon("#ef4444")}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
            <BookOpen size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No se encontraron capacitaciones.</p>
          </div>
        )}
      </div>

      {/* ====== MODAL ====== */}
      {showModal && (
        <ModalShell title={editingId ? "Editar Capacitación" : "Nueva Capacitación"} onClose={() => setShowModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Nombre de la capacitación *">
              <input type="text" value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Control en proceso de las etapas de fabricación"
                style={inputStyle} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Código interno">
                <input type="text" value={form.codigo}
                  onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  placeholder="Ej: P-AC-002" style={inputStyle} />
              </Field>
              <Field label="Grupo / Categoría *">
                <select value={form.curso_id}
                  onChange={(e) => setForm({ ...form, curso_id: e.target.value })}
                  style={inputStyle}>
                  <option value="">Seleccionar grupo...</option>
                  {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Código de documento (P-RH-007/F-XXX)">
              <input type="text" value={form.codigo_documento}
                onChange={(e) => setForm({ ...form, codigo_documento: e.target.value })}
                placeholder="Ej: P-DOC-001/F-503" style={inputStyle} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Tipo de capacitación">
                <select value={form.tipo_capacitacion}
                  onChange={(e) => setForm({ ...form, tipo_capacitacion: e.target.value })}
                  style={inputStyle}>
                  {Object.entries(TIPOS_CAPACITACION).map(([k, v]) => (
                    <option key={k} value={k}>{k} - {v.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Duración (horas)">
                <input type="number" min="0" step="0.5" value={form.duracion_horas}
                  onChange={(e) => setForm({ ...form, duracion_horas: e.target.value })}
                  style={inputStyle} />
              </Field>
            </div>

            <Field label="Tipo de aceptación">
              <select value={form.tipo_aceptacion}
                onChange={(e) => setForm({ ...form, tipo_aceptacion: e.target.value })}
                style={inputStyle}>
                {Object.entries(TIPOS_ACEPTACION).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: "#64748b", marginTop: 6, lineHeight: 1.5 }}>
                Define cómo se calificará: <b>Numérica</b> (0-10) para exámenes,
                <b> Cumple/No</b> para listas de cotejo, <b>Satisfactorio/No</b> para estudios de caso.
              </p>
            </Field>

            {errorMsg && <ErrorBanner msg={errorMsg} />}

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button onClick={() => setShowModal(false)} style={btnCancel}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={btnPrimary}>
                {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

/* ===== Helpers ===== */

function PillFilter({ active, onClick, label, color }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
      border: active ? `2px solid ${color || "#7c3aed"}` : "2px solid #e5e7eb",
      backgroundColor: active ? (color || "#7c3aed") : "#fff",
      color: active ? "#fff" : "#475569",
      cursor: "pointer", whiteSpace: "nowrap",
    }}>{label}</button>
  );
}

function ModalShell({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 560,
        maxHeight: "92vh", overflowY: "auto",
        boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
          position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1,
          borderRadius: "20px 20px 0 0",
        }}>
          <h3 style={{ fontWeight: 700, color: "#1e1b4b", margin: 0, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={{
            padding: 6, border: "none", background: "none", cursor: "pointer", borderRadius: 8,
          }}>
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

const selectFilter = {
  fontSize: 13, backgroundColor: "#f8fafc", border: "2px solid #e5e7eb",
  borderRadius: 10, padding: "8px 14px", outline: "none", cursor: "pointer",
  fontWeight: 500, color: "#475569",
};

const tableTh = {
  padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
  borderBottom: "2px solid #e5e7eb",
};

const tableTd = {
  padding: "12px 16px", fontSize: 13, color: "#475569",
};

const pillStyle = {
  display: "inline-block", fontSize: 11, fontWeight: 600,
  padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap",
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

const btnPrimaryHeader = {
  display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
  backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: 12,
  fontSize: 14, fontWeight: 500, cursor: "pointer",
  boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
};

const btnIcon = (color) => ({
  padding: "6px 10px",
  backgroundColor: color === "#ef4444" ? "#fef2f2" : "#f5f3ff",
  color: color,
  border: `1px solid ${color === "#ef4444" ? "#fecaca" : "#e9e5ff"}`,
  borderRadius: 8, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
});