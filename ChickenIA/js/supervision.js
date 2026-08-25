// js/supervision.js — Pantalla maestra de supervisión en tiempo real (Nancy).
// El supervisor NUNCA se autocalifica: aquí Nancy verifica lo que hizo cada área,
// no lo que reportan los empleados. Cada check queda con hora de servidor (checked_at).
const state = {
  locations: [],
  location: null,
  date: new Date().toISOString().slice(0, 10),
  supervisor: localStorage.getItem('chickenia_supervisor') || '',
  areas: [],
  checksByActivity: {},
};

const $ = (sel) => document.querySelector(sel);

async function api(path, opts) {
  const res = await fetch('/api/' + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Error de red');
  }
  return res.json();
}

async function init() {
  $('#supervisor-input').value = state.supervisor;
  $('#date-input').value = state.date;

  $('#supervisor-input').addEventListener('change', (e) => {
    state.supervisor = e.target.value.trim();
    localStorage.setItem('chickenia_supervisor', state.supervisor);
  });
  $('#date-input').addEventListener('change', (e) => {
    state.date = e.target.value;
    loadChecklist();
  });
  $('#location-select').addEventListener('change', (e) => {
    state.location = state.locations.find((l) => String(l.id) === e.target.value);
    loadChecklist();
  });

  try {
    state.locations = await api('locations');
  } catch (err) {
    $('#checklist').innerHTML = `<p class="loading">No se pudo conectar con la base de datos: ${err.message}</p>`;
    return;
  }

  const sel = $('#location-select');
  sel.innerHTML = state.locations.map((l) => `<option value="${l.id}">${l.name}</option>`).join('');
  state.location = state.locations[0];
  if (state.location) {
    sel.value = state.location.id;
    loadChecklist();
  }
}

async function loadChecklist() {
  if (!state.location) return;
  $('#checklist').innerHTML = '<p class="loading">Cargando...</p>';
  const [areas, checks] = await Promise.all([
    api(`areas?location_type=${state.location.type}`),
    api(`checks?location_id=${state.location.id}&date=${state.date}`),
  ]);
  state.areas = areas;
  state.checksByActivity = Object.fromEntries(checks.map((c) => [c.activity_id, c]));
  render();
  refreshSummary();
}

function render() {
  const html = state.areas
    .map(
      (area) => `
    <section class="area-block">
      <h3>${area.name}</h3>
      <div class="area-score" id="area-score-${area.code}"></div>
      ${area.activities.map((act) => renderActivity(act)).join('')}
    </section>
  `
    )
    .join('');
  $('#checklist').innerHTML = html || '<p>No hay actividades configuradas para esta ubicación.</p>';

  state.areas.forEach((area) => {
    area.activities.forEach((act) => attachHandlers(act));
  });
}

function renderActivity(act) {
  const c = state.checksByActivity[act.id] || {};
  const critClass = `crit-${act.criticality}`;
  const doneClass = c.done ? 'done' : '';
  const savedTag = c.checked_at
    ? `<span class="saved-tag">Guardado ${new Date(c.checked_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} — ${c.checked_by || ''}</span>`
    : '';
  return `
    <div class="activity-row ${critClass} ${doneClass}" data-activity-id="${act.id}">
      <label class="check-label">
        <input type="checkbox" class="chk" ${c.done ? 'checked' : ''} />
        <span>${act.name}</span>
        <span class="crit-badge">${act.criticality}</span>
      </label>
      <div class="activity-extra">
        ${act.requires_quantity ? `<input type="number" class="qty" placeholder="${act.unit || 'cantidad'}" value="${c.quantity ?? ''}" />` : ''}
        <input type="number" class="quality" min="0" max="100" placeholder="calidad %" value="${c.quality_score ?? ''}" />
        <input type="text" class="notes" placeholder="observaciones" value="${c.notes ?? ''}" />
        ${savedTag}
      </div>
    </div>
  `;
}

function attachHandlers(act) {
  const row = document.querySelector(`.activity-row[data-activity-id="${act.id}"]`);
  if (!row) return;
  const chk = row.querySelector('.chk');
  const qty = row.querySelector('.qty');
  const quality = row.querySelector('.quality');
  const notes = row.querySelector('.notes');

  chk.addEventListener('change', () => saveCheck(act, row));
  if (qty) qty.addEventListener('change', () => saveCheck(act, row));
  quality.addEventListener('change', () => saveCheck(act, row));
  notes.addEventListener('change', () => saveCheck(act, row));
}

async function saveCheck(act, row) {
  if (!state.supervisor) {
    alert('Escribe tu nombre en "Supervisor" antes de registrar.');
    $('#supervisor-input').focus();
    return;
  }
  const chk = row.querySelector('.chk');
  const qty = row.querySelector('.qty');
  const quality = row.querySelector('.quality');
  const notes = row.querySelector('.notes');

  const payload = {
    activity_id: act.id,
    location_id: state.location.id,
    check_date: state.date,
    done: chk.checked,
    quantity: qty ? (qty.value === '' ? null : Number(qty.value)) : null,
    quality_score: quality.value === '' ? null : Number(quality.value),
    notes: notes.value || null,
    checked_by: state.supervisor,
  };

  try {
    const saved = await api('checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    state.checksByActivity[act.id] = saved;
    row.classList.toggle('done', saved.done);
    refreshSummary();
  } catch (err) {
    alert('No se pudo guardar: ' + err.message);
  }
}

async function refreshSummary() {
  if (!state.location) return;
  try {
    const summary = await api(`summary?location_id=${state.location.id}&date=${state.date}`);
    $('#overall-score').textContent = summary.overall_score + '%';
    summary.areas.forEach((a) => {
      const el = document.getElementById(`area-score-${a.area_code}`);
      if (el) el.textContent = `${a.score}% (${a.done_items}/${a.total_items})`;
    });
    const pendingEl = $('#critical-pending');
    if (summary.critical_pending.length) {
      pendingEl.innerHTML = '⚠️ Pendientes críticos: ' + summary.critical_pending.map((p) => `${p.area_name}: ${p.name}`).join(' · ');
      pendingEl.style.display = 'block';
    } else {
      pendingEl.style.display = 'none';
    }
  } catch (err) {
    console.error(err);
  }
}

init();
