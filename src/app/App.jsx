import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";

import Puestos from "./components/pages/Puestos.jsx";
import Login from "./components/pages/Login.jsx";
import MiPerfil from "./components/pages/MiPerfil.jsx";
import Dashboard from "./components/pages/Dashboard.jsx";
import Empleados from "./components/pages/Empleados.jsx";
import Capacitaciones from "./components/pages/Capacitaciones.jsx";
import Organigrama from "./components/pages/Organigrama.jsx";
import Asignaciones from "./components/pages/Asignaciones.jsx";
import Calificaciones from "./components/pages/Calificaciones.jsx";
import MatrizEmpleado from "./components/pages/MatrizEmpleado.jsx";
import Evaluacion90 from "./components/pages/Evaluacion90.jsx";

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
            <Route path="capacitaciones" element={<Capacitaciones />} />
            <Route path="organigrama" element={<Organigrama />} />
              <Route path="puestos" element={<Puestos />} />
              <Route path="asignaciones" element={<Asignaciones />} />
              <Route path="calificaciones" element={<Calificaciones />} />
              <Route path="matriz" element={<MatrizEmpleado />} />
              <Route path="evaluacion90" element={<Evaluacion90 />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}