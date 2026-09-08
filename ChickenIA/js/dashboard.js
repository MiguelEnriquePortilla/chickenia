// js/dashboard.js — Dashboard de supervisión para Miguel y Lilian (única vista con acceso).
const $ = (sel) => document.querySelector(sel);
const state = {
  locations: [],
  location: null,
  date: new Date().toISOString().slice(0, 10),
};

// Password gate — solo esta vista (Nancy no entra aquí, sigue usando supervision.html sin restricción).
const GATE_PASSWORD = 'chickenia2026';
const GATE_STORAGE_KEY = 'chickenia_dash_ok';

function initGate() {
  const gate = document.getElementById('password-gate');
  const content = document.getElementById('app-content');
  const unlock = () => {
    gate.style.display = 'none';
    content.hidden = false;
    init();
  };
  if (localStorage.getItem(GATE_STORAGE_KEY) === '1') {
    unlock();
    return;
  }
  const form = document.getElementById('gate-form');
  const input = document.getElementById('gate-password');
  const errorEl = document.getElementById('gate-error');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value === GATE_PASSWORD) {
      localStorage.setItem(GATE_STORAGE_KEY, '1');
      unlock();
    } else {
      errorEl.textContent = 'Contraseña incorrecta.';
      input.value = '';
      input.focus();
    }
  });
  input.focus();
}

// --- Secciones colapsables (detalle de áreas / movimientos) ---
function initCollapsible(toggleId, bodyId) {
  const toggle = document.getElementById(toggleId);
  const body = document.getElementById(bodyId);
  if (!toggle || !body) return;
  toggle.addEventListener('click', () => setCollapsible(toggleId, bodyId, toggle.getAttribute('aria-expanded') !== 'true'));
}
function setCollapsible(toggleId, bodyId, open) {
  const toggle = document.getElementById(toggleId);
  const body = document.getElementById(bodyId);
  if (!toggle || !body) return;
  toggle.setAttribute('aria-expanded', String(open));
  body.inert = !open;
}

// --- Modo oscuro (mismo mecanismo/llave que supervision.js, así queda igual en ambas pantallas) ---
const THEME_KEY = 'chickenia_theme';
function applyTheme(theme) {
  if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(isDark ? 'light' : 'dark');
  closeCornerMenu();
}

// --- Menú ☰/⋮ de la esquina ---
function initCornerMenu() {
  const btn = $('#corner-menu-btn');
  const panel = $('#corner-menu-panel');
  if (!btn || !panel) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (panel.classList.contains('open')) {
      closeCornerMenu();
    } else {
      panel.classList.add('open');
      panel.inert = false;
      btn.setAttribute('aria-expanded', 'true');
    }
  });
  document.addEventListener('click', (e) => {
    if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== btn) closeCornerMenu();
  });
  $('#menu-expand-all')?.addEventListener('click', () => {
    setCollapsible('areas-toggle', 'areas', true);
    setCollapsible('movements-toggle', 'movements', true);
    closeCornerMenu();
  });
  $('#menu-collapse-all')?.addEventListener('click', () => {
    setCollapsible('areas-toggle', 'areas', false);
    setCollapsible('movements-toggle', 'movements', false);
    closeCornerMenu();
  });
  $('#menu-dark-toggle')?.addEventListener('click', toggleTheme);
  $('#menu-logout')?.addEventListener('click', () => {
    localStorage.removeItem(GATE_STORAGE_KEY);
    location.reload();
  });
}
function closeCornerMenu() {
  const btn = $('#corner-menu-btn');
  const panel = $('#corner-menu-panel');
  if (!panel || !panel.classList.contains('open')) return;
  panel.classList.remove('open');
  panel.inert = true;
  btn?.setAttribute('aria-expanded', 'false');
}

async function api(path) {
  const res = await fetch('/api/' + path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Error de red');
  }
  return res.json();
}

