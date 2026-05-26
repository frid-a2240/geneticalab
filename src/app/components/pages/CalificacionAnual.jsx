// src/app/components/pages/CalificacionAnual.jsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Search, Plus, X, Save, AlertCircle, Edit, Trash2, FileText,
  Award, TrendingUp, ChevronDown, ChevronUp, CheckCircle, Eye, Printer,
  Briefcase, Calendar, Hash, User, Users, Building2,
} from "lucide-react";

const ESCALA = [
  { min: 0, max: 59.99, label: "Bajo/Necesita Mejorar", color: "#b91c1c", bg: "#fef2f2", gradient: "linear-gradient(135deg, #ef4444, #dc2626)" },
  { min: 60, max: 79.99, label: "Regular", color: "#d97706", bg: "#fffbeb", gradient: "linear-gradient(135deg, #f59e0b, #d97706)" },
  { min: 80, max: 89.99, label: "Estándar", color: "#1d4ed8", bg: "#eff6ff", gradient: "linear-gradient(135deg, #3b82f6, #2563eb)" },
  { min: 90, max: 95.99, label: "Destacado", color: "#047857", bg: "#ecfdf5", gradient: "linear-gradient(135deg, #10b981, #059669)" },
  { min: 96, max: 100, label: "Excepcional", color: "#5b21b6", bg: "#f5f3ff", gradient: "linear-gradient(135deg, #8b5cf6, #6d28d9)" },
];

function getEscala(porcentaje) {
  if (porcentaje === null || porcentaje === undefined || isNaN(porcentaje)) return null;
  return ESCALA.find((e) => porcentaje >= e.min && porcentaje <= e.max) || ESCALA[0];
}

