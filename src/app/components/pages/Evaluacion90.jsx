// src/components/pages/Evaluacion90.jsx
import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Search, Clock, CheckCircle2, AlertTriangle, XCircle,
  User, Building2, Briefcase, Calendar, ChevronDown,
  Filter, ChevronRight, Hash, TrendingUp, Award,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────
function diffDias(fecha1, fecha2) {
  const d1 = new Date(fecha1 + "T00:00:00");
  const d2 = new Date(fecha2 + "T00:00:00");
  return Math.ceil((d2 - d1) / 86400000);
}

function hoyISO() { return new Date().toISOString().split("T")[0]; }

function sumarDias(fecha, dias) {
  const d = new Date(fecha + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return d.toISOString().split("T")[0];
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function fmtDate(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d + "T12:00:00");
    return `${String(dt.getDate()).padStart(2,'0')}-${MESES[dt.getMonth()]}-${String(dt.getFullYear()).slice(2)}`;
  } catch { return d; }
}

function califColor(val) {
  if (val === null || val === undefined || val === '') return { color:'#94a3b8', bg:'#f8fafc', label:'—' };
  const n = parseFloat(val);
  if (isNaN(n)) return { color:'#64748b', bg:'#f8fafc', label: String(val) };
  if (n >= 9)  return { color:'#10b981', bg:'#ecfdf5', label: n.toFixed(1) };
  if (n >= 8)  return { color:'#3b82f6', bg:'#eff6ff', label: n.toFixed(1) };
  if (n >= 7)  return { color:'#f59e0b', bg:'#fffbeb', label: n.toFixed(1) };
  return         { color:'#ef4444', bg:'#fef2f2', label: n.toFixed(1) };
}

function calcEstatus90(emp) {
  if (!emp.fec_ingreso) return { key:'sin_fecha', label:'Sin Fecha Ingreso', color:'#94a3b8', bg:'#f8fafc', icon: XCircle };
  const hoy = hoyISO();
  const limite = sumarDias(emp.fec_ingreso, 90);
  const diasTranscurridos = diffDias(emp.fec_ingreso, hoy);
  const diasRestantes = 90 - diasTranscurridos;

  if (diasTranscurridos < 0) {
    return { key:'futuro', label:'Ingreso Futuro', color:'#8b5cf6', bg:'#f5f3ff', icon: Clock, diasRestantes: Math.abs(diasTranscurridos) };
  }
  if (diasRestantes > 15) {
    return { key:'en_curso', label:'En Período', color:'#3b82f6', bg:'#eff6ff', icon: Clock, diasRestantes, limite };
  }
  if (diasRestantes > 0) {
    return { key:'proximo', label:'Próximo a Vencer', color:'#f59e0b', bg:'#fffbeb', icon: AlertTriangle, diasRestantes, limite };
  }
  if (diasRestantes <= 0) {
    return { key:'vencido', label:'Período Vencido', color:'#ef4444', bg:'#fef2f2', icon: AlertTriangle, diasRestantes: 0, limite };
  }
  return { key:'completado', label:'Completado', color:'#10b981', bg:'#ecfdf5', icon: CheckCircle2 };
}