async function init() {
  applyTheme(localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light');
  initCornerMenu();
  initCriticalChip();
  initCollapsible('areas-toggle', 'areas');
  initCollapsible('movements-toggle', 'movements');

  $('#date-input').value = state.date;
  $('#date-input').addEventListener('change', (e) => {
    state.date = e.target.value;
    load();
  });

  try {
    state.locations = await api('locations');
  } catch (err) {
    $('#areas').innerHTML = `<p class="loading">No se pudo conectar con la base de datos: ${err.message}</p>`;
    return;
  }

  // Por ahora solo operamos Jojutla Mercado — Moto queda escondida por completo (no solo deshabilitada).
  state.location = state.locations.find((l) => l.type === 'tienda') || state.locations[0];
  if (state.location) {
    load();
  }

  setInterval(load, 60000);
}

async function load() {
  if (!state.location) return;
  try {
    const [summary, movements] = await Promise.all([
      api(`summary?location_id=${state.location.id}&date=${state.date}`),
      api(`inventory-movements?location_id=${state.location.id}&date=${state.date}`),
    ]);
    renderStatusBar(summary);
    renderSummary(summary);
    renderMovements(movements);
  } catch (err) {
    console.error(err);
  }
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 30;
const prevAreaStatus = {};

function renderStatusBar(summary) {
  const bar = $('#area-status-bar');
  if (!bar) return;
  if (!summary.areas.length) {
    bar.style.display = 'none';
    return;
  }
  const criticalAreaNames = new Set(summary.critical_pending.map((p) => p.area_name));
  bar.style.display = 'grid';
  bar.innerHTML = summary.areas
    .map((a) => {
      const hasCritical = criticalAreaNames.has(a.area_name);
      const status = hasCritical ? 'status-critical' : a.score >= 80 ? 'status-ok' : a.score >= 50 ? 'status-warn' : '';
      const changed = prevAreaStatus[a.area_code] !== undefined && prevAreaStatus[a.area_code] !== status;
      prevAreaStatus[a.area_code] = status;
      const offset = RING_CIRCUMFERENCE * (1 - a.score / 100);
      return `<button type="button" class="area-badge ${status} ${changed ? 'badge-changed' : ''}" data-jump="${a.area_code}">
        <span class="ring-wrap">
          <svg viewBox="0 0 72 72">
            <circle class="ring-track" cx="36" cy="36" r="30" />
            <circle class="ring-fill" cx="36" cy="36" r="30" stroke-dasharray="${RING_CIRCUMFERENCE}" stroke-dashoffset="${offset}" />
          </svg>
          <span class="ring-pct">${a.score}%</span>
        </span>
        <span class="badge-name">${a.area_name}</span>
      </button>`;
    })
    .join('');
  bar.querySelectorAll('.area-badge').forEach((badge) => {
    badge.addEventListener('click', () => {
      setCollapsible('areas-toggle', 'areas', true);
      $('#areas-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderCriticalPending(el, criticalPending) {
  if (!criticalPending.length) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }
  el.style.display = 'inline-flex';
  const n = criticalPending.length;
  el.innerHTML = `
    <button type="button" class="crit-chip-btn">
      <span class="crit-icon" aria-hidden="true">⚠️</span>
      <span class="crit-count">${n}</span>
      <span class="crit-label">crítico${n === 1 ? '' : 's'}</span>
    </button>
    <div class="crit-popover" hidden>
      <ul>${criticalPending.map((p) => `<li><span class="cp-area">${p.area_name}:</span> ${p.name}</li>`).join('')}</ul>
    </div>
  `;
}

function initCriticalChip() {
  document.addEventListener('click', (e) => {
    const chip = $('#critical-pending');
    const popover = chip?.querySelector('.crit-popover');
    if (!chip || !popover) return;
    if (e.target.closest('.crit-chip-btn')) {
      popover.hidden = !popover.hidden;
      return;
    }
    if (!chip.contains(e.target)) popover.hidden = true;
  });
}

function renderSummary(summary) {
  $('#overall-score').textContent = summary.overall_score + '%';
  $('#areas').innerHTML = `<div class="collapsible-inner">${summary.areas
    .map(
      (a) => `
    <div class="area-bar-row">
      <span class="area-bar-label">${a.area_name}</span>
      <div class="area-bar-track"><div class="area-bar-fill" data-target="${a.score}" style="width:0%"></div></div>
      <span class="area-bar-value">${a.score}% (${a.done_items}/${a.total_items})</span>
    </div>
  `
    )
    .join('')}</div>`;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      $('#areas').querySelectorAll('.area-bar-fill').forEach((el) => {
        el.style.width = el.dataset.target + '%';
      });
    });
  });

  renderCriticalPending($('#critical-pending'), summary.critical_pending);

  const crossEl = $('#cross-check');
  if (summary.cross_check) {
    const { recibido, sobrante } = summary.cross_check;
    const vendidoImplicito = recibido - sobrante;
    crossEl.innerHTML = `
      <h2>Verificación cruzada — pollo (moto)</h2>
      <p>Recibido en la mañana: <strong>${recibido}</strong></p>
      <p>Sobrante al cierre: <strong>${sobrante}</strong></p>
      <p>Vendido implícito: <strong>${vendidoImplicito}</strong></p>
      <p class="hint">Compara este número contra el reporte de venta del día y, cuando esté conectado Poster, contra el detalle de venta real.</p>
    `;
    crossEl.style.display = 'block';
  } else {
    crossEl.style.display = 'none';
  }
}

function renderMovements(movements) {
  const titleEl = $('#movements-title');
  if (titleEl) titleEl.textContent = `Movimientos de inventario — hoy (${movements.length})`;

  const el = $('#movements');
  if (!movements.length) {
    el.innerHTML = '<div class="collapsible-inner"><p>Sin movimientos de inventario registrados hoy.</p></div>';
    return;
  }
  el.innerHTML = `
    <div class="collapsible-inner">
    <table>
      <thead><tr><th>Hora</th><th>Artículo</th><th>Tipo</th><th>Cantidad</th><th>Registró</th></tr></thead>
      <tbody>
        ${movements
          .map(
            (m) => `
          <tr>
            <td>${new Date(m.recorded_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${m.item_name}</td>
            <td>${m.movement_type}</td>
            <td>${m.quantity} ${m.unit}</td>
            <td>${m.recorded_by}</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    </div>
  `;
}

initGate();
