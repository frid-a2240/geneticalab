// Reemplaza los datos de ejemplo (dummy) de la tabla `organigrama` por la
// estructura real transcrita de "organigrama genetica.pdf" (ORG-RH-001, rev.37).
//
// Nota: el PDF es un diagrama escaneado con anotaciones a mano; algunas
// conexiones intermedias (sobre todo en el area de Calidad: Validacion /
// Aseguramiento / Asuntos Regulatorios / Control de Calidad, todas colgando
// del Gerente de la Unidad de Calidad) se transcribieron con la mejor
// lectura posible del escaneo. Como el organigrama ya quedo editable en la
// app, cualquier ajuste se puede corregir ahi directamente.
//
// Uso: node scripts/importar_organigrama.cjs --apply

const { createClient } = require("@supabase/supabase-js");

const APPLY = process.argv.includes("--apply");

const supabase = createClient(
  "https://cvkwmnirizycmciqnaok.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2a3dtbmlyaXp5Y21jaXFuYW9rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzUwMjQ4NCwiZXhwIjoyMDkzMDc4NDg0fQ.J9GgHk34AJRuGOfUohf4p2kMbQU-uhTctK_MiNtIypc"
);

// { key, parentKey, titulo, nombre, orden }
const NODOS = [
  { key: "consejo_gac",        parent: null,               titulo: "Consejo GAC",                                              nombre: "",       orden: 1 },
  { key: "dir_gral_gac",       parent: "consejo_gac",       titulo: "Director General GAC",                                     nombre: "",       orden: 1 },
  { key: "coord_rh_gac",       parent: "dir_gral_gac",      titulo: "Coordinador de Recursos Humanos GAC",                      nombre: "",       orden: 1 },
  { key: "dir_general",        parent: "dir_gral_gac",      titulo: "Director General",                                         nombre: "",       orden: 2 },

  { key: "gerente_planta",     parent: "dir_general",       titulo: "Gerente de Planta",                                        nombre: "Laura",  orden: 1 },
  { key: "gerente_calidad",    parent: "dir_general",       titulo: "Gerente de la Unidad de Calidad y Responsable Sanitario",  nombre: "Jachiel", orden: 2 },

  { key: "jefe_rh",            parent: "gerente_planta",    titulo: "Jefe de Recursos Humanos",                                 nombre: "",       orden: 1 },
  { key: "gerente_ing_mtto",   parent: "gerente_planta",    titulo: "Gerente de Ingeniería y Mantenimiento",                    nombre: "",       orden: 2 },
  { key: "gerente_cadena_sum", parent: "gerente_planta",    titulo: "Gerente de Cadena de Suministros",                         nombre: "",       orden: 3 },
  { key: "jefe_fabricacion",   parent: "gerente_planta",    titulo: "Jefe de Fabricación",                                      nombre: "",       orden: 4 },
  { key: "jefe_admin_fin",     parent: "gerente_planta",    titulo: "Jefe de Administración y Finanzas",                        nombre: "",       orden: 5 },
  { key: "gerente_ventas",     parent: "gerente_planta",    titulo: "Gerente de Ventas",                                        nombre: "",       orden: 6 },

  { key: "asist_rh",           parent: "jefe_rh",           titulo: "Asistente de Recursos Humanos",                            nombre: "",       orden: 1 },
  { key: "aux_intendencia",    parent: "asist_rh",          titulo: "Auxiliar de Intendencia",                                  nombre: "",       orden: 1 },
  { key: "enfermera",          parent: "asist_rh",          titulo: "Enfermera",                                                nombre: "",       orden: 2 },
  { key: "recepcionista",      parent: "asist_rh",          titulo: "Recepcionista",                                            nombre: "",       orden: 3 },

  { key: "supervisor_mtto",    parent: "gerente_ing_mtto",  titulo: "Supervisor de Mantenimiento",                              nombre: "",       orden: 1 },
  { key: "aux_mtto",           parent: "supervisor_mtto",   titulo: "Auxiliar de Mantenimiento",                                nombre: "",       orden: 1 },
  { key: "aux_doc_mtto",       parent: "supervisor_mtto",   titulo: "Auxiliar Documental de Mantenimiento",                     nombre: "",       orden: 2 },

  { key: "jefe_compras_log",   parent: "gerente_cadena_sum",titulo: "Jefe de Compras y Logística",                              nombre: "",       orden: 1 },
  { key: "jefe_almacen",       parent: "jefe_compras_log",  titulo: "Jefe de Almacén",                                          nombre: "",       orden: 1 },
  { key: "coord_almacen",      parent: "jefe_almacen",      titulo: "Coordinador de Almacén",                                   nombre: "",       orden: 1 },
  { key: "almacenista",        parent: "coord_almacen",     titulo: "Almacenista",                                              nombre: "",       orden: 1 },
  { key: "aux_doc_almacen",    parent: "coord_almacen",     titulo: "Auxiliar Documental de Almacén",                           nombre: "",       orden: 2 },
  { key: "supervisor_seg_hig", parent: "jefe_almacen",      titulo: "Supervisor de Seguridad e Higiene",                        nombre: "",       orden: 2 },

  { key: "supervisor_produccion", parent: "jefe_fabricacion", titulo: "Supervisor de Producción",                               nombre: "",       orden: 1 },
  { key: "operador_asegur_prod",  parent: "supervisor_produccion", titulo: "Operador de Aseguramiento de Producción A, B, C",    nombre: "",       orden: 1 },
  { key: "ayudante_gral_prod",    parent: "supervisor_produccion", titulo: "Ayudante General de Producción",                    nombre: "",       orden: 2 },
  { key: "aux_doc_fab",           parent: "supervisor_produccion", titulo: "Auxiliar Documental",                               nombre: "",       orden: 3 },
  { key: "supervisor_desarrollo", parent: "jefe_fabricacion", titulo: "Supervisor de Desarrollo",                               nombre: "",       orden: 2 },
  { key: "quimico_analisis",      parent: "supervisor_desarrollo", titulo: "Químico de Análisis A, B, C",                       nombre: "",       orden: 1 },
  { key: "quimico_formulaciones", parent: "supervisor_desarrollo", titulo: "Químico de Formulaciones A, B, C",                  nombre: "",       orden: 2 },

  { key: "contador_general",   parent: "jefe_admin_fin",    titulo: "Contador General",                                         nombre: "",       orden: 1 },
  { key: "cxc_facturacion",    parent: "jefe_admin_fin",    titulo: "Cuentas por Cobrar y Facturación",                         nombre: "",       orden: 2 },
  { key: "cxp",                parent: "jefe_admin_fin",    titulo: "Cuentas por Pagar",                                        nombre: "",       orden: 3 },

  { key: "ejecutivo_ventas",   parent: "gerente_ventas",    titulo: "Ejecutivo de Ventas",                                      nombre: "",       orden: 1 },

  { key: "jefe_validacion",    parent: "gerente_calidad",   titulo: "Jefe de Validación",                                       nombre: "Magi?",  orden: 1 },
  { key: "coord_validacion",   parent: "jefe_validacion",   titulo: "Coordinador de Validación",                                nombre: "",       orden: 1 },
  { key: "quimico_validacion", parent: "coord_validacion",  titulo: "Químico de Validación A, B, C",                            nombre: "",       orden: 1 },

  { key: "jefe_asegur_calidad",   parent: "gerente_calidad", titulo: "Jefe de Aseguramiento y Gestión de Calidad",              nombre: "Gabriela", orden: 2 },
  { key: "coord_asegur_calidad",  parent: "jefe_asegur_calidad", titulo: "Coordinador de Aseguramiento de Calidad",             nombre: "",       orden: 1 },
  { key: "inspector_calidad",     parent: "coord_asegur_calidad", titulo: "Inspector de Calidad",                               nombre: "",       orden: 1 },
  { key: "coord_documentacion",   parent: "jefe_asegur_calidad", titulo: "Coordinador de Documentación",                       nombre: "",       orden: 2 },
  { key: "quimico_gestion",       parent: "coord_documentacion", titulo: "Químico de Gestión",                                 nombre: "",       orden: 1 },
  { key: "quimico_documentacion", parent: "coord_documentacion", titulo: "Químico de Documentación",                           nombre: "",       orden: 2 },

  { key: "jefe_asuntos_reg",   parent: "gerente_calidad",   titulo: "Jefe de Asuntos Regulatorios y Farmacovigilancia",         nombre: "",       orden: 3 },
  { key: "coord_ing_empaque",  parent: "jefe_asuntos_reg",  titulo: "Coordinador de Ingeniería de Empaque",                     nombre: "",       orden: 1 },
  { key: "quimico_asuntos_reg",parent: "jefe_asuntos_reg",  titulo: "Químico de Asuntos Regulatorios y Farmacovigilancia",      nombre: "",       orden: 2 },
  { key: "aux_lab_reg",        parent: "jefe_asuntos_reg",  titulo: "Auxiliar de Laboratorio",                                  nombre: "",       orden: 3 },

  { key: "jefe_control_calidad",  parent: "gerente_calidad", titulo: "Jefe de Control de Calidad",                             nombre: "",       orden: 4 },
  { key: "coord_microbiologia",   parent: "jefe_control_calidad", titulo: "Coordinador de Microbiología",                     nombre: "",       orden: 1 },
  { key: "quimico_microbiologia", parent: "coord_microbiologia", titulo: "Químico Analista de Microbiología A, B, C",          nombre: "",       orden: 1 },
  { key: "aux_lab_micro",         parent: "coord_microbiologia", titulo: "Auxiliar de Laboratorio",                           nombre: "",       orden: 2 },
  { key: "coord_fisicoquimicos",  parent: "jefe_control_calidad", titulo: "Coordinador de Fisicoquímicos",                    nombre: "",       orden: 2 },
  { key: "quimico_fisicoquimicos",parent: "coord_fisicoquimicos", titulo: "Químico Analista de Fisicoquímicos A, B, C",        nombre: "",       orden: 1 },
  { key: "aux_lab_fisico",        parent: "coord_fisicoquimicos", titulo: "Auxiliar de Laboratorio",                          nombre: "",       orden: 2 },
];

