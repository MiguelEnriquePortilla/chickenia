'use strict';
const { createHmac, timingSafeEqual, scryptSync, createHash, randomBytes } = require('node:crypto');
const { InventoryError } = require('./inventory-domain');
const COOKIE = 'chickenia_inventory';
const pilot = require('./pilot-access');
function settings() {
  let users; try { users=JSON.parse(process.env.INVENTORY_USERS_JSON||'[]'); } catch { users=[]; }
  const secret=process.env.INVENTORY_SESSION_SECRET;
  if(!secret||secret.length<32)throw new InventoryError('Falta configurar la sesi\u00f3n.',503);
  return {users:Array.isArray(users)?users.filter(u=>u&&typeof u.id==='string'&&typeof u.name==='string'):[],secret};
}
function people(){return ['NANCY','LILIAN','MIGUEL'].map(name=>({id:name.toLowerCase(),name}));}
function allowedName(name){return typeof name==='string'&&people().some(p=>p.name===name.trim().toUpperCase());}
function safeEqual(a, b) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
function passwordHash(password) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 128) throw new Error('La contraseña debe tener entre 12 y 128 caracteres.');
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}
const userVersion = user => createHash('sha256').update(user.hash + user.role).digest('hex');
function sign(value, secret) { return createHmac('sha256', secret).update(value).digest('base64url'); }
function session(user, secret) {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600*10, v: userVersion(user), ...(user.pilot?{pilot:true,name:user.name}:{}) })).toString('base64url');
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
  const user = data.pilot&&allowedName(data.name)?pilot.user(data.name.trim().toUpperCase(),[]):!data.pilot?users.find(u => u.id === data.sub&&allowedName(u.name)):null;
  if (!user || user.id!==data.sub || data.v !== userVersion(user) || !Number.isFinite(data.exp) || data.exp < Date.now()/1000) throw new InventoryError('Selecciona tu nombre para continuar.',401);
  return { id: user.id, name: user.name.toUpperCase(), role: user.role, ...(user.pilot?{pilot:true}:{}) };
}
async function login(req, query) {
  const { users, secret } = settings();
  const {username}=req.body||{};
  const selected=people(users).find(u=>typeof username==='string'&&(u.id===username.trim().toLowerCase()||u.name===username.trim().toUpperCase()));
  if(!selected)throw new InventoryError('Selecciona tu nombre.',400);
  const user=pilot.user(selected.name,[]);
  return {user:{id:user.id,name:user.name,role:user.role,pilot:true},token:session(user,secret)};
}

module.exports = { authenticate, login, cookie, passwordHash, settings, people };
