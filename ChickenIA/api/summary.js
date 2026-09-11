// api/summary.js — resumen ponderado del día por ubicación: score por área,
// pendientes críticos, y verificación cruzada de pollo para unidades móviles.
const { ensureTables } = require('../lib/supervision/db');

module.exports = async (req, res) => {
  try {
    const sql = await ensureTables();
    const { location_id, date } = req.query;
    if (!location_id || !date) return res.status(400).json({ error: 'location_id y date son requeridos' });

    const loc = await sql`SELECT id, code, name, type FROM locations WHERE id = ${location_id}`;
    if (!loc.length) return res.status(404).json({ error: 'Ubicación no encontrada' });
    const locationType = loc[0].type;

    const activities = await sql`
      SELECT a.id, a.area_id, ar.code AS area_code, ar.name AS area_name, a.name, a.criticality, a.weight, a.requires_quantity, a.unit
      FROM activities a JOIN areas ar ON ar.id = a.area_id
      WHERE ar.location_type = ${locationType} AND a.active = true
        AND (a.frequency <> 'weekly' OR EXISTS (SELECT 1 FROM kitchen_plans kp WHERE kp.activity_id=a.id AND kp.plan_date=${date}::date))
        AND (a.valid_from IS NULL OR a.valid_from <= ${date}::date)
        AND (a.valid_until IS NULL OR a.valid_until > ${date}::date)
      ORDER BY ar.order_index, a.order_index
    `;
    const checks = await sql`
      SELECT activity_id, done, quantity, quality_score, notes, checked_by, checked_at
      FROM activity_checks WHERE location_id = ${location_id} AND check_date = ${date}
    `;
    const checkByActivity = Object.fromEntries(checks.map((c) => [c.activity_id, c]));

    const areaMap = {};
    let totalWeight = 0;
    let doneWeight = 0;
    const criticalPending = [];

    for (const act of activities) {
      const c = checkByActivity[act.id];
      const done = c ? c.done : false;
      totalWeight += act.weight;
      if (done) doneWeight += act.weight;
      if (!done && act.criticality === 'critica') {
        criticalPending.push({ area_name: act.area_name, name: act.name });
      }
      if (!areaMap[act.area_code]) {
        areaMap[act.area_code] = { area_code: act.area_code, area_name: act.area_name, total_weight: 0, done_weight: 0, total_items: 0, done_items: 0 };
      }
      const a = areaMap[act.area_code];
      a.total_weight += act.weight;
      a.total_items += 1;
      if (done) {
        a.done_weight += act.weight;
        a.done_items += 1;
      }
    }

    const areas = Object.values(areaMap).map((a) => ({
      ...a,
      score: a.total_weight ? Math.round((a.done_weight / a.total_weight) * 100) : 0,
    }));

    // Verificación cruzada para moto: recibido vs sobrante (pollo)
    let crossCheck = null;
    if (locationType === 'moto') {
      const recibidoAct = activities.find((a) => a.name === 'Pollo Chicanito entregado');
      const sobranteAct = activities.find((a) => a.name === 'Pollo Chicanito sobrante');
      const recibido = recibidoAct ? checkByActivity[recibidoAct.id] : null;
      const sobrante = sobranteAct ? checkByActivity[sobranteAct.id] : null;
      if (recibido && sobrante && recibido.quantity != null && sobrante.quantity != null) {
        crossCheck = { recibido: Number(recibido.quantity), sobrante: Number(sobrante.quantity) };
      }
    }

    res.status(200).json({
      location: loc[0],
      date,
      overall_score: totalWeight ? Math.round((doneWeight / totalWeight) * 100) : 0,
      areas,
      critical_pending: criticalPending,
      cross_check: crossCheck,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
