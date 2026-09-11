// js/supervision.js — Pantalla maestra de supervisión en tiempo real (Nancy).
// El supervisor NUNCA se autocalifica: aquí Nancy verifica lo que hizo cada área,
// no lo que reportan los empleados. Cada check queda con hora de servidor (checked_at).
const OPEN_AREAS_KEY = 'chickenia_open_areas';
const state = {
  locations: [],
  location: null,
  date: (()=>{const date=new URLSearchParams(location.search).get('date');return date&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date?date:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());})(),
  supervisor: localStorage.getItem('chickenia_supervisor') || '',
  areas: [],
  checksByActivity: {},
  openAreas: loadOpenAreas(),
  autoOpenApplied: false,
  employees: [],
  attendanceByEmployee: {},
};

const $ = (sel) => document.querySelector(sel);

// --- Acordeón por área: qué áreas quedan abiertas, persistido por dispositivo ---
function loadOpenAreas() {
  try {
    const raw = localStorage.getItem(OPEN_AREAS_KEY);
    return raw ? new Set(JSON.parse(raw)) : null; // null = todavía no hay preferencia guardada
  } catch (e) {
    return null;
  }
}
function saveOpenAreas() {
  try {
    localStorage.setItem(OPEN_AREAS_KEY, JSON.stringify(Array.from(state.openAreas)));
  } catch (e) {
    /* localStorage no disponible — no es crítico, seguimos sin persistir */
  }
}

function toggleArea(code, forceOpen) {
  const section = document.querySelector(`.area-block[data-area-code="${code}"]`);
  if (!section) return;
  const header = section.querySelector('.accordion-header');
  const body = section.querySelector('.accordion-body');
  const isOpen = forceOpen != null ? forceOpen : header.getAttribute('aria-expanded') !== 'true';
  header.setAttribute('aria-expanded', String(isOpen));
  body.inert = !isOpen;
  if(state.openAreas===null)state.openAreas=new Set();
  if (isOpen) state.openAreas.add(code);
  else state.openAreas.delete(code);
  saveOpenAreas();
}

function setAllAreas(open) {
  state.areas.forEach((a) => toggleArea(a.code, open));
  closeCornerMenu();
}

// --- Modo oscuro ---
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
  $('#menu-expand-all')?.addEventListener('click', () => setAllAreas(true));
  $('#menu-collapse-all')?.addEventListener('click', () => setAllAreas(false));
  $('#menu-dark-toggle')?.addEventListener('click', toggleTheme);
}
function closeCornerMenu() {
  const btn = $('#corner-menu-btn');
  const panel = $('#corner-menu-panel');
  if (!panel || !panel.classList.contains('open')) return;
  panel.classList.remove('open');
  panel.inert = true;
  btn?.setAttribute('aria-expanded', 'false');
}

async function api(path, opts) {
  const res = await fetch('/api/' + path, opts);
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

  $('#supervisor-input').value = state.supervisor;
  $('#date-input').value = state.date;

  $('#supervisor-input').addEventListener('change', (e) => {
    state.supervisor = e.target.value.trim();
    localStorage.setItem('chickenia_supervisor', state.supervisor);
  });
  $('#date-input').addEventListener('change', (e) => {
    state.date = e.target.value;
    loadChecklist();
    loadAttendance();
  });
  $('#attendance-toggle')?.addEventListener('click', () => {
    const header = $('#attendance-toggle');
    header.setAttribute('aria-expanded', String(header.getAttribute('aria-expanded') !== 'true'));
  });

  try {
    state.locations = await api('locations');
  } catch (err) {
    $('#checklist').innerHTML = `<p class="loading">No se pudo conectar con la base de datos: ${err.message}</p>`;
    return;
  }

  // Por ahora solo operamos Jojutla Mercado — Moto queda escondida por completo (no solo deshabilitada).
  state.location = state.locations.find((l) => l.type === 'tienda') || state.locations[0];
  if (state.location) {
    loadChecklist();
    loadAttendance();
  }
}

