// src/components/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import { login } from "../../../lib/authHelper.js";
import { useAuth } from "../../AuthContext.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [empId, setEmpId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!empId.trim() || !password.trim()) {
      setError("Por favor llena ambos campos.");
      return;
    }

    setLoading(true);
    const result = await login(empId, password);
    setLoading(false);

    if (result.success) {
      setUser(result.user);
      navigate("/dashboard", { replace: true });
    } else {
      setError(result.error);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)",
      padding: 16,
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 24,
        padding: 40,
        width: "100%",
        maxWidth: 420,
        boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 72,
            height: 72,
            margin: "0 auto 20px",
            background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 24px rgba(124,58,237,0.35)",
          }}>
            <svg viewBox="0 0 36 36" width="44" height="44">
              <text x="4" y="27" fontFamily="DM Sans, sans-serif" fontWeight="800" fontSize="28" fill="#fff">g</text>
              <circle cx="24" cy="8" r="3" fill="#EC4899" />
              <circle cx="30" cy="14" r="2.5" fill="#EC4899" opacity="0.7" />
              <line x1="24" y1="8" x2="30" y2="14" stroke="#EC4899" strokeWidth="1.5" />
            </svg>
          </div>
          <h1 style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#1e1b4b",
            margin: 0,
            letterSpacing: "0.02em",
          }}>
            genética
          </h1>
          <p style={{
            fontSize: 10,
            color: "#7c3aed",
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            margin: "4px 0 0 0",
            fontWeight: 600,
          }}>
            Laboratorios
          </p>
          <p style={{
            fontSize: 13,
            color: "#64748b",
            margin: "16px 0 0 0",
          }}>
            Sistema de Capacitacion y Adiestramiento
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Número de empleado */}
          <div>
            <label style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#475569",
              marginBottom: 8,
            }}>
              Número de Empleado
            </label>
            <div style={{ position: "relative" }}>
              <User size={18} style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }} />
              <input
                type="text"
                value={empId}
                onChange={(e) => setEmpId(e.target.value)}
                placeholder="Ej: 204656"
                disabled={loading}
                autoFocus
                style={{
                  width: "100%",
                  paddingLeft: 44,
                  paddingRight: 14,
                  paddingTop: 12,
                  paddingBottom: 12,
                  backgroundColor: "#f8fafc",
                  border: "2px solid #e5e7eb",
                  borderRadius: 12,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "all 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#7c3aed";
                  e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label style={{
              display: "block",
              fontSize: 12,
              fontWeight: 600,
              color: "#475569",
              marginBottom: 8,
            }}>
              Contraseña
            </label>
            <div style={{ position: "relative" }}>
              <Lock size={18} style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                disabled={loading}
                style={{
                  width: "100%",
                  paddingLeft: 44,
                  paddingRight: 44,
                  paddingTop: 12,
                  paddingBottom: 12,
                  backgroundColor: "#f8fafc",
                  border: "2px solid #e5e7eb",
                  borderRadius: 12,
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "all 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#7c3aed";
                  e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.boxShadow = "none";
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 12,
              color: "#b91c1c",
              fontSize: 13,
              fontWeight: 500,
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 14,
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: loading ? "#a78bfa" : "linear-gradient(135deg, #7c3aed, #5b21b6)",
              border: "none",
              borderRadius: 12,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: loading ? "none" : "0 6px 16px rgba(124,58,237,0.35)",
              transition: "all 0.2s",
              marginTop: 8,
            }}
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          marginTop: 28,
          textAlign: "center",
          paddingTop: 20,
          borderTop: "1px solid #f1f5f9",
        }}>
          
        
         
        </div>
      </div>
    </div>
  );
}