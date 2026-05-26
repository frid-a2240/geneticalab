// src/app/components/pages/MatrizPuesto.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Briefcase, Plus, X, AlertCircle, Trash2, ArrowUp, ArrowDown,
  FileText, Hash, Layers, Download, Users, Search
} from "lucide-react";

const TIPOS_CAPACITACION = {
  1: { label: "Lectura", color: "#3b82f6", bg: "#eff6ff" },
  2: { label: "Clase", color: "#10b981", bg: "#ecfdf5" },
  3: { label: "Video", color: "#f59e0b", bg: "#fffbeb" },
  4: { label: "Práctica", color: "#ec4899", bg: "#fdf2f8" },
  5: { label: "Cap. Continua", color: "#8b5cf6", bg: "#f5f3ff" },
};

const TIPOS_ACEPTACION = {
  numerico: { label: "Numérica (0-10)", color: "#7c3aed", short: "0-10" },
  cumple: { label: "Cumple / No", color: "#059669", short: "C/NC" },
  satisfactorio: { label: "Satisf. / No", color: "#d97706", short: "S/NS" },
};

const ETAPAS = {
  INDUCCION: { label: "Inducción", color: "#3b82f6", bg: "#eff6ff" },
  COMPLEMENTARIA: { label: "Complementaria", color: "#8b5cf6", bg: "#f5f3ff" },
  CONTINUA: { label: "Continua", color: "#10b981", bg: "#ecfdf5" },
};

