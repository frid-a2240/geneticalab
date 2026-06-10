// src/components/pages/Capacitaciones.jsx
import { useState } from "react";
import { BookOpen, User, ClipboardList } from "lucide-react";
import TabLista from "./capacitaciones/TabLista.jsx";
import TabPorEmpleado from "./capacitaciones/TabPorEmpleado.jsx";
import TabPendientes from "./capacitaciones/TabPendientes.jsx";

const TABS = [
  { id: "lista", label: "Catálogo", icon: BookOpen },
  { id: "empleado", label: "Por Empleado", icon: User },
  { id: "pendientes", label: "Pendientes / Activas", icon: ClipboardList },
];

export default function Capacitaciones() {
  const [activeTab, setActiveTab] = useState("lista");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>
          Capacitaciones
        </h1>
        <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
          Catálogo de capacitaciones, historial por empleado y pendientes por evaluar
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, padding: 4,
        backgroundColor: "#f1f5f9", borderRadius: 12,
        width: "fit-content",
      }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 18px", borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                border: "none", cursor: "pointer",
                backgroundColor: active ? "#fff" : "transparent",
                color: active ? "#7c3aed" : "#64748b",
                boxShadow: active ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s",
              }}>
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Contenido de la pestaña */}
      {activeTab === "lista" && <TabLista />}
      {activeTab === "empleado" && <TabPorEmpleado />}
      {activeTab === "pendientes" && <TabPendientes />}
    </div>
  );
}