export default function CalificacionAnual() {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAno, setFilterAno] = useState(new Date().getFullYear());
  const [filterResultado, setFilterResultado] = useState("Todos");

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPrintView, setShowPrintView] = useState(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [evalRes, empRes] = await Promise.all([
      supabase
        .from("calificacion_anual")
        .select("*")
        .order("ano", { ascending: false })
        .order("updated_at", { ascending: false }),
      supabase
        .from("empleados")
        .select("clave, nombre, puesto, depto, fec_ingreso, jefe_directo")
        .order("nombre"),
    ]);

    const empMap = {};
    (empRes.data || []).forEach((e) => (empMap[e.clave] = e));

    const enriched = (evalRes.data || []).map((ev) => ({
      ...ev,
      empleado: empMap[ev.emp_clave] || null,
    }));

    setEvaluaciones(enriched);
    setEmpleados(empRes.data || []);
    setLoading(false);
  }

  function openCreate() {
    setEditingId(null);
    setShowFormModal(true);
  }

  function openEdit(ev) {
    setEditingId(ev.id);
    setShowFormModal(true);
  }

  async function handleDelete(ev) {
    if (!confirm(`¿Eliminar la evaluación de ${ev.empleado?.nombre} del año ${ev.ano}?`)) return;
    await supabase.from("calificacion_anual").delete().eq("id", ev.id);
    fetchData();
  }

  const anos = useMemo(() => {
    const set = new Set(evaluaciones.map((e) => e.ano));
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [evaluaciones]);

  const filtered = useMemo(() => {
    return evaluaciones.filter((ev) => {
      const matchSearch = `${ev.empleado?.nombre || ""} ${ev.emp_clave} ${ev.empleado?.puesto || ""}`
        .toLowerCase().includes(searchTerm.toLowerCase());
      const matchAno = ev.ano === filterAno;
      const escala = getEscala(ev.porcentaje_final);
      const matchResultado = filterResultado === "Todos" || escala?.label === filterResultado;
      return matchSearch && matchAno && matchResultado;
    });
  }, [evaluaciones, searchTerm, filterAno, filterResultado]);

  const stats = useMemo(() => {
    const delAno = evaluaciones.filter((e) => e.ano === filterAno);
    const conResultado = delAno.filter((e) => e.porcentaje_final !== null);
    const promedio = conResultado.length > 0
      ? conResultado.reduce((s, e) => s + Number(e.porcentaje_final), 0) / conResultado.length
      : 0;

    const porEscala = {};
    ESCALA.forEach((es) => { porEscala[es.label] = 0; });
    conResultado.forEach((e) => {
      const es = getEscala(e.porcentaje_final);
      if (es) porEscala[es.label]++;
    });

    return {
      total: delAno.length,
      evaluados: conResultado.length,
      pendientes: delAno.length - conResultado.length,
      promedio: promedio.toFixed(1),
      porEscala,
    };
  }, [evaluaciones, filterAno]);

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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>
            Calificación Anual del Personal
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            Formato P-RH-007/F-124 · Evaluación anual con 5 rubros ponderados
          </p>
        </div>
        <button onClick={openCreate} style={btnPrimaryHeader}>
          <Plus size={18} /><span>Nueva Evaluación</span>
        </button>
      </div>

      {/* Stats por escala */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {ESCALA.map((es) => (
          <div key={es.label} style={{
            background: es.gradient, borderRadius: 14, padding: "16px 20px",
            color: "#fff", boxShadow: `0 6px 20px ${es.color}40`,
          }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.85)", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {es.label}
            </p>
            <p style={{ fontSize: 28, fontWeight: 800, margin: "6px 0 0 0", lineHeight: 1 }}>
              {stats.porEscala[es.label] || 0}
            </p>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", margin: "4px 0 0 0" }}>
              {es.min}-{es.max === 100 ? 100 : es.max}%
            </p>
          </div>
        ))}
      </div>

      {/* Resumen general */}
      <div style={{ ...cardBase, padding: 20, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
        <ResumenStat label="Total Evaluaciones" value={stats.total} color="#7c3aed" icon={FileText} />
        <ResumenStat label="Completadas" value={stats.evaluados} color="#10b981" icon={CheckCircle} />
        <ResumenStat label="Pendientes" value={stats.pendientes} color="#f59e0b" icon={Edit} />
        <ResumenStat label="Promedio General" value={`${stats.promedio}%`} color="#3b82f6" icon={TrendingUp} />
      </div>

      {/* Filtros */}
      <div style={{ ...cardBase, padding: 20 }}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input type="text" placeholder="Buscar por nombre, clave o puesto..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInput} />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <select value={filterAno} onChange={(e) => setFilterAno(parseInt(e.target.value))} style={selectFilter}>
            {anos.map((a) => <option key={a} value={a}>Año {a}</option>)}
          </select>
          <div style={{ width: 1, height: 28, backgroundColor: "#e5e7eb" }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <PillFilter active={filterResultado === "Todos"}
              onClick={() => setFilterResultado("Todos")} label="Todos" />
            {ESCALA.map((es) => (
              <PillFilter key={es.label} active={filterResultado === es.label}
                onClick={() => setFilterResultado(es.label)} label={es.label} color={es.color} />
            ))}
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ ...cardBase, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                {["Empleado", "Puesto", "Criterios", "Desempeño", "Desc. Puesto", "Eval 360°", "Capacit.", "Total", "Resultado", "Acciones"].map((h) => (
                  <th key={h} style={tableTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev) => {
                const escala = getEscala(ev.porcentaje_final);
                return (
                  <tr key={ev.id} style={{ borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#faf8ff"}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                  >
                    <td style={tableTd}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>
                          {ev.empleado?.nombre || ev.emp_clave}
                        </p>
                        <p style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace", margin: "2px 0 0 0" }}>
                          {ev.emp_clave}
                        </p>
                      </div>
                    </td>
                    <td style={{ ...tableTd, fontSize: 12, color: "#64748b", maxWidth: 160 }}>
                      {ev.empleado?.puesto || "—"}
                    </td>
                    <td style={tableTd}><MiniScore valor={ev.crit_total} max={5} /></td>
                    <td style={tableTd}><MiniScore valor={ev.desem_total} max={70} /></td>
                    <td style={tableTd}><MiniScore valor={ev.desc_total} max={4.5} /></td>
                    <td style={tableTd}><MiniScore valor={ev.eval360_total} max={9.4} /></td>
                    <td style={tableTd}><MiniScore valor={ev.cap_total} max={9.8} /></td>
                    <td style={tableTd}>
                      <span style={{
                        fontSize: 15, fontWeight: 800, color: "#1e1b4b",
                      }}>
                        {ev.porcentaje_final !== null ? `${Number(ev.porcentaje_final).toFixed(1)}%` : "—"}
                      </span>
                    </td>
                    <td style={tableTd}>
                      {escala ? (
                        <span style={{
                          display: "inline-block",
                          padding: "5px 12px", borderRadius: 999,
                          fontSize: 11, fontWeight: 700,
                          color: escala.color, backgroundColor: escala.bg,
                          border: `1px solid ${escala.color}40`,
                          whiteSpace: "nowrap",
                        }}>
                          {escala.label}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>Sin evaluar</span>
                      )}
                    </td>
                    <td style={tableTd}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button onClick={() => setShowPrintView(ev)} style={btnIcon("#7c3aed")} title="Ver/Imprimir">
                          <Printer size={13} />
                        </button>
                        <button onClick={() => openEdit(ev)} style={btnIcon("#3b82f6")} title="Editar">
                          <Edit size={13} />
                        </button>
                        <button onClick={() => handleDelete(ev)} style={btnIcon("#ef4444")} title="Eliminar">
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
            <FileText size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No hay evaluaciones con esos filtros.</p>
          </div>
        )}
      </div>

      {/* MODAL FORMULARIO F-124 */}
      {showFormModal && (
        <FormCalificacionF124
          editingId={editingId}
          empleados={empleados}
          evaluaciones={evaluaciones}
          onClose={() => { setShowFormModal(false); fetchData(); }}
        />
      )}

      {/* MODAL VISTA IMPRIMIBLE */}
      {showPrintView && (
        <PrintView evaluacion={showPrintView} onClose={() => setShowPrintView(null)} />
      )}
    </div>
  );
}

/* =========================================================
   FORMULARIO F-124 — REPLICA DEL PDF
   ========================================================= */

function FormCalificacionF124({ editingId, empleados, evaluaciones, onClose }) {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [autoCalcCap, setAutoCalcCap] = useState(true);

  const [form, setForm] = useState({
    emp_clave: "",
    ano: new Date().getFullYear(),
    jefe_directo: "",
    fecha_calificacion: new Date().toISOString().split("T")[0],
    periodo_inicio: "",
    periodo_fin: "",

    // I. Criterios
    crit_puntualidad: 0,
    crit_asistencia: 0,
    crit_equipo_pp: 0,
    crit_disponibilidad: 0,

    // II. Desempeño
    desem_examen: 0,
    desem_estudio_caso: 0,
    desem_cotejo: 0,
    desem_eval_registros: 0,

    // III. Descriptivo
    desc_escolaridad: 0,
    desc_experiencia: 0,
    desc_conocimientos: 0,

    // IV. Evaluación 360°
    eval360_jefe: 0,
    eval360_colega: 0,
    eval360_cliente: 0,
    eval360_personal: 0,

    // V. Capacitación
    cap_promedio: 0,

    observaciones: "",
  });

  useEffect(() => {
    if (editingId) {
      const ev = evaluaciones.find((e) => e.id === editingId);
      if (ev) {
        setForm({
          emp_clave: ev.emp_clave,
          ano: ev.ano,
          jefe_directo: ev.jefe_directo || "",
          fecha_calificacion: ev.fecha_calificacion || new Date().toISOString().split("T")[0],
          periodo_inicio: ev.periodo_inicio || "",
          periodo_fin: ev.periodo_fin || "",
          crit_puntualidad: Number(ev.crit_puntualidad) || 0,
          crit_asistencia: Number(ev.crit_asistencia) || 0,
          crit_equipo_pp: Number(ev.crit_equipo_pp) || 0,
          crit_disponibilidad: Number(ev.crit_disponibilidad) || 0,
          desem_examen: Number(ev.desem_examen) || 0,
          desem_estudio_caso: Number(ev.desem_estudio_caso) || 0,
          desem_cotejo: Number(ev.desem_cotejo) || 0,
          desem_eval_registros: Number(ev.desem_eval_registros) || 0,
          desc_escolaridad: Number(ev.desc_escolaridad) || 0,
          desc_experiencia: Number(ev.desc_experiencia) || 0,
          desc_conocimientos: Number(ev.desc_conocimientos) || 0,
          eval360_jefe: Number(ev.eval360_jefe) || 0,
          eval360_colega: Number(ev.eval360_colega) || 0,
          eval360_cliente: Number(ev.eval360_cliente) || 0,
          eval360_personal: Number(ev.eval360_personal) || 0,
          cap_promedio: Number(ev.cap_promedio) || 0,
          observaciones: ev.observaciones || "",
        });
      }
    }
  }, [editingId, evaluaciones]);

  const empSeleccionado = empleados.find((e) => e.clave === form.emp_clave);

  // Cuando cambia el empleado, autocompletar jefe_directo y calcular cap_promedio
  useEffect(() => {
    if (!form.emp_clave) return;
    const emp = empleados.find((e) => e.clave === form.emp_clave);
    if (emp?.jefe_directo && !form.jefe_directo) {
      setForm((f) => ({ ...f, jefe_directo: emp.jefe_directo }));
    }
    if (autoCalcCap) calcularPromedioCapacitaciones();
  }, [form.emp_clave, form.ano]);

  async function calcularPromedioCapacitaciones() {
    if (!form.emp_clave) return;
    const { data } = await supabase
      .from("matriz_empleado")
      .select("calificacion_numerica, cumple, satisfactorio, tipo_aceptacion_snap")
      .eq("emp_clave", form.emp_clave)
      .eq("ano", form.ano)
      .eq("completado", true)
      .eq("cap_eliminada", false);

    if (!data || data.length === 0) {
      setForm((f) => ({ ...f, cap_promedio: 0 }));
      return;
    }

    // Convertir todo a escala 0-100
    const valores = data.map((c) => {
      if (c.tipo_aceptacion_snap === "numerico" && c.calificacion_numerica !== null) {
        return Number(c.calificacion_numerica) * 10; // 0-10 → 0-100
      }
      if (c.tipo_aceptacion_snap === "cumple") return c.cumple ? 100 : 0;
      if (c.tipo_aceptacion_snap === "satisfactorio") return c.satisfactorio ? 100 : 0;
      return null;
    }).filter((v) => v !== null);

    if (valores.length === 0) {
      setForm((f) => ({ ...f, cap_promedio: 0 }));
      return;
    }

    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    setForm((f) => ({ ...f, cap_promedio: parseFloat(promedio.toFixed(2)) }));
  }

  // CÁLCULOS EN VIVO
  const calc = useMemo(() => {
    const crit_total = ((Number(form.crit_puntualidad) + Number(form.crit_asistencia) +
      Number(form.crit_equipo_pp) + Number(form.crit_disponibilidad)) / 4) * 0.05;

    const desem_total = (Number(form.desem_examen) * 0.20) +
      (Number(form.desem_estudio_caso) * 0.10) +
      (Number(form.desem_cotejo) * 0.25) +
      (Number(form.desem_eval_registros) * 0.15);

    const desc_total = ((Number(form.desc_escolaridad) * 0.80) +
      (Number(form.desc_experiencia) * 0.10) +
      (Number(form.desc_conocimientos) * 0.10)) * 0.045;

    const eval360_total = ((Number(form.eval360_jefe) * 0.40) +
      (Number(form.eval360_colega) * 0.20) +
      (Number(form.eval360_cliente) * 0.30) +
      (Number(form.eval360_personal) * 0.10)) * 0.094;

    const cap_total = Number(form.cap_promedio) * 0.098;

    const total = crit_total + desem_total + desc_total + eval360_total + cap_total;

    return {
      crit_total: crit_total.toFixed(2),
      desem_total: desem_total.toFixed(2),
      desc_total: desc_total.toFixed(2),
      eval360_total: eval360_total.toFixed(2),
      cap_total: cap_total.toFixed(2),
      total: total.toFixed(2),
    };
  }, [form]);

  const escala = getEscala(parseFloat(calc.total));

  async function handleGuardar() {
    setErrorMsg("");
    if (!form.emp_clave) {
      setErrorMsg("Selecciona un empleado.");
      return;
    }
    setSaving(true);

    const payload = {
      emp_clave: form.emp_clave,
      ano: parseInt(form.ano),
      jefe_directo: form.jefe_directo,
      fecha_calificacion: form.fecha_calificacion,
      periodo_inicio: form.periodo_inicio || null,
      periodo_fin: form.periodo_fin || null,
      crit_puntualidad: Number(form.crit_puntualidad) || 0,
      crit_asistencia: Number(form.crit_asistencia) || 0,
      crit_equipo_pp: Number(form.crit_equipo_pp) || 0,
      crit_disponibilidad: Number(form.crit_disponibilidad) || 0,
      desem_examen: Number(form.desem_examen) || 0,
      desem_estudio_caso: Number(form.desem_estudio_caso) || 0,
      desem_cotejo: Number(form.desem_cotejo) || 0,
      desem_eval_registros: Number(form.desem_eval_registros) || 0,
      desc_escolaridad: Number(form.desc_escolaridad) || 0,
      desc_experiencia: Number(form.desc_experiencia) || 0,
      desc_conocimientos: Number(form.desc_conocimientos) || 0,
      eval360_jefe: Number(form.eval360_jefe) || 0,
      eval360_colega: Number(form.eval360_colega) || 0,
      eval360_cliente: Number(form.eval360_cliente) || 0,
      eval360_personal: Number(form.eval360_personal) || 0,
      cap_promedio: Number(form.cap_promedio) || 0,
      resultado: escala?.label || null,
      observaciones: form.observaciones,
      estatus: "completada",
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("calificacion_anual").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("calificacion_anual").upsert(payload, { onConflict: "emp_clave,ano" }));
    }

    if (error) {
      setErrorMsg("Error: " + error.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
  }

  return (
    <div style={modalOverlay}>
      <div style={{
        backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 880,
        maxHeight: "94vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          borderRadius: "20px 20px 0 0",
        }}>
          <div style={{ color: "#fff" }}>
            <p style={{ fontSize: 10, fontWeight: 700, margin: 0, letterSpacing: "0.15em", color: "#c4b5fd" }}>
              P-RH-007/F-124
            </p>
            <h3 style={{ fontWeight: 700, margin: "2px 0 0 0", fontSize: 19 }}>
              {editingId ? "Editar" : "Nueva"} Calificación del Personal
            </h3>
          </div>
          <button onClick={onClose} style={{
            padding: 6, border: "none", background: "rgba(255,255,255,0.1)",
            cursor: "pointer", borderRadius: 8, color: "#fff",
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {/* Datos generales */}
          <Section icon={User} title="Datos del Evaluado">
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <Field label="Empleado *">
                <select value={form.emp_clave}
                  onChange={(e) => setForm({ ...form, emp_clave: e.target.value })}
                  disabled={!!editingId}
                  style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {empleados.map((e) => (
                    <option key={e.clave} value={e.clave}>
                      {e.clave} — {e.nombre}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Año *">
                <input type="number" value={form.ano}
                  onChange={(e) => setForm({ ...form, ano: e.target.value })}
                  disabled={!!editingId}
                  style={inputStyle} />
              </Field>
            </div>

            {empSeleccionado && (
              <div style={{
                marginTop: 10, padding: 12,
                backgroundColor: "#f5f3ff", borderRadius: 10,
                border: "1px solid #e9e5ff",
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
              }}>
                <InfoMini icon={Briefcase} label="Puesto" value={empSeleccionado.puesto || "—"} />
                <InfoMini icon={Building2} label="Depto" value={empSeleccionado.depto || "—"} />
                <InfoMini icon={Calendar} label="Ingreso" value={empSeleccionado.fec_ingreso || "—"} />
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
              <Field label="Jefe Directo">
                <input type="text" value={form.jefe_directo}
                  onChange={(e) => setForm({ ...form, jefe_directo: e.target.value })}
                  placeholder="Nombre del jefe" style={inputStyle} />
              </Field>
              <Field label="Período Inicio">
                <input type="date" value={form.periodo_inicio}
                  onChange={(e) => setForm({ ...form, periodo_inicio: e.target.value })}
                  style={inputStyle} />
              </Field>
              <Field label="Período Fin">
                <input type="date" value={form.periodo_fin}
                  onChange={(e) => setForm({ ...form, periodo_fin: e.target.value })}
                  style={inputStyle} />
              </Field>
            </div>
          </Section>

          {/* I. CRITERIOS */}
          <RubroSection
            roman="I"
            title="Criterios"
            ponderacion="5%"
            color="#3b82f6"
            total={calc.crit_total}
          >
            <ScoreInput label="A · Puntualidad" value={form.crit_puntualidad}
              onChange={(v) => setForm({ ...form, crit_puntualidad: v })} />
            <ScoreInput label="B · Asistencia" value={form.crit_asistencia}
              onChange={(v) => setForm({ ...form, crit_asistencia: v })} />
            <ScoreInput label="C · Equipo PP" value={form.crit_equipo_pp}
              onChange={(v) => setForm({ ...form, crit_equipo_pp: v })} />
            <ScoreInput label="D · Disponibilidad" value={form.crit_disponibilidad}
              onChange={(v) => setForm({ ...form, crit_disponibilidad: v })} />
          </RubroSection>

          {/* II. DESEMPEÑO */}
          <RubroSection
            roman="II"
            title="Desempeño"
            ponderacion="70%"
            color="#10b981"
            total={calc.desem_total}
          >
            <ScoreInput label="E · Examen (20%)" value={form.desem_examen}
              onChange={(v) => setForm({ ...form, desem_examen: v })} weight="20%" />
            <ScoreInput label="F · Estudio de Caso (10%)" value={form.desem_estudio_caso}
              onChange={(v) => setForm({ ...form, desem_estudio_caso: v })} weight="10%" />
            <ScoreInput label="G · Cotejo de Actividad (25%)" value={form.desem_cotejo}
              onChange={(v) => setForm({ ...form, desem_cotejo: v })} weight="25%" />
            <ScoreInput label="H · Evaluación de Registros (15%)" value={form.desem_eval_registros}
              onChange={(v) => setForm({ ...form, desem_eval_registros: v })} weight="15%" />
          </RubroSection>

          {/* III. DESCRIPTIVO */}
          <RubroSection
            roman="III"
            title="Descriptivo de Puesto"
            ponderacion="4.5%"
            color="#f59e0b"
            total={calc.desc_total}
          >
            <ScoreInput label="Escolaridad (80%)" value={form.desc_escolaridad}
              onChange={(v) => setForm({ ...form, desc_escolaridad: v })} weight="80%" />
            <ScoreInput label="Experiencia (10%)" value={form.desc_experiencia}
              onChange={(v) => setForm({ ...form, desc_experiencia: v })} weight="10%" />
            <ScoreInput label="Conocimientos (10%)" value={form.desc_conocimientos}
              onChange={(v) => setForm({ ...form, desc_conocimientos: v })} weight="10%" />
          </RubroSection>

          {/* IV. EVAL 360 */}
          <RubroSection
            roman="IV"
            title="Evaluación 360°"
            ponderacion="9.4%"
            color="#ec4899"
            total={calc.eval360_total}
          >
            <ScoreInput label="Jefe (40%)" value={form.eval360_jefe}
              onChange={(v) => setForm({ ...form, eval360_jefe: v })} weight="40%" />
            <ScoreInput label="Colega (20%)" value={form.eval360_colega}
              onChange={(v) => setForm({ ...form, eval360_colega: v })} weight="20%" />
            <ScoreInput label="Cliente (30%)" value={form.eval360_cliente}
              onChange={(v) => setForm({ ...form, eval360_cliente: v })} weight="30%" />
            <ScoreInput label="Personal a Cargo (10%)" value={form.eval360_personal}
              onChange={(v) => setForm({ ...form, eval360_personal: v })} weight="10%" />
          </RubroSection>

          {/* V. CAPACITACIÓN */}
          <RubroSection
            roman="V"
            title="Capacitación"
            ponderacion="9.8%"
            color="#8b5cf6"
            total={calc.cap_total}
            extra={
              <button onClick={calcularPromedioCapacitaciones}
                style={{
                  fontSize: 11, padding: "6px 12px",
                  backgroundColor: "#f5f3ff", color: "#7c3aed",
                  border: "1px solid #e9e5ff", borderRadius: 8,
                  cursor: "pointer", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                <TrendingUp size={12} />
                Recalcular desde matriz_empleado
              </button>
            }
          >
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Promedio de Capacitaciones del Año (0-100)">
                <input type="number" min="0" max="100" step="0.1"
                  value={form.cap_promedio}
                  onChange={(e) => {
                    setAutoCalcCap(false);
                    setForm({ ...form, cap_promedio: e.target.value });
                  }}
                  style={{ ...inputStyle, fontSize: 16, fontWeight: 700, textAlign: "center" }} />
              </Field>
              <p style={{ fontSize: 11, color: "#64748b", margin: "6px 0 0 0", fontStyle: "italic" }}>
                💡 Click en "Recalcular" para promediar automáticamente las capacitaciones completadas en {form.ano}.
              </p>
            </div>
          </RubroSection>

          {/* Observaciones */}
          <Section icon={FileText} title="Observaciones">
            <textarea value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              placeholder="Conclusión, recomendaciones, plan de acción..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          </Section>

          {errorMsg && (
            <div style={{ ...errorBanner, marginTop: 14 }}>
              <AlertCircle size={14} />{errorMsg}
            </div>
          )}
        </div>

        {/* Footer con totales */}
        <div style={{
          padding: "18px 24px", borderTop: "2px solid #e5e7eb",
          backgroundColor: "#f8fafc", borderRadius: "0 0 20px 20px",
        }}>
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1.5fr",
            gap: 12, marginBottom: 14,
          }}>
            <MiniTotal label="I. Criterios" value={calc.crit_total} max={5} />
            <MiniTotal label="II. Desempeño" value={calc.desem_total} max={70} />
            <MiniTotal label="III. Desc." value={calc.desc_total} max={4.5} />
            <MiniTotal label="IV. 360°" value={calc.eval360_total} max={9.4} />
            <MiniTotal label="V. Capacit." value={calc.cap_total} max={9.8} />
            <div style={{
              padding: "10px 14px",
              background: escala?.gradient || "linear-gradient(135deg, #94a3b8, #64748b)",
              borderRadius: 10, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              boxShadow: `0 4px 12px ${escala?.color || "#64748b"}40`,
            }}>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, margin: 0, opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Total Final
                </p>
                <p style={{ fontSize: 22, fontWeight: 800, margin: "2px 0 0 0", lineHeight: 1 }}>
                  {calc.total}%
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 8, fontWeight: 700, margin: 0, opacity: 0.85, textTransform: "uppercase" }}>
                  Resultado
                </p>
                <p style={{ fontSize: 12, fontWeight: 700, margin: "2px 0 0 0" }}>
                  {escala?.label || "—"}
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={onClose} style={btnCancel}>Cancelar</button>
            <button onClick={handleGuardar} disabled={saving || !form.emp_clave} style={btnPrimary}>
              <Save size={16} />
              {saving ? "Guardando..." : "Guardar Evaluación"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   VISTA IMPRIMIBLE
   ========================================================= */

function PrintView({ evaluacion, onClose }) {
  const escala = getEscala(evaluacion.porcentaje_final);

  function handlePrint() {
    window.print();
  }

  return (
    <div style={modalOverlay}>
      <div style={{
        backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 900,
        maxHeight: "94vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid #e5e7eb",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }} className="no-print">
          <h3 style={{ fontWeight: 700, color: "#1e1b4b", margin: 0, fontSize: 16 }}>
            Vista Previa · Calificación del Personal
          </h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handlePrint} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", backgroundColor: "#7c3aed",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>
              <Printer size={14} />Imprimir
            </button>
            <button onClick={onClose} style={{
              padding: 6, border: "none", background: "none", cursor: "pointer", borderRadius: 8,
            }}>
              <X size={20} color="#94a3b8" />
            </button>
          </div>
        </div>

        {/* Print content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 32, backgroundColor: "#f8fafc" }} id="print-area">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              #print-area, #print-area * { visibility: visible; }
              #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px !important; background: #fff !important; }
              .no-print { display: none !important; }
            }
          `}</style>

          <div style={{
            backgroundColor: "#fff", padding: 32, borderRadius: 12,
            border: "1px solid #e5e7eb",
          }}>
            {/* Encabezado */}
            <div style={{ textAlign: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #1e1b4b" }}>
              <p style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, margin: 0, letterSpacing: "0.15em" }}>
                P-RH-007/F-124
              </p>
              <h1 style={{ fontSize: 18, fontWeight: 800, color: "#1e1b4b", margin: "4px 0" }}>
                CALIFICACIÓN DEL PERSONAL
              </h1>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                Genética Laboratorios S.A. de C.V.
              </p>
            </div>

            {/* Datos */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
              <PrintField label="Colaborador" value={evaluacion.empleado?.nombre || "—"} />
              <PrintField label="Jefe Directo" value={evaluacion.jefe_directo || "—"} />
              <PrintField label="Puesto" value={evaluacion.empleado?.puesto || "—"} />
              <PrintField label="Fecha" value={evaluacion.fecha_calificacion || "—"} />
              <PrintField label="Departamento" value={evaluacion.empleado?.depto || "—"} />
              <PrintField label="Período" value={
                evaluacion.periodo_inicio && evaluacion.periodo_fin
                  ? `${evaluacion.periodo_inicio} a ${evaluacion.periodo_fin}`
                  : "—"
              } />
            </div>

            {/* Resultado destacado */}
            <div style={{
              padding: 20, marginBottom: 24,
              background: escala?.gradient || "linear-gradient(135deg, #94a3b8, #64748b)",
              borderRadius: 12, color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, margin: 0, opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  % Final
                </p>
                <p style={{ fontSize: 42, fontWeight: 800, margin: "4px 0 0 0", lineHeight: 1 }}>
                  {evaluacion.porcentaje_final !== null ? Number(evaluacion.porcentaje_final).toFixed(2) : "—"}%
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 11, fontWeight: 700, margin: 0, opacity: 0.85, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Resultado
                </p>
                <p style={{ fontSize: 22, fontWeight: 800, margin: "4px 0 0 0" }}>
                  {escala?.label || "Sin evaluar"}
                </p>
              </div>
            </div>

            {/* Tabla de rubros */}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 20 }}>
              <thead>
                <tr style={{ backgroundColor: "#1e1b4b", color: "#fff" }}>
                  <th style={printTh}>Rubro</th>
                  <th style={printTh}>Detalle</th>
                  <th style={{ ...printTh, textAlign: "right" }}>Valor</th>
                  <th style={{ ...printTh, textAlign: "right" }}>Ponderado</th>
                </tr>
              </thead>
              <tbody>
                <PrintRubro
                  roman="I" title="Criterios" pond="5%"
                  detalle={[
                    ["A. Puntualidad", evaluacion.crit_puntualidad],
                    ["B. Asistencia", evaluacion.crit_asistencia],
                    ["C. Equipo PP", evaluacion.crit_equipo_pp],
                    ["D. Disponibilidad", evaluacion.crit_disponibilidad],
                  ]}
                  total={evaluacion.crit_total}
                />
                <PrintRubro
                  roman="II" title="Desempeño" pond="70%"
                  detalle={[
                    ["E. Examen (20%)", evaluacion.desem_examen],
                    ["F. Estudio Caso (10%)", evaluacion.desem_estudio_caso],
                    ["G. Cotejo (25%)", evaluacion.desem_cotejo],
                    ["H. Eval. Registros (15%)", evaluacion.desem_eval_registros],
                  ]}
                  total={evaluacion.desem_total}
                />
                <PrintRubro
                  roman="III" title="Descriptivo" pond="4.5%"
                  detalle={[
                    ["Escolaridad (80%)", evaluacion.desc_escolaridad],
                    ["Experiencia (10%)", evaluacion.desc_experiencia],
                    ["Conocimientos (10%)", evaluacion.desc_conocimientos],
                  ]}
                  total={evaluacion.desc_total}
                />
                <PrintRubro
                  roman="IV" title="Evaluación 360°" pond="9.4%"
                  detalle={[
                    ["Jefe (40%)", evaluacion.eval360_jefe],
                    ["Colega (20%)", evaluacion.eval360_colega],
                    ["Cliente (30%)", evaluacion.eval360_cliente],
                    ["Personal a Cargo (10%)", evaluacion.eval360_personal],
                  ]}
                  total={evaluacion.eval360_total}
                />
                <PrintRubro
                  roman="V" title="Capacitación" pond="9.8%"
                  detalle={[["Promedio del año", evaluacion.cap_promedio]]}
                  total={evaluacion.cap_total}
                />
                <tr style={{ backgroundColor: "#1e1b4b", color: "#fff", fontWeight: 800 }}>
                  <td colSpan={3} style={{ ...printTd, textAlign: "right", fontSize: 13 }}>
                    TOTAL FINAL:
                  </td>
                  <td style={{ ...printTd, textAlign: "right", fontSize: 16 }}>
                    {evaluacion.porcentaje_final !== null ? Number(evaluacion.porcentaje_final).toFixed(2) : "—"}%
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Observaciones */}
            {evaluacion.observaciones && (
              <div style={{
                padding: 14, backgroundColor: "#f8fafc",
                borderLeft: "4px solid #7c3aed", borderRadius: 8, marginBottom: 24,
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", margin: 0, textTransform: "uppercase" }}>
                  Observaciones
                </p>
                <p style={{ fontSize: 12, color: "#475569", margin: "6px 0 0 0", lineHeight: 1.6 }}>
                  {evaluacion.observaciones}
                </p>
              </div>
            )}

            {/* Firmas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, marginTop: 36 }}>
              {["Colaborador Evaluado", "Evaluador", "Recursos Humanos"].map((rol) => (
                <div key={rol} style={{ textAlign: "center" }}>
                  <div style={{ height: 50, borderBottom: "1px solid #1e1b4b" }} />
                  <p style={{ fontSize: 10, color: "#475569", margin: "8px 0 0 0", fontWeight: 600 }}>{rol}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENTES AUXILIARES
   ========================================================= */

function Section({ icon: Icon, title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid #f1f5f9",
      }}>
        <Icon size={15} color="#7c3aed" />
        <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>{title}</h4>
      </div>
      {children}
    </div>
  );
}

function RubroSection({ roman, title, ponderacion, color, total, extra, children }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div style={{
      marginBottom: 16, border: `2px solid ${color}30`,
      borderRadius: 12, overflow: "hidden",
    }}>
      <button onClick={() => setExpanded(!expanded)} style={{
        width: "100%", padding: "12px 16px",
        backgroundColor: color + "10", border: "none",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: color, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800,
          }}>
            {roman}
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>
              {title}
            </p>
            <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0 0" }}>
              Ponderación {ponderacion}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {extra && <div onClick={(e) => e.stopPropagation()}>{extra}</div>}
          <div style={{
            padding: "6px 14px", backgroundColor: color, color: "#fff",
            borderRadius: 8, fontSize: 14, fontWeight: 800,
            minWidth: 70, textAlign: "center",
          }}>
            {total}
          </div>
          {expanded ? <ChevronUp size={18} color={color} /> : <ChevronDown size={18} color={color} />}
        </div>
      </button>
      {expanded && (
        <div style={{ padding: 16, backgroundColor: "#fff" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreInput({ label, value, onChange, weight }) {
  return (
    <div>
      <label style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 5,
      }}>
        <span>{label}</span>
        {weight && <span style={{ fontSize: 10, color: "#7c3aed" }}>{weight}</span>}
      </label>
      <input type="number" min="0" max="100" step="1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", padding: "8px 12px",
          backgroundColor: "#f8fafc", border: "2px solid #e5e7eb",
          borderRadius: 8, fontSize: 14, fontWeight: 600, outline: "none",
          textAlign: "center", boxSizing: "border-box",
        }} />
    </div>
  );
}

function MiniTotal({ label, value, max }) {
  const pct = (parseFloat(value) / max) * 100;
  return (
    <div style={{
      padding: "8px 10px", backgroundColor: "#fff",
      borderRadius: 8, border: "1px solid #e5e7eb",
    }}>
      <p style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, margin: 0, textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ fontSize: 16, fontWeight: 800, color: "#1e1b4b", margin: "2px 0 0 0", lineHeight: 1 }}>
        {value}
      </p>
      <div style={{ height: 3, backgroundColor: "#f1f5f9", borderRadius: 2, marginTop: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${Math.min(pct, 100)}%`,
          backgroundColor: pct > 80 ? "#10b981" : pct > 60 ? "#3b82f6" : pct > 0 ? "#f59e0b" : "#e5e7eb",
        }} />
      </div>
    </div>
  );
}

function MiniScore({ valor, max }) {
  if (valor === null || valor === undefined) {
    return <span style={{ fontSize: 11, color: "#94a3b8" }}>—</span>;
  }
  const pct = (Number(valor) / max) * 100;
  const color = pct >= 80 ? "#10b981" : pct >= 60 ? "#3b82f6" : pct > 0 ? "#f59e0b" : "#94a3b8";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#1e1b4b" }}>
        {Number(valor).toFixed(2)}
      </span>
      <div style={{ height: 3, backgroundColor: "#f1f5f9", borderRadius: 2, overflow: "hidden", width: 50 }}>
        <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function ResumenStat({ label, value, color, icon: Icon }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: color + "15",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, fontWeight: 600 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 800, color: "#1e1b4b", margin: "2px 0 0 0", lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#475569", marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function InfoMini({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Icon size={11} color="#7c3aed" />
      <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{label}:</span>
      <span style={{ fontSize: 11, color: "#1e1b4b", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

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

function PrintField({ label, value }) {
  return (
    <div>
      <p style={{ fontSize: 10, color: "#7c3aed", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </p>
      <p style={{ fontSize: 13, color: "#1e1b4b", margin: "3px 0 0 0", fontWeight: 600, borderBottom: "1px solid #e5e7eb", paddingBottom: 4 }}>
        {value}
      </p>
    </div>
  );
}

function PrintRubro({ roman, title, pond, detalle, total }) {
  return (
    <>
      <tr style={{ backgroundColor: "#f5f3ff" }}>
        <td style={{ ...printTd, fontWeight: 800, color: "#7c3aed" }} rowSpan={detalle.length + 1}>
          {roman}
        </td>
        <td style={{ ...printTd, fontWeight: 700, color: "#1e1b4b" }} colSpan={2}>
          {title} <span style={{ color: "#94a3b8", fontWeight: 400 }}>({pond})</span>
        </td>
        <td style={{ ...printTd, fontWeight: 800, color: "#1e1b4b", textAlign: "right" }}>
          {Number(total || 0).toFixed(2)}
        </td>
      </tr>
      {detalle.map(([k, v], i) => (
        <tr key={i}>
          <td style={{ ...printTd, paddingLeft: 24, color: "#475569" }}>{k}</td>
          <td style={{ ...printTd, textAlign: "right", color: "#475569" }}>{v ?? "—"}</td>
          <td style={{ ...printTd }}></td>
        </tr>
      ))}
    </>
  );
}

/* ===== Estilos ===== */

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
  padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 700,
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
  borderBottom: "2px solid #e5e7eb", whiteSpace: "nowrap",
};

const tableTd = { padding: "10px 14px", fontSize: 13, color: "#475569" };

const printTh = { padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700 };
const printTd = { padding: "8px 12px", fontSize: 12, borderBottom: "1px solid #e5e7eb" };

const modalOverlay = {
  position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
  backdropFilter: "blur(4px)", zIndex: 50,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
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
  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
};

const btnCancel = {
  flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#475569",
  border: "2px solid #d1d5db", borderRadius: 12, backgroundColor: "#fff",
  cursor: "pointer",
};

const btnIcon = (color) => ({
  padding: "6px 10px",
  backgroundColor: color === "#ef4444" ? "#fef2f2" : color === "#3b82f6" ? "#eff6ff" : "#f5f3ff",
  color: color,
  border: `1px solid ${color === "#ef4444" ? "#fecaca" : color === "#3b82f6" ? "#bfdbfe" : "#e9e5ff"}`,
  borderRadius: 8, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
});

const errorBanner = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "10px 14px", backgroundColor: "#fef2f2",
  border: "1px solid #fecaca", borderRadius: 10,
  color: "#b91c1c", fontSize: 12, fontWeight: 500,
};