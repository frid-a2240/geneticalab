// src/components/pages/Calificaciones.jsx
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Search, Award, Calendar, Building2, Hash, Briefcase,
  X, AlertCircle, Filter, Plus, ArrowLeft, Save,
} from "lucide-react";

const PERIODOS = [
  { key: "90dias", label: "90 días",     entrega: "fecha_entrega_90dias", real: "fecha_real_90dias" },
  { key: "2025",   label: "Anual 2025",  entrega: "entrega_2025",         real: "fecha_real_2025" },
  { key: "2026",   label: "Anual 2026",  entrega: "entrega_2026",         real: "fecha_real_2026" },
  { key: "2027",   label: "Anual 2027",  entrega: "entrega_2027",         real: "fecha_real_2027" },
];

const DIAS_AVISO = 30;

// Estatus de una fecha de entrega: E (entregada) / P (próxima a vencer) / V (vencida) / null (sin dato/vigente)
function calcularEstatus(entregaISO, realISO) {
  if (realISO) return "E";
  if (!entregaISO) return null;
  const hoy = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
  const entrega = new Date(entregaISO + "T00:00:00");
  const diffDias = Math.round((entrega - hoy) / 86400000);
  if (diffDias < 0) return "V";
  if (diffDias <= DIAS_AVISO) return "P";
  return null;
}