// --- Asistencia: entrada / comida-salida / comida-regreso / salida por empleado ---
const ATT_EVENTS = [
  { key: 'entrada', label: 'Entrada' },
  { key: 'comida_salida', label: 'Comida ↓' },
  { key: 'comida_regreso', label: 'Comida ↑' },
  { key: 'salida', label: 'Salida' },
];

function formatTime(iso) {
  return iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—';
}

async function loadAttendance() {
  if (!state.location) return;
  const listEl = $('#attendance-list');
  listEl.innerHTML = '<p class="loading">Cargando...</p>';
  try {
    const [employees, attendance] = await Promise.all([
      api('employees'),
      api(`attendance?location_id=${state.location.id}&date=${state.date}`),
    ]);
    state.employees = employees;
    state.attendanceByEmployee = Object.fromEntries(attendance.map((a) => [a.employee_id, a]));
    renderAttendance();
  } catch (err) {
    listEl.innerHTML = `<p class="loading">No se pudo cargar asistencia: ${err.message}</p>`;
  }
}

function renderAttendance() {
  const listEl = $('#attendance-list');
  if (!state.employees.length) {
    listEl.innerHTML = '<p>No hay empleados configurados.</p>';
    return;
  }
  listEl.innerHTML = state.employees
    .map((emp) => {
      const a = state.attendanceByEmployee[emp.id] || {};
      const buttons = ATT_EVENTS.map((ev) => {
        const t = a[ev.key];
        return `<button type="button" class="att-btn ${t ? 'done' : ''}" data-employee-id="${emp.id}" data-event="${ev.key}" ${t ? 'disabled' : ''}>
          ${ev.label}<span class="att-time">${formatTime(t)}</span>
        </button>`;
      }).join('');
      let lunchMins = '';
      if (a.comida_salida && a.comida_regreso) {
        const mins = Math.round((new Date(a.comida_regreso) - new Date(a.comida_salida)) / 60000);
        lunchMins = `<span class="att-lunch-mins">${mins} min de comida</span>`;
      }
      return `<div class="attendance-row" data-employee-id="${emp.id}">
        <span class="att-name">${emp.name}</span>
        <div class="att-buttons">${buttons}</div>
        ${lunchMins}
      </div>`;
    })
    .join('');

  listEl.querySelectorAll('.att-btn:not(.done)').forEach((btn) => {
    btn.addEventListener('click', () => punchAttendance(btn));
  });

  const meta = $('#attendance-meta');
  if (meta) {
    const done = Object.values(state.attendanceByEmployee).filter((a) => a.salida).length;
    meta.textContent = `${done}/${state.employees.length} completos`;
  }
}

async function punchAttendance(btn) {
  if (!state.supervisor) {
    alert('Escribe tu nombre en "Supervisor" antes de registrar.');
    $('#supervisor-input').focus();
    return;
  }
  const employeeId = Number(btn.dataset.employeeId);
  const event = btn.dataset.event;
  const emp = state.employees.find((e) => e.id === employeeId);
  const evLabel = ATT_EVENTS.find((e) => e.key === event)?.label || event;
  if (!confirm(`¿Registrar "${evLabel}" para ${emp ? emp.name : ''} ahora?`)) return;

  try {
    const saved = await api('attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_id: employeeId,
        location_id: state.location.id,
        check_date: state.date,
        event,
        checked_by: state.supervisor,
      }),
    });
    state.attendanceByEmployee[employeeId] = saved;
    renderAttendance();
  } catch (err) {
    alert('No se pudo registrar: ' + err.message);
  }
}

function renderSkeleton() {
  const block = (rows) =>
    `<div class="skeleton-block">${Array.from({ length: rows })
      .map((_, i) => `<div class="skeleton-row" style="width:${i === 0 ? '40%' : '90%'}"></div>`)
      .join('')}</div>`;
  return block(3) + block(2) + block(2);
}

