import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Save,
  X,
  CheckCircle,
  AlertTriangle,
  Clock,
  Award,
  Users,
  FileText,
  ClipboardCheck,
  Eye,
  BookOpen,
} from "lucide-react";

const ESTATUS_CONFIG = {
  en_tiempo: { label: "En Tiempo", color: "#047857", bg: "#ecfdf5", border: "#a7f3d0", icon: CheckCircle },
  proxima_vencer: { label: "Próxima a Vencer", color: "#92400e", bg: "#fffbeb", border: "#fde68a", icon: AlertTriangle },
  vencida: { label: "Vencida", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", icon: Clock },
  realizada: { label: "Realizada", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", icon: Award },
};

export default function RevisionCalificaciones() {
  const [datos, setDatos] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepto, setFilterDepto] = useState("Todos");
  const [filterEstatus, setFilterEstatus] = useState("Todos");
  const [deptos, setDeptos] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showCalifModal, setShowCalifModal] = useState(false);
  const [califEmpleado, setCalifEmpleado] = useState(null);
  const [califData, setCalifData] = useState([]);
  const [califLoading, setCalifLoading] = useState(false);
  const [newRecord, setNewRecord] = useState({
    emp_clave: "",
    fecha_ingreso_cap: "",
    eval_90_fecha: "",
    eval_90_realizada: false,
    eval_90_fecha_real: "",
    numero_aniversario: 1,
    fecha_anual: "",
    estatus_anual: "en_tiempo",
    recepcion_entrega: false,
    descriptivo_puesto: false,
    matriz_capacitacion: false,
    observaciones: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [empRes, calRes] = await Promise.all([
      supabase.from("empleados").select("clave, nombre, puesto, depto, fec_ingreso").order("nombre"),
      supabase.from("calificaciones_empleado").select("*"),
    ]);
    const emps = empRes.data || [];
    const cals = calRes.data || [];
    setEmpleados(emps);
    setDeptos([...new Set(emps.map((e) => e.depto).filter(Boolean))]);

    const empMap = {};
    emps.forEach((e) => (empMap[e.clave] = e));

    const combined = cals.map((cal) => ({
      ...cal,
      empleado: empMap[cal.emp_clave] || null,
    }));
    setDatos(combined);
    setLoading(false);
  }

  async function fetchCalificaciones(empClave, empNombre) {
    setCalifLoading(true);
    setCalifEmpleado({ clave: empClave, nombre: empNombre });
    setShowCalifModal(true);

    const { data } = await supabase
      .from("asignaciones_cap")
      .select("nombre_cap_snap, calificacion, mes, completado")
      .eq("emp_clave", empClave)
      .eq("cap_eliminada", false)
      .order("mes", { ascending: false });

    setCalifData(data || []);
    setCalifLoading(false);
  }

  async function handleSaveEdit(id) {
    setSaving(true);
    const { error } = await supabase
      .from("calificaciones_empleado")
      .update({
        fecha_ingreso_cap: editData.fecha_ingreso_cap || null,
        eval_90_fecha: editData.eval_90_fecha || null,
        eval_90_realizada: editData.eval_90_realizada,
        eval_90_fecha_real: editData.eval_90_fecha_real || null,
        numero_aniversario: editData.numero_aniversario,
        fecha_anual: editData.fecha_anual || null,
        estatus_anual: editData.estatus_anual,
        recepcion_entrega: editData.recepcion_entrega,
        descriptivo_puesto: editData.descriptivo_puesto,
        matriz_capacitacion: editData.matriz_capacitacion,
        observaciones: editData.observaciones,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (!error) {
      setEditingId(null);
      setEditData({});
      fetchData();
    }
    setSaving(false);
  }

  async function handleCreate() {
    if (!newRecord.emp_clave) return;
    setSaving(true);
    const { error } = await supabase.from("calificaciones_empleado").insert({
      emp_clave: newRecord.emp_clave,
      fecha_ingreso_cap: newRecord.fecha_ingreso_cap || null,
      eval_90_fecha: newRecord.eval_90_fecha || null,
      eval_90_realizada: newRecord.eval_90_realizada,
      eval_90_fecha_real: newRecord.eval_90_fecha_real || null,
      numero_aniversario: newRecord.numero_aniversario,
      fecha_anual: newRecord.fecha_anual || null,
      estatus_anual: newRecord.estatus_anual,
      recepcion_entrega: newRecord.recepcion_entrega,
      descriptivo_puesto: newRecord.descriptivo_puesto,
      matriz_capacitacion: newRecord.matriz_capacitacion,
      observaciones: newRecord.observaciones,
    });
    if (!error) {
      setShowModal(false);
      setNewRecord({
        emp_clave: "",
        fecha_ingreso_cap: "",
        eval_90_fecha: "",
        eval_90_realizada: false,
        eval_90_fecha_real: "",
        numero_aniversario: 1,
        fecha_anual: "",
        estatus_anual: "en_tiempo",
        recepcion_entrega: false,
        descriptivo_puesto: false,
        matriz_capacitacion: false,
        observaciones: "",
      });
      fetchData();
    }
    setSaving(false);
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEditData({
      fecha_ingreso_cap: row.fecha_ingreso_cap || "",
      eval_90_fecha: row.eval_90_fecha || "",
      eval_90_realizada: row.eval_90_realizada,
      eval_90_fecha_real: row.eval_90_fecha_real || "",
      numero_aniversario: row.numero_aniversario,
      fecha_anual: row.fecha_anual || "",
      estatus_anual: row.estatus_anual,
      recepcion_entrega: row.recepcion_entrega,
      descriptivo_puesto: row.descriptivo_puesto,
      matriz_capacitacion: row.matriz_capacitacion,
      observaciones: row.observaciones || "",
    });
  }

  const filtered = datos.filter((d) => {
    const emp = d.empleado;
    const matchSearch = `${emp?.nombre || ""} ${emp?.clave || ""} ${emp?.puesto || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchDepto = filterDepto === "Todos" || emp?.depto === filterDepto;
    const matchEstatus = filterEstatus === "Todos" || d.estatus_anual === filterEstatus;
    return matchSearch && matchDepto && matchEstatus;
  });

  const empConCalif = new Set(datos.map((d) => d.emp_clave));
  const empSinCalif = empleados.filter((e) => !empConCalif.has(e.clave));

  const cardBase = {
    backgroundColor: "#fff",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid #7c3aed",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
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
            {datos.length} registros · {empSinCalif.length} empleados sin registro
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            backgroundColor: "#7c3aed",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
          }}
        >
          <Plus size={18} />
          <span>Nuevo Registro</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[
          {
            label: "En Tiempo",
            value: datos.filter((d) => d.estatus_anual === "en_tiempo").length,
            bg: "linear-gradient(135deg, #10b981, #059669)",
            shadow: "0 6px 20px rgba(16,185,129,0.3)",
          },
          {
            label: "Próximas a Vencer",
            value: datos.filter((d) => d.estatus_anual === "proxima_vencer").length,
            bg: "linear-gradient(135deg, #f59e0b, #d97706)",
            shadow: "0 6px 20px rgba(245,158,11,0.3)",
          },
          {
            label: "Vencidas",
            value: datos.filter((d) => d.estatus_anual === "vencida").length,
            bg: "linear-gradient(135deg, #ef4444, #dc2626)",
            shadow: "0 6px 20px rgba(239,68,68,0.3)",
          },
          {
            label: "Realizadas",
            value: datos.filter((d) => d.estatus_anual === "realizada").length,
            bg: "linear-gradient(135deg, #3b82f6, #2563eb)",
            shadow: "0 6px 20px rgba(59,130,246,0.3)",
          },
        ].map((s, i) => (
          <div
            key={i}
            style={{
              borderRadius: 14,
              padding: "20px 24px",
              background: s.bg,
              color: "#fff",
              boxShadow: s.shadow,
            }}
          >
            <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.75)", margin: 0 }}>
              {s.label}
            </p>
            <p style={{ fontSize: 32, fontWeight: 800, margin: "6px 0 0 0", lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...cardBase, padding: 20 }}>
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search
            size={18}
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
          />
          <input
            type="text"
            placeholder="Buscar por nombre, clave o puesto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              paddingLeft: 42,
              paddingRight: 16,
              paddingTop: 12,
              paddingBottom: 12,
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              fontSize: 14,
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "#7c3aed";
              e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#e2e8f0";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={15} color="#94a3b8" />
            <select
              value={filterDepto}
              onChange={(e) => setFilterDepto(e.target.value)}
              style={{
                fontSize: 13,
                backgroundColor: "#f8fafc",
                border: "2px solid #e5e7eb",
                borderRadius: 10,
                padding: "8px 14px",
                outline: "none",
                cursor: "pointer",
                fontWeight: 500,
                color: "#475569",
              }}
            >
              <option value="Todos">Todos los departamentos</option>
              {deptos.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div style={{ width: 1, height: 28, backgroundColor: "#e5e7eb" }} />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { key: "Todos", label: "Todos" },
              { key: "en_tiempo", label: "En Tiempo" },
              { key: "proxima_vencer", label: "Próximas" },
              { key: "vencida", label: "Vencidas" },
              { key: "realizada", label: "Realizadas" },
            ].map((est) => (
              <button
                key={est.key}
                onClick={() => setFilterEstatus(est.key)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  border: filterEstatus === est.key ? "2px solid #7c3aed" : "2px solid #e5e7eb",
                  backgroundColor: filterEstatus === est.key ? "#7c3aed" : "#fff",
                  color: filterEstatus === est.key ? "#fff" : "#475569",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {est.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...cardBase, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1300 }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                {[
                  "Empleado", "Puesto", "Departamento", "F. Ingreso Cap.",
                  "Ev. 90 Días", "Aniversario", "F. Anual", "Estatus",
                  "Calificaciones", "Recep.", "Desc.", "Matriz", "Observaciones", "Acciones",
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "14px 12px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      borderBottom: "2px solid #e5e7eb",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const emp = row.empleado;
                const isEditing = editingId === row.id;
                const est = ESTATUS_CONFIG[row.estatus_anual] || ESTATUS_CONFIG.en_tiempo;
                const EstIcon = est.icon;

                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background 0.15s",
                      backgroundColor: isEditing ? "#faf8ff" : "transparent",
                    }}
                    onMouseEnter={(e) => { if (!isEditing) e.currentTarget.style.backgroundColor = "#faf8ff"; }}
                    onMouseLeave={(e) => { if (!isEditing) e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {/* Empleado */}
                    <td style={{ padding: "12px", minWidth: 180 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, backgroundColor: "#f5f3ff", borderRadius: 8,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 700, color: "#7c3aed", flexShrink: 0,
                        }}>
                          {emp?.nombre?.split(" ").slice(0, 2).map((w) => w[0]).join("") || "?"}
                        </div>
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "#1e1b4b", margin: 0, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {emp?.nombre || row.emp_clave}
                          </p>
                          <p style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace", margin: "2px 0 0 0" }}>
                            {row.emp_clave}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Puesto */}
                    <td style={{ padding: "12px", fontSize: 12, color: "#475569", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {emp?.puesto || "—"}
                    </td>

                    {/* Departamento */}
                    <td style={{ padding: "12px", fontSize: 12, color: "#475569" }}>
                      {emp?.depto || "—"}
                    </td>

                    {/* Fecha Ingreso Cap */}
                    <td style={{ padding: "12px" }}>
                      {isEditing ? (
                        <input type="date" value={editData.fecha_ingreso_cap}
                          onChange={(e) => setEditData({ ...editData, fecha_ingreso_cap: e.target.value })}
                          style={{ fontSize: 11, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 8, outline: "none", width: 130 }}
                        />
                      ) : (
                        <span style={{ fontSize: 12, color: "#475569" }}>{row.fecha_ingreso_cap || "—"}</span>
                      )}
                    </td>

                    {/* Ev 90 días */}
                    <td style={{ padding: "12px" }}>
                      {isEditing ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <input type="date" value={editData.eval_90_fecha}
                            onChange={(e) => setEditData({ ...editData, eval_90_fecha: e.target.value })}
                            style={{ fontSize: 11, padding: "4px 6px", border: "1px solid #d1d5db", borderRadius: 6, outline: "none", width: 130 }}
                          />
                          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#64748b" }}>
                            <input type="checkbox" checked={editData.eval_90_realizada}
                              onChange={(e) => setEditData({ ...editData, eval_90_realizada: e.target.checked })}
                            />
                            Realizada
                          </label>
                        </div>
                      ) : (
                        <div>
                          <span style={{ fontSize: 12, color: "#475569" }}>{row.eval_90_fecha || "—"}</span>
                          {row.eval_90_realizada && (
                            <CheckCircle size={12} color="#10b981" style={{ marginLeft: 6, verticalAlign: "middle" }} />
                          )}
                        </div>
                      )}
                    </td>

                    {/* Aniversario */}
                    <td style={{ padding: "12px" }}>
                      {isEditing ? (
                        <input type="number" min="1" value={editData.numero_aniversario}
                          onChange={(e) => setEditData({ ...editData, numero_aniversario: parseInt(e.target.value) || 1 })}
                          style={{ fontSize: 12, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 8, outline: "none", width: 60 }}
                        />
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#7c3aed", backgroundColor: "#f5f3ff", padding: "4px 10px", borderRadius: 6 }}>
                          {row.numero_aniversario}°
                        </span>
                      )}
                    </td>

                    {/* Fecha Anual */}
                    <td style={{ padding: "12px" }}>
                      {isEditing ? (
                        <input type="date" value={editData.fecha_anual}
                          onChange={(e) => setEditData({ ...editData, fecha_anual: e.target.value })}
                          style={{ fontSize: 11, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 8, outline: "none", width: 130 }}
                        />
                      ) : (
                        <span style={{ fontSize: 12, color: "#475569" }}>{row.fecha_anual || "—"}</span>
                      )}
                    </td>

                    {/* Estatus */}
                    <td style={{ padding: "12px" }}>
                      {isEditing ? (
                        <select value={editData.estatus_anual}
                          onChange={(e) => setEditData({ ...editData, estatus_anual: e.target.value })}
                          style={{ fontSize: 11, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 8, outline: "none" }}
                        >
                          <option value="en_tiempo">En Tiempo</option>
                          <option value="proxima_vencer">Próxima a Vencer</option>
                          <option value="vencida">Vencida</option>
                          <option value="realizada">Realizada</option>
                        </select>
                      ) : (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 11, fontWeight: 600, color: est.color,
                          backgroundColor: est.bg, padding: "5px 10px",
                          borderRadius: 999, border: `1px solid ${est.border}`, whiteSpace: "nowrap",
                        }}>
                          <EstIcon size={11} />
                          {est.label}
                        </span>
                      )}
                    </td>

                    {/* CALIFICACIONES - BOTÓN NUEVO */}
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <button
                        onClick={() => fetchCalificaciones(row.emp_clave, emp?.nombre || row.emp_clave)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "6px 14px",
                          backgroundColor: "#f5f3ff",
                          color: "#7c3aed",
                          border: "1px solid #e9e5ff",
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all 0.2s",
                          whiteSpace: "nowrap",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = "#7c3aed";
                          e.currentTarget.style.color = "#fff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#f5f3ff";
                          e.currentTarget.style.color = "#7c3aed";
                        }}
                      >
                        <Eye size={13} />
                        Ver Notas
                      </button>
                    </td>

                    {/* Checkboxes */}
                    {["recepcion_entrega", "descriptivo_puesto", "matriz_capacitacion"].map((field) => (
                      <td key={field} style={{ padding: "12px", textAlign: "center" }}>
                        {isEditing ? (
                          <input type="checkbox" checked={editData[field]}
                            onChange={(e) => setEditData({ ...editData, [field]: e.target.checked })}
                            style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#7c3aed" }}
                          />
                        ) : row[field] ? (
                          <CheckCircle size={16} color="#10b981" />
                        ) : (
                          <X size={16} color="#d1d5db" />
                        )}
                      </td>
                    ))}

                    {/* Observaciones */}
                    <td style={{ padding: "12px", maxWidth: 180 }}>
                      {isEditing ? (
                        <input type="text" value={editData.observaciones}
                          onChange={(e) => setEditData({ ...editData, observaciones: e.target.value })}
                          style={{ fontSize: 11, padding: "6px 8px", border: "1px solid #d1d5db", borderRadius: 8, outline: "none", width: "100%", minWidth: 140 }}
                          placeholder="Observaciones..."
                        />
                      ) : (
                        <span style={{ fontSize: 11, color: "#64748b", display: "block", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.observaciones}>
                          {row.observaciones || "—"}
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: "12px" }}>
                      {isEditing ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => handleSaveEdit(row.id)} disabled={saving}
                            style={{ padding: "6px 12px", backgroundColor: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <Save size={12} />{saving ? "..." : "Guardar"}
                          </button>
                          <button onClick={() => { setEditingId(null); setEditData({}); }}
                            style={{ padding: "6px 10px", backgroundColor: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 8, fontSize: 11, cursor: "pointer" }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(row)}
                          style={{ padding: "6px 12px", backgroundColor: "#f5f3ff", color: "#7c3aed", border: "1px solid #e9e5ff", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                        >
                          <Edit size={12} />Editar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
            <Search size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14, margin: 0 }}>No se encontraron registros.</p>
          </div>
        )}
      </div>

      {/* ========== MODAL CALIFICACIONES ========== */}
      {showCalifModal && (
        <div
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)", zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 620,
              maxHeight: "85vh", display: "flex", flexDirection: "column",
              boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 24px", borderBottom: "1px solid #e5e7eb", flexShrink: 0,
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
                    {califEmpleado?.nombre} — {califEmpleado?.clave}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowCalifModal(false)}
                style={{ padding: 6, border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}
              >
                <X size={20} color="#94a3b8" />
              </button>
            </div>

            {/* Stats rápidos */}
            {!califLoading && califData.length > 0 && (
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 16 }}>
                {(() => {
                  const conNota = califData.filter((c) => c.calificacion !== null);
                  const promedio = conNota.length > 0
                    ? (conNota.reduce((sum, c) => sum + c.calificacion, 0) / conNota.length).toFixed(1)
                    : "—";
                  const mejor = conNota.length > 0 ? Math.max(...conNota.map((c) => c.calificacion)) : "—";
                  const menor = conNota.length > 0 ? Math.min(...conNota.map((c) => c.calificacion)) : "—";
                  return [
                    { label: "Total Cursos", value: califData.length, color: "#7c3aed" },
                    { label: "Promedio", value: promedio, color: "#10b981" },
                    { label: "Mejor", value: mejor, color: "#3b82f6" },
                    { label: "Menor", value: menor, color: "#f59e0b" },
                  ].map((s, i) => (
                    <div key={i} style={{ flex: 1, textAlign: "center", padding: "10px", backgroundColor: "#f8fafc", borderRadius: 10 }}>
                      <p style={{ fontSize: 10, color: "#94a3b8", margin: 0, fontWeight: 600 }}>{s.label}</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: s.color, margin: "4px 0 0 0" }}>{s.value}</p>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* Lista */}
            <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
              {califLoading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
                  <div style={{ width: 28, height: 28, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                </div>
              ) : califData.length === 0 ? (
                <div style={{ textAlign: "center", padding: 48, color: "#94a3b8" }}>
                  <BookOpen size={36} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                  <p style={{ fontSize: 14, margin: 0 }}>Sin capacitaciones registradas</p>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      {["Capacitación", "Año", "Calificación"].map((h) => (
                        <th key={h} style={{
                          padding: "12px 20px", textAlign: h === "Calificación" ? "center" : "left",
                          fontSize: 11, fontWeight: 700, color: "#64748b",
                          textTransform: "uppercase", borderBottom: "2px solid #e5e7eb",
                          position: "sticky", top: 0, backgroundColor: "#f8fafc",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {califData.map((cap, i) => {
                      const nota = cap.calificacion;
                      let notaColor = "#94a3b8";
                      let notaBg = "#f8fafc";
                      if (nota !== null) {
                        if (nota >= 9) { notaColor = "#047857"; notaBg = "#ecfdf5"; }
                        else if (nota >= 7) { notaColor = "#1d4ed8"; notaBg = "#eff6ff"; }
                        else if (nota >= 6) { notaColor = "#92400e"; notaBg = "#fffbeb"; }
                        else { notaColor = "#b91c1c"; notaBg = "#fef2f2"; }
                      }
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#faf8ff"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                          <td style={{ padding: "10px 20px", fontSize: 13, color: "#334155", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            title={cap.nombre_cap_snap}
                          >
                            {cap.nombre_cap_snap || "—"}
                          </td>
                          <td style={{ padding: "10px 20px", fontSize: 12, color: "#64748b" }}>
                            {cap.mes || "—"}
                          </td>
                          <td style={{ padding: "10px 20px", textAlign: "center" }}>
                            <span style={{
                              display: "inline-block", minWidth: 48,
                              padding: "5px 14px", borderRadius: 8,
                              fontSize: 13, fontWeight: 700,
                              color: notaColor, backgroundColor: notaBg,
                            }}>
                              {nota !== null ? nota : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "14px 24px", borderTop: "1px solid #e5e7eb",
              backgroundColor: "#f8fafc", borderRadius: "0 0 20px 20px", flexShrink: 0,
            }}>
              <button onClick={() => setShowCalifModal(false)}
                style={{
                  width: "100%", padding: 12, fontSize: 14, fontWeight: 600,
                  color: "#475569", border: "2px solid #d1d5db", borderRadius: 12,
                  backgroundColor: "#fff", cursor: "pointer",
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL NUEVO REGISTRO ========== */}
      {showModal && (
        <div
          style={{
            position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)", zIndex: 50,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 520,
              maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
              position: "sticky", top: 0, backgroundColor: "#fff", zIndex: 1, borderRadius: "20px 20px 0 0",
            }}>
              <div>
                <h3 style={{ fontWeight: 700, color: "#1e1b4b", margin: 0, fontSize: 18 }}>Nuevo Registro de Calificación</h3>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0 0" }}>Agrega el seguimiento de un empleado</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ padding: 6, border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
                <X size={20} color="#94a3b8" />
              </button>
            </div>

            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Empleado</label>
                <select value={newRecord.emp_clave} onChange={(e) => setNewRecord({ ...newRecord, emp_clave: e.target.value })}
                  style={{ width: "100%", backgroundColor: "#f8fafc", border: "2px solid #e5e7eb", borderRadius: 12, padding: "12px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                >
                  <option value="">Seleccionar empleado...</option>
                  {empSinCalif.map((e) => (
                    <option key={e.clave} value={e.clave}>{e.nombre} — {e.depto}</option>
                  ))}
                </select>
                {empSinCalif.length === 0 && (
                  <p style={{ fontSize: 11, color: "#f59e0b", marginTop: 6 }}>Todos los empleados ya tienen registro.</p>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "F. Ingreso Capacitación", key: "fecha_ingreso_cap" },
                  { label: "F. Evaluación 90 Días", key: "eval_90_fecha" },
                  { label: "F. Calificación Anual", key: "fecha_anual" },
                ].map((f) => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>{f.label}</label>
                    <input type="date" value={newRecord[f.key]} onChange={(e) => setNewRecord({ ...newRecord, [f.key]: e.target.value })}
                      style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", backgroundColor: "#f8fafc" }}
                    />
                  </div>
                ))}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" }}>N° Aniversario</label>
                  <input type="number" min="1" value={newRecord.numero_aniversario}
                    onChange={(e) => setNewRecord({ ...newRecord, numero_aniversario: parseInt(e.target.value) || 1 })}
                    style={{ width: "100%", padding: "10px 12px", border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box", backgroundColor: "#f8fafc" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8, display: "block" }}>Estatus Anual</label>
                <select value={newRecord.estatus_anual} onChange={(e) => setNewRecord({ ...newRecord, estatus_anual: e.target.value })}
                  style={{ width: "100%", backgroundColor: "#f8fafc", border: "2px solid #e5e7eb", borderRadius: 12, padding: "12px 14px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                >
                  <option value="en_tiempo">En Tiempo</option>
                  <option value="proxima_vencer">Próxima a Vencer</option>
                  <option value="vencida">Vencida</option>
                  <option value="realizada">Realizada</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 24, padding: "14px 16px", backgroundColor: "#f8fafc", borderRadius: 12, border: "1px solid #e5e7eb" }}>
                {[
                  { key: "eval_90_realizada", label: "Ev. 90 días", icon: ClipboardCheck },
                  { key: "recepcion_entrega", label: "Recepción", icon: FileText },
                  { key: "descriptivo_puesto", label: "Descriptivo", icon: Users },
                  { key: "matriz_capacitacion", label: "Matriz", icon: Award },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <label key={item.key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#475569", cursor: "pointer", fontWeight: 500 }}>
                      <input type="checkbox" checked={newRecord[item.key]}
                        onChange={(e) => setNewRecord({ ...newRecord, [item.key]: e.target.checked })}
                        style={{ accentColor: "#7c3aed" }}
                      />
                      <Icon size={13} color="#94a3b8" />
                      {item.label}
                    </label>
                  );
                })}
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8, display: "block" }}>Observaciones</label>
                <textarea value={newRecord.observaciones}
                  onChange={(e) => setNewRecord({ ...newRecord, observaciones: e.target.value })}
                  placeholder="Notas adicionales..." rows={3}
                  style={{ width: "100%", padding: "10px 14px", border: "2px solid #e5e7eb", borderRadius: 12, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", backgroundColor: "#f8fafc", fontFamily: "inherit" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, padding: "18px 24px", borderTop: "1px solid #e5e7eb", backgroundColor: "#f8fafc", borderRadius: "0 0 20px 20px" }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#475569", border: "2px solid #d1d5db", borderRadius: 12, backgroundColor: "#fff", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button onClick={handleCreate} disabled={!newRecord.emp_clave || saving}
                style={{ flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#fff", backgroundColor: "#7c3aed", border: "none", borderRadius: 12, cursor: "pointer", opacity: !newRecord.emp_clave || saving ? 0.5 : 1, boxShadow: "0 4px 14px rgba(124,58,237,0.3)" }}
              >
                {saving ? "Guardando..." : "Crear Registro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}