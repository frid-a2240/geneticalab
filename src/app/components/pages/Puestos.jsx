// src/components/pages/Puestos.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Search, Plus, Briefcase, Building2, Edit, Trash2,
  X, AlertCircle, GraduationCap, Award, Brain, Target, Users
} from "lucide-react";

export default function Puestos() {
  const [puestos, setPuestos] = useState([]);
  const [empleadosPorPuesto, setEmpleadosPorPuesto] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepto, setFilterDepto] = useState("Todos");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({
    nombre: "", departamento: "", reporta_a: "",
    edad_minima: "22 años en adelante", sexo: "Indistinto",
    escolaridad: "", conocimientos: "", experiencia: "",
    habilidades: "", objetivo_puesto: "",
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [puestosRes, empRes] = await Promise.all([
      supabase.from("puestos").select("*").eq("activo", true).order("departamento, nombre"),
      supabase.from("empleados").select("puesto_id"),
    ]);
    setPuestos(puestosRes.data || []);

    // Contar empleados por puesto
    const conteo = {};
    (empRes.data || []).forEach((e) => {
      if (e.puesto_id) conteo[e.puesto_id] = (conteo[e.puesto_id] || 0) + 1;
    });
    setEmpleadosPorPuesto(conteo);
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      nombre: "", departamento: "", reporta_a: "",
      edad_minima: "22 años en adelante", sexo: "Indistinto",
      escolaridad: "", conocimientos: "", experiencia: "",
      habilidades: "", objetivo_puesto: "",
    });
    setErrorMsg("");
    setShowModal(true);
  }

  function openEdit(puesto) {
    setEditingId(puesto.id);
    setForm({
      nombre: puesto.nombre || "",
      departamento: puesto.departamento || "",
      reporta_a: puesto.reporta_a || "",
      edad_minima: puesto.edad_minima || "",
      sexo: puesto.sexo || "Indistinto",
      escolaridad: puesto.escolaridad || "",
      conocimientos: puesto.conocimientos || "",
      experiencia: puesto.experiencia || "",
      habilidades: puesto.habilidades || "",
      objetivo_puesto: puesto.objetivo_puesto || "",
    });
    setErrorMsg("");
    setShowModal(true);
  }

  async function handleSave() {
    setErrorMsg("");
    if (!form.nombre.trim() || !form.departamento.trim()) {
      setErrorMsg("Nombre y departamento son obligatorios.");
      return;
    }
    setSaving(true);

    const payload = {
      nombre: form.nombre.trim(),
      departamento: form.departamento.trim(),
      reporta_a: form.reporta_a.trim(),
      edad_minima: form.edad_minima.trim(),
      sexo: form.sexo,
      escolaridad: form.escolaridad.trim(),
      conocimientos: form.conocimientos.trim(),
      experiencia: form.experiencia.trim(),
      habilidades: form.habilidades.trim(),
      objetivo_puesto: form.objetivo_puesto.trim(),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("puestos").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("puestos").insert(payload));
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

  async function handleDelete(puesto) {
    const empCount = empleadosPorPuesto[puesto.id] || 0;
    if (empCount > 0) {
      alert(`No se puede eliminar: hay ${empCount} empleado(s) asignados a este puesto.`);
      return;
    }
    if (!confirm(`¿Eliminar el puesto "${puesto.nombre}"?`)) return;

    // Soft delete
    const { error } = await supabase
      .from("puestos")
      .update({ activo: false })
      .eq("id", puesto.id);

    if (error) {
      alert("Error: " + error.message);
      return;
    }
    fetchData();
  }

  const deptos = [...new Set(puestos.map((p) => p.departamento).filter(Boolean))];
  const filtered = puestos.filter((p) => {
    const matchSearch = `${p.nombre} ${p.departamento}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (filterDepto === "Todos" || p.departamento === filterDepto);
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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Catálogo de Puestos</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            {puestos.length} puestos registrados · {deptos.length} departamentos
          </p>
        </div>
        <button onClick={openCreate} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
          backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: 12,
          fontSize: 14, fontWeight: 500, cursor: "pointer",
          boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
        }}>
          <Plus size={18} /><span>Nuevo Puesto</span>
        </button>
      </div>

      {/* Filters */}
      <div style={{ ...cardBase, padding: 20 }}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input type="text" placeholder="Buscar puesto o departamento..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%", paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
              backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12,
              fontSize: 14, outline: "none", boxSizing: "border-box",
            }} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["Todos", ...deptos].map((d) => (
            <button key={d} onClick={() => setFilterDepto(d)} style={{
              padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
              border: filterDepto === d ? "2px solid #7c3aed" : "2px solid #e5e7eb",
              backgroundColor: filterDepto === d ? "#7c3aed" : "#fff",
              color: filterDepto === d ? "#fff" : "#475569",
              cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap",
            }}>{d}</button>
          ))}
        </div>
      </div>

      {/* Lista de Puestos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {filtered.map((puesto) => {
          const empCount = empleadosPorPuesto[puesto.id] || 0;
          return (
            <div key={puesto.id} style={{
              ...cardBase, padding: 20,
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-3px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(124,58,237,0.3)", flexShrink: 0,
                }}>
                  <Briefcase size={20} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", margin: 0, lineHeight: 1.3 }}>
                    {puesto.nombre}
                  </h3>
                  <p style={{ fontSize: 12, color: "#7c3aed", margin: "4px 0 0 0", fontWeight: 600 }}>
                    {puesto.departamento}
                  </p>
                </div>
              </div>

              {puesto.objetivo_puesto && (
                <p style={{
                  fontSize: 12, color: "#475569", lineHeight: 1.5, margin: "0 0 14px 0",
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {puesto.objetivo_puesto}
                </p>
              )}

              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", backgroundColor: "#f8fafc",
                borderRadius: 10, marginBottom: 14,
              }}>
                <Users size={14} color="#7c3aed" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "#1e1b4b" }}>
                  {empCount}
                </span>
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  {empCount === 1 ? "empleado asignado" : "empleados asignados"}
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                <button onClick={() => openEdit(puesto)} style={{
                  flex: 1, padding: "8px",
                  backgroundColor: "#f5f3ff", color: "#7c3aed",
                  border: "1px solid #e9e5ff", borderRadius: 8,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <Edit size={13} />Editar
                </button>
                <button onClick={() => handleDelete(puesto)} style={{
                  flex: 1, padding: "8px",
                  backgroundColor: empCount > 0 ? "#f1f5f9" : "#fef2f2",
                  color: empCount > 0 ? "#94a3b8" : "#b91c1c",
                  border: empCount > 0 ? "1px solid #e2e8f0" : "1px solid #fecaca",
                  borderRadius: 8, fontSize: 12, fontWeight: 600,
                  cursor: empCount > 0 ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                  <Trash2 size={13} />Eliminar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
          <Briefcase size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>No hay puestos registrados.</p>
        </div>
      )}

      {/* ====== MODAL ====== */}
      {showModal && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 640,
            maxHeight: "92vh", overflowY: "auto",
            boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
              position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1,
              borderRadius: "20px 20px 0 0",
            }}>
              <div>
                <h3 style={{ fontWeight: 700, color: "#1e1b4b", margin: 0, fontSize: 18 }}>
                  {editingId ? "Editar Puesto" : "Nuevo Puesto"}
                </h3>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0 0" }}>
                  Descriptivo del puesto (Formato P-RH-007/F-561)
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{
                padding: 6, border: "none", background: "none", cursor: "pointer", borderRadius: 8,
              }}>
                <X size={20} color="#94a3b8" />
              </button>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Información básica */}
              <SectionTitle icon={Briefcase} text="Información del Puesto" />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Nombre del puesto *">
                  <input type="text" value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Operador de Producción C" style={inputStyle} />
                </Field>
                <Field label="Departamento *">
                  <input type="text" value={form.departamento}
                    onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                    placeholder="Ej: Fabricación" style={inputStyle} />
                </Field>
              </div>

              <Field label="Reporta a">
                <input type="text" value={form.reporta_a}
                  onChange={(e) => setForm({ ...form, reporta_a: e.target.value })}
                  placeholder="Ej: Supervisor de Producción" style={inputStyle} />
              </Field>

              {/* Requerimientos */}
              <SectionTitle icon={Target} text="Requerimientos del Puesto" />

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <Field label="Edad mínima">
                  <input type="text" value={form.edad_minima}
                    onChange={(e) => setForm({ ...form, edad_minima: e.target.value })}
                    placeholder="Ej: 22 años en adelante" style={inputStyle} />
                </Field>
                <Field label="Sexo">
                  <select value={form.sexo}
                    onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                    style={inputStyle}>
                    <option value="Indistinto">Indistinto</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </Field>
              </div>

              <Field label="Escolaridad">
                <input type="text" value={form.escolaridad}
                  onChange={(e) => setForm({ ...form, escolaridad: e.target.value })}
                  placeholder="Ej: Deseable Bachillerato" style={inputStyle} />
              </Field>

              <Field label="Conocimientos requeridos">
                <textarea value={form.conocimientos}
                  onChange={(e) => setForm({ ...form, conocimientos: e.target.value })}
                  placeholder="Técnicos requeridos, buenas prácticas..." rows={3}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
              </Field>

              <Field label="Experiencia">
                <textarea value={form.experiencia}
                  onChange={(e) => setForm({ ...form, experiencia: e.target.value })}
                  placeholder="Mínimo 6 meses en el área de producción..." rows={2}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
              </Field>

              <Field label="Habilidades">
                <textarea value={form.habilidades}
                  onChange={(e) => setForm({ ...form, habilidades: e.target.value })}
                  placeholder="Trabajo en equipo, orientación a resultados..." rows={2}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
              </Field>

              {/* Objetivo */}
              <SectionTitle icon={Award} text="Objetivo del Puesto" />

              <Field label="Objetivo">
                <textarea value={form.objetivo_puesto}
                  onChange={(e) => setForm({ ...form, objetivo_puesto: e.target.value })}
                  placeholder="Garantizar el correcto funcionamiento de..." rows={3}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
              </Field>

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

            <div style={{
              display: "flex", gap: 12, padding: "18px 24px",
              borderTop: "1px solid #e5e7eb", backgroundColor: "#f8fafc",
              borderRadius: "0 0 20px 20px",
            }}>
              <button onClick={() => setShowModal(false)} style={btnCancel}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={btnPrimary}>
                {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear Puesto"}
              </button>
            </div>
          </div>
        </div>
      )}
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

function SectionTitle({ icon: Icon, text }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginTop: 8, paddingBottom: 6, borderBottom: "2px solid #f1f5f9",
    }}>
      <Icon size={15} color="#7c3aed" />
      <span style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>{text}</span>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  backgroundColor: "#f8fafc",
  border: "2px solid #e5e7eb",
  borderRadius: 10,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

const btnCancel = {
  flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#475569",
  border: "2px solid #d1d5db", borderRadius: 12, backgroundColor: "#fff",
  cursor: "pointer",
};

const btnPrimary = {
  flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#fff",
  backgroundColor: "#7c3aed", border: "none", borderRadius: 12,
  cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
};