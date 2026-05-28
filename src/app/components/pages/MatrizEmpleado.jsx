// src/components/pages/MatrizEmpleado.jsx
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "../../../lib/supabaseClient.js";
import {
  Search, User, Building2, Briefcase, Calendar,
  Award, ChevronDown, X, CheckCircle2, Clock,
  AlertTriangle, Hash, TrendingUp, Plus, Trash2,
  LayoutGrid, Users, Edit, Check,
} from "lucide-react";

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtDate(d) {
  if (!d) return '—';
  try {
    const dt = new Date(d + 'T12:00:00');
    return `${String(dt.getDate()).padStart(2,'0')}-${MESES[dt.getMonth()]}-${String(dt.getFullYear()).slice(2)}`;
  } catch { return d; }
}

function califColor(val) {
  if (val === null || val === undefined || val === '') return { color:'#94a3b8', bg:'#f8fafc', label:'—' };
  const s = String(val);
  if (s.toLowerCase().includes('cumple') || s.toLowerCase().includes('satisf'))
    return { color:'#10b981', bg:'#ecfdf5', label: s };
  const n = parseFloat(s);
  if (isNaN(n)) return { color:'#64748b', bg:'#f8fafc', label: s };
  if (n >= 9)  return { color:'#10b981', bg:'#ecfdf5', label: n % 1 === 0 ? String(n) : n.toFixed(1) };
  if (n >= 8)  return { color:'#3b82f6', bg:'#eff6ff', label: n.toFixed(1) };
  if (n >= 7)  return { color:'#f59e0b', bg:'#fffbeb', label: n.toFixed(1) };
  return         { color:'#ef4444', bg:'#fef2f2', label: n.toFixed(1) };
}

function estatusCap(row) {
  if (row.completado) return 'completado';
  if (!row.fecha_limite) return 'en_curso';
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const lim = new Date(row.fecha_limite); lim.setHours(0,0,0,0);
  if (lim < hoy) return 'vencido';
  if ((lim - hoy) / 86400000 <= 15) return 'proximo';
  return 'en_curso';
}

const EST_CFG = {
  completado: { label:'Completado',     color:'#10b981', bg:'#ecfdf5', icon: CheckCircle2 },
  en_curso:   { label:'En Curso',       color:'#3b82f6', bg:'#eff6ff', icon: Clock },
  proximo:    { label:'Próx. a Vencer', color:'#f59e0b', bg:'#fffbeb', icon: AlertTriangle },
  vencido:    { label:'Vencido',        color:'#ef4444', bg:'#fef2f2', icon: AlertTriangle },
};

