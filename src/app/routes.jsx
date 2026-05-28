import { createBrowserRouter } from "react-router";

import Layout from "./components/Layout";

import Dashboard from "./components/pages/Dashboard";
import MiPerfil from "./components/pages/MiPerfil";
import Empleados from "./components/pages/Empleados";
import Capacitaciones from "./components/pages/Capacitaciones";
import Organigrama from "./components/pages/Organigrama";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Dashboard },
      { path: "perfil", Component: MiPerfil },
      { path: "dashboard", Component: Dashboard },
      { path: "empleados", Component: Empleados },
      { path: "capacitaciones", Component: Capacitaciones },
      { path: "organigrama", Component: Organigrama },
    ],
  },
]);