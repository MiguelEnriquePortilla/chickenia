'use strict';
const { timingSafeEqual } = require('node:crypto');
const ZONE = 'America/Mexico_City';
const CUTS = [
  { id: 'apertura', time: '09:30', block: 'apertura', label: 'Apertura', focus: 'Verificar las rutinas de apertura y resolver pendientes.' },
  { id: 'comida', time: '12:00', block: 'operacion', label: 'Preparación para la comida', focus: 'Revisar inventario disponible y preparación de producción para la comida.' },
  { id: 'produccion', time: '14:00', block: 'operacion', label: 'Producción y actividades', focus: 'Verificar producción disponible, reposiciones y avance de actividades durante la venta de comida.' },
  { id: 'precierre', time: '17:00', block: 'operacion', label: 'Antes del cierre', focus: 'Revisar pendientes antes de comenzar las rutinas de cierre.' },
  { id: 'cierre', time: '19:00', block: 'cierre', label: 'Revisión del cierre', focus: 'Revisar avance de cierre e incidencias de todas las áreas.' },
];
function authorized(header, secret) {
  if (!secret || secret.length < 32 || typeof header !== 'string') return false;
  const a = Buffer.from(header), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
function currentCut(now = new Date(), requestedCut) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  const cut = CUTS.find(c => { const [h,m] = c.time.split(':').map(Number); return (!requestedCut || c.id === requestedCut) && minute >= h*60+m && minute < h*60+m+65; });
  return { date: `${parts.year}-${parts.month}-${parts.day}`, cut };
}
function score(rows) {
  const total = rows.reduce((s,r) => s+Number(r.weight),0);
  return total ? Math.round(rows.reduce((s,r) => s+(r.done ? Number(r.weight) : 0),0)*100/total) : null;
}
function report(rows, cut, date, location, capturedAt) {
  const { blockFor, guidance, areaSummary } = require('./report-guidance');
  rows = rows.map(row => ({ ...row, routine_block: blockFor(row) }));
  const groups = new Map();
  for (const row of rows) { if (!groups.has(row.area_name)) groups.set(row.area_name, []); groups.get(row.area_name).push(row); }
  const areas = [...groups].map(([name, items]) => ({ name, day: score(items), block: score(items.filter(r => r.routine_block === cut.block)), critical_pending: items.filter(r => !r.done && r.criticality === 'critica' && r.routine_block === cut.block).length, unclassified: items.filter(r => !r.routine_block).length }));
  for (const area of areas) Object.assign(area, areaSummary(groups.get(area.name), cut));
  return { date, cut: cut.id, scheduled_time: cut.time, captured_at: capturedAt, location, areas, overall_score: score(rows), instruction: guidance(rows, cut) };
}
function message(snapshot) {
  const cut = CUTS.find(c => c.id === snapshot.cut);
  const captured = new Date(snapshot.captured_at).toLocaleTimeString('es-MX', { timeZone: ZONE, hour12: false });
  const lines = [
    '🐔 CHICKENIA · SUPERVISIÓN',
    `${snapshot.location} · ${snapshot.date} · Captura ${captured} CDMX`,
    cut.label,
    '',
    snapshot.overall_score == null ? 'Avance del día: sin datos' : `Avance del día: ${snapshot.overall_score}% verificado`,
    '',
    ...snapshot.areas.map(a => `${({complete:'✅',critical:'🔴',pending:'🔎',later:'🕒'})[a.status] || '🔎'} ${a.name}: ${a.day == null ? 'sin datos' : a.day+'%'} · ${a.summary || 'Consultar detalle'}`),
    '',
    snapshot.instruction || 'Supervisor: revisa los pendientes del día con cada responsable y registra las verificaciones en ChickenIA.',
    '',
    'Ver dashboard actualizado:',
    dashboardUrl(snapshot),
  ];
  const result = lines.join('\n');
  if (result.length > 4000) throw new Error('Reporte demasiado largo');
  return result;
}
function dashboardUrl(snapshot) {
  return `https://chickenia.chicanito.app/dashboard.html?date=${encodeURIComponent(snapshot.date)}`;
}

async function sendReport(snapshot, png, env = process.env, fetchImpl = fetch) {
  if (!env.TELEGRAM_BOT_TOKEN || !/^-\d+$/.test(env.TELEGRAM_CHAT_ID || '')) throw new Error('Telegram sin configurar');
  const full = message(snapshot);
  // A photo caption is limited to 1024 characters; the image retains every area.
  const caption = full.length <= 1024 ? full : [
    '🐔 CHICKENIA · SUPERVISIÓN', `${snapshot.location} · ${snapshot.date}`,
    `${CUTS.find(c => c.id === snapshot.cut).label} · Captura ${new Date(snapshot.captured_at).toLocaleTimeString('es-MX',{timeZone:ZONE,hour12:false})} CDMX`,
    `Avance del día: ${snapshot.overall_score == null ? 'sin datos' : snapshot.overall_score+'% verificado'}`,
    '', snapshot.instruction,
    '', 'Detalle por área en la imagen. El dashboard muestra los registros actualizados.',
  ].join('\n');
  if (caption.length > 1024) throw new Error('Resumen demasiado largo');
  const body = new FormData();
  body.set('chat_id',env.TELEGRAM_CHAT_ID);
  body.set('photo',new Blob([png],{type:'image/png'}),'supervision.png');
  body.set('caption',caption);
  body.set('reply_markup',JSON.stringify({inline_keyboard:[[{text:'Ver dashboard del día',url:dashboardUrl(snapshot)}]]}));
  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`,{method:'POST',body,signal:AbortSignal.timeout(20000)});
    const data = await response.json();
    if (!response.ok || !data.ok || !data.result?.message_id) throw new Error();
    return data.result.message_id;
  } catch { throw new Error('No se pudo confirmar la imagen en Telegram. Revisar el grupo antes de reintentar.'); }
}
async function sendTelegram(text, env = process.env, fetchImpl = fetch) {
  if (!env.TELEGRAM_BOT_TOKEN || !/^-\d+$/.test(env.TELEGRAM_CHAT_ID || '')) throw new Error('Telegram sin configurar');
  // Never expose the token, request URL, or Telegram response in errors/logs.
  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, link_preview_options: { is_disabled: true } }), signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    if (!response.ok || !data.ok || !data.result?.message_id) throw new Error();
    return data.result.message_id;
  } catch { throw new Error('No se pudo confirmar el envío a Telegram. Revisar el grupo antes de reintentar.'); }
}
module.exports = { CUTS, ZONE, authorized, currentCut, score, report, message, sendTelegram, sendReport, dashboardUrl };
