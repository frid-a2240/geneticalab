// src/app/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./components/pages/Login.jsx";
import MiPerfil from "./components/pages/MiPerfil.jsx";
import Dashboard from "./components/pages/Dashboard.jsx";
import Empleados from "./components/pages/Empleados.jsx";
import Puestos from "./components/pages/Puestos.jsx";
import Capacitaciones from "./components/pages/Capacitaciones.jsx";
import MatrizPuesto from "./components/pages/MatrizPuesto.jsx";
import Organigrama from "./components/pages/Organigrama.jsx";
import RevisionCalificaciones from "./components/pages/RevisionCalificaciones.jsx";
import CalificacionAnual from "./components/pages/CalificacionAnual.jsx";
import CargasMasivas from "./components/pages/CargasMasivas.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="perfil" element={<MiPerfil />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="empleados" element={<Empleados />} />
            <Route path="puestos" element={<Puestos />} />
            <Route path="capacitaciones" element={<Capacitaciones />} />
            <Route path="matriz-puesto" element={<MatrizPuesto />} />
            <Route path="organigrama" element={<Organigrama />} />
            <Route path="revision-calificaciones" element={<RevisionCalificaciones />} />
            <Route path="calificacion-anual" element={<CalificacionAnual />} />
            <Route path="cargas-masivas" element={<CargasMasivas />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}