// ── Componente principal ─────────────────────────────────────
export default function MatrizEmpleado() {
  const [tab, setTab] = useState('empleado'); // 'empleado' | 'puesto'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize:24, fontWeight:700, color:'#1e1b4b', margin:0 }}>Matriz de Capacitación</h1>
        <p style={{ fontSize:14, color:'#64748b', marginTop:4 }}>Vista por empleado y por puesto</p>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, backgroundColor:'#f1f5f9', borderRadius:14, padding:4, width:'fit-content' }}>
        {[
          { key:'empleado', label:'Por Empleado', icon: User },
          { key:'puesto',   label:'Por Puesto',   icon: Users },
        ].map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              display:'flex', alignItems:'center', gap:7,
              padding:'9px 20px', borderRadius:10, border:'none', cursor:'pointer',
              fontSize:13, fontWeight:600,
              backgroundColor: active ? '#fff' : 'transparent',
              color: active ? '#7c3aed' : '#64748b',
              boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition:'all 0.2s',
            }}>
              <Icon size={15} />{t.label}
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      {tab === 'empleado' ? <TabEmpleado /> : <TabPuesto />}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// TAB: POR EMPLEADO
// ══════════════════════════════════════════════════════
function TabEmpleado() {
  const [empleados, setEmpleados]   = useState([]);
  const [query, setQuery]           = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [empSel, setEmpSel]         = useState(null);
  const [caps, setCaps]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [filterAno, setFilterAno]   = useState('Todos');
  const [filterEstatus, setFilterEstatus] = useState('Todos');
  const inputRef = useRef(null);

  useEffect(() => {
    supabase.from('empleados').select('clave,nombre,puesto,depto,fec_ingreso,jefe_directo')
      .eq('activo', true).order('nombre')
      .then(({ data }) => setEmpleados(data || []));
  }, []);

  const empFiltrados = useMemo(() => {
    if (!query.trim()) return empleados.slice(0, 8);
    const q = query.toLowerCase();
    return empleados.filter(e =>
      e.nombre.toLowerCase().includes(q) || e.clave.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [empleados, query]);

  async function seleccionar(emp) {
    setEmpSel(emp); setQuery(emp.nombre);
    setShowDropdown(false); setFilterAno('Todos'); setFilterEstatus('Todos');
    setLoading(true);
    const { data } = await supabase.from('matriz_empleado').select('*')
      .eq('emp_clave', emp.clave).eq('cap_eliminada', false)
      .order('fecha_capacitacion', { ascending: false });
    setCaps(data || []);
    setLoading(false);
  }

  function limpiar() {
    setEmpSel(null); setQuery(''); setCaps([]);
    setFilterAno('Todos'); setFilterEstatus('Todos');
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const anos = useMemo(() => {
    const set = new Set(caps.map(c => c.ano).filter(Boolean));
    return ['Todos', ...Array.from(set).sort((a,b) => b - a)];
  }, [caps]);

  const capsFiltradas = useMemo(() => caps.filter(c => {
    const matchAno = filterAno === 'Todos' || String(c.ano) === String(filterAno);
    const matchEst = filterEstatus === 'Todos' || estatusCap(c) === filterEstatus;
    return matchAno && matchEst;
  }), [caps, filterAno, filterEstatus]);

  const porAno = useMemo(() => {
    const map = {};
    capsFiltradas.forEach(c => {
      const a = c.ano || c.fecha_capacitacion?.slice(0,4) || '—';
      if (!map[a]) map[a] = [];
      map[a].push(c);
    });
    return map;
  }, [capsFiltradas]);

  const stats = useMemo(() => {
    const nums = caps.map(c => c.calificacion_numerica).filter(n => n !== null && n !== undefined);
    return {
      total: caps.length,
      completadas: caps.filter(c => c.completado).length,
      pendientes: caps.filter(c => !c.completado).length,
      vencidas: caps.filter(c => estatusCap(c) === 'vencido').length,
      promedio: nums.length ? (nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(1) : '—',
    };
  }, [caps]);

  const cardBase = { backgroundColor:'#fff', borderRadius:16, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };

  return (
    <>
      {/* Buscador */}
      <div style={{ ...cardBase, padding:20 }}>
        <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:8 }}>
          Buscar empleado por nombre o clave
        </label>
        <div style={{ position:'relative' }}>
          <Search size={17} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', zIndex:1 }} />
          <input ref={inputRef} type="text"
            placeholder="Escribe nombre o número de empleado..."
            value={query}
            onChange={e => { setQuery(e.target.value); setShowDropdown(true); if(empSel){setEmpSel(null);setCaps([]);} }}
            onFocus={() => setShowDropdown(true)}
            style={{
              width:'100%', paddingLeft:42, paddingRight: empSel ? 40 : 16,
              paddingTop:12, paddingBottom:12,
              backgroundColor:'#f8fafc',
              border:'2px solid ' + (empSel ? '#7c3aed' : '#e5e7eb'),
              borderRadius:12, fontSize:14, outline:'none', boxSizing:'border-box',
            }}
          />
          {empSel && (
            <button onClick={limpiar} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', border:'none', background:'none', cursor:'pointer', padding:4 }}>
              <X size={16} color="#94a3b8" />
            </button>
          )}
          {showDropdown && !empSel && empFiltrados.length > 0 && (
            <div style={{
              position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:50,
              backgroundColor:'#fff', borderRadius:12, border:'1px solid #e5e7eb',
              boxShadow:'0 8px 24px rgba(0,0,0,0.1)', overflow:'hidden', maxHeight:280, overflowY:'auto',
            }}>
              {empFiltrados.map(e => (
                <div key={e.clave} onMouseDown={() => seleccionar(e)}
                  style={{ padding:'10px 16px', cursor:'pointer', display:'flex', alignItems:'center', gap:12, borderBottom:'1px solid #f1f5f9' }}
                  onMouseEnter={el => el.currentTarget.style.backgroundColor = '#faf8ff'}
                  onMouseLeave={el => el.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ width:34, height:34, borderRadius:10, flexShrink:0, background:'linear-gradient(135deg,#7c3aed,#5b21b6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:11, fontWeight:700 }}>
                    {e.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')}
                  </div>
                  <div>
                    <p style={{ fontSize:13, fontWeight:600, color:'#1e1b4b', margin:0 }}>{e.nombre}</p>
                    <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{e.clave} · {e.puesto}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ficha empleado */}
      {empSel && (
        <div style={{ ...cardBase, overflow:'hidden' }}>
          <div style={{ height:6, background:'linear-gradient(90deg,#7c3aed,#ec4899)' }} />
          <div style={{ padding:20, display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
            <div style={{ width:50, height:50, borderRadius:14, flexShrink:0, background:'linear-gradient(135deg,#7c3aed,#5b21b6)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:16, fontWeight:800 }}>
              {empSel.nombre.split(' ').slice(0,2).map(w=>w[0]).join('')}
            </div>
            <div style={{ flex:1, minWidth:200 }}>
              <h2 style={{ fontSize:17, fontWeight:800, color:'#1e1b4b', margin:0 }}>{empSel.nombre}</h2>
              <div style={{ display:'flex', gap:14, flexWrap:'wrap', marginTop:6 }}>
                {[
                  { icon:Hash,      text: empSel.clave },
                  { icon:Briefcase, text: empSel.puesto || '—' },
                  { icon:Building2, text: empSel.depto || '—' },
                  { icon:Calendar,  text: `Ingreso: ${empSel.fec_ingreso || '—'}` },
                ].map((item,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <item.icon size={13} color="#94a3b8" />
                    <span style={{ fontSize:12, color:'#475569' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', gap:14 }}>
              {[
                { label:'Total',       value:stats.total,       color:'#7c3aed' },
                { label:'Completadas', value:stats.completadas, color:'#10b981' },
                { label:'Pendientes',  value:stats.pendientes,  color:'#f59e0b' },
                { label:'Vencidas',    value:stats.vencidas,    color:'#ef4444' },
                { label:'Promedio',    value:stats.promedio,    color:'#3b82f6' },
              ].map((s,i) => (
                <div key={i} style={{ textAlign:'center' }}>
                  <p style={{ fontSize:20, fontWeight:800, color:s.color, margin:0, lineHeight:1 }}>{s.value}</p>
                  <p style={{ fontSize:10, color:'#94a3b8', margin:'3px 0 0' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      {empSel && !loading && caps.length > 0 && (
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ position:'relative' }}>
            <select value={filterAno} onChange={e => setFilterAno(e.target.value)} style={selectStyle}>
              {anos.map(a => <option key={a} value={a}>{a === 'Todos' ? 'Todos los años' : a}</option>)}
            </select>
            <ChevronDown size={13} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', pointerEvents:'none' }} />
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {[
              { key:'Todos',      label:'Todos' },
              { key:'completado', label:'Completadas' },
              { key:'en_curso',   label:'En Curso' },
              { key:'proximo',    label:'Próx. Vencer' },
              { key:'vencido',    label:'Vencidas' },
            ].map(s => (
              <button key={s.key} onClick={() => setFilterEstatus(s.key)} style={{
                padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer',
                border: filterEstatus === s.key ? '2px solid #7c3aed' : '2px solid #e5e7eb',
                backgroundColor: filterEstatus === s.key ? '#7c3aed' : '#fff',
                color: filterEstatus === s.key ? '#fff' : '#475569',
              }}>{s.label}</button>
            ))}
          </div>
          <span style={{ fontSize:12, color:'#94a3b8', marginLeft:'auto' }}>{capsFiltradas.length} caps</span>
        </div>
      )}

      {loading && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
          <div style={{ width:32, height:32, border:'3px solid #7c3aed', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Tablas por año */}
      {empSel && !loading && capsFiltradas.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {Object.keys(porAno).sort((a,b) => b - a).map(ano => (
            <div key={ano} style={{ ...cardBase, overflow:'hidden' }}>
              <div style={{ padding:'12px 20px', background:'linear-gradient(135deg,#7c3aed,#5b21b6)', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{ano}</span>
                <span style={{ fontSize:11, fontWeight:600, color:'#fff', backgroundColor:'rgba(255,255,255,0.2)', padding:'2px 10px', borderRadius:999 }}>
                  {porAno[ano].length} caps
                </span>
                <span style={{ fontSize:11, fontWeight:600, color:'#fff', backgroundColor:'rgba(255,255,255,0.2)', padding:'2px 10px', borderRadius:999 }}>
                  Prom: {(() => { const ns = porAno[ano].map(c=>c.calificacion_numerica).filter(n=>n!=null); return ns.length ? (ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1) : '—'; })()}
                </span>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:750 }}>
                  <thead>
                    <tr style={{ backgroundColor:'#f8fafc' }}>
                      {['#','Fecha','Folio','Nombre de la Capacitación','Calificación','Responsable','Estatus'].map(h => (
                        <th key={h} style={tableTh}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {porAno[ano].slice().sort((a,b) => (a.fecha_capacitacion||'').localeCompare(b.fecha_capacitacion||'')).map((cap, idx) => {
                      const califVal = cap.calificacion_numerica ?? (cap.cumple !== null && cap.cumple !== undefined ? (cap.cumple ? 'Cumple' : 'No Cumple') : cap.satisfactorio !== null && cap.satisfactorio !== undefined ? (cap.satisfactorio ? 'Satisfactorio' : 'No Satisfactorio') : null);
                      const cs = califColor(califVal);
                      const est = estatusCap(cap);
                      const ecfg = EST_CFG[est];
                      const Icon = ecfg.icon;
                      return (
                        <tr key={cap.id}
                          style={{ borderBottom:'1px solid #f1f5f9' }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#faf8ff'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ ...tableTd, fontSize:11, color:'#94a3b8', textAlign:'center', width:36 }}>{idx+1}</td>
                          <td style={{ ...tableTd, whiteSpace:'nowrap', fontSize:12, color:'#64748b' }}>{fmtDate(cap.fecha_capacitacion || cap.fecha_asignacion)}</td>
                          <td style={{ ...tableTd, fontFamily:'monospace', fontSize:11, color:'#7c3aed', whiteSpace:'nowrap' }}>{cap.codigo_cap_snap || '—'}</td>
                          <td style={{ ...tableTd, maxWidth:340 }}>
                            <p style={{ fontSize:13, color:'#1e1b4b', margin:0, fontWeight:500, lineHeight:1.3 }}>{cap.nombre_cap_snap}</p>
                          </td>
                          <td style={{ ...tableTd, textAlign:'center', whiteSpace:'nowrap' }}>
                            <span style={{ display:'inline-block', fontSize:13, fontWeight:800, padding:'4px 12px', borderRadius:8, backgroundColor:cs.bg, color:cs.color, minWidth:40 }}>{cs.label}</span>
                          </td>
                          <td style={{ ...tableTd, fontSize:12, color:'#64748b', whiteSpace:'nowrap' }}>{cap.responsable_capacitacion || '—'}</td>
                          <td style={{ ...tableTd, whiteSpace:'nowrap' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:999, backgroundColor:ecfg.bg, color:ecfg.color }}>
                              <Icon size={11} />{ecfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {empSel && !loading && capsFiltradas.length === 0 && (
        <div style={{ backgroundColor:'#fff', borderRadius:16, border:'1px solid #e5e7eb', padding:'48px 0', textAlign:'center', color:'#94a3b8' }}>
          <Award size={44} style={{ margin:'0 auto 12px', opacity:0.25 }} />
          <p style={{ fontSize:14, margin:0 }}>{caps.length === 0 ? 'Este empleado no tiene capacitaciones registradas.' : 'No hay capacitaciones con los filtros seleccionados.'}</p>
        </div>
      )}

      {!empSel && !loading && (
        <div style={{ backgroundColor:'#fff', borderRadius:16, border:'1px solid #e5e7eb', padding:'56px 0', textAlign:'center', color:'#94a3b8' }}>
          <Search size={44} style={{ margin:'0 auto 14px', opacity:0.2 }} />
          <p style={{ fontSize:15, fontWeight:600, color:'#475569', margin:'0 0 6px 0' }}>Busca un empleado para ver su matriz</p>
          <p style={{ fontSize:13, margin:0 }}>Escribe el nombre o número de clave en el buscador</p>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════
// TAB: POR PUESTO
// ══════════════════════════════════════════════════════
function TabPuesto() {
  const [puestos, setPuestos]           = useState([]);
  const [capacitaciones, setCapacitaciones] = useState([]);
  const [matriz, setMatriz]             = useState([]); // matriz_puesto
  const [loading, setLoading]           = useState(true);
  const [searchPuesto, setSearchPuesto] = useState('');
  const [puestoSel, setPuestoSel]       = useState(null);
  const [showModal, setShowModal]       = useState(false);
  const [capSearch, setCapSearch]       = useState('');
  const [capsSelec, setCapsSelec]       = useState({});
  const [saving, setSaving]             = useState(false);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [pRes, cRes, mRes] = await Promise.all([
      supabase.from('puestos').select('id,nombre,departamento').eq('activo', true).order('nombre'),
      supabase.from('capacitaciones').select('id,nombre,codigo,cursos(nombre)').order('nombre'),
      supabase.from('matriz_puesto').select('*'),
    ]);
    setPuestos(pRes.data || []);
    setCapacitaciones(cRes.data || []);
    setMatriz(mRes.data || []);
    setLoading(false);
  }

  // Caps asignadas a un puesto
  function capsDelPuesto(puestoId) {
    const ids = matriz.filter(m => m.puesto_id === puestoId).map(m => m.capacitacion_id);
    return capacitaciones.filter(c => ids.includes(c.id));
  }

  // Caps disponibles para agregar (las que NO tiene el puesto)
  function capsDisponibles(puestoId) {
    const ids = matriz.filter(m => m.puesto_id === puestoId).map(m => m.capacitacion_id);
    return capacitaciones.filter(c => !ids.includes(c.id));
  }

  async function agregarCaps() {
    if (!puestoSel) return;
    setSaving(true);
    const selIds = Object.keys(capsSelec).filter(k => capsSelec[k]).map(Number);
    if (selIds.length === 0) { setSaving(false); return; }
    const rows = selIds.map(id => ({ puesto_id: puestoSel.id, capacitacion_id: id, obligatoria: true }));
    await supabase.from('matriz_puesto').insert(rows);
    setCapsSelec({});
    setShowModal(false);
    setSaving(false);
    fetchAll();
  }

  async function eliminarCap(puestoId, capId) {
    await supabase.from('matriz_puesto').delete()
      .eq('puesto_id', puestoId).eq('capacitacion_id', capId);
    fetchAll();
  }

  const puestosFiltrados = useMemo(() => {
    if (!searchPuesto.trim()) return puestos;
    const q = searchPuesto.toLowerCase();
    return puestos.filter(p => p.nombre.toLowerCase().includes(q) || p.departamento.toLowerCase().includes(q));
  }, [puestos, searchPuesto]);

  const capsDisp = puestoSel ? capsDisponibles(puestoSel.id).filter(c => {
    if (!capSearch.trim()) return true;
    return c.nombre.toLowerCase().includes(capSearch.toLowerCase()) || (c.codigo||'').toLowerCase().includes(capSearch.toLowerCase());
  }) : [];

  const cardBase = { backgroundColor:'#fff', borderRadius:16, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
      <div style={{ width:32, height:32, border:'3px solid #7c3aed', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      {/* Buscador de puesto */}
      <div style={{ ...cardBase, padding:20 }}>
        <label style={{ fontSize:12, fontWeight:600, color:'#475569', display:'block', marginBottom:8 }}>
          Buscar puesto
        </label>
        <div style={{ position:'relative' }}>
          <Search size={17} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
          <input type="text" placeholder="Nombre del puesto o departamento..."
            value={searchPuesto} onChange={e => setSearchPuesto(e.target.value)}
            style={{ width:'100%', paddingLeft:42, paddingRight:16, paddingTop:11, paddingBottom:11, backgroundColor:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, fontSize:14, outline:'none', boxSizing:'border-box' }}
          />
        </div>
      </div>

      {/* Lista de puestos */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:12 }}>
        {puestosFiltrados.map(puesto => {
          const caps = capsDelPuesto(puesto.id);
          const activo = puestoSel?.id === puesto.id;
          return (
            <div key={puesto.id} style={{
              ...cardBase, overflow:'hidden', cursor:'pointer',
              border: activo ? '2px solid #7c3aed' : '1px solid #e5e7eb',
              transition:'transform 0.15s, box-shadow 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,0.06)'; }}
            >
              {/* Header puesto */}
              <div style={{ padding:'14px 16px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <p style={{ fontSize:14, fontWeight:700, color:'#1e1b4b', margin:0 }}>{puesto.nombre}</p>
                  <p style={{ fontSize:11, color:'#94a3b8', margin:'3px 0 0' }}>{puesto.departamento}</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:999, backgroundColor: caps.length > 0 ? '#f5f3ff' : '#f8fafc', color: caps.length > 0 ? '#7c3aed' : '#94a3b8' }}>
                    {caps.length} caps
                  </span>
                  <button onClick={() => { setPuestoSel(puesto); setCapsSelec({}); setCapSearch(''); setShowModal(true); }}
                    style={{ padding:'6px 10px', backgroundColor:'#7c3aed', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', display:'flex', alignItems:'center', gap:4, fontSize:11, fontWeight:600 }}>
                    <Plus size={12} /> Agregar
                  </button>
                </div>
              </div>

              {/* Lista de caps del puesto */}
              <div style={{ padding: caps.length ? '8px 0' : '16px', maxHeight:200, overflowY:'auto' }}>
                {caps.length === 0 ? (
                  <p style={{ textAlign:'center', fontSize:12, color:'#94a3b8', margin:0 }}>
                    Sin capacitaciones asignadas
                  </p>
                ) : (
                  caps.map((cap, i) => (
                    <div key={cap.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 16px', borderBottom: i < caps.length-1 ? '1px solid #f8fafc' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#faf8ff'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ width:6, height:6, borderRadius:'50%', backgroundColor:'#7c3aed', flexShrink:0 }} />
                      <p style={{ fontSize:12, color:'#475569', margin:0, flex:1, lineHeight:1.3 }}>{cap.nombre}</p>
                      <button onClick={() => eliminarCap(puesto.id, cap.id)}
                        style={{ padding:'3px 6px', backgroundColor:'#fef2f2', color:'#ef4444', border:'1px solid #fecaca', borderRadius:6, cursor:'pointer', flexShrink:0 }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {puestosFiltrados.length === 0 && (
        <div style={{ ...cardBase, padding:'48px 0', textAlign:'center', color:'#94a3b8' }}>
          <Users size={44} style={{ margin:'0 auto 12px', opacity:0.25 }} />
          <p style={{ fontSize:14, margin:0 }}>No se encontraron puestos.</p>
        </div>
      )}

      {/* Modal agregar capacitaciones al puesto */}
      {showModal && puestoSel && (
        <div style={{ position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ backgroundColor:'#fff', borderRadius:20, width:'100%', maxWidth:540, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 48px rgba(0,0,0,0.2)' }}>

            {/* Header */}
            <div style={{ padding:'18px 24px', borderBottom:'1px solid #e5e7eb', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <h3 style={{ fontSize:16, fontWeight:700, color:'#1e1b4b', margin:0 }}>Agregar capacitaciones</h3>
                <p style={{ fontSize:12, color:'#94a3b8', margin:'2px 0 0' }}>{puestoSel.nombre} · {puestoSel.departamento}</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ border:'none', background:'none', cursor:'pointer', padding:6 }}>
                <X size={18} color="#94a3b8" />
              </button>
            </div>

            {/* Buscador caps */}
            <div style={{ padding:'16px 24px 8px' }}>
              <div style={{ position:'relative' }}>
                <Search size={15} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
                <input type="text" placeholder="Buscar capacitación..."
                  value={capSearch} onChange={e => setCapSearch(e.target.value)}
                  style={{ width:'100%', paddingLeft:36, paddingRight:12, paddingTop:9, paddingBottom:9, backgroundColor:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, fontSize:13, outline:'none', boxSizing:'border-box' }}
                />
              </div>
              <p style={{ fontSize:11, color:'#94a3b8', margin:'6px 0 0' }}>
                {Object.values(capsSelec).filter(Boolean).length} seleccionadas · {capsDisp.length} disponibles
              </p>
            </div>

            {/* Lista caps */}
            <div style={{ flex:1, overflowY:'auto', padding:'0 24px' }}>
              {capsDisp.map(c => {
                const sel = !!capsSelec[c.id];
                return (
                  <div key={c.id} onClick={() => setCapsSelec(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, cursor:'pointer', backgroundColor: sel ? '#f5f3ff' : 'transparent', marginBottom:2 }}
                    onMouseEnter={e => { if(!sel) e.currentTarget.style.backgroundColor='#faf8ff'; }}
                    onMouseLeave={e => { if(!sel) e.currentTarget.style.backgroundColor='transparent'; }}
                  >
                    <div style={{ width:18, height:18, borderRadius:4, border:'2px solid ' + (sel ? '#7c3aed' : '#d1d5db'), backgroundColor: sel ? '#7c3aed' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {sel && <Check size={11} color="#fff" />}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, color: sel ? '#1e1b4b' : '#475569', margin:0, fontWeight: sel ? 600 : 400 }}>{c.nombre}</p>
                      {c.codigo && <p style={{ fontSize:10, color:'#94a3b8', margin:0, fontFamily:'monospace' }}>{c.codigo}</p>}
                    </div>
                  </div>
                );
              })}
              {capsDisp.length === 0 && (
                <p style={{ textAlign:'center', color:'#94a3b8', fontSize:13, padding:'24px 0' }}>
                  {capacitaciones.length === 0 ? 'No hay capacitaciones en el catálogo.' : 'Todas las capacitaciones ya están asignadas a este puesto.'}
                </p>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding:'16px 24px', borderTop:'1px solid #e5e7eb', display:'flex', gap:10 }}>
              <button onClick={() => setShowModal(false)} style={{ flex:1, padding:11, fontSize:13, fontWeight:600, color:'#475569', border:'2px solid #d1d5db', borderRadius:12, backgroundColor:'#fff', cursor:'pointer' }}>
                Cancelar
              </button>
              <button onClick={agregarCaps} disabled={saving || Object.values(capsSelec).filter(Boolean).length === 0}
                style={{ flex:1, padding:11, fontSize:13, fontWeight:600, color:'#fff', backgroundColor:'#7c3aed', border:'none', borderRadius:12, cursor:'pointer', opacity: Object.values(capsSelec).filter(Boolean).length === 0 ? 0.5 : 1 }}>
                {saving ? 'Guardando...' : `Agregar (${Object.values(capsSelec).filter(Boolean).length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Estilos compartidos ─────────────────────────────────── */
const selectStyle = {
  fontSize:13, backgroundColor:'#f8fafc', border:'2px solid #e5e7eb',
  borderRadius:10, padding:'8px 32px 8px 12px', outline:'none',
  cursor:'pointer', fontWeight:500, color:'#475569', appearance:'none',
};
const tableTh = {
  padding:'11px 14px', textAlign:'left', fontSize:11, fontWeight:700,
  color:'#64748b', textTransform:'uppercase', letterSpacing:'0.04em',
  borderBottom:'2px solid #e5e7eb', whiteSpace:'nowrap',
};
const tableTd = { padding:'11px 14px', fontSize:13, color:'#475569', verticalAlign:'middle' };