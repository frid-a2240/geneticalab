// src/components/Layout.jsx
import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  User,
  LayoutDashboard,
  Users,
  BookCheck,
  Grid,
  Network,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  Briefcase,
  Award,
  Upload,
} from "lucide-react";
import { useAuth } from "../AuthContext.jsx";

const menuItems = [
  { path: "/perfil", label: "Mi Perfil", icon: User },
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/empleados", label: "Empleados", icon: Users },
  { path: "/puestos", label: "Puestos", icon: Briefcase },
  { path: "/capacitaciones", label: "Capacitaciones", icon: BookCheck },
  { path: "/matriz-puesto", label: "Matriz por Puesto", icon: Grid },
  { path: "/organigrama", label: "Organigrama", icon: Network },
  { path: "/revision-calificaciones", label: "Calificaciones", icon: ShieldCheck },
  { path: "/calificacion-anual", label: "Eval. Anual F-124", icon: Award },
  { path: "/cargas-masivas", label: "Cargas Masivas", icon: Upload },
];
function GeneticaLogo({ collapsed }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div
        style={{
          width: 36,
          height: 36,
          backgroundColor: "#fff",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 4px 12px rgba(91,33,182,0.3)",
        }}
      >
        <svg viewBox="0 0 36 36" width="24" height="24">
          <text x="4" y="27" fontFamily="DM Sans, sans-serif" fontWeight="800" fontSize="28" fill="#7C3AED">g</text>
          <circle cx="24" cy="8" r="3" fill="#EC4899" />
          <circle cx="30" cy="14" r="2.5" fill="#EC4899" opacity="0.7" />
          <line x1="24" y1="8" x2="30" y2="14" stroke="#EC4899" strokeWidth="1.5" />
        </svg>
      </div>
      {!collapsed && (
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", letterSpacing: "0.05em", lineHeight: 1 }}>
            genética
          </div>
          <div style={{ fontSize: 9, color: "#c4b5fd", letterSpacing: "0.2em", textTransform: "uppercase", marginTop: 2 }}>
            LABORATORIOS
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const sidebarWidth = isCollapsed ? 72 : 256;

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#F5F3FF" }}>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        style={{
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 50,
          padding: 10,
          backgroundColor: "#7C3AED",
          color: "#fff",
          borderRadius: 12,
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: "none",
        }}
        className="mobile-menu-btn"
      >
        {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Sidebar */}
      <aside
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          height: "100vh",
          background: "linear-gradient(180deg, #7C3AED 0%, #5B21B6 50%, #4C1D95 100%)",
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s ease, min-width 0.3s ease",
          overflow: "hidden",
          position: "relative",
          zIndex: 40,
          boxShadow: "4px 0 20px rgba(0,0,0,0.1)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: isCollapsed ? "20px 12px" : "20px",
            borderBottom: "1px solid rgba(167,139,250,0.2)",
          }}
        >
          <GeneticaLogo collapsed={isCollapsed} />
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  style={({ isActive }) => ({
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: isCollapsed ? "10px" : "10px 12px",
                    borderRadius: 10,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 500,
                    transition: "all 0.2s ease",
                    justifyContent: isCollapsed ? "center" : "flex-start",
                    backgroundColor: isActive ? "#EC4899" : "transparent",
                    color: isActive ? "#fff" : "#c4b5fd",
                    boxShadow: isActive ? "0 4px 15px rgba(236,72,153,0.35)" : "none",
                  })}
                  onMouseEnter={(e) => {
                    if (!e.currentTarget.classList.contains("active")) {
                      e.currentTarget.style.backgroundColor = "rgba(124,58,237,0.4)";
                      e.currentTarget.style.color = "#fff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    const isActive = e.currentTarget.getAttribute("aria-current") === "page";
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.color = "#c4b5fd";
                    }
                  }}
                >
                  <Icon size={19} style={{ flexShrink: 0 }} />
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Collapse toggle */}
        <div style={{ padding: "12px", borderTop: "1px solid rgba(167,139,250,0.2)" }}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "8px",
              color: "#a78bfa",
              backgroundColor: "transparent",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(124,58,237,0.4)";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "#a78bfa";
            }}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!isCollapsed && <span>Colapsar</span>}
          </button>
        </div>

        {/* User Info + Logout */}
        {!isCollapsed && user && (
          <div
            style={{
              padding: "16px",
              borderTop: "1px solid rgba(167,139,250,0.2)",
              backgroundColor: "rgba(91,33,182,0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #EC4899, #DB2777)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  boxShadow: "0 2px 8px rgba(236,72,153,0.3)",
                  flexShrink: 0,
                }}
              >
                {user.nombre?.split(" ").slice(0, 2).map((w) => w[0]).join("")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.nombre}
                </div>
                <div style={{ fontSize: 10, color: "#a78bfa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  ID: {user.id}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px",
                backgroundColor: "rgba(239,68,68,0.15)",
                color: "#fca5a5",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ef4444";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.15)";
                e.currentTarget.style.color = "#fca5a5";
              }}
            >
              <LogOut size={13} />
              Cerrar Sesión
            </button>
          </div>
        )}

        {/* Logout compacto cuando sidebar está colapsado */}
        {isCollapsed && user && (
          <div style={{ padding: "8px", borderTop: "1px solid rgba(167,139,250,0.2)" }}>
            <button
              onClick={logout}
              title="Cerrar Sesión"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px",
                backgroundColor: "rgba(239,68,68,0.15)",
                color: "#fca5a5",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ef4444";
                e.currentTarget.style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.15)";
                e.currentTarget.style.color = "#fca5a5";
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 30,
          }}
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
        <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
          <Outlet />
        </div>
      </main>

      {/* Mobile responsive styles */}
      <style>{`
        @media (max-width: 1023px) {
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </div>
  );
}