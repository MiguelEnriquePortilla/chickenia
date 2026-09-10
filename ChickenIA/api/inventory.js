'use strict';
const { production } = require('../lib/inventory-store');
const auth = require('../lib/inventory-auth');
const { roles, OPENING_TASKS, today, InventoryError } = require('../lib/inventory-domain');

function createHandler(getRepository = production, queryOverride) {
  let migrated;
  return async (req, res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    try {
      if (!['GET','POST'].includes(req.method)) { res.setHeader('Allow','GET, POST'); throw new InventoryError('Método no permitido.',405); }
      if (req.method === 'POST') {
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new InventoryError('Se requiere JSON.',415);
        if (req.headers['sec-fetch-site'] === 'cross-site') throw new InventoryError('Origen no permitido.',403);
        if (req.headers.origin) {
          let origin; try { origin = new URL(req.headers.origin); } catch { throw new InventoryError('Origen inválido.',403); }
          if (origin.host !== req.headers.host) throw new InventoryError('Origen no permitido.',403);
        }
        if (Buffer.byteLength(JSON.stringify(req.body || {})) > 100000) throw new InventoryError('Solicitud demasiado grande.',413);
      }
      const action = req.query?.action || 'snapshot';
      if (req.method === 'POST' && action === 'logout') { res.setHeader('Set-Cookie',auth.cookie('',req,true)); return res.status(200).json({ok:true}); }
      // Missing credentials fails closed; anonymous requests cannot create tables or read stock.
      auth.settings();
      const user = action === 'login' && req.method === 'POST' ? null : auth.authenticate(req);
      const repo = getRepository();
      if (!migrated) migrated = repo.migrate().catch(e => { migrated = null; throw e; });
      await migrated;
      if (req.method === 'POST' && action === 'login') {
        const query = queryOverride || ((s,p) => require('@neondatabase/serverless').neon(process.env.DATABASE_URL)(s,p));
        const result = await auth.login(req,query);
        res.setHeader('Set-Cookie',auth.cookie(result.token,req));
        return res.status(200).json({user:result.user});
      }
      if (req.method === 'GET') {
        if (action === 'history') {
          const before = req.query.before == null ? 2147483647 : Number(req.query.before);
          if (!Number.isInteger(before) || before < 1) throw new InventoryError('Página inválida.');
          return res.status(200).json(await repo.history(before));
        }
        if (action !== 'snapshot') throw new InventoryError('Ruta desconocida.',404);
        return res.status(200).json({ ...(await repo.snapshot()), user, permissions:Object.keys(roles).filter(k=>roles[k].includes(user.role)), openingTasks:OPENING_TASKS, today:today(new Date()) });
      }
      if (action !== 'operation') throw new InventoryError('Ruta desconocida.',404);
      return res.status(200).json(await repo.execute(req.body,user));
    } catch (error) {
      const status = error.status || 500;
      if (status === 500) console.error('inventory failed', error.code || error.name);
      return res.status(status).json({error:status===500?'No se pudo guardar o cargar el inventario. Reintenta; no dupliques la captura.':error.message});
    }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
