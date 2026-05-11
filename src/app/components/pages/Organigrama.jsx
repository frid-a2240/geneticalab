//organigrama.jsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";
import { ChevronDown, ChevronUp, Users, Layers, GitBranch } from "lucide-react";

export default function Organigrama() {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, niveles: 0, deptos: 0 });

  useEffect(() => { fetchOrganigrama(); }, []);

  async function fetchOrganigrama() {
    setLoading(true);
    const { data } = await supabase.from("organigrama").select("*").order("orden");
    if (data) {
      const map = {};
      data.forEach((n) => { map[n.id] = { ...n, children: [] }; });
      let root = null;
      data.forEach((n) => {
        if (n.parent_id === null) root = map[n.id];
        else if (map[n.parent_id]) map[n.parent_id].children.push(map[n.id]);
      });
      setTree(root);
      const calcNiveles = (node, level = 1) => !node.children.length ? level : Math.max(...node.children.map((c) => calcNiveles(c, level + 1)));
      setStats({ total: data.length, niveles: root ? calcNiveles(root) : 0, deptos: root?.children?.length || 0 });
    }
    setLoading(false);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Organigrama</h1>
        <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>Estructura organizacional de la empresa</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "Total Posiciones", value: stats.total, icon: Users, bg: "linear-gradient(135deg, #7c3aed, #5b21b6)", shadow: "0 6px 20px rgba(124,58,237,0.3)" },
          { label: "Áreas Directas", value: stats.deptos, icon: Layers, bg: "linear-gradient(135deg, #ec4899, #db2777)", shadow: "0 6px 20px rgba(236,72,153,0.3)" },
          { label: "Niveles Jerárquicos", value: stats.niveles, icon: GitBranch, bg: "linear-gradient(135deg, #10b981, #059669)", shadow: "0 6px 20px rgba(16,185,129,0.3)" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} style={{
              position: "relative", overflow: "hidden",
              borderRadius: 14, padding: "20px 24px",
              background: s.bg, color: "#fff", boxShadow: s.shadow,
            }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.75)", margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: 32, fontWeight: 800, margin: "6px 0 0 0", lineHeight: 1 }}>{s.value}</p>
              <Icon size={56} style={{ position: "absolute", right: -4, bottom: -8, color: "rgba(255,255,255,0.15)" }} />
            </div>
          );
        })}
      </div>

      {/* Tree */}
      <div style={{ ...cardBase, padding: 40, overflowX: "auto" }}>
        <div style={{ display: "inline-block", minWidth: "100%" }}>
          {tree && <OrgNode node={tree} isRoot />}
        </div>
      </div>
    </div>
  );
}

function OrgNode({ node, isRoot = false }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const initials = node.nombre.split(" ").slice(0, 2).map((w) => w[0]).join("");

  // Colores por nivel
  const nodeStyle = isRoot
    ? {
        border: "2px solid #7c3aed",
        backgroundColor: "#f5f3ff",
        boxShadow: "0 6px 20px rgba(124,58,237,0.18)",
        avatarBg: "linear-gradient(135deg, #7c3aed, #a855f7)",
        avatarColor: "#fff",
        titleColor: "#7c3aed",
      }
    : hasChildren
    ? {
        border: "2px solid #d1d5db",
        backgroundColor: "#fff",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
        avatarBg: "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
        avatarColor: "#4f46e5",
        titleColor: "#64748b",
      }
    : {
        border: "1px solid #e5e7eb",
        backgroundColor: "#fafafa",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        avatarBg: "#f1f5f9",
        avatarColor: "#64748b",
        titleColor: "#94a3b8",
      };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Card */}
      <div style={{
        borderRadius: 16, padding: 18, width: 230,
        border: nodeStyle.border,
        backgroundColor: nodeStyle.backgroundColor,
        boxShadow: nodeStyle.boxShadow,
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "default",
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = nodeStyle.boxShadow; }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: nodeStyle.avatarBg,
            color: nodeStyle.avatarColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, flexShrink: 0,
            boxShadow: isRoot ? "0 4px 12px rgba(124,58,237,0.3)" : "none",
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontWeight: 700, fontSize: 13, color: "#1e1b4b", lineHeight: 1.4, margin: 0 }}>{node.nombre}</h4>
            <p style={{ fontSize: 11, fontWeight: 600, color: nodeStyle.titleColor, margin: "4px 0 0 0" }}>{node.titulo}</p>
          </div>
        </div>

        {hasChildren && (
          <button onClick={() => setIsExpanded(!isExpanded)} style={{
            marginTop: 14, width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: 8,
            backgroundColor: isRoot ? "rgba(124,58,237,0.08)" : "#f8fafc",
            color: isRoot ? "#7c3aed" : "#64748b",
            borderRadius: 10, border: `1px solid ${isRoot ? "rgba(124,58,237,0.15)" : "#e5e7eb"}`,
            cursor: "pointer", fontSize: 11, fontWeight: 600,
            transition: "background 0.2s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isRoot ? "rgba(124,58,237,0.15)" : "#f1f5f9"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isRoot ? "rgba(124,58,237,0.08)" : "#f8fafc"}
          >
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {isExpanded ? "Ocultar" : "Mostrar"} {node.children.length} subordinado{node.children.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <>
          {/* Vertical line down from parent */}
          <div style={{ width: 2, height: 28, backgroundColor: isRoot ? "#7c3aed" : "#d1d5db", borderRadius: 1 }} />

          {/* Horizontal connector + children */}
          <div style={{ position: "relative" }}>
            {/* Horizontal bar connecting all children */}
            {node.children.length > 1 && (
              <div style={{
                position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                height: 2, backgroundColor: "#d1d5db", borderRadius: 1,
                width: `calc(100% - 230px)`,
                minWidth: node.children.length > 1 ? 100 : 0,
              }} />
            )}

            <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
              {node.children.map((child) => (
                <div key={child.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  {/* Vertical line down to child */}
                  <div style={{ width: 2, height: 28, backgroundColor: "#d1d5db", borderRadius: 1 }} />
                  <OrgNode node={child} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}