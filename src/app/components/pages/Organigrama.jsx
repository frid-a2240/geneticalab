// organigrama.jsx — Árbol D3 editable (zoom/pan, expandir por click, editar por doble click)
import { useEffect, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import * as d3 from "d3";
import { supabase } from "../../../lib/supabaseClient.js";
import { Users, Layers, GitBranch, Maximize2, Minimize2, Crosshair } from "lucide-react";

const NODE_W = 240;
const NODE_H = 84;
const H_GAP = 30;
const V_GAP = 96;
const DURATION = 700;

// Paleta por nivel, en el tema morado/rosa de la app (fill, stroke, text, sub)
const PALETTE = [
  { fill: "#F5F3FF", stroke: "#7C3AED", text: "#4C1D95", sub: "#8B5CF6" }, // 0 - Dirección
  { fill: "#FDF2F8", stroke: "#EC4899", text: "#9D174D", sub: "#F472B6" }, // 1 - Gerencia
  { fill: "#EFF6FF", stroke: "#3B82F6", text: "#1E40AF", sub: "#60A5FA" }, // 2 - Jefatura
  { fill: "#ECFDF5", stroke: "#10B981", text: "#065F46", sub: "#34D399" }, // 3 - Coordinación / Supervisión
  { fill: "#FFFBEB", stroke: "#F59E0B", text: "#92400E", sub: "#FBBF24" }, // 4 - Líder
  { fill: "#F8FAFC", stroke: "#64748B", text: "#334155", sub: "#94A3B8" }, // 5 - Operativo
];
const NIVEL_LABEL = ["Dirección", "Gerencia", "Jefatura", "Coordinación / Supervisión", "Líder", "Operativo"];
function colorDe(depth) { return PALETTE[Math.min(depth, PALETTE.length - 1)]; }

function iniciales(nombre) {
  const s = (nombre || "").trim();
  if (!s) return "—";
  return s.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function diagonal(s, t) {
  const sx = s.x, sy = s.y + NODE_H / 2;
  const tx = t.x, ty = t.y - NODE_H / 2;
  const mid = (sy + ty) / 2;
  return `M${sx},${sy} C${sx},${mid} ${tx},${mid} ${tx},${ty}`;
}

// Envuelve texto en <tspan>s dentro de un ancho máximo; regresa el número de líneas.
function wrapText(textSel, str, maxWidth, fontSize) {
  textSel.text(null);
  if (!str) return 1;
  const words = String(str).split(/\s+/);
  let line = [];
  let lineCount = 1;
  let tspan = textSel.append("tspan").attr("x", textSel.attr("x")).attr("dy", 0);
  for (const word of words) {
    line.push(word);
    tspan.text(line.join(" "));
    if (tspan.node().getComputedTextLength() > maxWidth && line.length > 1) {
      line.pop();
      tspan.text(line.join(" "));
      line = [word];
      lineCount++;
      tspan = textSel.append("tspan").attr("x", textSel.attr("x")).attr("dy", fontSize * 1.2).text(word);
    }
  }
  return lineCount;
}

export default function Organigrama() {
  // Colapsa el sidebar automáticamente al entrar aquí (más espacio horizontal) y lo restaura al salir.
  const outletCtx = useOutletContext?.() || {};
  const { setIsCollapsed } = outletCtx;
  useEffect(() => {
    if (!setIsCollapsed) return;
    let prev;
    setIsCollapsed((cur) => { prev = cur; return true; });
    return () => setIsCollapsed(prev ?? false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wrapRef = useRef(null);
  const d3Ref = useRef({}); // svg, zoomLayer, gLinks, gNodes, zoom, root, treeLayout, firstRender
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, niveles: 0, deptos: 0 });
  const [empty, setEmpty] = useState(false);
  const [creandoRaiz, setCreandoRaiz] = useState(false);
  const [raiz, setRaiz] = useState(null);

  useEffect(() => {
    cargar();
    return () => cerrarFlotantes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Solo inicializa D3 después de que React ya pintó el contenedor (wrapRef.current
  // no existe todavía mientras loading=true, así que no se puede llamar initD3 en el
  // mismo tick en el que se apaga el loading).
  useEffect(() => {
    if (raiz) initD3(raiz);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raiz]);

  async function cargar() {
    setLoading(true);
    const { data } = await supabase.from("organigrama").select("*").order("orden");
    const rows = data || [];
    const raizData = buildHierarchyData(rows);
    setStats(calcStats(rows, raizData));
    setEmpty(!raizData);
    setLoading(false);
    setRaiz(raizData);
  }

  // Convierte las filas planas en el objeto anidado que espera d3.hierarchy.
  // titulo (puesto) -> puesto ; nombre (persona) -> persona
  function buildHierarchyData(rows) {
    const map = {};
    rows.forEach((r) => {
      map[r.id] = { id: r.id, puesto: r.titulo || "", persona: r.nombre || "", children: [] };
    });
    let raiz = null;
    rows.forEach((r) => {
      if (r.parent_id === null) raiz = map[r.id];
      else if (map[r.parent_id]) map[r.parent_id].children.push(map[r.id]);
    });
    return raiz;
  }

  function calcStats(rows, raizData) {
    if (!raizData) return { total: 0, niveles: 0, deptos: 0 };
    const calcNiveles = (n, lvl = 1) => (!n.children.length ? lvl : Math.max(...n.children.map((c) => calcNiveles(c, lvl + 1))));
    return { total: rows.length, niveles: calcNiveles(raizData), deptos: raizData.children.length };
  }

  async function recargar() { await cargar(); }

  /* ────────── D3 init / update ────────── */

  function initD3(data) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.innerHTML = "";

    const svg = d3.select(wrap).append("svg").attr("width", "100%").attr("height", "100%").style("display", "block");
    const zoomLayer = svg.append("g");

    const zoom = d3.zoom().scaleExtent([0.15, 3]).on("zoom", (event) => zoomLayer.attr("transform", event.transform));
    svg.call(zoom);
    svg.on("dblclick.zoom", null);

    const gLinks = zoomLayer.append("g");
    const gNodes = zoomLayer.append("g");
    const treeLayout = d3.tree().nodeSize([NODE_W + H_GAP, NODE_H + V_GAP]);

    const root = d3.hierarchy(data);
    root.x0 = 0;
    root.y0 = 0;
    root.descendants().forEach((d) => {
      if (d.depth > 0 && d.children && d.depth >= 2) {
        d._children = d.children;
        d.children = null;
      }
    });

    d3Ref.current = { svg, zoomLayer, gLinks, gNodes, zoom, root, treeLayout, firstRender: true };
    update(root);
  }

  function update(source) {
    const ref = d3Ref.current;
    if (!ref.root) return;
    const instant = ref.firstRender;
    const dur = instant ? 0 : DURATION;

    ref.treeLayout(ref.root);
    const nodes = ref.root.descendants();
    const links = ref.root.links();

    /* Links */
    const link = ref.gLinks.selectAll("path.org-link").data(links, (d) => d.target.data.id);

    const linkEnter = link.enter().append("path")
      .attr("class", "org-link")
      .attr("fill", "none")
      .attr("stroke", (d) => colorDe(d.target.depth).stroke)
      .attr("stroke-width", (d) => Math.max(1, 2.5 - d.target.depth * 0.4))
      .attr("stroke-linecap", "round");

    if (instant) {
      linkEnter.attr("stroke-opacity", 0.5).attr("d", (d) => diagonal(d.source, d.target));
    } else {
      linkEnter.attr("stroke-opacity", 0).attr("d", () => {
        const o = { x: source.x0 ?? source.x, y: source.y0 ?? source.y };
        return diagonal(o, o);
      });
      linkEnter.transition().duration(dur).ease(d3.easeCubicInOut)
        .attr("stroke-opacity", 0.5).attr("d", (d) => diagonal(d.source, d.target));
    }

    link.transition().duration(dur).ease(d3.easeCubicInOut)
      .attr("stroke", (d) => colorDe(d.target.depth).stroke)
      .attr("stroke-opacity", 0.5)
      .attr("d", (d) => diagonal(d.source, d.target));

    link.exit().transition().duration(dur).ease(d3.easeCubicIn)
      .attr("stroke-opacity", 0)
      .attr("d", () => diagonal({ x: source.x, y: source.y }, { x: source.x, y: source.y }))
      .remove();

    /* Nodos */
    const node = ref.gNodes.selectAll("g.org-node").data(nodes, (d) => d.data.id);
    const TEXT_X = -NODE_W / 2 + 58;
    const MAX_TXT_W = NODE_W - 58 - 22;

    const nodeEnter = node.enter().append("g")
      .attr("class", "org-node")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (!d.children && !d._children) return;
        if (d.children) { d._children = d.children; d.children = null; }
        else { d.children = d._children; d._children = null; }
        update(d);
      })
      .on("dblclick", (event, d) => { event.stopPropagation(); abrirMenu(event, d); });

    if (instant) {
      nodeEnter.attr("transform", (d) => `translate(${d.x},${d.y})`).style("opacity", 1);
    } else {
      nodeEnter.attr("transform", () => `translate(${source.x0 ?? source.x},${source.y0 ?? source.y})`).style("opacity", 0);
    }

    nodeEnter.append("rect")
      .attr("x", -NODE_W / 2 + 3).attr("y", -NODE_H / 2 + 3)
      .attr("width", NODE_W).attr("height", NODE_H).attr("rx", 14)
      .attr("fill", (d) => colorDe(d.depth).stroke).attr("fill-opacity", 0.08);

    nodeEnter.append("rect")
      .attr("class", "org-card-bg")
      .attr("x", -NODE_W / 2).attr("y", -NODE_H / 2)
      .attr("width", NODE_W).attr("height", NODE_H).attr("rx", 14)
      .attr("fill", (d) => colorDe(d.depth).fill)
      .attr("stroke", (d) => colorDe(d.depth).stroke)
      .attr("stroke-width", 1.5)
      .on("mouseover", function () { d3.select(this).transition().duration(160).attr("stroke-width", 3); })
      .on("mouseout", function () { d3.select(this).transition().duration(160).attr("stroke-width", 1.5); });

    nodeEnter.append("circle")
      .attr("cx", -NODE_W / 2 + 30).attr("cy", 0).attr("r", 22)
      .attr("fill", (d) => colorDe(d.depth).stroke).attr("fill-opacity", 0.18)
      .attr("stroke", (d) => colorDe(d.depth).stroke).attr("stroke-width", 1);

    nodeEnter.append("text")
      .attr("x", -NODE_W / 2 + 30).attr("y", 0)
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", "10.5px").attr("font-weight", "700")
      .attr("fill", (d) => colorDe(d.depth).sub)
      .text((d) => iniciales(d.data.persona));

    nodeEnter.each(function (d) {
      const g = d3.select(this);
      const NAME_FONT = 12.5, TITLE_FONT = 11, NAME_Y = -16, GAP = 4;

      const puestoText = g.append("text")
        .attr("x", TEXT_X).attr("y", NAME_Y)
        .attr("font-size", NAME_FONT + "px").attr("font-weight", "700")
        .attr("fill", colorDe(d.depth).text);
      const puestoLines = wrapText(puestoText, d.data.puesto, MAX_TXT_W, NAME_FONT);

      const personaY = NAME_Y + puestoLines * (NAME_FONT * 1.2) + GAP;
      const personaText = g.append("text")
        .attr("x", TEXT_X).attr("y", personaY)
        .attr("font-size", TITLE_FONT + "px")
        .attr("fill", colorDe(d.depth).sub);
      const personaLines = wrapText(personaText, d.data.persona || "Sin asignar", MAX_TXT_W, TITLE_FONT);

      const totalTextH = puestoLines * NAME_FONT * 1.2 + GAP + personaLines * TITLE_FONT * 1.2 + 26;
      const realH = Math.max(NODE_H, totalTextH);
      if (realH > NODE_H) {
        g.select("rect.org-card-bg").attr("y", -realH / 2).attr("height", realH);
        g.selectAll("rect").filter(function () { return !d3.select(this).classed("org-card-bg"); })
          .attr("y", -realH / 2 + 3).attr("height", realH);
      }
    });

    nodeEnter.append("text")
      .attr("class", "org-expand-icon")
      .attr("x", NODE_W / 2 - 18).attr("y", 0)
      .attr("text-anchor", "middle").attr("dominant-baseline", "central")
      .attr("font-size", "18px")
      .attr("fill", (d) => colorDe(d.depth).stroke)
      .attr("opacity", (d) => (d.children || d._children ? 0.75 : 0))
      .text((d) => (d.children ? "−" : "+"));

    if (!instant) {
      nodeEnter.transition().duration(dur).ease(d3.easeCubicOut)
        .attr("transform", (d) => `translate(${d.x},${d.y})`).style("opacity", 1);
    }

    node.transition().duration(dur).ease(d3.easeCubicInOut)
      .attr("transform", (d) => `translate(${d.x},${d.y})`).style("opacity", 1);

    node.select(".org-expand-icon")
      .text((d) => (d.children ? "−" : "+"))
      .attr("opacity", (d) => (d.children || d._children ? 0.75 : 0));

    node.exit().transition().duration(dur).ease(d3.easeCubicIn)
      .attr("transform", () => `translate(${source.x},${source.y})`).style("opacity", 0).remove();

    nodes.forEach((d) => { d.x0 = d.x; d.y0 = d.y; });

    if (instant) {
      ref.firstRender = false;
      fitView(false);
    } else {
      setTimeout(() => fitView(true), dur + 40);
    }
  }

  function fitView(animate = true) {
    const ref = d3Ref.current;
    const wrap = wrapRef.current;
    if (!ref.root || !ref.svg || !wrap) return;
    const nodes = ref.root.descendants().filter((d) => d.x !== undefined);
    if (!nodes.length) return;

    const xs = nodes.map((n) => n.x), ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs) - NODE_W / 2 - 40, maxX = Math.max(...xs) + NODE_W / 2 + 40;
    const minY = Math.min(...ys) - NODE_H / 2 - 40, maxY = Math.max(...ys) + NODE_H / 2 + 40;
    const treeW = maxX - minX, treeH = maxY - minY;
    const wrapW = wrap.clientWidth || 800, wrapH = wrap.clientHeight || 600;

    const scale = Math.min(wrapW / treeW, wrapH / treeH, 1.15);
    const tx = (wrapW - treeW * scale) / 2 - minX * scale;
    const ty = (wrapH - treeH * scale) / 2 - minY * scale;
    const t = d3.zoomIdentity.translate(tx, ty).scale(scale);

    if (animate) ref.svg.transition().duration(DURATION).call(ref.zoom.transform, t);
    else ref.svg.call(ref.zoom.transform, t);
  }

  function expandirTodo() {
    const ref = d3Ref.current;
    if (!ref.root) return;
    ref.root.descendants().forEach((d) => { if (d._children) { d.children = d._children; d._children = null; } });
    update(ref.root);
  }

  function colapsarTodo() {
    const ref = d3Ref.current;
    if (!ref.root) return;
    ref.root.descendants().forEach((d) => { if (d.depth > 0 && d.children) { d._children = d.children; d.children = null; } });
    update(ref.root);
  }

  /* ────────── Menú contextual + modal (DOM directo, estilo de la app) ────────── */

  function cerrarFlotantes() {
    document.getElementById("org-ctx-menu")?.remove();
    document.getElementById("org-modal-edit")?.remove();
  }

  function abrirMenu(event, d) {
    cerrarFlotantes();
    const menu = document.createElement("div");
    menu.id = "org-ctx-menu";
    Object.assign(menu.style, {
      position: "fixed", left: `${event.clientX + 8}px`, top: `${event.clientY - 8}px`,
      background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.15)", padding: "6px", zIndex: 9999, minWidth: "190px",
      fontFamily: "inherit",
    });

    const header = document.createElement("div");
    Object.assign(header.style, {
      padding: "6px 10px 8px", fontSize: "11px", color: "#94a3b8", fontWeight: 600,
      textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9", marginBottom: "4px",
    });
    header.textContent = d.data.puesto || "Puesto";
    menu.appendChild(header);

    const item = (label, onClick, danger = false) => {
      const el = document.createElement("div");
      el.textContent = label;
      Object.assign(el.style, {
        padding: "8px 12px", borderRadius: "8px", fontSize: "13px", cursor: "pointer",
        color: danger ? "#ef4444" : "#1e1b4b", transition: "background-color 0.12s",
      });
      el.onmouseenter = () => (el.style.backgroundColor = danger ? "#fef2f2" : "#faf8ff");
      el.onmouseleave = () => (el.style.backgroundColor = "transparent");
      el.onmousedown = onClick;
      menu.appendChild(el);
    };

    item("✏️ Editar puesto", () => modalEditar(d));
    item("➕ Agregar subordinado", () => modalAgregarHijo(d));
    if (d.depth > 0) item("🗑 Eliminar", () => eliminarNodo(d), true);

    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener("click", cerrarFlotantes, { once: true }), 200);
  }

  function abrirModal(titulo, camposHtml, onGuardar) {
    cerrarFlotantes();
    const modal = document.createElement("div");
    modal.id = "org-modal-edit";
    Object.assign(modal.style, {
      position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000,
    });

    const box = document.createElement("div");
    Object.assign(box.style, {
      background: "#fff", borderRadius: "20px", padding: "24px", width: "360px",
      boxShadow: "0 24px 48px rgba(0,0,0,0.2)", fontFamily: "inherit",
    });
    box.innerHTML = `
      <div style="font-size:16px;font-weight:700;color:#1e1b4b;margin-bottom:16px">${titulo}</div>
      ${camposHtml}
      <div style="display:flex;gap:10px;margin-top:18px">
        <button id="org-btn-cancelar" style="flex:1;padding:11px;border-radius:12px;border:2px solid #d1d5db;background:#fff;color:#475569;font-weight:600;font-size:13px;cursor:pointer">Cancelar</button>
        <button id="org-btn-guardar" style="flex:1;padding:11px;border-radius:12px;border:none;background:#7c3aed;color:#fff;font-weight:600;font-size:13px;cursor:pointer;box-shadow:0 4px 14px rgba(124,58,237,0.3)">Guardar</button>
      </div>
    `;
    modal.appendChild(box);
    modal.addEventListener("mousedown", (e) => { if (e.target === modal) cerrarFlotantes(); });
    document.body.appendChild(modal);

    document.getElementById("org-btn-cancelar").onclick = cerrarFlotantes;
    document.getElementById("org-btn-guardar").onclick = onGuardar;
    setTimeout(() => document.getElementById("org-inp-puesto")?.focus(), 50);
  }

  function campoHtml(id, label, valor, placeholder) {
    return `
      <div style="margin-bottom:12px">
        <label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px">${label}</label>
        <input id="${id}" value="${(valor || "").replace(/"/g, "&quot;")}" placeholder="${placeholder}"
          style="width:100%;padding:10px 12px;background:#f8fafc;border:2px solid #e5e7eb;border-radius:10px;font-size:13px;outline:none;box-sizing:border-box;font-family:inherit" />
      </div>`;
  }

  function modalEditar(d) {
    abrirModal(
      "Editar puesto",
      campoHtml("org-inp-puesto", "Puesto", d.data.puesto, "Ej: Coordinador de Almacén") +
      campoHtml("org-inp-persona", "Nombre de la persona", d.data.persona, "Ej: Beatriz Tapia"),
      async () => {
        const puesto = document.getElementById("org-inp-puesto").value.trim();
        const persona = document.getElementById("org-inp-persona").value.trim();
        if (!puesto) { alert("El puesto es obligatorio."); return; }
        const { error } = await supabase.from("organigrama").update({ titulo: puesto, nombre: persona }).eq("id", d.data.id);
        if (error) { alert("Error al guardar: " + error.message); return; }
        cerrarFlotantes();
        await recargar();
      }
    );
  }

  function modalAgregarHijo(d) {
    abrirModal(
      `Agregar subordinado a: ${d.data.puesto}`,
      campoHtml("org-inp-puesto", "Puesto", "", "Ej: Supervisor de Área") +
      campoHtml("org-inp-persona", "Nombre de la persona", "", "Ej: Juan Pérez"),
      async () => {
        const puesto = document.getElementById("org-inp-puesto").value.trim();
        const persona = document.getElementById("org-inp-persona").value.trim();
        if (!puesto) { alert("El puesto es obligatorio."); return; }
        const maxOrden = Math.max(0, ...(d.children || d._children || []).map((c) => c.data?.orden || 0));
        const { error } = await supabase.from("organigrama").insert({ titulo: puesto, nombre: persona, parent_id: d.data.id, orden: maxOrden + 1 });
        if (error) { alert("Error al agregar: " + error.message); return; }
        cerrarFlotantes();
        await recargar();
      }
    );
  }

  async function eliminarNodo(d) {
    cerrarFlotantes();
    const ids = d.descendants().map((n) => n.data.id);
    const extra = ids.length - 1;
    const msg = extra > 0
      ? `¿Eliminar "${d.data.puesto}"? Esto también eliminará a sus ${extra} subordinado${extra > 1 ? "s" : ""}.`
      : `¿Eliminar "${d.data.puesto}"?`;
    if (!confirm(msg)) return;
    const { error } = await supabase.from("organigrama").delete().in("id", ids);
    if (error) { alert("Error al eliminar: " + error.message); return; }
    await recargar();
  }

  async function crearRaiz() {
    setCreandoRaiz(true);
    const { error } = await supabase.from("organigrama").insert({ parent_id: null, nombre: "", titulo: "Nuevo puesto", orden: 1 });
    setCreandoRaiz(false);
    if (error) { alert("Error al agregar: " + error.message); return; }
    await recargar();
  }

  const cardBase = { backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
        <div style={{ width: 36, height: 36, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1e1b4b", margin: 0 }}>Organigrama</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
            Rueda o pellizco para zoom · arrastra para mover · click para abrir/cerrar rama · doble click para editar
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!empty && (
            <>
              <button onClick={expandirTodo} style={btnGhost}><Maximize2 size={14} /> Expandir todo</button>
              <button onClick={colapsarTodo} style={btnGhost}><Minimize2 size={14} /> Colapsar todo</button>
              <button onClick={() => fitView(true)} style={btnGhost}><Crosshair size={14} /> Centrar</button>
            </>
          )}
          {empty && (
            <button onClick={crearRaiz} disabled={creandoRaiz} style={btnPrimary}>+ Crear primer puesto</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[
          { label: "Total Posiciones", value: stats.total, icon: Users, bg: "linear-gradient(135deg, #7c3aed, #5b21b6)", shadow: "0 6px 20px rgba(124,58,237,0.3)" },
          { label: "Áreas Directas", value: stats.deptos, icon: Layers, bg: "linear-gradient(135deg, #ec4899, #db2777)", shadow: "0 6px 20px rgba(236,72,153,0.3)" },
          { label: "Niveles Jerárquicos", value: stats.niveles, icon: GitBranch, bg: "linear-gradient(135deg, #10b981, #059669)", shadow: "0 6px 20px rgba(16,185,129,0.3)" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} style={{ position: "relative", overflow: "hidden", borderRadius: 14, padding: "20px 24px", background: s.bg, color: "#fff", boxShadow: s.shadow }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.75)", margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: 32, fontWeight: 800, margin: "6px 0 0 0", lineHeight: 1 }}>{s.value}</p>
              <Icon size={56} style={{ position: "absolute", right: -4, bottom: -8, color: "rgba(255,255,255,0.15)" }} />
            </div>
          );
        })}
      </div>

      {/* Leyenda de niveles */}
      {!empty && (
        <div style={{ ...cardBase, padding: "12px 20px", display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
          {PALETTE.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: c.stroke, flexShrink: 0 }} />
              {NIVEL_LABEL[i]}
            </div>
          ))}
        </div>
      )}

      {/* Canvas D3 */}
      <div style={{ ...cardBase, padding: 0, overflow: "hidden" }}>
        <div ref={wrapRef} style={{ width: "100%", height: "70vh", cursor: "grab" }} />
        {empty && (
          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 14, padding: "40px 0" }}>
            Todavía no hay ningún puesto capturado. Crea el primero con el botón de arriba.
          </p>
        )}
      </div>
    </div>
  );
}

const btnGhost = {
  display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", fontSize: 13, fontWeight: 600,
  color: "#475569", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, cursor: "pointer",
};
const btnPrimary = {
  padding: "10px 20px", fontSize: 14, fontWeight: 500, color: "#fff",
  backgroundColor: "#7c3aed", border: "none", borderRadius: 12, cursor: "pointer",
  boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
};
