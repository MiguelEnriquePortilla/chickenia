'use strict';
const { createHmac, timingSafeEqual, scryptSync, createHash, randomBytes } = require('node:crypto');
const { InventoryError } = require('./inventory-domain');
const COOKIE = 'chickenia_inventory';
function settings() {
  let users;
  try { users = JSON.parse(process.env.INVENTORY_USERS_JSON || 'null'); } catch { /* handled below */ }
  const secret = process.env.INVENTORY_SESSION_SECRET;
  if (!secret || secret.length < 32 || !Array.isArray(users) || !users.length) throw new InventoryError('El administrador debe configurar las cuentas de inventario.', 503);
  if (users.some(u => !/^[a-z0-9-]{2,40}$/.test(u.id) || !['manager','kitchen','dispatch','processor'].includes(u.role) || typeof u.name !== 'string' || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(u.hash))) throw new InventoryError('Configuración de cuentas inválida.', 503);
  if (new Set(users.map(u => u.id)).size !== users.length) throw new InventoryError('Cuentas duplicadas.', 503);
  return { users, secret };
}
function safeEqual(a, b) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
function passwordHash(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw new Error('La contraseña debe tener entre 12 y 128 caracteres.');
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}
const userVersion = user => createHash('sha256').update(user.hash + user.role).digest('hex');
function sign(value, secret) { return createHmac('sha256', secret).update(value).digest('base64url'); }
function session(user, secret) {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600*10, v: userVersion(user) })).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}
function cookie(value, req, clear = false) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' || req.headers['x-forwarded-proto'] === 'https';
  return [
    `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/api/inventory; Max-Age=0${secure ? '; Secure' : ''}`,
    `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${clear ? 0 : 36000}${secure ? '; Secure' : ''}`
  ];
}
function authenticate(req) {
  const { users, secret } = settings();
  const raw = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if (!raw || raw.length > 2000) throw new InventoryError('Inicia sesión para continuar.', 401);
  const [payload, signature, extra] = raw.split('.');
  if (extra || !signature || !safeEqual(sign(payload, secret), signature)) throw new InventoryError('Sesión inválida.', 401);
  let data; try { data = JSON.parse(Buffer.from(payload,'base64url').toString()); } catch { throw new InventoryError('Sesión inválida.',401); }
  const user = users.find(u => u.id === data.sub);
  if (!user || data.v !== userVersion(user) || !Number.isFinite(data.exp) || data.exp < Date.now()/1000) throw new InventoryError('La sesión venció.',401);
  return { id: user.id, name: user.name, role: user.role };
}
async function login(req, query) {
  const { users, secret } = settings();
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || username.length > 40 || typeof password !== 'string' || password.length > 128) throw new InventoryError('Credenciales inválidas.',401);
  const key = createHash('sha256').update(username.toLowerCase()).digest('hex');
  const attempts = await query(`INSERT INTO inv_login_attempts(key) VALUES($1)
    ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN inv_login_attempts.window_start < now()-interval '15 minutes' THEN 1 ELSE inv_login_attempts.attempts+1 END,
    window_start=CASE WHEN inv_login_attempts.window_start < now()-interval '15 minutes' THEN now() ELSE inv_login_attempts.window_start END RETURNING attempts`, [key]);
  if (attempts[0].attempts > 10) throw new InventoryError('Demasiados intentos. Espera 15 minutos.',429);
  const user = users.find(u => u.id === username.toLowerCase());
  const hash = user?.hash || `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;
  const [,salt,expected] = hash.split('$');
  const computed = scryptSync(password,salt,64).toString('hex');
  if (!user || !safeEqual(expected,computed)) throw new InventoryError('Usuario o contraseña incorrectos.',401);
  await query('DELETE FROM inv_login_attempts WHERE key=$1',[key]);
  return { user: { id:user.id,name:user.name,role:user.role }, token:session(user,secret) };
}
module.exports = { authenticate, login, cookie, passwordHash, settings };