export default function MatrizPuesto() {
  const [puestos, setPuestos] = useState([]);
  const [puestoSeleccionado, setPuestoSeleccionado] = useState(null);
  const [matrizItems, setMatrizItems] = useState([]);
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [empleadosDelPuesto, setEmpleadosDelPuesto] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingMatriz, setSavingMatriz] = useState(false);

  // Modal agregar
  const [showAddModal, setShowAddModal] = useState(false);
  const [busquedaCap, setBusquedaCap] = useState("");
  const [capsSeleccionadas, setCapsSeleccionadas] = useState([]); // Set
  const [etapaSel, setEtapaSel] = useState("INDUCCION");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => { fetchPuestos(); }, []);

  async function fetchPuestos() {
    setLoading(true);
    const { data } = await supabase
      .from("puestos")
      .select("*")
      .eq("activo", true)
      .order("departamento, nombre");
    setPuestos(data || []);
    setLoading(false);
  }

  async function selectPuesto(puesto) {
    setPuestoSeleccionado(puesto);
    setSavingMatriz(true);

    const [matrizRes, capsRes, empRes] = await Promise.all([
      supabase
        .from("matriz_puesto")
        .select("*, capacitaciones(id, nombre, codigo, tipo_capacitacion, tipo_aceptacion, codigo_documento, cursos(nombre))")
        .eq("puesto_id", puesto.id)
        .order("etapa, orden"),
      supabase
        .from("capacitaciones")
        .select("*, cursos(nombre)")
        .order("nombre"),
      supabase
        .from("empleados")
        .select("clave, nombre, depto")
        .eq("puesto_id", puesto.id)
        .order("nombre"),
    ]);

    setMatrizItems(matrizRes.data || []);
    setCapacitaciones(capsRes.data || []);
    setEmpleadosDelPuesto(empRes.data || []);
    setSavingMatriz(false);
  }

  function openAddModal() {
    setCapsSeleccionadas(new Set());
    setBusquedaCap("");
    setEtapaSel("INDUCCION");
    setErrorMsg("");
    setShowAddModal(true);
  }

  async function handleAgregarCaps() {
    if (capsSeleccionadas.size === 0) {
      setErrorMsg("Selecciona al menos una capacitación.");
      return;
    }
    setSavingMatriz(true);
    setErrorMsg("");

    const maxOrden = matrizItems
      .filter((m) => m.etapa === etapaSel)
      .reduce((max, m) => Math.max(max, m.orden || 0), 0);

    const inserts = Array.from(capsSeleccionadas).map((capId, i) => ({
      puesto_id: puestoSeleccionado.id,
      capacitacion_id: capId,
      etapa: etapaSel,
      orden: maxOrden + i + 1,
      obligatoria: true,
    }));

    const { error } = await supabase.from("matriz_puesto").insert(inserts);

    if (error) {
      setErrorMsg("Error: " + error.message);
      setSavingMatriz(false);
      return;
    }

    setShowAddModal(false);
    setSavingMatriz(false);
    selectPuesto(puestoSeleccionado);
  }

  async function handleEliminar(item) {
    if (!confirm(`¿Eliminar "${item.capacitaciones?.nombre}" de esta matriz?`)) return;
    await supabase.from("matriz_puesto").delete().eq("id", item.id);
    selectPuesto(puestoSeleccionado);
  }

  async function handleMover(item, direccion) {
    const sameEtapa = matrizItems.filter((m) => m.etapa === item.etapa).sort((a, b) => a.orden - b.orden);
    const idx = sameEtapa.findIndex((m) => m.id === item.id);
    const targetIdx = direccion === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sameEtapa.length) return;

    const target = sameEtapa[targetIdx];
    await Promise.all([
      supabase.from("matriz_puesto").update({ orden: target.orden }).eq("id", item.id),
      supabase.from("matriz_puesto").update({ orden: item.orden }).eq("id", target.id),
    ]);
    selectPuesto(puestoSeleccionado);
  }

  async function handleCambiarEtapa(item, nuevaEtapa) {
    await supabase.from("matriz_puesto").update({ etapa: nuevaEtapa }).eq("id", item.id);
    selectPuesto(puestoSeleccionado);
  }

  const cardBase = {
    backgroundColor: "#fff", borderRadius: 16,
    border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  };

  // Capacitaciones disponibles (no en la matriz aún) + filtro búsqueda
  const idsEnMatriz = new Set(matrizItems.map((m) => m.capacitacion_id));
  const capsDisponibles = capacitaciones
    .filter((c) => !idsEnMatriz.has(c.id))
    .filter((c) =>
      `${c.nombre} ${c.codigo || ""} ${c.cursos?.nombre || ""}`
        .toLowerCase()
        .includes(busquedaCap.toLowerCase())
    );

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        <div style={{ width: 36, height: 36, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // VISTA: Sin puesto seleccionado → grid de puestos
  if (!puestoSeleccionado) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>
            Matriz de Capacitación por Puesto
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            Formato P-RH-007/F-125 · Selecciona un puesto para gestionar su matriz
          </p>
        </div>

        {puestos.length === 0 ? (
          <div style={{ ...cardBase, padding: 48, textAlign: "center" }}>
            <Briefcase size={48} style={{ margin: "0 auto 16px", opacity: 0.3, color: "#94a3b8" }} />
            <p style={{ fontSize: 15, color: "#475569", margin: 0 }}>
              No hay puestos registrados.
            </p>
            <p style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>
              Crea puestos en la sección "Puestos" antes de definir sus matrices.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {puestos.map((p) => (
              <button key={p.id} onClick={() => selectPuesto(p)}
                style={{
                  ...cardBase, padding: 20, textAlign: "left",
                  cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s",
                  border: "1px solid #e5e7eb",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-3px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(124,58,237,0.15)";
                  e.currentTarget.style.borderColor = "#c4b5fd";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
                  e.currentTarget.style.borderColor = "#e5e7eb";
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(124,58,237,0.3)", flexShrink: 0,
                  }}>
                    <Briefcase size={20} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", margin: 0, lineHeight: 1.3 }}>
                      {p.nombre}
                    </h3>
                    <p style={{ fontSize: 12, color: "#7c3aed", margin: "4px 0 0 0", fontWeight: 600 }}>
                      {p.departamento}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // VISTA: Puesto seleccionado → matriz
  const matrizPorEtapa = {
    INDUCCION: matrizItems.filter((m) => m.etapa === "INDUCCION"),
    COMPLEMENTARIA: matrizItems.filter((m) => m.etapa === "COMPLEMENTARIA"),
    CONTINUA: matrizItems.filter((m) => m.etapa === "CONTINUA"),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Back + Header */}
      <button onClick={() => setPuestoSeleccionado(null)} style={{
        display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
        backgroundColor: "#f5f3ff", color: "#7c3aed",
        border: "1px solid #e9e5ff", borderRadius: 10, cursor: "pointer",
        fontSize: 12, fontWeight: 600, alignSelf: "flex-start",
      }}>
        ← Volver a puestos
      </button>

      <div style={{ ...cardBase, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700, margin: 0, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Matriz de Capacitación Interna
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1e1b4b", margin: "4px 0" }}>
              {puestoSeleccionado.nombre}
            </h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
              {puestoSeleccionado.departamento} · {matrizItems.length} capacitaciones · {empleadosDelPuesto.length} empleados asignados
            </p>
          </div>
          <button onClick={openAddModal} style={btnPrimaryHeader}>
            <Plus size={18} /><span>Agregar Capacitación</span>
          </button>
        </div>

        {/* Stats por etapa */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20 }}>
          {Object.entries(ETAPAS).map(([key, info]) => (
            <div key={key} style={{
              padding: "14px 18px", backgroundColor: info.bg,
              borderRadius: 12, border: `1px solid ${info.color}30`,
            }}>
              <p style={{ fontSize: 11, color: info.color, fontWeight: 700, margin: 0, textTransform: "uppercase" }}>
                {info.label}
              </p>
              <p style={{ fontSize: 24, fontWeight: 800, color: info.color, margin: "4px 0 0 0", lineHeight: 1 }}>
                {matrizPorEtapa[key].length}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla por etapas */}
      {Object.entries(ETAPAS).map(([etapaKey, etapaInfo]) => {
        const items = matrizPorEtapa[etapaKey];
        return (
          <div key={etapaKey} style={{ ...cardBase, overflow: "hidden" }}>
            <div style={{
              padding: "14px 20px", backgroundColor: etapaInfo.bg,
              borderBottom: `2px solid ${etapaInfo.color}30`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Layers size={16} color={etapaInfo.color} />
                <h3 style={{ fontSize: 14, fontWeight: 700, color: etapaInfo.color, margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Documentación de {etapaInfo.label}
                </h3>
                <span style={{
                  padding: "2px 10px", backgroundColor: "#fff",
                  color: etapaInfo.color, fontSize: 11, fontWeight: 700,
                  borderRadius: 999,
                }}>
                  {items.length}
                </span>
              </div>
            </div>

            {items.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#94a3b8" }}>
                <p style={{ fontSize: 13, margin: 0 }}>Sin capacitaciones en esta etapa</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc" }}>
                      <th style={{ ...tableTh, width: 50 }}>#</th>
                      <th style={{ ...tableTh, width: 110 }}>Código</th>
                      <th style={tableTh}>Descripción</th>
                      <th style={{ ...tableTh, width: 130 }}>Tipo Cap.</th>
                      <th style={{ ...tableTh, width: 110 }}>Aceptación</th>
                      <th style={{ ...tableTh, width: 110 }}>Documento</th>
                      <th style={{ ...tableTh, width: 120 }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const cap = item.capacitaciones;
                      const tipo = TIPOS_CAPACITACION[cap?.tipo_capacitacion] || TIPOS_CAPACITACION[1];
                      const acept = TIPOS_ACEPTACION[cap?.tipo_aceptacion] || TIPOS_ACEPTACION.numerico;
                      return (
                        <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#faf8ff"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                          <td style={{ ...tableTd, textAlign: "center", fontWeight: 700, color: "#7c3aed" }}>
                            {idx + 1}
                          </td>
                          <td style={{ ...tableTd, fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>
                            {cap?.codigo || "—"}
                          </td>
                          <td style={{ ...tableTd, fontSize: 13, color: "#1e1b4b", fontWeight: 500 }}>
                            {cap?.nombre || "—"}
                            {cap?.cursos?.nombre && (
                              <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 8 }}>
                                · {cap.cursos.nombre}
                              </span>
                            )}
                          </td>
                          <td style={tableTd}>
                            <span style={{ ...pillStyle, color: tipo.color, backgroundColor: tipo.bg }}>
                              {cap?.tipo_capacitacion} · {tipo.label}
                            </span>
                          </td>
                          <td style={tableTd}>
                            <span style={{ ...pillStyle, color: acept.color, backgroundColor: acept.color + "15" }}>
                              {acept.short}
                            </span>
                          </td>
                          <td style={{ ...tableTd, fontSize: 10, fontFamily: "monospace", color: "#64748b" }}>
                            {cap?.codigo_documento || "—"}
                          </td>
                          <td style={tableTd}>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => handleMover(item, "up")} disabled={idx === 0}
                                style={{ ...btnIconMini("#7c3aed"), opacity: idx === 0 ? 0.3 : 1 }}>
                                <ArrowUp size={12} />
                              </button>
                              <button onClick={() => handleMover(item, "down")} disabled={idx === items.length - 1}
                                style={{ ...btnIconMini("#7c3aed"), opacity: idx === items.length - 1 ? 0.3 : 1 }}>
                                <ArrowDown size={12} />
                              </button>
                              <select
                                value={item.etapa}
                                onChange={(e) => handleCambiarEtapa(item, e.target.value)}
                                title="Cambiar etapa"
                                style={{
                                  fontSize: 10, padding: "4px 6px",
                                  border: "1px solid #e5e7eb", borderRadius: 6,
                                  backgroundColor: "#fff", cursor: "pointer", outline: "none",
                                }}>
                                <option value="INDUCCION">Ind.</option>
                                <option value="COMPLEMENTARIA">Comp.</option>
                                <option value="CONTINUA">Cont.</option>
                              </select>
                              <button onClick={() => handleEliminar(item)} style={btnIconMini("#ef4444")}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* Empleados con este puesto */}
      {empleadosDelPuesto.length > 0 && (
        <div style={{ ...cardBase, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Users size={16} color="#7c3aed" />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>
              Empleados con este puesto ({empleadosDelPuesto.length})
            </h3>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {empleadosDelPuesto.map((e) => (
              <div key={e.clave} style={{
                padding: "6px 12px", backgroundColor: "#f8fafc",
                borderRadius: 8, border: "1px solid #e5e7eb",
                fontSize: 12, color: "#475569",
              }}>
                <span style={{ fontFamily: "monospace", color: "#94a3b8", marginRight: 6 }}>{e.clave}</span>
                {e.nombre}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==== MODAL AGREGAR CAPACITACIONES ==== */}
      {showAddModal && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)", zIndex: 50,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div style={{
            backgroundColor: "#fff", borderRadius: 20, width: "100%", maxWidth: 720,
            maxHeight: "92vh", display: "flex", flexDirection: "column",
            boxShadow: "0 24px 48px rgba(0,0,0,0.2)",
          }}>
            <div style={{
              padding: "20px 24px", borderBottom: "1px solid #e5e7eb",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <h3 style={{ fontWeight: 700, color: "#1e1b4b", margin: 0, fontSize: 18 }}>
                  Agregar Capacitaciones
                </h3>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "4px 0 0 0" }}>
                  A la matriz de {puestoSeleccionado.nombre}
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{
                padding: 6, border: "none", background: "none", cursor: "pointer", borderRadius: 8,
              }}>
                <X size={20} color="#94a3b8" />
              </button>
            </div>

            <div style={{ padding: 20, borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 12, marginBottom: 12 }}>
                <div style={{ position: "relative" }}>
                  <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  <input type="text" placeholder="Buscar capacitación..."
                    value={busquedaCap} onChange={(e) => setBusquedaCap(e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 36 }} />
                </div>
                <select value={etapaSel} onChange={(e) => setEtapaSel(e.target.value)}
                  style={inputStyle}>
                  <option value="INDUCCION">Etapa: Inducción</option>
                  <option value="COMPLEMENTARIA">Etapa: Complementaria</option>
                  <option value="CONTINUA">Etapa: Continua</option>
                </select>
              </div>
              <p style={{ fontSize: 11, color: "#64748b", margin: 0 }}>
                {capsSeleccionadas.size} seleccionadas · {capsDisponibles.length} disponibles
              </p>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
              {capsDisponibles.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                  <p style={{ fontSize: 13, margin: 0 }}>
                    {capacitaciones.length === 0
                      ? "No hay capacitaciones registradas. Crea capacitaciones primero."
                      : "Todas las capacitaciones disponibles ya están en la matriz."}
                  </p>
                </div>
              ) : (
                capsDisponibles.map((cap) => {
                  const selected = capsSeleccionadas.has(cap.id);
                  const tipo = TIPOS_CAPACITACION[cap.tipo_capacitacion] || TIPOS_CAPACITACION[1];
                  return (
                    <div key={cap.id}
                      onClick={() => {
                        const newSet = new Set(capsSeleccionadas);
                        if (selected) newSet.delete(cap.id); else newSet.add(cap.id);
                        setCapsSeleccionadas(newSet);
                      }}
                      style={{
                        padding: "12px 14px", marginBottom: 6,
                        backgroundColor: selected ? "#f5f3ff" : "#fff",
                        border: selected ? "2px solid #7c3aed" : "1px solid #e5e7eb",
                        borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                        display: "flex", alignItems: "center", gap: 12,
                      }}
                    >
                      <input type="checkbox" checked={selected} readOnly
                        style={{ accentColor: "#7c3aed", width: 16, height: 16, cursor: "pointer" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                          {cap.codigo && (
                            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#94a3b8" }}>
                              {cap.codigo}
                            </span>
                          )}
                          <span style={{ ...pillStyle, color: tipo.color, backgroundColor: tipo.bg, fontSize: 10 }}>
                            {tipo.label}
                          </span>
                        </div>
                        <p style={{ fontSize: 13, color: "#1e1b4b", margin: 0, fontWeight: 500 }}>
                          {cap.nombre}
                        </p>
                        {cap.cursos?.nombre && (
                          <p style={{ fontSize: 10, color: "#94a3b8", margin: "2px 0 0 0" }}>
                            {cap.cursos.nombre}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {errorMsg && <div style={{ padding: "0 20px" }}><ErrorBanner msg={errorMsg} /></div>}

            <div style={{
              display: "flex", gap: 12, padding: "16px 20px",
              borderTop: "1px solid #e5e7eb", backgroundColor: "#f8fafc",
              borderRadius: "0 0 20px 20px",
            }}>
              <button onClick={() => setShowAddModal(false)} style={btnCancel}>Cancelar</button>
              <button onClick={handleAgregarCaps} disabled={savingMatriz || capsSeleccionadas.size === 0}
                style={{ ...btnPrimary, opacity: capsSeleccionadas.size === 0 ? 0.5 : 1 }}>
                {savingMatriz ? "Guardando..." : `Agregar ${capsSeleccionadas.size} capacitación(es)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 14px", backgroundColor: "#fef2f2",
      border: "1px solid #fecaca", borderRadius: 10,
      color: "#b91c1c", fontSize: 12, fontWeight: 500, marginBottom: 12,
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

const tableTh = {
  padding: "12px 14px", textAlign: "left", fontSize: 10, fontWeight: 700,
  color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em",
  borderBottom: "2px solid #e5e7eb", whiteSpace: "nowrap",
};

const tableTd = {
  padding: "10px 14px", fontSize: 13, color: "#475569",
};

const pillStyle = {
  display: "inline-block", fontSize: 10, fontWeight: 700,
  padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap",
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

const btnIconMini = (color) => ({
  padding: "4px 6px",
  backgroundColor: color === "#ef4444" ? "#fef2f2" : "#f5f3ff",
  color: color,
  border: `1px solid ${color === "#ef4444" ? "#fecaca" : "#e9e5ff"}`,
  borderRadius: 6, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
});