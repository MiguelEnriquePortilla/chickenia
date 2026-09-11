'use strict';
const { createHash } = require('node:crypto');
const { freshState, applyOperation, InventoryError } = require('./inventory-domain');

const migrations = [
  `CREATE TABLE IF NOT EXISTS inv_state (id integer PRIMARY KEY CHECK (id=1), version integer NOT NULL DEFAULT 0, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS inv_events (id uuid PRIMARY KEY, version integer NOT NULL UNIQUE, actor_id text NOT NULL, fingerprint text NOT NULL, kind text NOT NULL, business_date date NOT NULL, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS inv_events_date ON inv_events (business_date, version DESC)`,
  `CREATE TABLE IF NOT EXISTS inv_reversals (original_id uuid PRIMARY KEY REFERENCES inv_events(id), reversal_id uuid NOT NULL UNIQUE REFERENCES inv_events(id))`,
  `CREATE TABLE IF NOT EXISTS inv_login_attempts (key text PRIMARY KEY, window_start timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 1)`,
];
// This query either writes the new balance AND audit record, or writes neither.
const COMMIT_SQL = `WITH changed AS (
 UPDATE inv_state SET data=$1::jsonb, version=version+1, updated_at=now()
 WHERE id=1 AND version=$2 RETURNING version
), logged AS (
 INSERT INTO inv_events(id,version,actor_id,fingerprint,kind,business_date,data)
 SELECT $3::uuid,version,$4,$5,$6,$7::date,$8::jsonb FROM changed RETURNING version
), reversed AS (
 INSERT INTO inv_reversals(original_id,reversal_id)
 SELECT $9::uuid,$3::uuid FROM logged WHERE $9::uuid IS NOT NULL
) SELECT version FROM logged`;
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function repository(query) {
  async function migrate() {
    for (const sql of migrations) await query(sql, []);
    await query('INSERT INTO inv_state(id,data) VALUES(1,$1::jsonb) ON CONFLICT(id) DO NOTHING', [JSON.stringify(freshState())]);
    // Add only absent catalogue IDs. Never reinterpret existing units or balances.
    await query(`UPDATE inv_state SET data=jsonb_set(data,'{items}',(data->'items') || (
      SELECT jsonb_agg(item) FROM jsonb_array_elements($1::jsonb) AS item
      WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(data->'items') old WHERE old->>'id'=item->>'id')
    )),version=version+1,updated_at=now() WHERE id=1 AND EXISTS (
      SELECT 1 FROM jsonb_array_elements($1::jsonb) item WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(data->'items') old WHERE old->>'id'=item->>'id')
    )`,[JSON.stringify(require('./kitchen-items'))]);
  }
  async function snapshot() {
    const rows = await query('SELECT version,data FROM inv_state WHERE id=1', []);
    if (!rows.length) throw new InventoryError('Inventario no inicializado.', 503);
    return rows[0];
  }
  async function history(before = 2147483647) {
    return query('SELECT version,data FROM inv_events WHERE version<$1 ORDER BY version DESC LIMIT 50', [before]);
  }
  async function dailyEvents(day, version) {
    return query('SELECT version,data FROM inv_events WHERE business_date=$1::date AND version<=$2 ORDER BY version', [day, version]);
  }
  async function execute(command, actor) {
    if (!command || typeof command.id !== 'string' || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(command.id)) throw new InventoryError('Identificador de operación inválido.');
    if (!Number.isInteger(command.version) || command.version < 0) throw new InventoryError('Versión inválida.');
    if (Object.keys(command).some(k => k.startsWith('_'))) throw new InventoryError('Campo reservado.');
    const fingerprint = createHash('sha256').update(stable(command)).digest('hex');
    const repeated = await query('SELECT actor_id,fingerprint,version,data FROM inv_events WHERE id=$1::uuid', [command.id]);
    if (repeated.length) {
      if (repeated[0].actor_id !== actor.id || repeated[0].fingerprint !== fingerprint) throw new InventoryError('Identificador ya usado para otro registro.', 409);
      return { version: repeated[0].version, event: repeated[0].data, repeated: true };
    }
    const current = await snapshot();
    if (current.version !== command.version) throw new InventoryError('Otra persona actualizó el inventario. Actualiza los datos y revisa la operación.', 409);
    let target;
    if (command.type === 'reverse') {
      if (typeof command.target !== 'string' || !/^[a-f\d-]{36}$/i.test(command.target)) throw new InventoryError('Registro inválido.');
      const records = await query('SELECT data FROM inv_events WHERE id=$1::uuid', [command.target]);
      const reversals = await query('SELECT original_id FROM inv_reversals WHERE original_id=$1::uuid', [command.target]);
      if (!records.length || reversals.length) throw new InventoryError('Registro inexistente o ya corregido.', 409);
      target = records[0].data;
    }
    const result = applyOperation(current.data, { ...command, _target: target }, actor);
    try {
      const rows = await query(COMMIT_SQL, [JSON.stringify(result.state), command.version, command.id, actor.id, fingerprint, command.type, result.event.date, JSON.stringify(result.event), target?.id || null]);
      if (!rows.length) {
        const retry = await query('SELECT actor_id,fingerprint,version,data FROM inv_events WHERE id=$1::uuid', [command.id]);
        if (retry[0]?.actor_id === actor.id && retry[0]?.fingerprint === fingerprint) return { version:retry[0].version,event:retry[0].data,repeated:true };
        throw new InventoryError('El saldo cambió. Actualiza y vuelve a revisar.', 409);
      }
      return { version: rows[0].version, event: result.event };
    } catch (error) {
      if (error.code === '23505') {
        const retry = await query('SELECT actor_id,fingerprint,version,data FROM inv_events WHERE id=$1::uuid', [command.id]);
        if (retry[0]?.actor_id === actor.id && retry[0]?.fingerprint === fingerprint) return { version: retry[0].version, event: retry[0].data, repeated: true };
        throw new InventoryError('La operación ya fue procesada o corregida.', 409);
      }
      throw error;
    }
  }
  return { migrate, snapshot, history, dailyEvents, execute };
}
let productionRepository;
function production() {
  if (!process.env.DATABASE_URL) throw new InventoryError('Falta configurar la base de datos.', 503);
  if (!productionRepository) {
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL);
    productionRepository = repository((statement, params) => sql(statement, params));
  }
  return productionRepository;
}
module.exports = { repository, production, migrations, COMMIT_SQL };
