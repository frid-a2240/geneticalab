// Edge Function: alertas-calificaciones
//
// Revisa la tabla `calificaciones` y manda un correo con dos listas:
// - Calificaciones VENCIDAS (fecha de entrega ya pasó y no hay fecha real)
// - Calificaciones PROXIMAS A VENCER (faltan <= DIAS_AVISO dias y no hay fecha real)
//
// Usa la misma regla de estatus que src/app/components/pages/Calificaciones.jsx
// (funcion calcularEstatus) para que la alerta sea consistente con lo que se ve en pantalla.
//
// Secrets requeridos (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (Supabase los inyecta automático en runtime)
//   RESEND_API_KEY   -> API key de https://resend.com
//   RESEND_TO        -> destinatarios separados por coma, ej "farroyo@amayacuriel.com"
//   RESEND_FROM      -> remitente verificado en Resend (opcional, default: onboarding@resend.dev)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DIAS_AVISO = 30;

const PERIODOS = [
  { label: "90 días", entrega: "fecha_entrega_90dias", real: "fecha_real_90dias" },
  { label: "Anual 2025", entrega: "entrega_2025", real: "fecha_real_2025" },
  { label: "Anual 2026", entrega: "entrega_2026", real: "fecha_real_2026" },
  { label: "Anual 2027", entrega: "entrega_2027", real: "fecha_real_2027" },
];

function calcularEstatus(entregaISO: string | null, realISO: string | null): "E" | "P" | "V" | null {
  if (realISO) return "E";
  if (!entregaISO) return null;
  const hoy = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00");
  const entrega = new Date(entregaISO + "T00:00:00");
  const diffDias = Math.round((entrega.getTime() - hoy.getTime()) / 86400000);
  if (diffDias < 0) return "V";
  if (diffDias <= DIAS_AVISO) return "P";
  return null;
}

function fmt(d: string | null) {
  return d || "—";
}

function renderTabla(titulo: string, color: string, filas: { nombre: string; clave: string; periodo: string; entrega: string }[]) {
  if (filas.length === 0) return "";
  const rows = filas
    .map(
      (f) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${f.nombre} <span style="color:#94a3b8;font-family:monospace;font-size:11px;">(${f.clave})</span></td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${f.periodo}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${fmt(f.entrega)}</td>
      </tr>`
    )
    .join("");
  return `
    <h2 style="color:${color};font-size:16px;margin:24px 0 8px;">${titulo} (${filas.length})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;font-family:sans-serif;">
      <thead>
        <tr style="background:#f8fafc;text-align:left;">
          <th style="padding:8px 12px;">Empleado</th>
          <th style="padding:8px 12px;">Periodo</th>
          <th style="padding:8px 12px;">Fecha de entrega</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const resendTo = Deno.env.get("RESEND_TO");
  const resendFrom = Deno.env.get("RESEND_FROM") || "onboarding@resend.dev";

  if (!resendKey || !resendTo) {
    return new Response(
      JSON.stringify({ error: "Faltan los secrets RESEND_API_KEY y/o RESEND_TO." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: empleados, error: errEmp } = await supabase
    .from("empleados")
    .select("clave, nombre");
  const { data: califs, error: errCalif } = await supabase
    .from("calificaciones")
    .select("*");

  if (errEmp || errCalif) {
    return new Response(
      JSON.stringify({ error: (errEmp || errCalif)?.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const nombreByClave = new Map((empleados || []).map((e) => [e.clave, e.nombre]));

  const vencidas: { nombre: string; clave: string; periodo: string; entrega: string }[] = [];
  const proximas: { nombre: string; clave: string; periodo: string; entrega: string }[] = [];

  for (const c of califs || []) {
    const nombre = nombreByClave.get(c.emp_clave) || c.emp_clave;
    for (const p of PERIODOS) {
      const estatus = calcularEstatus(c[p.entrega], c[p.real]);
      const fila = { nombre, clave: c.emp_clave, periodo: p.label, entrega: c[p.entrega] };
      if (estatus === "V") vencidas.push(fila);
      else if (estatus === "P") proximas.push(fila);
    }
  }

  if (vencidas.length === 0 && proximas.length === 0) {
    return new Response(JSON.stringify({ ok: true, mensaje: "Sin vencimientos, no se envió correo." }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const html = `
    <div style="font-family:sans-serif;color:#1e1b4b;">
      <h1 style="font-size:18px;">Alerta de calificaciones — Genética Laboratorios</h1>
      <p style="font-size:13px;color:#64748b;">Resumen generado el ${new Date().toISOString().slice(0, 10)}.</p>
      ${renderTabla("Vencidas", "#ef4444", vencidas)}
      ${renderTabla("Próximas a vencer (≤ " + DIAS_AVISO + " días)", "#f59e0b", proximas)}
    </div>`;

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom,
      to: resendTo.split(",").map((s) => s.trim()),
      subject: `Calificaciones: ${vencidas.length} vencidas, ${proximas.length} próximas a vencer`,
      html,
    }),
  });

  const resendJson = await resendRes.json();

  return new Response(
    JSON.stringify({ ok: resendRes.ok, vencidas: vencidas.length, proximas: proximas.length, resend: resendJson }),
    { status: resendRes.ok ? 200 : 500, headers: { "Content-Type": "application/json" } }
  );
});