async function loadChecklist() {
  if (!state.location) return;
  $('#checklist').innerHTML = renderSkeleton();
  const [areas, checks] = await Promise.all([
    api(`areas?location_type=${state.location.type}&date=${state.date}`),
    api(`checks?location_id=${state.location.id}&date=${state.date}`),
  ]);
  state.areas = areas;
  state.checksByActivity = Object.fromEntries(checks.map((c) => [c.activity_id, c]));
  render();
  AreaNavigation.mount(document.body, selectOperationalArea);
  refreshSummary();
}

function render() {
  const html = state.areas
    .map((area) => {
      const isOpen = state.openAreas ? state.openAreas.has(area.code) : false;
      return `
    <section class="area-block" data-area-code="${area.code}">
      <button type="button" class="accordion-header" aria-expanded="${isOpen}">
        <span class="acc-title"><span class="acc-chevron">▸</span><span class="acc-name">${area.name}</span></span>
        <span class="acc-meta" id="area-score-${area.code}"></span>
      </button>
      <div class="accordion-body" ${isOpen ? '' : 'inert'}>
        <div class="collapsible-inner">
          ${renderRoutineActivities(area.activities)}
        </div>
      </div>
    </section>
  `;
    })
    .join('');
  $('#checklist').innerHTML = html || '<p>No hay actividades configuradas para esta ubicación.</p>';

  document.querySelectorAll('.accordion-header').forEach((header) => {
    header.addEventListener('click', () => {
      const code = header.closest('.area-block').dataset.areaCode;
      toggleArea(code);
    });
  });

  state.areas.forEach((area) => {
    area.activities.forEach((act) => attachHandlers(act));
  });
}

function selectOperationalArea(code) {
  document.querySelector('.attendance-wrap').hidden = !['general','supervision'].includes(code);
  document.querySelectorAll('#checklist .area-block').forEach(section => {
    section.hidden = code !== 'general' && section.dataset.areaCode !== code;
    if (code !== 'general' && section.dataset.areaCode === code) {
      const header=section.querySelector('.accordion-header');
      if(header.getAttribute('aria-expanded')!=='true') header.click();
    }
  });
  document.getElementById('area-empty')?.remove();
  if(code !== 'general' && !state.areas.some(a=>a.code===code)) {
    document.getElementById('checklist').insertAdjacentHTML('beforeend','<p class="area-empty" id="area-empty">Esta área todavía no tiene actividades cargadas. Su inventario está disponible en la vista Inventario.</p>');
  }
}

function renderRoutineActivities(activities) {
  const labels = { apertura: 'Rutina de apertura', operacion: 'Operación durante el día', cierre: 'Rutina de cierre' };
  let previous;
  return activities.map(act => {
    const heading = act.routine_block && act.routine_block !== previous
      ? `<h3 class="routine-heading">${labels[act.routine_block] || 'Actividades'}</h3>` : '';
    previous = act.routine_block;
    return heading + renderActivity(act);
  }).join('');
}

