// src/app/routes.jsx
import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import Dashboard from "./components/pages/Dashboard";
import MiPerfil from "./components/pages/MiPerfil";
import Empleados from "./components/pages/Empleados";
import Puestos from "./components/pages/Puestos";
import Capacitaciones from "./components/pages/Capacitaciones";
import MatrizPuesto from "./components/pages/MatrizPuesto";
import Organigrama from "./components/pages/Organigrama";
import RevisionCalificaciones from "./components/pages/RevisionCalificaciones";
import CalificacionAnual from "./components/pages/CalificacionAnual";
import CargasMasivas from "./components/pages/CargasMasivas";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "perfil", Component: MiPerfil },
      { path: "dashboard", Component: Dashboard },
      { path: "empleados", Component: Empleados },
      { path: "puestos", Component: Puestos },
      { path: "capacitaciones", Component: Capacitaciones },
      { path: "matriz-puesto", Component: MatrizPuesto },
      { path: "organigrama", Component: Organigrama },
      { path: "revision-calificaciones", Component: RevisionCalificaciones },
      { path: "calificacion-anual", Component: CalificacionAnual },
      { path: "cargas-masivas", Component: CargasMasivas },
    ],
  },
]);