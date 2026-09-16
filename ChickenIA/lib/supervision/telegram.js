'use strict';
const { timingSafeEqual } = require('node:crypto');
const ZONE = 'America/Mexico_City';
const CUTS = [
  { id: 'apertura', time: '09:30', block: 'apertura', label: 'Apertura', focus: 'Verificar las rutinas de apertura y resolver pendientes.' },
  { id: 'comida', time: '12:00', block: 'operacion', label: 'Preparación para la comida', focus: 'Revisar inventario disponible y preparación de producción para la comida.' },
  { id: 'precierre', time: '17:00', block: 'operacion', label: 'Antes del cierre', focus: 'Revisar pendientes antes de comenzar las rutinas de cierre.' },
  { id: 'cierre', time: '19:00', block: 'cierre', label: 'Revisión del cierre', focus: 'Revisar avance de cierre e incidencias de todas las áreas.' },
];
function authorized(header, secret) {
  if (!secret || secret.length < 32 || typeof header !== 'string') return false;
  const a = Buffer.from(header), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
function currentCut(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  const minute = Number(parts.hour) * 60 + Number(parts.minute);
  const cut = CUTS.find(c => { const [h,m] = c.time.split(':').map(Number); return minute >= h*60+m && minute < h*60+m+5; });
  return { date: `${parts.year}-${parts.month}-${parts.day}`, cut };
}
function score(rows) {
  const total = rows.reduce((s,r) => s+Number(r.weight),0);
  return total ? Math.round(rows.reduce((s,r) => s+(r.done ? Number(r.weight) : 0),0)*100/total) : null;
}
function report(rows, cut, date, location, capturedAt) {
  const groups = new Map();
  for (const row of rows) { if (!groups.has(row.area_name)) groups.set(row.area_name, []); groups.get(row.area_name).push(row); }
  const areas = [...groups].map(([name, items]) => ({ name, day: score(items), block: score(items.filter(r => r.routine_block === cut.block)), critical_pending: items.filter(r => !r.done && r.criticality === 'critica' && r.routine_block === cut.block).length, unclassified: items.filter(r => !r.routine_block).length }));
  return { date, cut: cut.id, scheduled_time: cut.time, captured_at: capturedAt, location, areas, overall_score: score(rows) };
}
function message(snapshot) {
  const cut = CUTS.find(c => c.id === snapshot.cut);
  const pct = n => n === null ? 'sin actividades' : `${n}%`;
  const lines = [`ChickenIA · ${cut.label} · ${cut.time}`, `${snapshot.location} · ${snapshot.date}`, cut.focus, '', 'Cumplimiento del bloque / avance total del día:'];
  for (const area of snapshot.areas) lines.push(`${area.name}: ${pct(area.block)} / ${pct(area.day)}${area.critical_pending ? ` · ${area.critical_pending} críticos pendientes del bloque` : ''}${area.unclassified ? ` · ${area.unclassified} actividades sin bloque` : ''}`);
  lines.push('', `Avance total del día: ${pct(snapshot.overall_score)}`, 'Porcentajes según verificaciones registradas; no certifican existencias ni producción.', `Reporte capturado: ${new Date(snapshot.captured_at).toLocaleTimeString('es-MX', { timeZone: ZONE, hour12: false })}`, `https://chickenia.chicanito.app/supervision.html?date=${snapshot.date}`);
  const result = lines.join('\n');
  if (result.length > 4000) throw new Error('Reporte demasiado largo');
  return result;
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
module.exports = { CUTS, ZONE, authorized, currentCut, score, report, message, sendTelegram };
