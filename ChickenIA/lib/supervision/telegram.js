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
  const groups = new Map();
  for (const row of rows) { if (!groups.has(row.area_name)) groups.set(row.area_name, []); groups.get(row.area_name).push(row); }
  const areas = [...groups].map(([name, items]) => ({ name, day: score(items), block: score(items.filter(r => r.routine_block === cut.block)), critical_pending: items.filter(r => !r.done && r.criticality === 'critica' && r.routine_block === cut.block).length, unclassified: items.filter(r => !r.routine_block).length }));
  return { date, cut: cut.id, scheduled_time: cut.time, captured_at: capturedAt, location, areas, overall_score: score(rows) };
}
function message(snapshot) {
  const cut = CUTS.find(c => c.id === snapshot.cut);
  const pct = n => n == null ? 'sin actividades asignadas' : `${n}%`;
  const bar = n => {
    if (n == null) return 'Sin porcentaje disponible';
    const filled = Math.max(0, Math.min(10, Math.floor(n / 10)));
    return `${'▰'.repeat(filled)}${'▱'.repeat(10-filled)} ${pct(n)}`;
  };
  const icons = {apertura:'🌅',comida:'🍽️',produccion:'🍗',precierre:'🕔',cierre:'🌙'};
  const critical = snapshot.areas.reduce((sum,a)=>sum+a.critical_pending,0);
  const unclassified = snapshot.areas.reduce((sum,a)=>sum+a.unclassified,0);
  const lines = [`🐔 CHICKENIA · SUPERVISIÓN`, `${icons[cut.id]} ${cut.label} · ${cut.time}`, `📍 ${snapshot.location} | 📅 ${snapshot.date}`, '', '📊 AVANCE TOTAL DEL DÍA', bar(snapshot.overall_score), '', '🎯 EN ESTE CORTE', cut.focus, '', '🏷️ CUMPLIMIENTO POR ÁREA'];
  for (const area of snapshot.areas) {
    const icon = area.critical_pending ? '🔴' : area.block == null ? '⚪' : area.block === 100 ? '✅' : '🔎';
    lines.push('', `${icon} ${area.name}`, area.block == null ? 'Bloque: sin actividades asignadas' : `Bloque: ${bar(area.block)}`, `Día: ${pct(area.day)}`);
    if(area.critical_pending)lines.push(`⚠️ ${area.critical_pending} críticos pendientes del bloque`);
    if(area.unclassified)lines.push(`🧩 ${area.unclassified} actividades aún sin clasificar por bloque`);
  }
  lines.push('', '📌 PARA DAR SEGUIMIENTO', critical ? `⚠️ ${critical} críticos pendientes en los bloques clasificados.` : 'No hay críticos pendientes en los bloques clasificados.', ...(unclassified ? [`🧩 ${unclassified} actividades sin bloque: cuentan en el día; falta completar su clasificación.`] : []), '', 'ℹ️ Porcentajes según verificaciones registradas; no certifican existencias ni producción.', '✅ Bloque al 100% · 🔎 Por verificar · 🔴 Críticos pendientes · ⚪ Sin actividades de bloque', `🕒 Captura real (CDMX): ${new Date(snapshot.captured_at).toLocaleTimeString('es-MX', { timeZone: ZONE, hour12: false })}`, 'Reporte automático; refleja los registros a la hora de captura.', '', '👉 Ver detalle en ChickenIA', `https://chickenia.chicanito.app/supervision.html?date=${snapshot.date}`);
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
