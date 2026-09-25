// src/components/pages/Calendario.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays, Filter, AlertCircle } from "lucide-react";
import { cargarVencimientos, ESTATUS_INFO, DIAS_AVISO, hoyISO } from "../../../lib/calificaciones.js";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MAX_CHIPS = 3;

function isoDe(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function fmtLargo(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1].toLowerCase()} de ${y}`;
}

function textoDias(ev) {
  if (ev.estatus === "E") return `Entregada ${ev.fechaReal}`;
  if (ev.dias === 0) return "Vence hoy";
  if (ev.dias < 0) return `Vencida hace ${-ev.dias} día${ev.dias === -1 ? "" : "s"}`;
  return `Faltan ${ev.dias} día${ev.dias === 1 ? "" : "s"}`;
}

export default function Calendario() {
  const navigate = useNavigate();
  const hoy = hoyISO();
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [diaSel, setDiaSel] = useState(hoy);
  const [filtros, setFiltros] = useState({ V: true, P: true, F: true, E: false });
  const [filterDepto, setFilterDepto] = useState("Todos");

  useEffect(() => {
    cargarVencimientos()
      .then(setEventos)
      .catch((e) => setErrorMsg("Error al cargar: " + e.message))
      .finally(() => setLoading(false));
  }, []);

  const deptos = useMemo(
    () => [...new Set(eventos.map((e) => e.depto).filter(Boolean))].sort(),
    [eventos]
  );

  const visibles = useMemo(
    () => eventos.filter((e) => filtros[e.estatus] && (filterDepto === "Todos" || e.depto === filterDepto)),
    [eventos, filtros, filterDepto]
  );

  const porFecha = useMemo(() => {
    const map = new Map();
    for (const e of visibles) {
      if (!map.has(e.fecha)) map.set(e.fecha, []);
      map.get(e.fecha).push(e);
    }
    return map;
  }, [visibles]);

  // Celdas del mes, iniciando en lunes
  const celdas = useMemo(() => {
    const primerDia = new Date(mes.y, mes.m, 1);
    const offset = (primerDia.getDay() + 6) % 7;
    const diasMes = new Date(mes.y, mes.m + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= diasMes; d++) out.push(isoDe(mes.y, mes.m, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [mes]);

  const resumenMes = useMemo(() => {
    const prefijo = isoDe(mes.y, mes.m, 1).slice(0, 7);
    const delMes = visibles.filter((e) => e.fecha.startsWith(prefijo));
    return {
      V: delMes.filter((e) => e.estatus === "V").length,
      P: delMes.filter((e) => e.estatus === "P").length,
      total: delMes.length,
    };
  }, [visibles, mes]);

  function moverMes(delta) {
    setMes(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function irHoy() {
    const d = new Date();
    setMes({ y: d.getFullYear(), m: d.getMonth() });
    setDiaSel(hoy);
  }

  function abrirEmpleado(clave) {
    navigate(`/calificaciones?emp=${encodeURIComponent(clave)}`);
  }

  const cardBase = { backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
  const eventosDia = porFecha.get(diaSel) || [];

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
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Calendario</h1>
        <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
          Fechas de entrega de calificaciones · aviso {DIAS_AVISO} días antes
        </p>
      </div>

      {errorMsg && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#b91c1c", fontSize: 12, fontWeight: 500 }}>
          <AlertCircle size={14} />{errorMsg}
        </div>
      )}

      {/* Filtros */}
      <div style={{ ...cardBase, padding: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["V", "P", "F", "E"].map((k) => {
            const info = ESTATUS_INFO[k];
            const activo = filtros[k];
            return (
              <button key={k} onClick={() => setFiltros({ ...filtros, [k]: !activo })} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `2px solid ${activo ? info.color : "#e5e7eb"}`,
                backgroundColor: activo ? info.bg : "#fff",
                color: activo ? info.color : "#94a3b8",
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: activo ? info.color : "#cbd5e1" }} />
                {info.label}
              </button>
            );
          })}
        </div>

        <div style={{ width: 1, height: 28, backgroundColor: "#e5e7eb" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Filter size={15} color="#94a3b8" />
          <select value={filterDepto} onChange={(e) => setFilterDepto(e.target.value)} style={{
            fontSize: 13, backgroundColor: "#f8fafc", border: "2px solid #e5e7eb",
            borderRadius: 10, padding: "8px 14px", outline: "none", cursor: "pointer",
            fontWeight: 500, color: "#475569",
          }}>
            <option value="Todos">Todos los departamentos</option>
            {deptos.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Mes */}
        <div style={{ ...cardBase, padding: 20, flex: "3 1 560px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1e1b4b", margin: 0 }}>{MESES[mes.m]} {mes.y}</h2>
              <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 0 0" }}>
                {resumenMes.total} entrega{resumenMes.total === 1 ? "" : "s"} este mes
                {resumenMes.V > 0 && <span style={{ color: ESTATUS_INFO.V.color, fontWeight: 600 }}> · {resumenMes.V} vencida{resumenMes.V === 1 ? "" : "s"}</span>}
                {resumenMes.P > 0 && <span style={{ color: ESTATUS_INFO.P.color, fontWeight: 600 }}> · {resumenMes.P} próxima{resumenMes.P === 1 ? "" : "s"}</span>}
              </p>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => moverMes(-1)} style={navBtn} title="Mes anterior"><ChevronLeft size={16} /></button>
              <button onClick={irHoy} style={{ ...navBtn, padding: "0 14px", fontSize: 12, fontWeight: 600 }}>Hoy</button>
              <button onClick={() => moverMes(1)} style={navBtn} title="Mes siguiente"><ChevronRight size={16} /></button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(84px, 1fr))", gap: 4, minWidth: 600 }}>
              {DIAS_SEMANA.map((d) => (
                <div key={d} style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", padding: "4px 6px" }}>{d}</div>
              ))}
              {celdas.map((iso, i) => {
                if (!iso) return <div key={`v${i}`} />;
                const evs = porFecha.get(iso) || [];
                const esHoy = iso === hoy;
                const sel = iso === diaSel;
                return (
                  <div key={iso} onClick={() => setDiaSel(iso)} style={{
                    minHeight: 92, padding: 6, borderRadius: 10, cursor: "pointer",
                    border: sel ? "2px solid #7c3aed" : "1px solid #f1f5f9",
                    backgroundColor: sel ? "#faf8ff" : "#fff",
                    display: "flex", flexDirection: "column", gap: 3, boxSizing: "border-box",
                  }}>
                    <span style={{
                      alignSelf: "flex-start", fontSize: 12, fontWeight: 700,
                      width: 24, height: 24, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      backgroundColor: esHoy ? "#ec4899" : "transparent",
                      color: esHoy ? "#fff" : "#1e1b4b",
                    }}>{Number(iso.slice(8))}</span>
                    {evs.slice(0, MAX_CHIPS).map((ev) => {
                      const info = ESTATUS_INFO[ev.estatus];
                      return (
                        <span key={ev.id} title={`${ev.nombre} · ${ev.periodo} · ${info.label}`} style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 6,
                          backgroundColor: info.bg, color: info.color, borderLeft: `3px solid ${info.color}`,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>
                          {ev.nombre.split(",")[1]?.trim().split(" ")[0] || ev.nombre.split(" ")[0]} · {ev.periodo}
                        </span>
                      );
                    })}
                    {evs.length > MAX_CHIPS && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#7c3aed", paddingLeft: 4 }}>+{evs.length - MAX_CHIPS} más</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Detalle del día */}
        <div style={{ ...cardBase, padding: 20, flex: "1 1 280px", minWidth: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>{fmtLargo(diaSel)}</h3>
          <p style={{ fontSize: 12, color: "#64748b", margin: "4px 0 16px 0" }}>
            {eventosDia.length === 0 ? "Sin entregas este día" : `${eventosDia.length} entrega${eventosDia.length === 1 ? "" : "s"}`}
          </p>
          {eventosDia.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#cbd5e1" }}>
              <CalendarDays size={36} style={{ margin: "0 auto" }} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {eventosDia.map((ev) => {
              const info = ESTATUS_INFO[ev.estatus];
              return (
                <button key={ev.id} onClick={() => abrirEmpleado(ev.clave)} style={{
                  textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                  backgroundColor: "#fff", border: "1px solid #e5e7eb", borderLeft: `4px solid ${info.color}`,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1e1b4b", margin: 0 }}>{ev.nombre}</p>
                  <p style={{ fontSize: 11, color: "#64748b", margin: "2px 0 0 0" }}>{ev.periodo} · {ev.depto || "—"}</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: info.color, margin: "4px 0 0 0" }}>{textoDias(ev)}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const navBtn = {
  height: 34, minWidth: 34, display: "flex", alignItems: "center", justifyContent: "center",
  backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
  color: "#475569", cursor: "pointer",
};
