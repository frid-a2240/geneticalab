import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import MiPerfil from "./components/pages/MiPerfil.jsx";
import Dashboard from "./components/pages/Dashboard.jsx";
import Empleados from "./components/pages/Empleados.jsx";
import Cursos from "./components/pages/Cursos.jsx";
import Asignaciones from "./components/pages/Asignaciones.jsx";
import Listas from "./components/pages/Listas.jsx";
import Matriz from "./components/pages/Matriz.jsx";
import Organigrama from "./components/pages/Organigrama.jsx";
import RevisionCalificaciones from "./components/pages/RevisionCalificaciones.jsx";
import DashboardCalificaciones from "./components/pages/DashboardCalificaciones.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="perfil" element={<MiPerfil />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="empleados" element={<Empleados />} />
          <Route path="cursos" element={<Cursos />} />
          <Route path="asignaciones" element={<Asignaciones />} />
          <Route path="listas" element={<Listas />} />
          <Route path="matriz" element={<Matriz />} />
          <Route path="organigrama" element={<Organigrama />} />
          <Route path="revision-calificaciones" element={<RevisionCalificaciones />} />
          <Route path="dashboard-calificaciones" element={<DashboardCalificaciones />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}