const ESTATUS_INFO = {
  E: { label: "Entregada",        color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
  P: { label: "Próxima a Vencer", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  V: { label: "Vencida",          color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
};

function EstatusBadge({ estatus }) {
  if (!estatus) return <span style={{ fontSize: 12, color: "#cbd5e1" }}>—</span>;
  const info = ESTATUS_INFO[estatus];
  return (
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 10px",
      borderRadius: 999, backgroundColor: info.bg, color: info.color,
      border: `1px solid ${info.border}`,
    }}>
      {info.label}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return "—";
  return d;
}

export default function Calificaciones() {
  const [searchParams, setSearchParams] = useSearchParams();
  const empParam = searchParams.get("emp");

  const [filas, setFilas] = useState([]); // empleados + calificaciones join
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filterDepto, setFilterDepto] = useState("Todos");
  const [filterEstatus, setFilterEstatus] = useState("Todos");
  const [empSel, setEmpSel] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [form, setForm] = useState({});

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (empParam && filas.length > 0) {
      const f = filas.find((r) => r.clave === empParam);
      if (f) abrirDetalle(f);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empParam, filas]);

  async function cargar() {
    setLoading(true);
    const { data: empleados } = await supabase
      .from("empleados")
      .select("clave, nombre, puesto, depto, fec_ingreso, fec_cambio_puesto")
      .order("nombre");
    const { data: califs } = await supabase.from("calificaciones").select("*");

    const califByClave = new Map((califs || []).map((c) => [c.emp_clave, c]));
    const combinado = (empleados || []).map((e) => ({
      ...e,
      calif: califByClave.get(e.clave) || null,
    }));
    setFilas(combinado);
    setLoading(false);
  }

  const deptos = useMemo(
    () => [...new Set(filas.map((f) => f.depto).filter(Boolean))].sort(),
    [filas]
  );

  const filasConEstatus = useMemo(() => {
    return filas.map((f) => {
      const estatusPorPeriodo = PERIODOS.map((p) =>
        calcularEstatus(f.calif?.[p.entrega] || null, f.calif?.[p.real] || null)
      );
      const peor = estatusPorPeriodo.includes("V") ? "V" : estatusPorPeriodo.includes("P") ? "P" : null;
      return { ...f, estatusPorPeriodo, peor };
    });
  }, [filas]);

  const filtrados = useMemo(() => {
    return filasConEstatus.filter((f) => {
      const matchQuery = `${f.nombre} ${f.clave} ${f.puesto || ""}`.toLowerCase().includes(query.toLowerCase());
      const matchDepto = filterDepto === "Todos" || f.depto === filterDepto;
      const matchEstatus =
        filterEstatus === "Todos" ||
        (filterEstatus === "vencidas" && f.peor === "V") ||
        (filterEstatus === "proximas" && f.peor === "P") ||
        (filterEstatus === "al_dia" && !f.peor);
      return matchQuery && matchDepto && matchEstatus;
    });
  }, [filasConEstatus, query, filterDepto, filterEstatus]);

  const stats = useMemo(() => ({
    total: filasConEstatus.length,
    vencidas: filasConEstatus.filter((f) => f.peor === "V").length,
    proximas: filasConEstatus.filter((f) => f.peor === "P").length,
  }), [filasConEstatus]);

  function abrirDetalle(f) {
    setEmpSel(f);
    setForm({
      cierre_matriz: f.calif?.cierre_matriz || "",
      fecha_entrega_90dias: f.calif?.fecha_entrega_90dias || "",
      fecha_real_90dias: f.calif?.fecha_real_90dias || "",
      entrega_2025: f.calif?.entrega_2025 || "",
      fecha_real_2025: f.calif?.fecha_real_2025 || "",
      entrega_2026: f.calif?.entrega_2026 || "",
      fecha_real_2026: f.calif?.fecha_real_2026 || "",
      entrega_2027: f.calif?.entrega_2027 || "",
      fecha_real_2027: f.calif?.fecha_real_2027 || "",
      observaciones: f.calif?.observaciones || "",
      rh: f.calif?.rh || "",
    });
  }

  function cerrarDetalle() {
    setEmpSel(null);
    setForm({});
    if (empParam) {
      searchParams.delete("emp");
      setSearchParams(searchParams);
    }
  }

  async function guardarDetalle() {
    setSaving(true);
    const payload = { ...form };
    Object.keys(payload).forEach((k) => { if (payload[k] === "") payload[k] = null; });
    payload.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from("calificaciones")
      .upsert({ emp_clave: empSel.clave, ...payload }, { onConflict: "emp_clave" });

    setSaving(false);
    if (error) { setErrorMsg("Error al guardar: " + error.message); return; }
    await cargar();
    cerrarDetalle();
  }

  const cardBase = { backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        <div style={{ width: 36, height: 36, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (empSel) {
    return (
      <DetalleEmpleado
        emp={empSel} form={form} setForm={setForm}
        onBack={cerrarDetalle} onSave={guardarDetalle}
        saving={saving} errorMsg={errorMsg}
        cardBase={cardBase}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Calificaciones</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>Control de vencimientos de calificaciones por empleado</p>
        </div>
        <button onClick={() => { setErrorMsg(""); setShowAddModal(true); }}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
            backgroundColor: "#7c3aed", color: "#fff", border: "none", borderRadius: 12,
            fontSize: 14, fontWeight: 500, cursor: "pointer", boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
          }}>
          <Plus size={18} /><span>Agregar empleado</span>
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "Total Empleados",   value: stats.total,    bg: "linear-gradient(135deg, #7c3aed, #5b21b6)" },
          { label: "Vencidas",          value: stats.vencidas, bg: "linear-gradient(135deg, #ef4444, #dc2626)" },
          { label: "Próximas a Vencer", value: stats.proximas, bg: "linear-gradient(135deg, #f59e0b, #d97706)" },
        ].map((s, i) => (
          <div key={i} style={{ borderRadius: 14, padding: "20px 24px", background: s.bg, color: "#fff", boxShadow: "0 6px 20px rgba(0,0,0,0.15)" }}>
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
            value={query} onChange={(e) => setQuery(e.target.value)}
            style={{
              width: "100%", paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
              backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12,
              fontSize: 14, outline: "none", boxSizing: "border-box",
            }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { key: "Todos", label: "Todos" },
              { key: "vencidas", label: "Vencidas" },
              { key: "proximas", label: "Próx. a Vencer" },
              { key: "al_dia", label: "Al día" },
            ].map((est) => (
              <button key={est.key} onClick={() => setFilterEstatus(est.key)} style={{
                padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600,
                border: filterEstatus === est.key ? "2px solid #7c3aed" : "2px solid #e5e7eb",
                backgroundColor: filterEstatus === est.key ? "#7c3aed" : "#fff",
                color: filterEstatus === est.key ? "#fff" : "#475569",
                cursor: "pointer",
              }}>{est.label}</button>
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

          <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>{filtrados.length} de {filas.length}</span>
        </div>
      </div>

      {/* Tabla */}
      <div style={{ ...cardBase, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc" }}>
                {["Empleado", "Puesto", "Depto", "90 días", "2025", "2026", "2027"].map((h) => (
                  <th key={h} style={tableTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((f) => (
                <tr key={f.clave} onClick={() => abrirDetalle(f)}
                  style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#faf8ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <td style={tableTd}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>{f.nombre}</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, fontFamily: "monospace" }}>{f.clave}</p>
                  </td>
                  <td style={{ ...tableTd, fontSize: 12, color: "#475569" }}>{f.puesto || "—"}</td>
                  <td style={{ ...tableTd, fontSize: 12, color: "#475569" }}>{f.depto || "—"}</td>
                  {f.estatusPorPeriodo.map((estatus, i) => (
                    <td key={i} style={tableTd}><EstatusBadge estatus={estatus} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtrados.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#94a3b8" }}>
            <Award size={40} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14 }}>No se encontraron empleados.</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <AgregarEmpleadoModal
          onClose={() => setShowAddModal(false)}
          onCreated={async () => { setShowAddModal(false); await cargar(); }}
        />
      )}
    </div>
  );
}

function DetalleEmpleado({ emp, form, setForm, onBack, onSave, saving, errorMsg, cardBase }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <button onClick={onBack} style={{
        display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start",
        padding: "8px 14px", backgroundColor: "#fff", border: "1px solid #e5e7eb",
        borderRadius: 10, fontSize: 13, fontWeight: 600, color: "#475569", cursor: "pointer",
      }}>
        <ArrowLeft size={15} /> Volver a la lista
      </button>

      <div style={{ ...cardBase, overflow: "hidden" }}>
        <div style={{ height: 6, background: "linear-gradient(90deg,#7c3aed,#ec4899)" }} />
        <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{
            width: 50, height: 50, borderRadius: 14, flexShrink: 0,
            background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 16, fontWeight: 800,
          }}>
            {emp.nombre.split(" ").slice(0, 2).map((w) => w[0]).join("")}
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: "#1e1b4b", margin: 0 }}>{emp.nombre}</h2>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
              {[
                { icon: Hash, text: emp.clave },
                { icon: Briefcase, text: emp.puesto || "—" },
                { icon: Building2, text: emp.depto || "—" },
                { icon: Calendar, text: `Ingreso: ${emp.fec_ingreso || "—"}` },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <item.icon size={12} color="#94a3b8" />
                  <span style={{ fontSize: 12, color: "#475569" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...cardBase, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", margin: "0 0 16px 0" }}>Cierre de matriz</h3>
        <Field label="Cierre de matriz">
          <input type="date" value={form.cierre_matriz || ""}
            onChange={(e) => setForm({ ...form, cierre_matriz: e.target.value })} style={inputStyle} />
        </Field>
      </div>

      {PERIODOS.map((p) => {
        const estatus = calcularEstatus(form[p.entrega] || null, form[p.real] || null);
        return (
          <div key={p.key} style={{ ...cardBase, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>{p.label}</h3>
              <EstatusBadge estatus={estatus} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Fecha de entrega">
                <input type="date" value={form[p.entrega] || ""}
                  onChange={(e) => setForm({ ...form, [p.entrega]: e.target.value })} style={inputStyle} />
              </Field>
              <Field label="Fecha real de entrega">
                <input type="date" value={form[p.real] || ""}
                  onChange={(e) => setForm({ ...form, [p.real]: e.target.value })} style={inputStyle} />
              </Field>
            </div>
          </div>
        );
      })}

      <div style={{ ...cardBase, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", margin: "0 0 16px 0" }}>Observaciones</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Observaciones">
            <textarea value={form.observaciones || ""} rows={3}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
          </Field>
          <Field label="RH">
            <input type="text" value={form.rh || ""}
              onChange={(e) => setForm({ ...form, rh: e.target.value })} style={inputStyle} />
          </Field>
        </div>
      </div>

      {errorMsg && <ErrorBanner msg={errorMsg} />}

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onBack} style={btnCancel}>Cancelar</button>
        <button onClick={onSave} disabled={saving} style={btnPrimary}>
          <Save size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

function AgregarEmpleadoModal({ onClose, onCreated }) {
  const [nuevo, setNuevo] = useState({
    clave: "", nombre: "", puesto: "", depto: "",
    fec_ingreso: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function crear() {
    setErrorMsg("");
    if (!nuevo.clave.trim() || !nuevo.nombre.trim()) {
      setErrorMsg("Clave y nombre son obligatorios.");
      return;
    }
    setSaving(true);

    const { data: existe } = await supabase.from("empleados").select("clave").eq("clave", nuevo.clave.trim()).maybeSingle();
    if (existe) { setErrorMsg("Ya existe un empleado con esa clave."); setSaving(false); return; }

    const { error } = await supabase.from("empleados").insert({
      clave: nuevo.clave.trim(),
      nombre: nuevo.nombre.trim(),
      puesto: nuevo.puesto.trim(),
      depto: nuevo.depto.trim(),
      fec_ingreso: nuevo.fec_ingreso || null,
      activo: true,
    });
    if (error) { setErrorMsg("Error al crear: " + error.message); setSaving(false); return; }

    await supabase.from("calificaciones").insert({ emp_clave: nuevo.clave.trim() });
    setSaving(false);
    onCreated();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(4px)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{ backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 460, boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #e5e7eb" }}>
          <h3 style={{ fontWeight: 700, color: "#1e1b4b", margin: 0, fontSize: 18 }}>Agregar Empleado</h3>
          <button onClick={onClose} style={{ padding: 6, border: "none", background: "none", cursor: "pointer", borderRadius: 8 }}>
            <X size={20} color="#94a3b8" />
          </button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
            <Field label="Clave *">
              <input type="text" value={nuevo.clave} onChange={(e) => setNuevo({ ...nuevo, clave: e.target.value })} placeholder="Ej: 100753" style={inputStyle} />
            </Field>
            <Field label="Nombre completo *">
              <input type="text" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} placeholder="Apellido Apellido, Nombre" style={inputStyle} />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Puesto">
              <input type="text" value={nuevo.puesto} onChange={(e) => setNuevo({ ...nuevo, puesto: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Departamento">
              <input type="text" value={nuevo.depto} onChange={(e) => setNuevo({ ...nuevo, depto: e.target.value })} style={inputStyle} />
            </Field>
          </div>
          <Field label="Fecha de ingreso">
            <input type="date" value={nuevo.fec_ingreso} onChange={(e) => setNuevo({ ...nuevo, fec_ingreso: e.target.value })} style={inputStyle} />
          </Field>

          {errorMsg && <ErrorBanner msg={errorMsg} />}

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button onClick={onClose} style={btnCancel}>Cancelar</button>
            <button onClick={crear} disabled={saving} style={btnPrimary}>{saving ? "Guardando..." : "Crear Empleado"}</button>
          </div>
        </div>
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
      display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
      backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10,
      color: "#b91c1c", fontSize: 12, fontWeight: 500,
    }}>
      <AlertCircle size={14} />{msg}
    </div>
  );
}

const tableTh = {
  padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700,
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
  borderBottom: "2px solid #e5e7eb", whiteSpace: "nowrap",
};
const tableTd = { padding: "11px 14px", fontSize: 13, color: "#475569", verticalAlign: "middle" };
const inputStyle = {
  width: "100%", padding: "10px 12px", backgroundColor: "#f8fafc",
  border: "2px solid #e5e7eb", borderRadius: 10, fontSize: 13,
  outline: "none", boxSizing: "border-box",
};
const btnCancel = {
  flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#475569",
  border: "2px solid #d1d5db", borderRadius: 12, backgroundColor: "#fff", cursor: "pointer",
};
const btnPrimary = {
  flex: 1, padding: 12, fontSize: 14, fontWeight: 600, color: "#fff",
  backgroundColor: "#7c3aed", border: "none", borderRadius: 12,
  cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
};
