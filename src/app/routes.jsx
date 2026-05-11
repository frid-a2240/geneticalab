import { createBrowserRouter } from "react-router";
import Layout from "./components/Layout";
import Dashboard from "./components/pages/Dashboard";
import MiPerfil from "./components/pages/MiPerfil";
import Empleados from "./components/pages/Empleados";
import Cursos from "./components/pages/Cursos";
import Asignaciones from "./components/pages/Asignaciones";
import Listas from "./components/pages/Listas";
import Matriz from "./components/pages/Matriz";
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
      { path: "cursos", Component: Cursos },
      { path: "asignaciones", Component: Asignaciones },
      { path: "listas", Component: Listas },
      { path: "matriz", Component: Matriz },
      { path: "organigrama", Component: Organigrama },
    ],
  },
]);
