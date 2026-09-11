'use strict';
const { today, InventoryError } = require('./inventory-domain');
const AREAS = { general:'Todas las áreas', rastro:'Rastro', almacen:'Almacén', cocina:'Cocina', rosticero:'Rosticero', freidoras:'Freidoras', caja:'Caja', ventas_barras:'Ventas / Barras', trastes:'Lavado de trastes', supervision:'Supervisión' };
const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function parse(input, now = new Date()) {
  let { question='', date=today(now), area='general', previous='' } = input;
  if(typeof question!=='string'||!question.trim()||question.length>500) throw new InventoryError('Escribe una pregunta de hasta 500 caracteres.');
  if(!Object.hasOwn(AREAS,area)) throw new InventoryError('Área inválida.');
  const q=normalize(question);
  if(/\bhoy\b/.test(q))date=today(now);
  if(/\bayer\b/.test(q)&&!/compar/.test(q))date=new Date(Date.parse(today(now)+'T12:00:00Z')-86400000).toISOString().slice(0,10);
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date>today(now)) throw new InventoryError('Selecciona una fecha válida, hasta hoy.');
  for(const [code,name] of Object.entries(AREAS))if(code!=='general'&&q.includes(normalize(name)))area=code;
  if(/todas las areas|por areas|comparar areas/.test(q))area='general';
  let intent=/autoriza|compra |ajusta|borra|elimina|registra|guarda/.test(q)?'unsupported':/nancy|verificacion|verifico/.test(q)?'nancy':/inventario|existencia|compra|saldo/.test(q)?'inventory':/critic|pendiente/.test(q)?'critical':/compar|desglos|areas/.test(q)?'areas':/resumen|como vamos|como va|dia/.test(q)?'summary':null;
  if(!intent&&/^¿?y\b/.test(q)&&['summary','critical','areas','nancy','inventory'].includes(previous))intent=previous;
  return {question,date,area,intent:intent||'unsupported',compare:/compar.*ayer/.test(q)};
}
async function answer(context, query, now=new Date()) {
  const {intent,date,area}=context;
  const result={...context,areaName:AREAS[area],consultedAt:now.toISOString(),title:'',lines:[],warnings:[],sources:[],rows:[],columns:[]};
  if(intent==='unsupported')return {...result,title:'Puedo ayudarte con cinco consultas operativas.',lines:['Prueba “Resumen del día”, “Pendientes críticos”, “Comparar áreas”, “Verificaciones de Nancy” o “Inventarios y compras”.'],warnings:['Este piloto usa consultas guiadas. No realiza cambios ni responde todavía preguntas fuera de estas consultas.']};
  if(['nancy','inventory'].includes(intent)) {
    if(date!==today(now))return {...result,title:'Esta consulta está disponible para hoy.',warnings:['El saldo actual no representa un inventario histórico. Selecciona Hoy para consultar existencias y compras actuales.']};
    const [snapshot]=await query('SELECT version,data,updated_at FROM inv_state WHERE id=1',[]);
    if(!snapshot)throw new InventoryError('Inventario no inicializado.',503);
    const s=snapshot.data;
    result.areaName='CEDIS y Sucursal · Todas las áreas';
    result.updatedAt=snapshot.updated_at;
    result.sources=[{label:'Ver inventario y compras',href:'/inventario.html?area=general'+(intent==='nancy'?'&panel=nancy':'')}];
    result.warnings.push('Existencia registrada y conteo físico son datos distintos. Un conteo puede haber cambiado por movimientos posteriores.');
    if(area!=='general')result.warnings.push('Inventarios, compras y verificaciones se muestran para CEDIS y Sucursal completos; no se atribuyen a un área.');
    if(intent==='nancy') {
      const events=await query("SELECT data FROM inv_events WHERE business_date=$1::date AND version<=$2 ORDER BY version",[date,snapshot.version]);
      const report=require('./protein-report').proteinReport(snapshot,events,date);
      result.title=`Nancy verificó ${report.nancy.verified} de ${report.nancy.total} combinaciones de proteína y ubicación hoy.`;
      result.lines=[`${report.nancy.receiptsToday} recepciones registradas por Nancy hoy.`,`${report.unresolved.length} conteos de proteína con diferencias pendientes de resolver.`];
      result.columns=['Proteína / ubicación','Verificación de Nancy hoy'];
      result.rows=report.rows.map(r=>[`${r.name} · ${r.location}`,r.verifiedByNancyToday?'Registrada':'Sin captura']);
      result.warnings.push('Sin captura no demuestra incumplimiento. Los conteos con diferencias pendientes requieren revisión.');
    } else {
      result.title='Existencias registradas y compras pendientes';
      const pending=(s.purchaseRequests||[]).filter(r=>r.status==='requested');
      const receiving=(s.purchases||[]).filter(p=>p.lines.some(l=>l.qty>(p.received.find(r=>r.item===l.item)?.qty||0)));
      result.lines=[`${pending.length} solicitudes por autorizar.`,`${receiving.length} pedidos con recepción pendiente. Estado actual de todas las fechas.`];
      result.columns=['Artículo / ubicación','Registrado','Último conteo físico'];
      for(const location of ['cedis','sucursal'])for(const item of s.items){
        const key=`${location}:${item.id}`;
        if(!s.initialized[key])continue;
        const count=s.counts.filter(c=>c.location===location&&c.lines.some(l=>l.item===item.id)).sort((a,b)=>b.at.localeCompare(a.at))[0];
        const line=count?.lines.find(l=>l.item===item.id);
        result.rows.push([`${item.name} · ${location}`,`${(s.balances[key]||0)/1000} ${item.unit}`,count?`${line.qty/1000} ${item.unit} · ${count.at} · ${count.status==='pending'?'Diferencia pendiente':(s.lastMoved?.[key]||null)!==line.stamp?'Hubo movimientos después':'Sin movimientos posteriores'}`:'Sin conteo']);
      }
      if(!result.rows.length)result.warnings.push('No hay saldos inicializados; no equivale a existencia cero.');
      result.warnings.push('No se calculan faltantes de compra: aún no hay mínimos de inventario validados.');
    }
    return result;
  }
  // Read-only equivalent of summary.js: same catalogue validity and weekly planning rules.
  const rows=await query(`SELECT a.name,a.weight,a.criticality,ar.code AS area_code,ar.name AS area_name,c.done,c.checked_at
    FROM activities a JOIN areas ar ON ar.id=a.area_id
    LEFT JOIN activity_checks c ON c.activity_id=a.id AND c.check_date=$1::date
      AND c.location_id=(SELECT id FROM locations WHERE code='jojutla' AND type='tienda' AND active=true LIMIT 1)
    WHERE ar.location_type='tienda' AND a.active=true
      AND (a.frequency<>'weekly' OR EXISTS(SELECT 1 FROM kitchen_plans kp WHERE kp.activity_id=a.id AND kp.plan_date=$1::date))
      AND (a.valid_from IS NULL OR a.valid_from<=$1::date) AND (a.valid_until IS NULL OR a.valid_until>$1::date)
      AND ($2='general' OR ar.code=$2) ORDER BY ar.order_index,a.order_index`,[date,area]);
  const grouped=new Map();
  for(const r of rows){const g=grouped.get(r.area_code)||{name:r.area_name,total:0,done:0,weight:0,doneWeight:0};g.total++;g.weight+=Number(r.weight);if(r.done){g.done++;g.doneWeight+=Number(r.weight);}grouped.set(r.area_code,g);}
  const missing=rows.filter(r=>!r.checked_at).length, pending=rows.filter(r=>!r.done&&r.criticality==='critica');
  const weight=rows.reduce((n,r)=>n+Number(r.weight),0), doneWeight=rows.reduce((n,r)=>n+(r.done?Number(r.weight):0),0);
  result.title=rows.length?`${rows.filter(r=>r.done).length} de ${rows.length} actividades con cumplimiento registrado.`:'Esta área no tiene actividades programadas para la fecha.';
  result.lines=rows.length?[`Avance ponderado: ${weight?Math.round(doneWeight/weight*100):0}%.`,`${pending.length} actividades críticas sin cumplimiento registrado.`]:[];
  result.warnings=[`${missing} actividades sin captura. La ausencia de registro no demuestra incumplimiento; considera el horario de apertura, operación y cierre.`];
  result.updatedAt=rows.map(r=>r.checked_at).filter(Boolean).sort((a,b)=>new Date(a)-new Date(b)).at(-1)||null;
  result.sources=[{label:'Ver actividades de la fecha',href:`/supervision.html?area=${area}&date=${date}`}];
  result.columns=intent==='critical'?['Actividad crítica','Estado']:['Área','Cumplimiento registrado','Avance ponderado'];
  result.rows=intent==='critical'?pending.map(r=>[`${r.area_name}: ${r.name}`,r.checked_at?'Capturada sin completar':'Sin captura']):[...grouped.values()].map(g=>[g.name,`${g.done} / ${g.total}`,`${g.weight?Math.round(g.doneWeight/g.weight*100):0}%`]);
  if(context.compare){
    const before=new Date(Date.parse(date+'T12:00:00Z')-86400000).toISOString().slice(0,10);
    const prior=await answer({...context,date:before,intent:'areas',compare:false},query,now);
    const current=[...grouped.values()].map(g=>[g.name,`${g.done} / ${g.total}`,`${g.weight?Math.round(g.doneWeight/g.weight*100):0}%`]);
    result.title=`Comparación de avance: ${date} y ${before}`;
    result.columns=['Área',date,before];
    const names=[...new Set([...current,...prior.rows].map(r=>r[0]))];
    const cell=row=>row?`${row[1]} · ${row[2]}`:'Sin actividades';
    result.rows=names.map(name=>[name,cell(current.find(r=>r[0]===name)),cell(prior.rows.find(r=>r[0]===name))]);
    result.warnings.push('Cada fecha usa sus actividades vigentes y programadas; los totales pueden variar.');
    result.sources.push({...prior.sources[0],label:`Ver actividades del ${before}`});
  }
  return result;
}
module.exports={parse,answer,AREAS};
