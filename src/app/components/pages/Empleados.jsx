// src/components/pages/Empleados.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Search, Plus, Briefcase, Calendar, Building2, UserMinus,
  Filter, X, AlertCircle, Eye, Edit, RotateCcw
} from "lucide-react";

const DEPTO_GRADIENTS = {
  "Producción": "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  "Control de Calidad": "linear-gradient(135deg, #10b981, #059669)",
  "Mantenimiento": "linear-gradient(135deg, #f59e0b, #d97706)",
  "Recursos Humanos": "linear-gradient(135deg, #8b5cf6, #6d28d9)",
  "Almacén": "linear-gradient(135deg, #06b6d4, #0891b2)",
  "Seguridad y Medio Ambiente": "linear-gradient(135deg, #ec4899, #db2777)",
  "Dirección": "linear-gradient(135deg, #475569, #1e293b)",
  "Administración": "linear-gradient(135deg, #6366f1, #4f46e5)",
  "Fabricación": "linear-gradient(135deg, #3b82f6, #1d4ed8)",
};

export default function Empleados() {
  const [empleados, setEmpleados] = useState([]);
  const [bajas, setBajas] = useState([]);
  const [puestos, setPuestos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepto, setFilterDepto] = useState("Todos");
  const [filterEstatus, setFilterEstatus] = useState("activos");
  const [deptos, setDeptos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBajaModal, setShowBajaModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [empSeleccionado, setEmpSeleccionado] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [newEmp, setNewEmp] = useState({
    clave: "", nombre: "", puesto_id: "", depto: "",
    fec_ingreso: new Date().toISOString().split("T")[0],
    email: "", jefe_directo: "",
  });

  // ====== NUEVO: form de edición ======
  const [editEmp, setEditEmp] = useState({
    clave: "", nombre: "", puesto_id: "", depto: "",
    fec_ingreso: "", email: "", jefe_directo: "",
    puesto_id_original: null, // para detectar cambio de puesto
  });

  const [bajaData, setBajaData] = useState({
    fec_baja: new Date().toISOString().split("T")[0],
    motivo: "",
  });

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    const [empRes, bajasRes, puestosRes] = await Promise.all([
      supabase.from("empleados").select("*").order("clave"),
      supabase.from("bajas").select("*").order("clave"),
      supabase.from("puestos").select("id, nombre, departamento").eq("activo", true).order("nombre"),
    ]);
    const emps = empRes.data || [];
    setEmpleados(emps);
    setBajas(bajasRes.data || []);
    setPuestos(puestosRes.data || []);
    setDeptos([...new Set(emps.map((e) => e.depto).filter(Boolean))]);
    setLoading(false);
  }

  // ====== NUEVO: helper para asignar caps de un puesto a un empleado ======
  async function asignarCapsDePuesto(empClave, puestoId) {
    if (!puestoId) return;
    // Obtener caps del puesto
    const { data: capsPuesto, error } = await supabase
      .from("matriz_puesto")
      .select("capacitacion_id, capacitaciones(id, nombre, codigo)")
      .eq("puesto_id", puestoId);
    if (error || !capsPuesto || capsPuesto.length === 0) return;

    const inserts = capsPuesto.map(c => ({
      emp_clave: empClave,
      capacitacion_id: c.capacitacion_id,
      nombre_capacitacion: c.capacitaciones?.nombre || "Sin nombre",
      codigo_capacitacion: c.capacitaciones?.codigo || "",
      completado: false,
      origen: "puesto",
      puesto_id_origen: puestoId,
      activa: true,
    }));
    await supabase.from("calificaciones").insert(inserts);
  }

  // ====== NUEVO: helper para manejar cambio de puesto ======
  async function procesarCambioPuesto(empClave, puestoAnteriorId, puestoNuevoId) {
    // 1) Borrar las pendientes del puesto anterior (origen='puesto', completado=false)
    if (puestoAnteriorId) {
      await supabase.from("calificaciones")
        .delete()
        .eq("emp_clave", empClave)
        .eq("puesto_id_origen", puestoAnteriorId)
        .eq("origen", "puesto")
        .eq("completado", false);

      // 2) Marcar las completadas del puesto anterior como inactivas (historial)
      await supabase.from("calificaciones")
        .update({ activa: false })
        .eq("emp_clave", empClave)
        .eq("puesto_id_origen", puestoAnteriorId)
        .eq("origen", "puesto")
        .eq("completado", true);
    }

    // 3) Asignar caps del nuevo puesto
    if (puestoNuevoId) {
      await asignarCapsDePuesto(empClave, puestoNuevoId);
    }
  }

  async function handleCreateEmpleado() {
    setErrorMsg("");
    if (!newEmp.clave.trim() || !newEmp.nombre.trim()) {
      setErrorMsg("Clave y nombre son obligatorios.");
      return;
    }

    const { data: existe } = await supabase
      .from("empleados").select("clave").eq("clave", newEmp.clave.trim()).maybeSingle();
    if (existe) { setErrorMsg("Ya existe un empleado con esa clave."); return; }

    const { data: enBaja } = await supabase
      .from("bajas").select("clave").eq("clave", newEmp.clave.trim()).maybeSingle();
    if (enBaja) { setErrorMsg("Esa clave existe como baja. Usa otra clave o reactiva la baja."); return; }

    setSaving(true);
    const puestoSel = puestos.find((p) => p.id === parseInt(newEmp.puesto_id));
    const payload = {
      clave: newEmp.clave.trim(),
      nombre: newEmp.nombre.trim(),
      puesto: puestoSel?.nombre || "",
      puesto_id: puestoSel?.id || null,
      depto: puestoSel?.departamento || newEmp.depto || "",
      fec_ingreso: newEmp.fec_ingreso,
      email: newEmp.email.trim(),
      jefe_directo: newEmp.jefe_directo.trim(),
      activo: true,
    };

    const { error } = await supabase.from("empleados").insert(payload);
    if (error) { setErrorMsg("Error al crear: " + error.message); setSaving(false); return; }

    // ====== NUEVO: asignar caps si tiene puesto ======
    if (puestoSel?.id) {
      await asignarCapsDePuesto(newEmp.clave.trim(), puestoSel.id);
    }

    setShowCreateModal(false);
    setNewEmp({
      clave: "", nombre: "", puesto_id: "", depto: "",
      fec_ingreso: new Date().toISOString().split("T")[0],
      email: "", jefe_directo: "",
    });
    setSaving(false);
    fetchData();
  }

  // ====== NUEVO: abrir modal de edición ======
  function openEdit(emp) {
    setEditEmp({
      clave: emp.clave,
      nombre: emp.nombre || "",
      puesto_id: emp.puesto_id ? String(emp.puesto_id) : "",
      depto: emp.depto || "",
      fec_ingreso: emp.fec_ingreso || "",
      email: emp.email || "",
      jefe_directo: emp.jefe_directo || "",
      puesto_id_original: emp.puesto_id || null,
    });
    setErrorMsg("");
    setShowEditModal(true);
  }

  // ====== NUEVO: guardar edición ======
  async function handleEditEmpleado() {
    setErrorMsg("");
    if (!editEmp.nombre.trim()) { setErrorMsg("El nombre es obligatorio."); return; }
    setSaving(true);

    const puestoSel = puestos.find(p => p.id === parseInt(editEmp.puesto_id));
    const nuevoPuestoId = puestoSel?.id || null;
    const puestoIdOriginal = editEmp.puesto_id_original;

    const payload = {
      nombre: editEmp.nombre.trim(),
      puesto: puestoSel?.nombre || "",
      puesto_id: nuevoPuestoId,
      depto: puestoSel?.departamento || editEmp.depto || "",
      fec_ingreso: editEmp.fec_ingreso || null,
      email: editEmp.email.trim(),
      jefe_directo: editEmp.jefe_directo.trim(),
    };

    const { error } = await supabase
      .from("empleados").update(payload).eq("clave", editEmp.clave);

    if (error) { setErrorMsg("Error al editar: " + error.message); setSaving(false); return; }

    // ====== Si cambió de puesto, procesar caps ======
    if (puestoIdOriginal !== nuevoPuestoId) {
      await procesarCambioPuesto(editEmp.clave, puestoIdOriginal, nuevoPuestoId);
    }

    setShowEditModal(false);
    setSaving(false);
    fetchData();
  }

  async function handleDarBaja() {
    if (!empSeleccionado || !bajaData.fec_baja) {
      setErrorMsg("Fecha de baja es obligatoria.");
      return;
    }
    setSaving(true);
    setErrorMsg("");

    const { error: bajaErr } = await supabase.from("bajas").insert({
      clave: empSeleccionado.clave,
      nombre: empSeleccionado.nombre,
      fec_ingreso: empSeleccionado.fec_ingreso,
      puesto: empSeleccionado.puesto,
      depto: empSeleccionado.depto,
      fec_baja: bajaData.fec_baja,
    });

    if (bajaErr) { setErrorMsg("Error al registrar baja: " + bajaErr.message); setSaving(false); return; }

    const { error: delErr } = await supabase
      .from("empleados").delete().eq("clave", empSeleccionado.clave);

    if (delErr) {
      setErrorMsg("Baja registrada pero error al eliminar de empleados: " + delErr.message);
      setSaving(false); return;
    }

    setShowBajaModal(false);
    setEmpSeleccionado(null);
    setBajaData({ fec_baja: new Date().toISOString().split("T")[0], motivo: "" });
    setSaving(false);
    fetchData();
  }

  async function handleReactivar(baja) {
    if (!confirm(`¿Reactivar a ${baja.nombre}? Volverá a la lista de empleados activos.`)) return;
    setSaving(true);

    const { error: empErr } = await supabase.from("empleados").insert({
      clave: baja.clave,
      nombre: baja.nombre,
      puesto: baja.puesto || "",
      depto: baja.depto || "",
      fec_ingreso: baja.fec_ingreso || "",
      activo: true,
    });

    if (empErr) { alert("Error al reactivar: " + empErr.message); setSaving(false); return; }

    await supabase.from("bajas").delete().eq("clave", baja.clave);
    setSaving(false);
    fetchData();
  }

  const totalActivos = empleados.filter((e) => e.activo !== false).length;
  const totalBajas = bajas.length;

  let dataToShow = [];
  if (filterEstatus === "activos") {
    dataToShow = empleados.filter((e) => e.activo !== false);
  } else if (filterEstatus === "bajas") {
    dataToShow = bajas.map((b) => ({ ...b, es_baja: true }));
  } else {
    dataToShow = [...empleados, ...bajas.map((b) => ({ ...b, es_baja: true }))];
  }

  const filtered = dataToShow.filter((emp) => {
    const matchSearch = `${emp.nombre} ${emp.clave} ${emp.puesto || ""}`
      .toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch && (filterDepto === "Todos" || emp.depto === filterDepto);
  });

  function getInitials(nombre) {
    if (!nombre) return "?";
    const parts = nombre.split(" ");
    return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
  }

  const cardBase = {
    backgroundColor: "#fff", borderRadius: 16,
    border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Empleados</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            {totalActivos} activos · {totalBajas} bajas
          </p>
        </div>
        <button onClick={() => { setErrorMsg(""); setShowCreateModal(true); }}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
            backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: 12,
            fontSize: 14, fontWeight: 500, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
          }}>
          <Plus size={18} /><span>Nuevo Empleado</span>
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "Empleados Activos", value: totalActivos, bg: "linear-gradient(135deg, #10b981, #059669)", shadow: "0 6px 20px rgba(16,185,129,0.3)" },
          { label: "Bajas Registradas", value: totalBajas, bg: "linear-gradient(135deg, #ef4444, #dc2626)", shadow: "0 6px 20px rgba(239,68,68,0.3)" },
          { label: "Total Histórico", value: totalActivos + totalBajas, bg: "linear-gradient(135deg, #7c3aed, #5b21b6)", shadow: "0 6px 20px rgba(124,58,237,0.3)" },
        ].map((s, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "20px 24px", background: s.bg, color: "#fff", boxShadow: s.shadow }}>
            <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.75)", margin: 0 }}>{s.label}</p>
            <p style={{ fontSize: 32, fontWeight: 800, margin: "6px 0 0 0", lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...cardBase, padding: 20 }}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input type="text" placeholder="Buscar por nombre, clave o puesto..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%", paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
              backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12,
              fontSize: 14, outline: "none", boxSizing: "border-box",
            }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { key: "activos", label: "Activos", count: totalActivos },
              { key: "bajas", label: "Bajas", count: totalBajas },
              { key: "todos", label: "Todos", count: totalActivos + totalBajas },
            ].map((est) => (
              <button key={est.key} onClick={() => setFilterEstatus(est.key)} style={{
                padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                border: filterEstatus === est.key ? "2px solid #7c3aed" : "2px solid #e5e7eb",
                backgroundColor: filterEstatus === est.key ? "#7c3aed" : "#fff",
                color: filterEstatus === est.key ? "#fff" : "#475569",
                cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                {est.label}
                <span style={{
                  fontSize: 10, padding: "2px 6px", borderRadius: 999,
                  backgroundColor: filterEstatus === est.key ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                  color: filterEstatus === est.key ? "#fff" : "#64748b",
                }}>{est.count}</span>
              </button>
            ))}
          </div>

          <div style={{ width: 1, height: 28, backgroundColor: "#e5e7eb" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={15} color="#94a3b8" />
            <select value={filterDepto} onChange={(e) => setFilterDepto(e.target.value)}
              style={{
                fontSize: 13, backgroundColor: "#f8fafc", border: "2px solid #e5e7eb",
                borderRadius: 10, padding: "8px 14px", outline: "none", cursor: "pointer",
                fontWeight: 500, color: "#475569",
              }}>
              <option value="Todos">Todos los departamentos</option>
              {deptos.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {filtered.map((emp) => {
          const gradient = DEPTO_GRADIENTS[emp.depto] || "linear-gradient(135deg, #64748b, #475569)";
          const esBaja = emp.es_baja;

          return (
            <div key={emp.clave} style={{
              ...cardBase, overflow: "hidden",
              transition: "transform 0.2s, box-shadow 0.2s",
              opacity: esBaja ? 0.85 : 1, position: "relative",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}>

              <div style={{ height: 56, background: esBaja ? "linear-gradient(135deg, #94a3b8, #64748b)" : gradient, position: "relative" }}>
                <span style={{
                  position: "absolute", top: 10, right: 12, fontSize: 10, fontFamily: "monospace",
                  fontWeight: 600, color: "rgba(255,255,255,0.85)",
                  backgroundColor: "rgba(255,255,255,0.2)",
                  padding: "3px 10px", borderRadius: 6, backdropFilter: "blur(4px)",
                }}>{emp.clave}</span>
                {esBaja && (
                  <span style={{
                    position: "absolute", top: 10, left: 12, fontSize: 10,
                    fontWeight: 700, color: "#fff", backgroundColor: "#ef4444",
                    padding: "3px 10px", borderRadius: 6,
                  }}>BAJA</span>
                )}
              </div>

              <div style={{ padding: "0 20px 16px 20px", position: "relative" }}>
                <div style={{
                  width: 48, height: 48, backgroundColor: "#fff", borderRadius: 14,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)", border: "3px solid #fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", top: -24, marginBottom: -12,
                }}>
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    background: esBaja ? "linear-gradient(135deg, #94a3b8, #64748b)" : gradient,
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                  }}>{getInitials(emp.nombre)}</span>
                </div>

                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b", margin: "0 0 14px 0", lineHeight: 1.3 }}>
                  {emp.nombre}
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { icon: Briefcase, text: emp.puesto || "Sin puesto" },
                    { icon: Building2, text: emp.depto || "Sin depto" },
                    { icon: Calendar, text: esBaja ? `Baja: ${emp.fec_baja || "—"}` : `Ingreso: ${emp.fec_ingreso || "—"}` },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#475569" }}>
                      <item.icon size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.text}</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 6, marginTop: 14, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                  <button onClick={() => { setEmpSeleccionado(emp); setShowDetailModal(true); }}
                    style={{
                      flex: 1, padding: "6px 8px",
                      backgroundColor: "#f5f3ff", color: "#7c3aed",
                      border: "1px solid #e9e5ff", borderRadius: 8,
                      fontSize: 11, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    }}>
                    <Eye size={12} />Ver
                  </button>

                  {!esBaja && (
                    <button onClick={() => openEdit(emp)}
                      style={{
                        flex: 1, padding: "6px 8px",
                        backgroundColor: "#eff6ff", color: "#2563eb",
                        border: "1px solid #bfdbfe", borderRadius: 8,
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      }}>
                      <Edit size={12} />Editar
                    </button>
                  )}

                  {esBaja ? (
                    <button onClick={() => handleReactivar(emp)} disabled={saving}
                      style={{
                        flex: 1, padding: "6px 8px",
                        backgroundColor: "#ecfdf5", color: "#047857",
                        border: "1px solid #a7f3d0", borderRadius: 8,
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      }}>
                      <RotateCcw size={12} />Reactivar
                    </button>
                  ) : (
                    <button onClick={() => {
                      setEmpSeleccionado(emp);
                      setBajaData({ fec_baja: new Date().toISOString().split("T")[0], motivo: "" });
                      setErrorMsg("");
                      setShowBajaModal(true);
                    }}
                      style={{
                        flex: 1, padding: "6px 8px",
                        backgroundColor: "#fef2f2", color: "#b91c1c",
                        border: "1px solid #fecaca", borderRadius: 8,
                        fontSize: 11, fontWeight: 600, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      }}>
                      <UserMinus size={12} />Baja
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
          <Search size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>No se encontraron empleados.</p>
        </div>
      )}

      {/* ====== MODAL NUEVO EMPLEADO ====== */}
      {showCreateModal && (
        <ModalShell title="Nuevo Empleado" onClose={() => setShowCreateModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
              <Field label="Clave *">
                <input type="text" value={newEmp.clave}
                  onChange={(e) => setNewEmp({ ...newEmp, clave: e.target.value })}
                  placeholder="Ej: 100753" style={inputStyle} />
              </Field>
              <Field label="Nombre completo *">
                <input type="text" value={newEmp.nombre}
                  onChange={(e) => setNewEmp({ ...newEmp, nombre: e.target.value })}
                  placeholder="Nombre Apellido Apellido" style={inputStyle} />
              </Field>
            </div>

            <Field label="Puesto">
              <select value={newEmp.puesto_id}
                onChange={(e) => setNewEmp({ ...newEmp, puesto_id: e.target.value })}
                style={inputStyle}>
                <option value="">Seleccionar puesto...</option>
                {puestos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} — {p.departamento}</option>
                ))}
              </select>
              {newEmp.puesto_id && (
                <p style={{ fontSize: 11, color: "#10b981", marginTop: 6 }}>
                  ✓ Se asignarán automáticamente las capacitaciones de este puesto.
                </p>
              )}
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Fecha de ingreso">
                <input type="date" value={newEmp.fec_ingreso}
                  onChange={(e) => setNewEmp({ ...newEmp, fec_ingreso: e.target.value })}
                  style={inputStyle} />
              </Field>
              <Field label="Jefe directo">
                <input type="text" value={newEmp.jefe_directo}
                  onChange={(e) => setNewEmp({ ...newEmp, jefe_directo: e.target.value })}
                  placeholder="Nombre del jefe" style={inputStyle} />
              </Field>
            </div>

            <Field label="Email (opcional)">
              <input type="email" value={newEmp.email}
                onChange={(e) => setNewEmp({ ...newEmp, email: e.target.value })}
                placeholder="correo@genetica.com" style={inputStyle} />
            </Field>

            {errorMsg && <ErrorBanner msg={errorMsg} />}

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button onClick={() => setShowCreateModal(false)} style={btnCancel}>Cancelar</button>
              <button onClick={handleCreateEmpleado} disabled={saving} style={btnPrimary}>
                {saving ? "Guardando..." : "Crear Empleado"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ====== MODAL EDITAR EMPLEADO ====== */}
      {showEditModal && (
        <ModalShell title="Editar Empleado" onClose={() => setShowEditModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: 10, backgroundColor: "#f5f3ff", borderRadius: 8, border: "1px solid #e9e5ff" }}>
              <p style={{ fontSize: 11, color: "#5b21b6", margin: 0, fontFamily: "monospace" }}>
                Clave: <b>{editEmp.clave}</b> (no editable)
              </p>
            </div>

            <Field label="Nombre completo *">
              <input type="text" value={editEmp.nombre}
                onChange={(e) => setEditEmp({ ...editEmp, nombre: e.target.value })}
                style={inputStyle} />
            </Field>

            <Field label="Puesto">
              <select value={editEmp.puesto_id}
                onChange={(e) => setEditEmp({ ...editEmp, puesto_id: e.target.value })}
                style={inputStyle}>
                <option value="">Sin puesto</option>
                {puestos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} — {p.departamento}</option>
                ))}
              </select>
              {parseInt(editEmp.puesto_id) !== (editEmp.puesto_id_original || 0) && (
                <p style={{ fontSize: 11, color: "#f59e0b", marginTop: 6, lineHeight: 1.4 }}>
                  ⚠ Estás cambiando el puesto. Las capacitaciones pendientes del puesto anterior se borrarán,
                  las completadas pasarán a historial, y se asignarán las del nuevo puesto.
                </p>
              )}
            </Field>

            <Field label="Departamento (manual, si no hay puesto)">
              <input type="text" value={editEmp.depto}
                onChange={(e) => setEditEmp({ ...editEmp, depto: e.target.value })}
                placeholder="Solo si no tiene puesto asignado"
                style={inputStyle} />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Fecha de ingreso">
                <input type="date" value={editEmp.fec_ingreso}
                  onChange={(e) => setEditEmp({ ...editEmp, fec_ingreso: e.target.value })}
                  style={inputStyle} />
              </Field>
              <Field label="Jefe directo">
                <input type="text" value={editEmp.jefe_directo}
                  onChange={(e) => setEditEmp({ ...editEmp, jefe_directo: e.target.value })}
                  style={inputStyle} />
              </Field>
            </div>

            <Field label="Email">
              <input type="email" value={editEmp.email}
                onChange={(e) => setEditEmp({ ...editEmp, email: e.target.value })}
                style={inputStyle} />
            </Field>

            {errorMsg && <ErrorBanner msg={errorMsg} />}

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button onClick={() => setShowEditModal(false)} style={btnCancel}>Cancelar</button>
              <button onClick={handleEditEmpleado} disabled={saving} style={btnPrimary}>
                {saving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ====== MODAL BAJA ====== */}
      {showBajaModal && empSeleccionado && (
        <ModalShell title="Dar de Baja" onClose={() => setShowBajaModal(false)}>
          <div style={{
            padding: 14, backgroundColor: "#fef2f2", borderRadius: 12,
            border: "1px solid #fecaca", marginBottom: 14,
          }}>
            <p style={{ fontSize: 13, color: "#7f1d1d", margin: 0 }}>Estás a punto de dar de baja a:</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#7f1d1d", margin: "6px 0 0 0" }}>
              {empSeleccionado.nombre} ({empSeleccionado.clave})
            </p>
          </div>

          <Field label="Fecha de baja *">
            <input type="date" value={bajaData.fec_baja}
              onChange={(e) => setBajaData({ ...bajaData, fec_baja: e.target.value })}
              style={inputStyle} />
          </Field>

          <Field label="Motivo (opcional)">
            <textarea value={bajaData.motivo}
              onChange={(e) => setBajaData({ ...bajaData, motivo: e.target.value })}
              placeholder="Razón de la baja..." rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          </Field>

          <p style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
            El empleado se moverá a la tabla de bajas. Sus calificaciones históricas se conservarán.
          </p>

          {errorMsg && <ErrorBanner msg={errorMsg} />}

          <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
            <button onClick={() => setShowBajaModal(false)} style={btnCancel}>Cancelar</button>
            <button onClick={handleDarBaja} disabled={saving}
              style={{ ...btnPrimary, backgroundColor: "#dc2626", boxShadow: "0 4px 14px rgba(220,38,38,0.3)" }}>
              {saving ? "Procesando..." : "Confirmar Baja"}
            </button>
          </div>
        </ModalShell>
      )}

      {/* ====== MODAL DETALLE ====== */}
      {showDetailModal && empSeleccionado && (
        <ModalShell title="Detalle del Empleado" onClose={() => setShowDetailModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <DetailRow label="Clave" value={empSeleccionado.clave} mono />
            <DetailRow label="Nombre" value={empSeleccionado.nombre} />
            <DetailRow label="Puesto" value={empSeleccionado.puesto} />
            <DetailRow label="Departamento" value={empSeleccionado.depto} />
            <DetailRow label="Fecha de ingreso" value={empSeleccionado.fec_ingreso} />
            {empSeleccionado.es_baja && (
              <DetailRow label="Fecha de baja" value={empSeleccionado.fec_baja} highlight />
            )}
            {empSeleccionado.email && <DetailRow label="Email" value={empSeleccionado.email} />}
            {empSeleccionado.jefe_directo && <DetailRow label="Jefe directo" value={empSeleccionado.jefe_directo} />}
          </div>
          <button onClick={() => setShowDetailModal(false)} style={{ ...btnCancel, width: "100%", marginTop: 16 }}>
            Cerrar
          </button>
        </ModalShell>
      )}
    </div>
  );
}

/* ========== Helpers / Mini-componentes ========== */

function ModalShell({ title, children, onClose }) {
  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 500,
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
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function DetailRow({ label, value, mono = false, highlight = false }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 14px", backgroundColor: highlight ? "#fef2f2" : "#f8fafc",
      borderRadius: 10, border: highlight ? "1px solid #fecaca" : "1px solid #e5e7eb",
    }}>
      <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>{label}</span>
      <span style={{
        fontSize: 13, color: highlight ? "#7f1d1d" : "#1e1b4b",
        fontWeight: 600, fontFamily: mono ? "monospace" : "inherit",
      }}>{value || "—"}</span>
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