function renderActivity(act) {
  const c = state.checksByActivity[act.id] || {};
  const doneClass = c.done ? 'done' : '';
  const savedTag = c.checked_at
    ? `<span class="saved-tag">Guardado ${new Date(c.checked_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} — ${c.checked_by || ''}</span>`
    : '';
  // Campo de cantidad — solo para actividades marcadas requires_quantity (el catálogo
  // ya trae esto en 26 actividades de tienda + 10 de moto; la pantalla no lo dibujaba
  // hasta ahora). El placeholder muestra la meta del indicador cuando existe (marco de
  // 11 tipos, piloto en Freidoras) y si no, cae a la unidad — "Etapa 1": se captura el
  // valor, no se valida ni se colorea todavía contra la meta (eso es Etapa 2, aparte).
  const qtyField = act.requires_quantity
    ? `<input type="number" step="${act.unit === 'kg' ? '0.001' : '0.01'}" inputmode="decimal" class="qty"
         placeholder="${act.target ? 'meta: ' + escapeAttr(act.target) : (act.unit || 'cantidad')}"
         value="${c.quantity ?? ''}" />
       ${act.unit ? `<span class="qty-unit">${act.unit}</span>` : ''}`
    : '';
  return `
    <div class="activity-row ${doneClass}" data-activity-id="${act.id}">
      <label class="check-label">
        <input type="checkbox" class="chk" ${c.done ? 'checked' : ''} />
        <span>${act.name}${act.routine_block && act.target ? `<small class="activity-criterion">${act.target}</small>` : ''}</span>
      </label>
      <div class="activity-extra">
        ${qtyField}
        <input type="text" class="notes" placeholder="observaciones" value="${c.notes ?? ''}" />
        ${savedTag}
      </div>
    </div>
  `;
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

function attachHandlers(act) {
  const row = document.querySelector(`.activity-row[data-activity-id="${act.id}"]`);
  if (!row) return;
  const chk = row.querySelector('.chk');
  const notes = row.querySelector('.notes');
  const qty = row.querySelector('.qty');

  chk.addEventListener('change', () => saveCheck(act, row));
  notes.addEventListener('change', () => saveCheck(act, row));
  qty?.addEventListener('change', () => saveCheck(act, row));
}

async function saveCheck(act, row) {
  if (!state.supervisor) {
    alert('Escribe tu nombre en "Supervisor" antes de registrar.');
    $('#supervisor-input').focus();
    return;
  }
  const chk = row.querySelector('.chk');
  const notes = row.querySelector('.notes');
  const qty = row.querySelector('.qty');

  const payload = {
    activity_id: act.id,
    location_id: state.location.id,
    check_date: state.date,
    done: chk.checked,
    quantity: qty && qty.value !== '' ? Number(qty.value) : null,
    notes: notes.value || null,
    checked_by: state.supervisor,
  };

  try {
    const saved = await api('checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    ChickenFeedback.saved('Actividad guardada ✓');
    state.checksByActivity[act.id] = saved;
    row.classList.toggle('done', saved.done);
    row.classList.remove('just-saved');
    void row.offsetWidth;
    row.classList.add('just-saved');
    refreshSummary();
  } catch (err) {
    alert('No se pudo guardar: ' + err.message);
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
      const code = badge.dataset.jump;
      toggleArea(code, true);
      document.querySelector(`.area-block[data-area-code="${code}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

function applyAutoOpenDefaults(summary) {
  // Primera carga sin preferencia guardada: abrimos solo las áreas con algo crítico
  // pendiente, para que nunca queden escondidas. Si no hay ninguna, todo queda cerrado.
  if (state.autoOpenApplied) return;
  state.autoOpenApplied = true;
  if (state.openAreas !== null) return; // el usuario ya tiene su propia preferencia guardada
  state.openAreas = new Set();
  const criticalAreaNames = new Set(summary.critical_pending.map((p) => p.area_name));
  summary.areas.forEach((a) => {
    if (criticalAreaNames.has(a.area_name)) toggleArea(a.area_code, true);
  });
}

async function refreshSummary() {
  if (!state.location) return;
  try {
    const summary = await api(`summary?location_id=${state.location.id}&date=${state.date}`);
    ChickenFeedback.summary(summary);
    $('#overall-score').textContent = summary.overall_score + '%';
    summary.areas.forEach((a) => {
      const el = document.getElementById(`area-score-${a.area_code}`);
      if (el) {
        el.textContent = `${a.score}% (${a.done_items}/${a.total_items})`;
        const hasCritical = summary.critical_pending.some((p) => p.area_name === a.area_name);
        el.classList.toggle('has-critical', hasCritical);
      }
    });
    renderStatusBar(summary);
    applyAutoOpenDefaults(summary);
    renderCriticalPending($('#critical-pending'), summary.critical_pending);
  } catch (err) {
    console.error(err);
  }
}

init();
