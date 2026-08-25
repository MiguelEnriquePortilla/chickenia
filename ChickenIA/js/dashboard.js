// js/dashboard.js — Dashboard de supervisión para Miguel y Lilian (única vista con acceso).
const $ = (sel) => document.querySelector(sel);
const state = {
  locations: [],
  location: null,
  date: new Date().toISOString().slice(0, 10),
};

async function api(path) {
  const res = await fetch('/api/' + path);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Error de red');
  }
  return res.json();
}

async function init() {
  $('#date-input').value = state.date;
  $('#date-input').addEventListener('change', (e) => {
    state.date = e.target.value;
    load();
  });
  $('#location-select').addEventListener('change', (e) => {
    state.location = state.locations.find((l) => String(l.id) === e.target.value);
    load();
  });

  try {
    state.locations = await api('locations');
  } catch (err) {
    $('#areas').innerHTML = `<p class="loading">No se pudo conectar con la base de datos: ${err.message}</p>`;
    return;
  }

  const sel = $('#location-select');
  sel.innerHTML = state.locations.map((l) => `<option value="${l.id}">${l.name}</option>`).join('');
  state.location = state.locations[0];
  if (state.location) {
    sel.value = state.location.id;
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
    renderSummary(summary);
    renderMovements(movements);
  } catch (err) {
    console.error(err);
  }
}

function renderSummary(summary) {
  $('#overall-score').textContent = summary.overall_score + '%';
  $('#areas').innerHTML = summary.areas
    .map(
      (a) => `
    <div class="area-bar-row">
      <span class="area-bar-label">${a.area_name}</span>
      <div class="area-bar-track"><div class="area-bar-fill" style="width:${a.score}%"></div></div>
      <span class="area-bar-value">${a.score}% (${a.done_items}/${a.total_items})</span>
    </div>
  `
    )
    .join('');

  const pendingEl = $('#critical-pending');
  if (summary.critical_pending.length) {
    pendingEl.innerHTML =
      '<strong>⚠️ Pendientes críticos:</strong> ' + summary.critical_pending.map((p) => `${p.area_name}: ${p.name}`).join(' · ');
    pendingEl.style.display = 'block';
  } else {
    pendingEl.style.display = 'none';
  }

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
  const el = $('#movements');
  if (!movements.length) {
    el.innerHTML = '<p>Sin movimientos de inventario registrados hoy.</p>';
    return;
  }
  el.innerHTML = `
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
  `;
}

init();
