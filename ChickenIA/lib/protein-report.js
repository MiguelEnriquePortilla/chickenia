'use strict';
const { today } = require('./inventory-domain');
const PROTEINS = ['pollo-enhielado', 'rosti-marinado', 'cruji-marinado', 'rosti-cocinado', 'cruji-cocinado'];
function proteinReport(snapshot, events, day) {
  const state = snapshot.data;
  const todayCounts = events.filter(({data:e}) => e.type === 'count').map(({data:e}) => ({...e.detail, actorId:e.actor.id}));
  const rows = [];
  for (const location of ['cedis', 'sucursal']) for (const id of PROTEINS) {
    const product = state.items.find(i => i.id === id);
    if (!product) continue;
    const key = `${location}:${id}`;
    let entries = 0, exits = 0;
    for (const { data: e } of events) for (const d of e.deltas || []) {
      if (d.location === location && d.item === id) {
        if (d.qty > 0) entries += d.qty; else exits -= d.qty;
      }
    }
    const current = state.balances[key] || 0;
    const counts = state.counts.filter(c => c.location === location && c.lines.some(l => l.item === id)).sort((a,b) => b.at.localeCompare(a.at));
    const count = counts[0], line = count?.lines.find(l => l.item === id);
    rows.push({ location, item: id, name: product.name, unit: product.unit, step: product.step,
      initialized: !!state.initialized[key], previous: current - entries + exits, entries, exits, current,
      verification: count ? { at: count.at, actor: count.actor, actorId: count.actorId || null,
        quantity: line.qty, difference: line.qty - line.expected, moment: count.moment || null,
        movedSince: (state.lastMoved?.[key] || null) !== line.stamp, status: count.status } : null,
      verifiedByNancyToday: todayCounts.some(c => c.location === location && c.lines.some(l=>l.item===id) && c.actorId === 'nancy'),
    });
  }
  const transit = [];
  for (const request of state.requests) for (const shipment of request.shipments) for (const line of shipment.lines) {
    if (!PROTEINS.includes(line.item)) continue;
    const quantity = line.qty - (shipment.received.find(l => l.item === line.item)?.qty || 0) - (shipment.returned.find(l => l.item === line.item)?.qty || 0);
    if (quantity > 0) transit.push({ item: line.item, quantity, at: shipment.at, actor: shipment.actor, request: request.id, shipment: shipment.id });
  }
  const counts = state.counts.filter(c => c.lines.some(l => PROTEINS.includes(l.item)));
  return { version: snapshot.version, day, rows, transit,
    unresolved: counts.filter(c => c.status === 'pending').map(c => ({id:c.id,at:c.at,actor:c.actor,location:c.location,note:c.note})),
    nancy: { verified: rows.filter(r => r.verifiedByNancyToday).length, total: rows.length,
      receiptsToday: new Set(events.filter(({data:e}) => e.type === 'receive' && e.actor.id === 'nancy').map(({data:e})=>e.detail.shipment)).size,
      differencesResolvedToday: events.filter(({data:e})=>e.type==='reconcile' && e.detail.lines.some(l=>PROTEINS.includes(l.item))).length,
      moments: [...new Set(todayCounts.filter(c => c.actorId === 'nancy' && c.lines.some(l=>PROTEINS.includes(l.item))).map(c=>c.moment).filter(Boolean))] },
  };
}
module.exports = { proteinReport, PROTEINS };