async function main() {
  console.log(APPLY ? "=== MODO APLICAR ===" : "=== DRY RUN (usa --apply para ejecutar) ===");
  console.log(`Nodos a insertar: ${NODOS.length}`);

  const { count: actuales } = await supabase.from("organigrama").select("*", { count: "exact", head: true });
  console.log(`Filas actuales en organigrama (se borrarán): ${actuales}`);

  if (!APPLY) {
    console.log("Dry run terminado. Corre con --apply para reemplazar los datos de ejemplo por la estructura real.");
    return;
  }

  const { error: delErr } = await supabase.from("organigrama").delete().gte("id", 0);
  if (delErr) throw delErr;
  console.log("Datos de ejemplo borrados.");

  const idByKey = {};
  // Insertar en el orden del arreglo: cada nodo ya tiene su padre insertado antes (parent siempre aparece arriba en NODOS).
  for (const n of NODOS) {
    const parent_id = n.parent ? idByKey[n.parent] : null;
    const { data, error } = await supabase
      .from("organigrama")
      .insert({ parent_id, nombre: n.nombre, titulo: n.titulo, orden: n.orden })
      .select("id")
      .single();
    if (error) throw new Error(`Error insertando "${n.titulo}": ${error.message}`);
    idByKey[n.key] = data.id;
  }

  console.log(`Insertados ${NODOS.length} puestos.`);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
