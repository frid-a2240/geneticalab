//listas.jsx
import { useState } from "react";
import { Plus, Trash2, Edit, Users } from "lucide-react";

const listasData = [
  { id: 1, nombre: "Empleados IT", descripcion: "Personal del departamento de tecnología", miembros: 12, tipo: "Departamento" },
  { id: 2, nombre: "Certificaciones Pendientes", descripcion: "Empleados que deben renovar certificaciones", miembros: 8, tipo: "Seguimiento" },
  { id: 3, nombre: "Nuevos Ingresos 2026", descripcion: "Personal incorporado en el año actual", miembros: 15, tipo: "Onboarding" },
  { id: 4, nombre: "Formación Obligatoria", descripcion: "Empleados que deben completar cursos obligatorios", miembros: 23, tipo: "Compliance" },
  { id: 5, nombre: "Líderes y Managers", descripcion: "Personal con funciones de liderazgo", miembros: 18, tipo: "Gestión" },
];

const TYPE_COLORS = {
  Departamento: { bg: "#dbeafe", color: "#1d4ed8" },
  Seguimiento: { bg: "#fef3c7", color: "#92400e" },
  Onboarding: { bg: "#d1fae5", color: "#047857" },
  Compliance: { bg: "#fee2e2", color: "#b91c1c" },
  Gestión: { bg: "#ede9fe", color: "#5b21b6" },
};

export default function Listas() {
  const [selectedLista, setSelectedLista] = useState(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#1e1b4b" }}>Listas</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>Gestión de grupos y segmentación</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ backgroundColor: "#7c3aed", boxShadow: "0 4px 12px rgba(124,58,237,0.25)" }}>
          <Plus size={18} /><span className="hidden sm:inline">Nueva Lista</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
        {listasData.map((lista) => {
          const tc = TYPE_COLORS[lista.tipo] || { bg: "#f1f5f9", color: "#334155" };
          return (
            <div key={lista.id} onClick={() => setSelectedLista(lista.id)}
              className="bg-white rounded-2xl card-hover"
              style={{
                border: selectedLista === lista.id ? "2px solid #7c3aed" : "2px solid #e5e7eb",
                boxShadow: selectedLista === lista.id ? "0 4px 12px rgba(124,58,237,0.15)" : "0 1px 3px rgba(0,0,0,0.05)",
                cursor: "pointer", transition: "all 0.2s",
              }}>
              <div style={{ padding: 20 }}>
                <div className="flex items-start justify-between" style={{ marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: 700, color: "#1e1b4b", marginBottom: 4 }}>{lista.nombre}</h3>
                    <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{lista.descripcion}</p>
                  </div>
                  <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 500, backgroundColor: tc.bg, color: tc.color, flexShrink: 0, marginLeft: 8 }}>{lista.tipo}</span>
                </div>
                <div className="flex items-center gap-2" style={{ color: "#475569", marginBottom: 16 }}>
                  <Users size={15} style={{ color: "#94a3b8" }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{lista.miembros}</span>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>miembros</span>
                </div>
                <div className="flex gap-2" style={{ paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
                  <button className="flex-1 flex items-center justify-center gap-1.5" style={{ padding: "8px", color: "#7c3aed", backgroundColor: "transparent", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                    <Edit size={14} />Editar
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5" style={{ padding: "8px", color: "#ef4444", backgroundColor: "transparent", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 12, fontWeight: 500 }}>
                    <Trash2 size={14} />Eliminar
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <div style={{ borderRadius: 16, border: "2px dashed #d1d5db", padding: 32, textAlign: "center", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 200, transition: "border-color 0.2s" }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#7c3aed"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "#d1d5db"}>
          <div style={{ width: 48, height: 48, backgroundColor: "#f1f5f9", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Plus size={24} style={{ color: "#94a3b8" }} />
          </div>
          <div>
            <h3 style={{ fontWeight: 600, fontSize: 14, color: "#334155" }}>Crear Nueva Lista</h3>
            <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Organiza empleados en grupos</p>
          </div>
        </div>
      </div>
    </div>
  );
}