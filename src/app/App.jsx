import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Layout from "./components/Layout.jsx";

import Login from "./components/pages/Login.jsx";
import Empleados from "./components/pages/Empleados.jsx";
import Organigrama from "./components/pages/Organigrama.jsx";
import Calificaciones from "./components/pages/Calificaciones.jsx";
import Calendario from "./components/pages/Calendario.jsx";


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
            <Route index element={<Navigate to="/calificaciones" replace />} />

            <Route path="empleados" element={<Empleados />} />
            <Route path="organigrama" element={<Organigrama />} />
            <Route path="calificaciones" element={<Calificaciones />} />
            <Route path="calendario" element={<Calendario />} />

          </Route>

          <Route path="*" element={<Navigate to="/calificaciones" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}