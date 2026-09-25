// src/components/NotificacionesBell.jsx
// Campana con las calificaciones vencidas y próximas a vencer.
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, CalendarDays } from "lucide-react";
import { cargarVencimientos, ESTATUS_INFO, DIAS_AVISO } from "../../lib/calificaciones.js";

function textoDias(dias) {
  if (dias === 0) return "Vence hoy";
  if (dias < 0) return `Vencida hace ${-dias} día${dias === -1 ? "" : "s"}`;
  return `Faltan ${dias} día${dias === 1 ? "" : "s"}`;
}

export default function NotificacionesBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [avisos, setAvisos] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  // Se recarga al cambiar de página para reflejar lo que se guardó en Calificaciones
  useEffect(() => {
    cargarVencimientos()
      .then((eventos) => {
        const vencidas = eventos.filter((e) => e.estatus === "V");
        const proximas = eventos.filter((e) => e.estatus === "P");
        setAvisos([...vencidas, ...proximas]);
      })
      .catch(() => setAvisos([]));
  }, [location.pathname]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, [abierto]);

  const nVencidas = avisos.filter((a) => a.estatus === "V").length;
  const nProximas = avisos.length - nVencidas;

  function ir(path) {
    setAbierto(false);
    navigate(path);
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setAbierto(!abierto)} title="Notificaciones" style={{
        position: "relative", width: 40, height: 40, borderRadius: 12,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "#fff", border: "1px solid #e5e7eb", cursor: "pointer",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)", color: "#5b21b6",
      }}>
        <Bell size={19} />
        {avisos.length > 0 && (
          <span style={{
            position: "absolute", top: -6, right: -6, minWidth: 20, height: 20, padding: "0 5px",
            borderRadius: 999, fontSize: 11, fontWeight: 700, color: "#fff",
            backgroundColor: nVencidas > 0 ? ESTATUS_INFO.V.color : ESTATUS_INFO.P.color,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #F5F3FF", boxSizing: "border-box",
          }}>{avisos.length > 99 ? "99+" : avisos.length}</span>
        )}
      </button>

      {abierto && (
        <div style={{
          position: "absolute", right: 0, top: 48, zIndex: 60,
          width: 340, maxWidth: "calc(100vw - 32px)",
          backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e5e7eb",
          boxShadow: "0 16px 40px rgba(0,0,0,0.15)", overflow: "hidden",
        }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Avisos de calificaciones</p>
            <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0 0" }}>
              {avisos.length === 0
                ? `Nada vencido ni por vencer en los próximos ${DIAS_AVISO} días`
                : <>
                    <span style={{ color: ESTATUS_INFO.V.color, fontWeight: 600 }}>{nVencidas} vencida{nVencidas === 1 ? "" : "s"}</span>
                    {" · "}
                    <span style={{ color: ESTATUS_INFO.P.color, fontWeight: 600 }}>{nProximas} próxima{nProximas === 1 ? "" : "s"}</span>
                  </>}
            </p>
          </div>

          <div style={{ maxHeight: 360, overflowY: "auto" }}>
            {avisos.map((a) => {
              const info = ESTATUS_INFO[a.estatus];
              return (
                <button key={a.id} onClick={() => ir(`/calificaciones?emp=${encodeURIComponent(a.clave)}`)} style={{
                  width: "100%", textAlign: "left", display: "flex", gap: 10, alignItems: "flex-start",
                  padding: "10px 16px", border: "none", borderBottom: "1px solid #f8fafc",
                  backgroundColor: "#fff", cursor: "pointer",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#faf8ff")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fff")}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: info.color, marginTop: 5, flexShrink: 0 }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1e1b4b" }}>{a.nombre}</span>
                    <span style={{ display: "block", fontSize: 11, color: "#64748b" }}>{a.periodo} · entrega {a.fecha}</span>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: info.color }}>{textoDias(a.dias)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <button onClick={() => ir("/calendario")} style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: 12, border: "none", borderTop: "1px solid #f1f5f9", backgroundColor: "#f8fafc",
            color: "#7c3aed", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>
            <CalendarDays size={14} /> Ver calendario
          </button>
        </div>
      )}
    </div>
  );
}
