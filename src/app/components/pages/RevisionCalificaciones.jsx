// src/app/components/pages/RevisionCalificaciones.jsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Search, Filter, Plus, Edit, Save, X, CheckCircle, AlertTriangle,
  Clock, Award, Users, FileText, ClipboardCheck, Eye, BookOpen,
  GraduationCap, ChevronDown, Calendar, Hash, AlertCircle, Briefcase,
} from "lucide-react";

const ESTATUS_CONFIG = {
  en_tiempo: { label: "En Tiempo", color: "#047857", bg: "#ecfdf5", border: "#a7f3d0", icon: CheckCircle },
  proxima_vencer: { label: "Próxima a Vencer", color: "#92400e", bg: "#fffbeb", border: "#fde68a", icon: AlertTriangle },
  vencida: { label: "Vencida", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", icon: Clock },
  realizada: { label: "Realizada", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", icon: Award },
};

const TIPOS_ACEPTACION = {
  numerico: { label: "Numérica (0-10)", color: "#7c3aed" },
  cumple: { label: "Cumple / No Cumple", color: "#059669" },
  satisfactorio: { label: "Satisfactorio / No Satisfactorio", color: "#d97706" },
};

export default function RevisionCalificaciones() {
  const [datos, setDatos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepto, setFilterDepto] = useState("Todos");
  const [filterEstatus, setFilterEstatus] = useState("Todos");
  const [deptos, setDeptos] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  // Modales
  const [showSeguimientoModal, setShowSeguimientoModal] = useState(false);
  const [showCalificarModal, setShowCalificarModal] = useState(false);
  const [showCalifVerModal, setShowCalifVerModal] = useState(false);

  // Modal calificar (nuevo flujo)
  const [empSeleccionado, setEmpSeleccionado] = useState(null);
  const [capsPendientes, setCapsPendientes] = useState([]);
  const [capElegida, setCapElegida] = useState(null);
  const [calificacionInput, setCalificacionInput] = useState({
    numerica: "", cumple: null, satisfactorio: null,
    fecha: new Date().toISOString().split("T")[0],
    responsable: "", observaciones: "",
  });
  const [loadingCaps, setLoadingCaps] = useState(false);

  // Modal ver calificaciones
  const [califEmpleado, setCalifEmpleado] = useState(null);
  const [califData, setCalifData] = useState([]);
  const [califLoading, setCalifLoading] = useState(false);

  // Modal seguimiento anual (lo que ya tenías)
  const [newRecord, setNewRecord] = useState({
    emp_clave: "", fecha_ingreso_cap: "",
    eval_90_fecha: "", eval_90_realizada: false, eval_90_fecha_real: "",
    numero_aniversario: 1, fecha_anual: "", estatus_anual: "en_tiempo",
    recepcion_entrega: false, descriptivo_puesto: false, matriz_capacitacion: false,
    observaciones: "",
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [empRes, calRes, puestosRes] = await Promise.all([
      supabase.from("empleados")
        .select("clave, nombre, puesto, puesto_id, depto, fec_ingreso, jefe_directo")
        .order("nombre"),
      supabase.from("calificacion_anual").select("*"),
      supabase.from("puestos").select("id, nombre, departamento"),
    ]);
    const emps = empRes.data || [];
    const cals = calRes.data || [];
    setEmpleados(emps);
    setPuestos(puestosRes.data || []);
    setDeptos([...new Set(emps.map((e) => e.depto).filter(Boolean))]);

    const empMap = {};
    emps.forEach((e) => (empMap[e.clave] = e));

    // Determinar estatus automático según fecha_anual
    const hoy = new Date();
    const combined = cals.map((cal) => {
      const empleado = empMap[cal.emp_clave] || null;
      let estatusCalc = cal.estatus || "en_tiempo";

      if (cal.fecha_anual && cal.estatus !== "completada") {
        const fechaAnual = new Date(cal.fecha_anual);
        const diasDif = Math.floor((fechaAnual - hoy) / (1000 * 60 * 60 * 24));
        if (diasDif < 0) estatusCalc = "vencida";
        else if (diasDif <= 30) estatusCalc = "proxima_vencer";
        else estatusCalc = "en_tiempo";
      }

      return { ...cal, empleado, estatus_calc: estatusCalc };
    });
    setDatos(combined);
    setLoading(false);
  }

  /* =========================================================
     FLUJO NUEVO: CALIFICAR CAPACITACIÓN INDIVIDUAL
     ========================================================= */

  async function abrirCalificar() {
    setEmpSeleccionado(null);
    setCapsPendientes([]);
    setCapElegida(null);
    setCalificacionInput({
      numerica: "", cumple: null, satisfactorio: null,
      fecha: new Date().toISOString().split("T")[0],
      responsable: "", observaciones: "",
    });
    setErrorMsg("");
    setShowCalificarModal(true);
  }

  async function onSeleccionarEmpleado(empClave) {
    if (!empClave) {
      setEmpSeleccionado(null);
      setCapsPendientes([]);
      setCapElegida(null);
      return;
    }
    const emp = empleados.find((e) => e.clave === empClave);
    setEmpSeleccionado(emp);
    setLoadingCaps(true);
    setCapElegida(null);

    // 1. Obtener matriz del puesto del empleado
    let capsDelPuesto = [];
    if (emp?.puesto_id) {
      const { data: matriz } = await supabase
        .from("matriz_puesto")
        .select("capacitaciones(id, nombre, codigo, tipo_capacitacion, tipo_aceptacion, codigo_documento, curso_id, cursos(nombre))")
        .eq("puesto_id", emp.puesto_id);
      capsDelPuesto = (matriz || []).map((m) => m.capacitaciones).filter(Boolean);
    }

    // 2. Obtener qué capacitaciones ya tiene calificadas en matriz_empleado este año
    const anoActual = new Date().getFullYear();
    const { data: yaCalificadas } = await supabase
      .from("matriz_empleado")
      .select("capacitacion_id, calificacion_numerica, cumple, satisfactorio, completado")
      .eq("emp_clave", empClave)
      .eq("ano", anoActual)
      .eq("cap_eliminada", false);

    const idsCompletadas = new Set(
      (yaCalificadas || [])
        .filter((c) => c.completado)
        .map((c) => c.capacitacion_id)
    );

    // 3. Pendientes = del puesto que NO estén completadas
    const pendientes = capsDelPuesto.filter((cap) => !idsCompletadas.has(cap.id));
    setCapsPendientes(pendientes);

    // 4. Si hay solo una, seleccionarla por default
    if (pendientes.length === 1) {
      setCapElegida(pendientes[0]);
    }

    setLoadingCaps(false);
  }

  function onElegirCap(capId) {
    const cap = capsPendientes.find((c) => c.id === parseInt(capId));
    setCapElegida(cap || null);
    setCalificacionInput({
      numerica: "", cumple: null, satisfactorio: null,
      fecha: new Date().toISOString().split("T")[0],
      responsable: "", observaciones: "",
    });
  }

  async function handleGuardarCalificacion() {
    setErrorMsg("");
    if (!empSeleccionado || !capElegida) {
      setErrorMsg("Selecciona un empleado y una capacitación.");
      return;
    }

    const tipo = capElegida.tipo_aceptacion || "numerico";

    // Validar según tipo
    if (tipo === "numerico") {
      const num = parseFloat(calificacionInput.numerica);
      if (isNaN(num) || num < 0 || num > 10) {
        setErrorMsg("La calificación debe ser un número entre 0 y 10.");
        return;
      }
    } else if (tipo === "cumple" && calificacionInput.cumple === null) {
      setErrorMsg("Indica si cumple o no cumple.");
      return;
    } else if (tipo === "satisfactorio" && calificacionInput.satisfactorio === null) {
      setErrorMsg("Indica si fue satisfactorio o no.");
      return;
    }

    setSaving(true);

    const anoActual = new Date().getFullYear();
    const payload = {
      emp_clave: empSeleccionado.clave,
      capacitacion_id: capElegida.id,
      nombre_cap_snap: capElegida.nombre,
      codigo_cap_snap: capElegida.codigo || "",
      tipo_capacitacion_snap: capElegida.tipo_capacitacion,
      tipo_aceptacion_snap: tipo,
      fecha_capacitacion: calificacionInput.fecha,
      responsable_capacitacion: calificacionInput.responsable.trim(),
      observaciones: calificacionInput.observaciones.trim(),
      completado: true,
      ano: anoActual,
      calificacion_numerica: tipo === "numerico" ? parseFloat(calificacionInput.numerica) : null,
      cumple: tipo === "cumple" ? calificacionInput.cumple : null,
      satisfactorio: tipo === "satisfactorio" ? calificacionInput.satisfactorio : null,
    };

    // upsert para que si ya existía un registro pendiente lo actualice
    const { error } = await supabase
      .from("matriz_empleado")
      .upsert(payload, { onConflict: "emp_clave,capacitacion_id,ano" });

    if (error) {
      setErrorMsg("Error al guardar: " + error.message);
      setSaving(false);
      return;
    }

    setShowCalificarModal(false);
    setSaving(false);

    // Refrescar matriz pendientes por si quiere calificar otra
    fetchData();
  }

  /* =========================================================
     VER CALIFICACIONES DE UN EMPLEADO
     ========================================================= */

  async function verCalificaciones(empClave, empNombre) {
    setCalifLoading(true);
    setCalifEmpleado({ clave: empClave, nombre: empNombre });
    setShowCalifVerModal(true);

    const { data } = await supabase
      .from("matriz_empleado")
      .select("*")
      .eq("emp_clave", empClave)
      .eq("cap_eliminada", false)
      .order("ano", { ascending: false })
      .order("fecha_capacitacion", { ascending: false });

    setCalifData(data || []);
    setCalifLoading(false);
  }

  /* =========================================================
     SEGUIMIENTO ANUAL (lo que ya tenías, ahora con calificacion_anual)
     ========================================================= */

  async function handleCrearSeguimiento() {
    if (!newRecord.emp_clave) return;
    setSaving(true);
    setErrorMsg("");

    const anoActual = new Date().getFullYear();

    // Inserta en calificacion_anual (la nueva tabla)
    const { error } = await supabase.from("calificacion_anual").insert({
      emp_clave: newRecord.emp_clave,
      ano: anoActual,
      periodo_inicio: newRecord.fecha_ingreso_cap || null,
      observaciones: newRecord.observaciones || "",
      estatus: "en_proceso",
    });

    if (error) {
      setErrorMsg("Error: " + error.message);
      setSaving(false);
      return;
    }

    setShowSeguimientoModal(false);
    setNewRecord({
      emp_clave: "", fecha_ingreso_cap: "",
      eval_90_fecha: "", eval_90_realizada: false, eval_90_fecha_real: "",
      numero_aniversario: 1, fecha_anual: "", estatus_anual: "en_tiempo",
      recepcion_entrega: false, descriptivo_puesto: false, matriz_capacitacion: false,
      observaciones: "",
    });
    setSaving(false);
    fetchData();
  }

  /* =========================================================
     RENDER
     ========================================================= */

  const filtered = useMemo(() => {
    return datos.filter((d) => {
      const emp = d.empleado;
      const matchSearch = `${emp?.nombre || ""} ${emp?.clave || ""} ${emp?.puesto || ""}`
        .toLowerCase().includes(searchTerm.toLowerCase());
      const matchDepto = filterDepto === "Todos" || emp?.depto === filterDepto;
      const matchEstatus = filterEstatus === "Todos" || d.estatus_calc === filterEstatus;
      return matchSearch && matchDepto && matchEstatus;
    });
  }, [datos, searchTerm, filterDepto, filterEstatus]);

  const empConCalif = new Set(datos.map((d) => d.emp_clave));
  const empSinCalif = empleados.filter((e) => !empConCalif.has(e.clave));

  // Agrupado por depto (cuando filtro es "Todos")
  const agrupado = useMemo(() => {
    if (filterDepto !== "Todos") return null;
    const grupos = {};
    filtered.forEach((d) => {
      const depto = d.empleado?.depto || "Sin departamento";
      if (!grupos[depto]) grupos[depto] = [];
      grupos[depto].push(d);
    });
    return grupos;
  }, [filtered, filterDepto]);

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
            Revisión de Calificaciones
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            {datos.length} seguimientos anuales · {empleados.length} empleados activos
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={abrirCalificar} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
            background: "linear-gradient(135deg, #ec4899, #db2777)",
            color: "#fff", border: "none", borderRadius: 12,
            fontSize: 14, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(236,72,153,0.3)",
          }}>
            <GraduationCap size={18} /><span>Calificar Capacitación</span>
          </button>
          <button onClick={() => setShowSeguimientoModal(true)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
            backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: 12,
            fontSize: 14, fontWeight: 500, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
          }}>
            <Plus size={18} /><span>Nuevo Seguimiento</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          { label: "En Tiempo", value: datos.filter((d) => d.estatus_calc === "en_tiempo").length,
            bg: "linear-gradient(135deg, #10b981, #059669)", shadow: "0 6px 20px rgba(16,185,129,0.3)" },
          { label: "Próximas a Vencer", value: datos.filter((d) => d.estatus_calc === "proxima_vencer").length,
            bg: "linear-gradient(135deg, #f59e0b, #d97706)", shadow: "0 6px 20px rgba(245,158,11,0.3)" },
          { label: "Vencidas", value: datos.filter((d) => d.estatus_calc === "vencida").length,
            bg: "linear-gradient(135deg, #ef4444, #dc2626)", shadow: "0 6px 20px rgba(239,68,68,0.3)" },
          { label: "Sin Registro", value: empSinCalif.length,
            bg: "linear-gradient(135deg, #64748b, #475569)", shadow: "0 6px 20px rgba(100,116,139,0.3)" },
        ].map((s, i) => (
          <div key={i} style={{
            borderRadius: 14, padding: "20px 24px",
            background: s.bg, color: "#fff", boxShadow: s.shadow,
          }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.75)", margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 32, fontWeight: 800, margin: "6px 0 0 0", lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ ...cardBase, padding: 20 }}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input type="text" placeholder="Buscar por nombre, clave o puesto..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={searchInput} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={15} color="#94a3b8" />
            <select value={filterDepto} onChange={(e) => setFilterDepto(e.target.value)} style={selectFilter}>
              <option value="Todos">Todos los departamentos (agrupados)</option>
              {deptos.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ width: 1, height: 28, backgroundColor: "#e5e7eb" }} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "Todos", label: "Todos" },
              { key: "vencida", label: "Vencidas", color: "#ef4444" },
              { key: "proxima_vencer", label: "Próximas", color: "#f59e0b" },
              { key: "en_tiempo", label: "En Tiempo", color: "#10b981" },
            ].map((est) => (
              <button key={est.key} onClick={() => setFilterEstatus(est.key)} style={{
                padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                border: filterEstatus === est.key ? `2px solid ${est.color || "#7c3aed"}` : "2px solid #e5e7eb",
                backgroundColor: filterEstatus === est.key ? (est.color || "#7c3aed") : "#fff",
                color: filterEstatus === est.key ? "#fff" : "#475569",
                cursor: "pointer", transition: "all 0.2s",
              }}>{est.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla agrupada por departamento o filtrada */}
      {filterDepto === "Todos" && agrupado ? (
        <DeptoGroups grupos={agrupado} onVer={verCalificaciones} />
      ) : (
        <SimpleTable rows={filtered} onVer={verCalificaciones} />
      )}

      {filtered.length === 0 && (
        <div style={{ ...cardBase, padding: 48, textAlign: "center" }}>
          <Search size={36} style={{ margin: "0 auto 12px", opacity: 0.3, color: "#94a3b8" }} />
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>No se encontraron registros con esos filtros.</p>
        </div>
      )}

      {/* ============ MODAL CALIFICAR CAPACITACIÓN (NUEVO) ============ */}
      {showCalificarModal && (
        <div style={modalOverlay}>
          <div style={{
            backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 640,
            maxHeight: "92vh", display: "flex", flexDirection: "column",
            boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          }}>
            {/* Header */}
            <div style={{
              padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: "linear-gradient(135deg, #ec4899, #db2777)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(236,72,153,0.3)",
                }}>
                  <GraduationCap size={20} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, color: "#1e1b4b", margin: 0, fontSize: 18 }}>
                    Calificar Capacitación
                  </h3>
                  <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0 0" }}>
                    Registra la calificación de una capacitación pendiente
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCalificarModal(false)} style={btnClose}>
                <X size={20} color="#94a3b8" />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              {/* Paso 1: Seleccionar empleado */}
              <Field label="1. Empleado *">
                <select value={empSeleccionado?.clave || ""}
                  onChange={(e) => onSeleccionarEmpleado(e.target.value)}
                  style={inputStyle}>
                  <option value="">Seleccionar empleado...</option>
                  {empleados.map((e) => (
                    <option key={e.clave} value={e.clave}>
                      {e.clave} — {e.nombre} ({e.depto})
                    </option>
                  ))}
                </select>
              </Field>

              {/* Info autocompletada del empleado */}
              {empSeleccionado && (
                <div style={{
                  marginTop: 12, padding: 14,
                  backgroundColor: "#f5f3ff", borderRadius: 12,
                  border: "1px solid #e9e5ff",
                }}>
                  <p style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Información del empleado
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }}>
                    <InfoMini icon={Hash} label="Clave" value={empSeleccionado.clave} />
                    <InfoMini icon={Briefcase} label="Puesto" value={empSeleccionado.puesto || "—"} />
                    <InfoMini icon={Users} label="Depto" value={empSeleccionado.depto || "—"} />
                    <InfoMini icon={Calendar} label="Ingreso" value={empSeleccionado.fec_ingreso || "—"} />
                  </div>
                </div>
              )}

              {/* Paso 2: Capacitación */}
              {empSeleccionado && (
                <div style={{ marginTop: 18 }}>
                  <Field label="2. Capacitación a calificar *">
                    {loadingCaps ? (
                      <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontStyle: "italic" }}>
                        Buscando capacitaciones pendientes...
                      </p>
                    ) : capsPendientes.length === 0 ? (
                      <div style={{
                        padding: 14, backgroundColor: "#fffbeb",
                        border: "1px solid #fde68a", borderRadius: 10,
                      }}>
                        <p style={{ fontSize: 12, color: "#92400e", margin: 0, fontWeight: 600 }}>
                          ⚠ Sin capacitaciones pendientes
                        </p>
                        <p style={{ fontSize: 11, color: "#92400e", margin: "4px 0 0 0" }}>
                          {!empSeleccionado.puesto_id
                            ? "Este empleado no tiene puesto asignado. Asígnale uno en Empleados."
                            : "Este empleado ya completó todas las capacitaciones de su matriz, o su puesto no tiene matriz definida."}
                        </p>
                      </div>
                    ) : capsPendientes.length === 1 ? (
                      <div style={{
                        padding: 14, backgroundColor: "#ecfdf5",
                        border: "2px solid #a7f3d0", borderRadius: 12,
                      }}>
                        <p style={{ fontSize: 11, color: "#047857", fontWeight: 700, margin: 0, textTransform: "uppercase" }}>
                          Capacitación pendiente (única)
                        </p>
                        <p style={{ fontSize: 14, color: "#1e1b4b", fontWeight: 600, margin: "6px 0 4px 0" }}>
                          {capElegida?.nombre}
                        </p>
                        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                          {capElegida?.codigo && (
                            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#64748b", backgroundColor: "#fff", padding: "2px 8px", borderRadius: 6 }}>
                              {capElegida.codigo}
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: "#7c3aed", backgroundColor: "#fff", padding: "2px 8px", borderRadius: 6, fontWeight: 600 }}>
                            {TIPOS_ACEPTACION[capElegida?.tipo_aceptacion]?.label}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <select value={capElegida?.id || ""}
                          onChange={(e) => onElegirCap(e.target.value)}
                          style={inputStyle}>
                          <option value="">Seleccionar una de {capsPendientes.length} capacitaciones pendientes...</option>
                          {capsPendientes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.codigo ? `[${c.codigo}] ` : ""}{c.nombre}
                            </option>
                          ))}
                        </select>
                        {capElegida && (
                          <div style={{
                            marginTop: 8, padding: "8px 12px",
                            backgroundColor: "#f5f3ff", borderRadius: 8,
                            display: "flex", alignItems: "center", gap: 8,
                          }}>
                            <span style={{ fontSize: 10, color: "#7c3aed", fontWeight: 700 }}>
                              Tipo de calificación:
                            </span>
                            <span style={{ fontSize: 11, color: "#1e1b4b", fontWeight: 600 }}>
                              {TIPOS_ACEPTACION[capElegida.tipo_aceptacion]?.label}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </Field>
                </div>
              )}

              {/* Paso 3: Calificación (cambia según tipo) */}
              {capElegida && (
                <div style={{ marginTop: 18 }}>
                  <Field label="3. Calificación *">
                    {capElegida.tipo_aceptacion === "numerico" && (
                      <input type="number" min="0" max="10" step="0.1"
                        value={calificacionInput.numerica}
                        onChange={(e) => setCalificacionInput({ ...calificacionInput, numerica: e.target.value })}
                        placeholder="Ej: 9.5"
                        style={{ ...inputStyle, fontSize: 16, fontWeight: 700, textAlign: "center" }} />
                    )}

                    {capElegida.tipo_aceptacion === "cumple" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <button type="button" onClick={() => setCalificacionInput({ ...calificacionInput, cumple: true })}
                          style={btnToggle(calificacionInput.cumple === true, "#10b981")}>
                          ✓ Cumple
                        </button>
                        <button type="button" onClick={() => setCalificacionInput({ ...calificacionInput, cumple: false })}
                          style={btnToggle(calificacionInput.cumple === false, "#ef4444")}>
                          ✗ No Cumple
                        </button>
                      </div>
                    )}

                    {capElegida.tipo_aceptacion === "satisfactorio" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <button type="button" onClick={() => setCalificacionInput({ ...calificacionInput, satisfactorio: true })}
                          style={btnToggle(calificacionInput.satisfactorio === true, "#10b981")}>
                          ✓ Satisfactorio
                        </button>
                        <button type="button" onClick={() => setCalificacionInput({ ...calificacionInput, satisfactorio: false })}
                          style={btnToggle(calificacionInput.satisfactorio === false, "#ef4444")}>
                          ✗ No Satisfactorio
                        </button>
                      </div>
                    )}
                  </Field>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
                    <Field label="Fecha de capacitación">
                      <input type="date" value={calificacionInput.fecha}
                        onChange={(e) => setCalificacionInput({ ...calificacionInput, fecha: e.target.value })}
                        style={inputStyle} />
                    </Field>
                    <Field label="Responsable">
                      <input type="text" value={calificacionInput.responsable}
                        onChange={(e) => setCalificacionInput({ ...calificacionInput, responsable: e.target.value })}
                        placeholder="Ej: A. Martínez" style={inputStyle} />
                    </Field>
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <Field label="Observaciones">
                      <textarea value={calificacionInput.observaciones}
                        onChange={(e) => setCalificacionInput({ ...calificacionInput, observaciones: e.target.value })}
                        placeholder="Notas adicionales..." rows={2}
                        style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
                    </Field>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div style={{ marginTop: 14, ...errorBanner }}>
                  <AlertCircle size={14} />{errorMsg}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              display: "flex", gap: 12, padding: "16px 24px",
              borderTop: "1px solid #e5e7eb", backgroundColor: "#f8fafc",
              borderRadius: "0 0 20px 20px",
            }}>
              <button onClick={() => setShowCalificarModal(false)} style={btnCancel}>Cancelar</button>
              <button onClick={handleGuardarCalificacion}
                disabled={!capElegida || saving}
                style={{
                  ...btnPrimary,
                  opacity: !capElegida || saving ? 0.5 : 1,
                  background: "linear-gradient(135deg, #ec4899, #db2777)",
                  boxShadow: "0 4px 14px rgba(236,72,153,0.3)",
                }}>
                {saving ? "Guardando..." : "Guardar Calificación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL VER CALIFICACIONES ============ */}
      {showCalifVerModal && (
        <ModalVerCalificaciones
          empleado={califEmpleado}
          data={califData}
          loading={califLoading}
          onClose={() => setShowCalifVerModal(false)}
        />
      )}

      {/* ============ MODAL NUEVO SEGUIMIENTO ANUAL ============ */}
      {showSeguimientoModal && (
        <div style={modalOverlay}>
          <div style={{
            backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 520,
            maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          }}>
            <div style={{
              padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <h3 style={{ fontWeight: 700, color: "#1e1b4b", margin: 0, fontSize: 18 }}>
                  Nuevo Seguimiento Anual
                </h3>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0 0" }}>
                  Control de evaluación anual del empleado (F-124)
                </p>
              </div>
              <button onClick={() => setShowSeguimientoModal(false)} style={btnClose}>
                <X size={20} color="#94a3b8" />
              </button>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Empleado *">
                <select value={newRecord.emp_clave}
                  onChange={(e) => setNewRecord({ ...newRecord, emp_clave: e.target.value })}
                  style={inputStyle}>
                  <option value="">Seleccionar empleado...</option>
                  {empSinCalif.map((e) => (
                    <option key={e.clave} value={e.clave}>{e.nombre} — {e.depto}</option>
                  ))}
                </select>
                {empSinCalif.length === 0 && (
                  <p style={{ fontSize: 11, color: "#f59e0b", marginTop: 6 }}>
                    Todos los empleados ya tienen seguimiento de este año.
                  </p>
                )}
              </Field>

              <Field label="Fecha de inicio de período">
                <input type="date" value={newRecord.fecha_ingreso_cap}
                  onChange={(e) => setNewRecord({ ...newRecord, fecha_ingreso_cap: e.target.value })}
                  style={inputStyle} />
              </Field>

              <Field label="Observaciones">
                <textarea value={newRecord.observaciones}
                  onChange={(e) => setNewRecord({ ...newRecord, observaciones: e.target.value })}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
              </Field>

              <p style={{ fontSize: 11, color: "#64748b", margin: 0, fontStyle: "italic" }}>
                💡 La evaluación completa F-124 (5 rubros) la podrás llenar en la siguiente entrega del sistema.
              </p>

              {errorMsg && (
                <div style={errorBanner}>
                  <AlertCircle size={14} />{errorMsg}
                </div>
              )}
            </div>

            <div style={{
              display: "flex", gap: 12, padding: "16px 24px",
              borderTop: "1px solid #e5e7eb", backgroundColor: "#f8fafc",
              borderRadius: "0 0 20px 20px",
            }}>
              <button onClick={() => setShowSeguimientoModal(false)} style={btnCancel}>Cancelar</button>
              <button onClick={handleCrearSeguimiento} disabled={!newRecord.emp_clave || saving}
                style={{ ...btnPrimary, opacity: !newRecord.emp_clave || saving ? 0.5 : 1 }}>
                {saving ? "Guardando..." : "Crear Seguimiento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   COMPONENTES AUXILIARES
   ========================================================= */

function DeptoGroups({ grupos, onVer }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {Object.entries(grupos).map(([depto, rows]) => (
        <DeptoGroup key={depto} depto={depto} rows={rows} onVer={onVer} />
      ))}
    </div>
  );
}

function DeptoGroup({ depto, rows, onVer }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div style={{
      backgroundColor: "#fff", borderRadius: 16,
      border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      overflow: "hidden",
    }}>
      <button onClick={() => setExpanded(!expanded)} style={{
        width: "100%", padding: "14px 20px",
        backgroundColor: "#f5f3ff", border: "none",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Briefcase size={16} color="#7c3aed" />
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#7c3aed", margin: 0, textTransform: "uppercase" }}>
            {depto}
          </h3>
          <span style={{
            padding: "2px 10px", backgroundColor: "#fff",
            color: "#7c3aed", fontSize: 11, fontWeight: 700, borderRadius: 999,
          }}>
            {rows.length}
          </span>
        </div>
        <ChevronDown size={16} color="#7c3aed" style={{
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s",
        }} />
      </button>
      {expanded && <SimpleTable rows={rows} onVer={onVer} embedded />}
    </div>
  );
}

function SimpleTable({ rows, onVer, embedded = false }) {
  return (
    <div style={{
      ...(embedded ? {} : {
        backgroundColor: "#fff", borderRadius: 16,
        border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }),
      overflow: "hidden",
    }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc" }}>
              {["Empleado", "Puesto", "Fecha Anual", "Estatus", "Calificaciones"].map((h) => (
                <th key={h} style={tableTh}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const emp = row.empleado;
              const est = ESTATUS_CONFIG[row.estatus_calc] || ESTATUS_CONFIG.en_tiempo;
              const EstIcon = est.icon;
              const isUrgent = row.estatus_calc === "vencida" || row.estatus_calc === "proxima_vencer";

              return (
                <tr key={row.id} style={{
                  borderBottom: "1px solid #f1f5f9",
                  backgroundColor: isUrgent ? est.bg + "30" : "transparent",
                }}>
                  <td style={tableTd}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, backgroundColor: est.bg, borderRadius: 8,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, color: est.color, flexShrink: 0,
                      }}>
                        {emp?.nombre?.split(" ").slice(0, 2).map((w) => w[0]).join("") || "?"}
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>
                          {emp?.nombre || row.emp_clave}
                        </p>
                        <p style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace", margin: "2px 0 0 0" }}>
                          {row.emp_clave}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...tableTd, fontSize: 12, color: "#475569", maxWidth: 180 }}>
                    {emp?.puesto || "—"}
                  </td>
                  <td style={{ ...tableTd, fontSize: 12, color: "#475569" }}>
                    {row.fecha_anual || row.periodo_inicio || "—"}
                  </td>
                  <td style={tableTd}>
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 11, fontWeight: 600, color: est.color,
                      backgroundColor: est.bg, padding: "5px 10px",
                      borderRadius: 999, border: `1px solid ${est.border}`,
                    }}>
                      <EstIcon size={11} />{est.label}
                    </span>
                  </td>
                  <td style={tableTd}>
                    <button onClick={() => onVer(row.emp_clave, emp?.nombre || row.emp_clave)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "6px 14px", backgroundColor: "#f5f3ff", color: "#7c3aed",
                        border: "1px solid #e9e5ff", borderRadius: 8,
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                      }}>
                      <Eye size={13} />Ver
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ModalVerCalificaciones({ empleado, data, loading, onClose }) {
  return (
    <div style={modalOverlay}>
      <div style={{
        backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 720,
        maxHeight: "85vh", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
      }}>
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, backgroundColor: "#f5f3ff", borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BookOpen size={20} color="#7c3aed" />
            </div>
            <div>
              <h3 style={{ fontWeight: 700, color: "#1e1b4b", margin: 0, fontSize: 16 }}>
                Calificaciones
              </h3>
              <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0 0" }}>
                {empleado?.nombre} — {empleado?.clave}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={btnClose}>
            <X size={20} color="#94a3b8" />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ width: 28, height: 28, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto" }} />
            </div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
              <BookOpen size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
              <p style={{ fontSize: 14, margin: 0 }}>Sin capacitaciones registradas</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc" }}>
                  {["Capacitación", "Fecha", "Año", "Calificación"].map((h) => (
                    <th key={h} style={{ ...tableTh, position: "sticky", top: 0, backgroundColor: "#f8fafc" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((cap, i) => {
                  let valor, valorColor, valorBg;
                  if (cap.tipo_aceptacion_snap === "cumple") {
                    valor = cap.cumple === true ? "✓ Cumple" : cap.cumple === false ? "✗ No Cumple" : "—";
                    valorColor = cap.cumple === true ? "#047857" : cap.cumple === false ? "#b91c1c" : "#94a3b8";
                    valorBg = cap.cumple === true ? "#ecfdf5" : cap.cumple === false ? "#fef2f2" : "#f8fafc";
                  } else if (cap.tipo_aceptacion_snap === "satisfactorio") {
                    valor = cap.satisfactorio === true ? "✓ Satisf." : cap.satisfactorio === false ? "✗ No Satisf." : "—";
                    valorColor = cap.satisfactorio === true ? "#047857" : cap.satisfactorio === false ? "#b91c1c" : "#94a3b8";
                    valorBg = cap.satisfactorio === true ? "#ecfdf5" : cap.satisfactorio === false ? "#fef2f2" : "#f8fafc";
                  } else {
                    valor = cap.calificacion_numerica !== null ? Number(cap.calificacion_numerica).toFixed(1) : "—";
                    const n = cap.calificacion_numerica;
                    if (n === null) { valorColor = "#94a3b8"; valorBg = "#f8fafc"; }
                    else if (n >= 9) { valorColor = "#047857"; valorBg = "#ecfdf5"; }
                    else if (n >= 7) { valorColor = "#1d4ed8"; valorBg = "#eff6ff"; }
                    else if (n >= 6) { valorColor = "#92400e"; valorBg = "#fffbeb"; }
                    else { valorColor = "#b91c1c"; valorBg = "#fef2f2"; }
                  }

                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ ...tableTd, fontSize: 12, color: "#1e1b4b", fontWeight: 500, maxWidth: 350 }}>
                        {cap.nombre_cap_snap}
                        {cap.codigo_cap_snap && (
                          <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace", marginLeft: 6 }}>
                            {cap.codigo_cap_snap}
                          </span>
                        )}
                      </td>
                      <td style={{ ...tableTd, fontSize: 11, color: "#64748b" }}>{cap.fecha_capacitacion || "—"}</td>
                      <td style={{ ...tableTd, fontSize: 11, color: "#64748b" }}>{cap.ano}</td>
                      <td style={{ ...tableTd, textAlign: "center" }}>
                        <span style={{
                          display: "inline-block", minWidth: 48,
                          padding: "5px 14px", borderRadius: 8,
                          fontSize: 12, fontWeight: 700,
                          color: valorColor, backgroundColor: valorBg,
                        }}>{valor}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div style={{
          padding: "14px 24px", borderTop: "1px solid #e5e7eb",
          backgroundColor: "#f8fafc", borderRadius: "0 0 20px 20px",
        }}>
          <button onClick={onClose} style={{
            width: "100%", padding: 12, fontSize: 14, fontWeight: 600,
            color: "#475569", border: "2px solid #d1d5db", borderRadius: 12,
            backgroundColor: "#fff", cursor: "pointer",
          }}>
            Cerrar
          </button>
        </div>
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

function InfoMini({ icon: Icon, label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <Icon size={12} color="#7c3aed" />
      <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase" }}>{label}:</span>
      <span style={{ fontSize: 11, color: "#1e1b4b", fontWeight: 600 }}>{value}</span>
    </div>
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
  padding: "14px 16px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
  borderBottom: "2px solid #e5e7eb",
};

const tableTd = {
  padding: "12px 16px", fontSize: 13, color: "#475569",
};

const modalOverlay = {
  position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
  backdropFilter: "blur(4px)", zIndex: 50,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};

const btnClose = {
  padding: 6, border: "none", background: "none", cursor: "pointer", borderRadius: 8,
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

const errorBanner = {
  display: "flex", alignItems: "center", gap: 8,
  padding: "10px 14px", backgroundColor: "#fef2f2",
  border: "1px solid #fecaca", borderRadius: 10,
  color: "#b91c1c", fontSize: 12, fontWeight: 500,
};

const btnToggle = (active, color) => ({
  padding: "12px",
  backgroundColor: active ? color : "#fff",
  color: active ? "#fff" : "#475569",
  border: `2px solid ${active ? color : "#e5e7eb"}`,
  borderRadius: 10, fontSize: 13, fontWeight: 700,
  cursor: "pointer", transition: "all 0.2s",
});