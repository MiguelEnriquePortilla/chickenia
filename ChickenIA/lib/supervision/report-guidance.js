'use strict';

// Only explicit catalog names are classified here; unknown tasks stay unknown.
const closing = new Set([
  '6:00pm — Revisión de limpieza profunda',
  '6:30 p. m. — Revisión de registros de inventario final',
  '6:30pm — Control de inventario final (conteo de proteínas)',
  '7:00pm — Cierre del local (caja, cuadres, cambio, evidencias)',
  '7:15pm — Inspección final del local',
  '7:30pm — Envío de reporte de cierre (ventas, incidencias, inventario)',
]);

function classifications(legacy) {
  // One entry per seed row; resolve by exact name, never by live database order.
  const blocks = {
    freidoras: 'A A A A O O O O O O O O O C O O O O O O O C C C C C',
    caja: 'A A A A A O O A O O O O O C C',
    ventas_barras: 'A A O O O O O O O C C C C',
    trastes: 'A O O A O O C',
  };
  const names = { A: 'apertura', O: 'operacion', C: 'cierre' };
  return Object.entries(blocks).flatMap(([area_code, sequence]) => {
    const entries = sequence.split(' ');
    if (legacy[area_code].length !== entries.length) throw new Error(`Revisar clasificación de ${area_code}`);
    return legacy[area_code].map((r, i) => ({ area_code, name: r[0], routine_block: names[entries[i]] }));
  }).concat([...closing].map(name => ({ area_code: 'supervision', name, routine_block: 'cierre' })));
}

function blockFor(row) {
  if (row.area_code === 'supervision' && closing.has(row.name)) return 'cierre';
  return row.routine_block || null;
}

function guidance(rows, cut) {
  const dueBlocks = cut.block === 'apertura' ? ['apertura'] : cut.block === 'cierre' ? ['apertura', 'operacion', 'cierre'] : ['apertura', 'operacion'];
  const pending = rows.filter(r => !r.done);
  const [hour, minute] = cut.time.split(':').map(Number);
  const due = pending.filter(r => {
    if (!dueBlocks.includes(blockFor(r))) return false;
    const time = (r.name || '').match(/^(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?/i);
    if (!time) return true;
    const scheduled = (Number(time[1]) % 12 + (time[3].toLowerCase() === 'p' ? 12 : 0)) * 60 + Number(time[2]);
    return scheduled <= hour * 60 + minute;
  });
  const critical = due.filter(r => r.criticality === 'critica');
  const unknown = pending.filter(r => !blockFor(r));
  const areas = [...new Set((critical.length ? critical : due).map(r => r.area_name))];
  if (!rows.length) return 'No hay actividades disponibles para evaluar. Supervisor: revisa el catálogo de la sucursal antes de emitir una conclusión.';
  if (!pending.length) return 'Todas las actividades del día están registradas como verificadas. Supervisor: confirma las incidencias y da seguimiento a cualquier novedad.';
  if (critical.length) return `Hay ${critical.length} ${critical.length === 1 ? 'actividad crítica pendiente' : 'actividades críticas pendientes'} de verificar en ${areas.join(', ')}. Supervisor: revisa con los responsables, resuelve lo pendiente y registra el resultado en ChickenIA.${unknown.length ? ' Revisa también los pendientes sin horario definido.' : ''}`;
  if (due.length) return `Quedan actividades de este corte o anteriores por verificar en ${areas.join(', ')}. Supervisor: confirma con los responsables cuáles ya se hicieron, completa las pendientes y registra el resultado.${unknown.length ? ' Revisa también los pendientes sin horario definido.' : ''}`;
  if (unknown.length) return 'Hay pendientes sin horario definido; no se puede determinar si ya corresponden a este corte. Supervisor: revisa cuándo deben realizarse y verifica su cumplimiento con cada responsable.';
  return `Las actividades correspondientes a este corte están verificadas; quedan rutinas posteriores. Supervisor: ${cut.focus.charAt(0).toLowerCase()}${cut.focus.slice(1)}`;
}

module.exports = { blockFor, guidance, classifications };
