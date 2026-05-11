//cursos.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { Search, Plus, BookOpen, ChevronDown, ChevronRight, Users, Layers } from "lucide-react";

const GROUP_STYLES = {
  "Proceso": { bg: "#eff6ff", accent: "#3b82f6", badge: { bg: "#dbeafe", color: "#1d4ed8" } },
  "Control de Calidad": { bg: "#ecfdf5", accent: "#10b981", badge: { bg: "#d1fae5", color: "#047857" } },
  "Ambiental": { bg: "#f0fdf4", accent: "#22c55e", badge: { bg: "#dcfce7", color: "#15803d" } },
  "Seguridad Industrial": { bg: "#fef2f2", accent: "#ef4444", badge: { bg: "#fee2e2", color: "#b91c1c" } },
  "Desarrollo Humano": { bg: "#f5f3ff", accent: "#8b5cf6", badge: { bg: "#ede9fe", color: "#5b21b6" } },
  "Mantenimiento": { bg: "#fffbeb", accent: "#f59e0b", badge: { bg: "#fef3c7", color: "#92400e" } },
  "Inducción": { bg: "#f8fafc", accent: "#64748b", badge: { bg: "#f1f5f9", color: "#334155" } },
  "Almacén y Logística": { bg: "#ecfeff", accent: "#06b6d4", badge: { bg: "#cffafe", color: "#0e7490" } },
};
const DEFAULT_STYLE = { bg: "#f8fafc", accent: "#64748b", badge: { bg: "#f1f5f9", color: "#334155" } };

export default function Cursos() {
  const [grupos, setGrupos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCursos(); }, []);

  async function fetchCursos() {
    setLoading(true);
    const { data: cursosData } = await supabase.from("cursos").select(`*, capacitaciones ( id, nombre, codigo )`).order("id");
    const { data: asigData } = await supabase.from("asignaciones_cap").select("cap_id").eq("cap_eliminada", false);
    const asigCount = {};
    (asigData || []).forEach((a) => { asigCount[a.cap_id] = (asigCount[a.cap_id] || 0) + 1; });
    const result = (cursosData || []).map((curso) => ({
      ...curso,
      capacitaciones: (curso.capacitaciones || []).map((cap) => ({ ...cap, asignados: asigCount[cap.id] || 0 })),
    }));
    setGrupos(result);
    const exp = {};
    result.forEach((g) => (exp[g.id] = true));
    setExpandedGroups(exp);
    setLoading(false);
  }

  const filteredGrupos = grupos.map((grupo) => {
    const matchGroup = grupo.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const filteredCaps = grupo.capacitaciones.filter((c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || (c.codigo && c.codigo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    if (matchGroup) return grupo;
    if (filteredCaps.length > 0) return { ...grupo, capacitaciones: filteredCaps };
    return null;
  }).filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 256 }}>
        <div style={{ width: 32, height: 32, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1e1b4b" }}>Cursos</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            {grupos.length} grupos · {grupos.reduce((t, g) => t + g.capacitaciones.length, 0)} capacitaciones
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ backgroundColor: "#7c3aed", boxShadow: "0 4px 12px rgba(124,58,237,0.25)" }}>
          <Plus size={18} /><span className="hidden sm:inline">Nuevo Curso</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-4" style={{ border: "1px solid #e5e7eb" }}>
        <div className="relative">
          <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={18} />
          <input type="text" placeholder="Buscar grupo o capacitación..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl text-sm"
            style={{ paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", outline: "none" }}
            onFocus={(e) => { e.target.style.borderColor = "#7c3aed"; e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.15)"; }}
            onBlur={(e) => { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; }}
          />
        </div>
      </div>

      {/* Groups */}
      <div className="space-y-4 stagger-children">
        {filteredGrupos.map((grupo) => {
          const s = GROUP_STYLES[grupo.nombre] || DEFAULT_STYLE;
          const isExpanded = expandedGroups[grupo.id];
          const totalAsignados = grupo.capacitaciones.reduce((t, c) => t + (c.asignados || 0), 0);

          return (
            <div key={grupo.id} className="bg-white rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${s.accent}33`, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              {/* Header */}
              <button onClick={() => setExpandedGroups((p) => ({ ...p, [grupo.id]: !p[grupo.id] }))}
                className="w-full flex items-center gap-4 text-left"
                style={{ padding: "16px 24px", backgroundColor: s.bg, cursor: "pointer", border: "none", transition: "opacity 0.2s" }}>
                <div style={{ width: 40, height: 40, backgroundColor: s.accent, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 8px ${s.accent}40` }}>
                  <Layers size={18} style={{ color: "#fff" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: 700, color: "#1e1b4b" }}>{grupo.nombre}</h3>
                  <div className="flex items-center gap-3" style={{ marginTop: 2 }}>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{grupo.capacitaciones.length} capacitaciones</span>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>·</span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{totalAsignados} asignados</span>
                    {grupo.categoria && (
                      <>
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>·</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 500, backgroundColor: s.badge.bg, color: s.badge.color }}>{grupo.categoria}</span>
                      </>
                    )}
                  </div>
                </div>
                {isExpanded ? <ChevronDown size={18} style={{ color: "#94a3b8" }} /> : <ChevronRight size={18} style={{ color: "#94a3b8" }} />}
              </button>

              {/* Capacitaciones */}
              {isExpanded && grupo.capacitaciones.map((cap) => (
                <div key={cap.id} className="flex items-center gap-4"
                  style={{ padding: "12px 24px", borderTop: "1px solid #f8fafc", transition: "background 0.2s" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: s.accent, flexShrink: 0 }} />
                  <p style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#334155", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cap.nombre}</p>
                  {cap.codigo && <span style={{ fontSize: 10, fontFamily: "monospace", color: "#94a3b8", backgroundColor: "#f8fafc", padding: "2px 8px", borderRadius: 6 }}>{cap.codigo}</span>}
                  <div className="flex items-center gap-1.5" style={{ fontSize: 12, color: "#64748b" }}>
                    <Users size={12} /><span>{cap.asignados}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}