// ── Componente principal ─────────────────────────────────────
export default function Evaluacion90() {
  const [empleados, setEmpleados]       = useState([]);
  const [matrizData, setMatrizData]     = useState({});
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterEstatus, setFilterEstatus] = useState('todos');
  const [filterDepto, setFilterDepto]   = useState('Todos');
  const [expandido, setExpandido]       = useState(null);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [empRes, matRes] = await Promise.all([
      supabase.from('empleados')
        .select('clave,nombre,puesto,depto,fec_ingreso,activo')
        .eq('activo', true)
        .order('fec_ingreso', { ascending: false }),
      supabase.from('matriz_empleado')
        .select('*')
        .eq('cap_eliminada', false)
        .range(0, 49999),
    ]);

    setEmpleados(empRes.data || []);

    // Agrupar matriz por empleado
    const map = {};
    (matRes.data || []).forEach(m => {
      if (!map[m.emp_clave]) map[m.emp_clave] = [];
      map[m.emp_clave].push(m);
    });
    setMatrizData(map);
    setLoading(false);
  }

  // Procesar empleados con info de 90 días
  const empleados90 = useMemo(() => empleados.map(emp => {
    const estatus = calcEstatus90(emp);
    const caps = matrizData[emp.clave] || [];

    // Filtrar caps dentro del período de 90 días
    let capsEnPeriodo = [];
    if (emp.fec_ingreso) {
      const limite = sumarDias(emp.fec_ingreso, 90);
      capsEnPeriodo = caps.filter(c => {
        const fCap = c.fecha_capacitacion || c.fecha_asignacion || '';
        return fCap >= emp.fec_ingreso && fCap <= limite;
      });
    }
    // Si no hay caps en período exacto, tomar todas (historial completo)
    if (capsEnPeriodo.length === 0) capsEnPeriodo = caps;

    const completadas = capsEnPeriodo.filter(c => c.completado).length;
    const pendientes  = capsEnPeriodo.length - completadas;
    const nums = capsEnPeriodo.map(c => c.calificacion_numerica).filter(n => n !== null && n !== undefined);
    const promedio = nums.length ? (nums.reduce((a,b) => a+b,0) / nums.length).toFixed(1) : '—';

    return { ...emp, estatus, caps: capsEnPeriodo, completadas, pendientes, promedio };
  }), [empleados, matrizData]);

  // Filtros
  const deptos = useMemo(() => ['Todos', ...new Set(empleados90.map(e => e.depto).filter(Boolean).sort())], [empleados90]);

  const filtered = useMemo(() => empleados90.filter(e => {
    const matchSearch = `${e.nombre} ${e.clave} ${e.puesto}`.toLowerCase().includes(search.toLowerCase());
    const matchDepto  = filterDepto === 'Todos' || e.depto === filterDepto;
    const matchEst    = filterEstatus === 'todos' || e.estatus.key === filterEstatus;
    return matchSearch && matchDepto && matchEst;
  }), [empleados90, search, filterDepto, filterEstatus]);

  // Stats globales
  const stats = useMemo(() => ({
    total:     empleados90.length,
    en_curso:  empleados90.filter(e => e.estatus.key === 'en_curso').length,
    proximo:   empleados90.filter(e => e.estatus.key === 'proximo').length,
    vencido:   empleados90.filter(e => e.estatus.key === 'vencido').length,
  }), [empleados90]);

  const cardBase = { backgroundColor:'#fff', borderRadius:16, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:36, height:36, border:'3px solid #7c3aed', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div>
        <h1 style={{ fontSize:24, fontWeight:700, color:'#1e1b4b', margin:0 }}>Evaluación 90 Días</h1>
        <p style={{ fontSize:14, color:'#64748b', marginTop:4 }}>
          Seguimiento del período de capacitación inicial por colaborador
        </p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12 }}>
        {[
          { key:'todos',    label:'Total Empleados', value:stats.total,    bg:'linear-gradient(135deg,#7c3aed,#5b21b6)' },
          { key:'en_curso', label:'En Período',      value:stats.en_curso, bg:'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
          { key:'proximo',  label:'Próx. a Vencer',  value:stats.proximo,  bg:'linear-gradient(135deg,#f59e0b,#d97706)' },
          { key:'vencido',  label:'Vencidos',         value:stats.vencido,  bg:'linear-gradient(135deg,#ef4444,#dc2626)' },
        ].map(s => (
          <div key={s.key} onClick={() => setFilterEstatus(s.key === filterEstatus ? 'todos' : s.key)}
            style={{
              borderRadius:14, padding:'18px 20px', cursor:'pointer',
              background: filterEstatus === s.key ? s.bg : '#fff',
              color: filterEstatus === s.key ? '#fff' : '#1e1b4b',
              border: filterEstatus === s.key ? 'none' : '1px solid #e5e7eb',
              boxShadow: filterEstatus === s.key ? '0 6px 20px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
              transition:'all 0.2s',
            }}>
            <p style={{ fontSize:11, fontWeight:600, margin:0, opacity:0.75 }}>{s.label}</p>
            <p style={{ fontSize:28, fontWeight:800, margin:'4px 0 0', lineHeight:1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ ...cardBase, padding:20 }}>
        <div style={{ position:'relative', marginBottom:14 }}>
          <Search size={17} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
          <input type="text" placeholder="Buscar por nombre, clave o puesto..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:'100%', paddingLeft:42, paddingRight:16, paddingTop:11, paddingBottom:11, backgroundColor:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, fontSize:14, outline:'none', boxSizing:'border-box' }}
          />
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
          <Filter size={14} color="#94a3b8" />
          <div style={{ position:'relative' }}>
            <select value={filterDepto} onChange={e => setFilterDepto(e.target.value)}
              style={{ fontSize:13, backgroundColor:'#f8fafc', border:'2px solid #e5e7eb', borderRadius:10, padding:'8px 32px 8px 12px', outline:'none', cursor:'pointer', fontWeight:500, color:'#475569', appearance:'none' }}>
              {deptos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown size={13} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
          </div>
          <span style={{ fontSize:12, color:'#94a3b8', marginLeft:'auto' }}>{filtered.length} empleados</span>
        </div>
      </div>

      {/* Lista */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {filtered.map(emp => {
          const abierto = expandido === emp.clave;
          const est = emp.estatus;
          const Icon = est.icon;

          return (
            <div key={emp.clave} style={{ ...cardBase, overflow:'hidden' }}>
              {/* Fila resumen */}
              <div onClick={() => setExpandido(abierto ? null : emp.clave)}
                style={{
                  display:'flex', alignItems:'center', gap:14, padding:'14px 20px',
                  cursor:'pointer', backgroundColor: abierto ? '#faf8ff' : 'transparent',
                  transition:'background 0.15s',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width:42, height:42, borderRadius:12, flexShrink:0,
                  background:'linear-gradient(135deg,#7c3aed,#5b21b6)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'#fff', fontSize:13, fontWeight:700,
                }}>
                  {emp.nombre.split(' ').slice(0,2).map(w => w[0]).join('')}
                </div>

                {/* Info */}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:14, fontWeight:700, color:'#1e1b4b', margin:0 }}>{emp.nombre}</p>
                  <p style={{ fontSize:12, color:'#64748b', margin:'2px 0 0' }}>
                    <span style={{ fontFamily:'monospace', color:'#7c3aed' }}>{emp.clave}</span>
                    {emp.puesto && <> · {emp.puesto}</>}
                    {emp.depto && <> · {emp.depto}</>}
                  </p>
                </div>

                {/* Fecha ingreso */}
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <p style={{ fontSize:12, fontWeight:600, color:'#475569', margin:0 }}>{fmtDate(emp.fec_ingreso)}</p>
                  <p style={{ fontSize:10, color:'#94a3b8', margin:'2px 0 0' }}>Ingreso</p>
                </div>

                {/* Fecha límite 90 días */}
                <div style={{ textAlign:'center', flexShrink:0 }}>
                  <p style={{ fontSize:12, fontWeight:600, color: est.key === 'vencido' ? '#ef4444' : '#475569', margin:0 }}>
                    {est.limite ? fmtDate(est.limite) : '—'}
                  </p>
                  <p style={{ fontSize:10, color:'#94a3b8', margin:'2px 0 0' }}>Límite 90d</p>
                </div>

                {/* Días restantes */}
                <div style={{
                  textAlign:'center', flexShrink:0, padding:'6px 14px', borderRadius:10,
                  backgroundColor: est.bg, color: est.color, minWidth:60,
                }}>
                  <p style={{ fontSize:16, fontWeight:800, margin:0, lineHeight:1 }}>
                    {est.diasRestantes !== undefined ? est.diasRestantes : '—'}
                  </p>
                  <p style={{ fontSize:9, fontWeight:600, margin:'2px 0 0' }}>
                    {est.key === 'vencido' ? 'VENCIDO' : est.key === 'sin_fecha' ? 'N/A' : 'días'}
                  </p>
                </div>

                {/* Caps */}
                <div style={{ display:'flex', gap:8, alignItems:'center', flexShrink:0 }}>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ fontSize:16, fontWeight:800, color:'#10b981', margin:0, lineHeight:1 }}>{emp.completadas}</p>
                    <p style={{ fontSize:9, color:'#94a3b8', margin:'2px 0 0' }}>complet.</p>
                  </div>
                  {emp.pendientes > 0 && <>
                    <div style={{ width:1, height:24, backgroundColor:'#e5e7eb' }} />
                    <div style={{ textAlign:'center' }}>
                      <p style={{ fontSize:16, fontWeight:800, color:'#f59e0b', margin:0, lineHeight:1 }}>{emp.pendientes}</p>
                      <p style={{ fontSize:9, color:'#94a3b8', margin:'2px 0 0' }}>pend.</p>
                    </div>
                  </>}
                </div>

                {/* Estatus badge */}
                <span style={{
                  display:'inline-flex', alignItems:'center', gap:4,
                  fontSize:11, fontWeight:600, padding:'5px 12px', borderRadius:999,
                  backgroundColor: est.bg, color: est.color, whiteSpace:'nowrap', flexShrink:0,
                }}>
                  <Icon size={12} />{est.label}
                </span>

                <div style={{ color:'#94a3b8', flexShrink:0, transition:'transform 0.2s', transform: abierto ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                  <ChevronRight size={16} />
                </div>
              </div>

              {/* Detalle expandible */}
              {abierto && (
                <div style={{ borderTop:'1px solid #f1f5f9' }}>
                  {/* Info bar */}
                  <div style={{ padding:'10px 20px', backgroundColor:'#f8fafc', display:'flex', gap:20, flexWrap:'wrap' }}>
                    {[
                      { icon: Calendar, text: `Ingreso: ${fmtDate(emp.fec_ingreso)}` },
                      { icon: Clock,    text: `Límite: ${est.limite ? fmtDate(est.limite) : '—'}` },
                      { icon: TrendingUp, text: `Promedio: ${emp.promedio}` },
                      { icon: Award,    text: `${emp.completadas}/${emp.caps.length} completadas` },
                    ].map((item, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <item.icon size={12} color="#94a3b8" />
                        <span style={{ fontSize:12, color:'#475569' }}>{item.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Barra de progreso */}
                  <div style={{ padding:'0 20px', marginTop:10 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>Progreso de capacitación</span>
                      <span style={{ fontSize:11, color:'#7c3aed', fontWeight:700 }}>
                        {emp.caps.length > 0 ? Math.round((emp.completadas / emp.caps.length) * 100) : 0}%
                      </span>
                    </div>
                    <div style={{ height:8, backgroundColor:'#f1f5f9', borderRadius:99, overflow:'hidden' }}>
                      <div style={{
                        height:'100%', borderRadius:99, transition:'width 0.3s',
                        background:'linear-gradient(90deg,#7c3aed,#ec4899)',
                        width: emp.caps.length > 0 ? `${(emp.completadas / emp.caps.length) * 100}%` : '0%',
                      }} />
                    </div>
                  </div>

                  {/* Tabla de capacitaciones */}
                  {emp.caps.length > 0 ? (
                    <div style={{ overflowX:'auto', marginTop:12 }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', minWidth:600 }}>
                        <thead>
                          <tr style={{ backgroundColor:'#f8fafc' }}>
                            {['#','Capacitación','Fecha','Calificación','Responsable','Estatus'].map(h => (
                              <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.04em', borderBottom:'2px solid #e5e7eb', whiteSpace:'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {emp.caps
                            .slice()
                            .sort((a,b) => (a.fecha_capacitacion||'').localeCompare(b.fecha_capacitacion||''))
                            .map((cap, idx) => {
                              const cs = califColor(cap.calificacion_numerica);
                              return (
                                <tr key={cap.id} style={{ borderBottom:'1px solid #f1f5f9' }}
                                  onMouseEnter={e => e.currentTarget.style.backgroundColor='#faf8ff'}
                                  onMouseLeave={e => e.currentTarget.style.backgroundColor='transparent'}
                                >
                                  <td style={{ padding:'10px 14px', fontSize:11, color:'#94a3b8', textAlign:'center' }}>{idx+1}</td>
                                  <td style={{ padding:'10px 14px', fontSize:13, color:'#1e1b4b', fontWeight:500, maxWidth:300 }}>
                                    {cap.nombre_cap_snap}
                                    {cap.codigo_cap_snap && <span style={{ display:'block', fontSize:10, color:'#94a3b8', fontFamily:'monospace' }}>{cap.codigo_cap_snap}</span>}
                                  </td>
                                  <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}>{fmtDate(cap.fecha_capacitacion)}</td>
                                  <td style={{ padding:'10px 14px', textAlign:'center' }}>
                                    <span style={{ display:'inline-block', fontSize:13, fontWeight:800, padding:'3px 12px', borderRadius:8, backgroundColor:cs.bg, color:cs.color, minWidth:36 }}>{cs.label}</span>
                                  </td>
                                  <td style={{ padding:'10px 14px', fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}>{cap.responsable_capacitacion || '—'}</td>
                                  <td style={{ padding:'10px 14px' }}>
                                    <span style={{
                                      display:'inline-flex', alignItems:'center', gap:3,
                                      fontSize:10, fontWeight:600, padding:'3px 8px', borderRadius:999,
                                      backgroundColor: cap.completado ? '#ecfdf5' : '#fffbeb',
                                      color: cap.completado ? '#10b981' : '#f59e0b',
                                    }}>
                                      {cap.completado ? <><CheckCircle2 size={10} />Completada</> : <><Clock size={10} />Pendiente</>}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding:'24px 20px', textAlign:'center', color:'#94a3b8', fontSize:13 }}>
                      Sin capacitaciones registradas en este período.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ ...cardBase, padding:'56px 0', textAlign:'center', color:'#94a3b8' }}>
          <Clock size={44} style={{ margin:'0 auto 14px', opacity:0.25 }} />
          <p style={{ fontSize:14, margin:0 }}>No se encontraron empleados con los filtros seleccionados.</p>
        </div>
      )}
    </div>
  );
}