(() => {
  const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const money = value => value == null ? 'Sin datos' : pesos.format(value / 100);
  const dateLabel = date => new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(date));
  const difference = value => value === 0 ? 'Caja cuadrada' : money(Math.abs(value)) + (value > 0 ? ' de sobrante' : ' de faltante');

  function sections(shift) {
    return [
      ['Ventas y saldo', [
        ['Ventas en efectivo', money(shift.cash)],
        ['Ventas con tarjeta', money(shift.card)],
        ['Saldo final registrado', money(shift.final)],
      ]],
      ['Salidas de efectivo', [
        ...shift.expenses.map(row => [row.concept, money(row.amount)]),
        ['Total registrado', money(shift.outgoing)],
        ...(!shift.expensesComplete ? [['Detalle de salidas incompleto en Poster', '']] : []),
      ]],
      ['Conciliación', [
        ...(shift.initial ? [['Fondo inicial', money(shift.initial)]] : []),
        ...(shift.incoming ? [['Entradas de caja', money(shift.incoming)]] : []),
        ...(shift.collections ? [['Retiros de caja', money(shift.collections)]] : []),
        ['Efectivo esperado', money(shift.expected)],
        ['Diferencia', difference(shift.difference)],
      ]],
    ];
  }

  function canvasImage(report, shift) {
    const groups = sections(shift);
    const width = 850;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    const context = canvas.getContext('2d');
    const font = (size, weight = 500) => weight + ' ' + size + 'px system-ui';
    function wrap(text, maxWidth) {
      const lines = [''];
      for (const character of text) {
        const last = lines.length - 1;
        if (context.measureText(lines[last] + character).width > maxWidth) lines.push(character);
        else lines[last] += character;
      }
      return lines;
    }
    context.font = font(25);
    const rows = groups.map(([label, values]) => [label, values.map(([name, value]) => ({
      lines: wrap(name, value ? 416 : 754), value,
    }))]);
    canvas.height = 372 + rows.reduce((height, [, values]) =>
      height + 62 + values.reduce((sum, row) => sum + row.lines.length * 33 + 13, 0), 0);
    function text(value, x, y, size, color, weight, align = 'left') {
      context.font = font(size, weight);
      context.textAlign = align;
      context.fillStyle = color;
      context.fillText(value, x, y);
    }
    context.fillStyle = '#fffaf0';
    context.fillRect(0, 0, width, canvas.height);
    context.fillStyle = '#17213e';
    context.fillRect(0, 0, width, 272);
    text('Chicken Chicanito', 48, 52, 24, '#ffcf73', 700);
    text('Cierre de caja', 48, 112, 53, '#ffffff', 750);
    text(dateLabel(report.date) + '  ·  Turno #' + shift.id, 48, 158, 24, '#ffffff');
    text('Ticket promedio del día', 48, 211, 25, '#ffffff');
    text(money(report.average), 802, 214, 32, '#ffcf73', 750, 'right');
    text(money(report.revenue) + ' en ventas del día  ·  ' + report.tickets + ' tickets', 48, 249, 22, '#ffffff');
    const total = Math.max(shift.cash, 0) + Math.max(shift.card, 0);
    const cashWidth = total ? 754 * Math.max(shift.cash, 0) / total : 0;
    context.fillStyle = total ? '#e9a935' : '#d9d4c8';
    context.fillRect(48, 301, 754, 15);
    context.fillStyle = '#b62238';
    context.fillRect(48, 301, cashWidth, 15);
    let y = 336;
    for (const [label, values] of rows) {
      text(label, 48, y + 31, 29, '#17213e', 750);
      y += 61;
      for (const row of values) {
        row.lines.forEach((line, index) => text(line, 48, y + index * 33, 25, '#17213e'));
        text(row.value, 802, y, 25, '#17213e', 700, 'right');
        y += row.lines.length * 33 + 13;
      }
    }
    text('Fuente  ·  Poster  /  MXN', 48, canvas.height - 20, 18, '#52586b');
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  function element(tag, value, className) {
    const node = document.createElement(tag);
    if (value) node.textContent = value;
    if (className) node.className = className;
    return node;
  }

  function render(report, shift, current) {
    const card = element('article', '', 'poster-close-card');
    const title = element('h3', 'Turno #' + shift.id);
    const average = element('p', 'Ticket promedio del día ' + money(report.average), 'poster-close-average');
    const chart = element('div', '', 'poster-close-chart');
    chart.setAttribute('aria-hidden', 'true');
    const cash = Math.max(shift.cash, 0);
    const total = cash + Math.max(shift.card, 0);
    chart.style.setProperty('--poster-cash', total ? (cash / total * 100) + '%' : '0%');
    if (!total) chart.hidden = true;
    const legend = element('p', 'Efectivo · Tarjeta', 'poster-close-legend');
    if (!total) legend.hidden = true;
    const actions = element('div', '', 'poster-close-actions');
    const share = element('button', 'Compartir imagen');
    const download = element('button', 'Descargar PNG');
    const status = element('p');
    status.setAttribute('role', 'status');
    share.type = download.type = 'button';
    share.hidden = true;
    download.disabled = true;
    actions.append(share, download);
    card.append(title, average, element('p', money(report.revenue) + ' en ventas del día · ' + report.tickets + ' tickets'), chart, legend);
    for (const [label, rows] of sections(shift)) {
      const list = element('dl');
      for (const [key, value] of rows) list.append(element('dt', key), element('dd', value));
      card.append(element('h4', label), list);
    }
    card.append(actions, status);

    canvasImage(report, shift).then(blob => {
      if (!current()) return;
      if (!blob) throw new Error('Image unavailable');
      const filename = 'cierre-' + report.date + '-turno-' + shift.id + '.png';
      const file = new File([blob], filename, { type: 'image/png' });
      const payload = { files: [file] };
      const canShare = navigator.canShare?.(payload) && Boolean(navigator.share);
      share.hidden = !canShare;
      download.disabled = false;
      download.addEventListener('click', () => {
        const url = URL.createObjectURL(blob);
        const link = element('a');
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      });
      share.addEventListener('click', async () => {
        try { await navigator.share(payload); }
        catch (error) {
          if (error.name !== 'AbortError') status.textContent = 'Descarga el PNG para adjuntarlo en WhatsApp.';
        }
      });
    }).catch(() => {
      if (current()) status.textContent = 'No se pudo generar la imagen del cierre.';
    });
    return card;
  }

  window.initPosterClose = function (dateInput) {
    const panel = document.querySelector('#resumen-cierre');
    const host = panel.querySelector('.poster-close-body');
    let version = 0;
    async function load() {
      const id = ++version;
      const current = () => id === version;
      const date = dateInput.value;
      host.replaceChildren();
      if (!date) return;
      host.append(element('p', 'Consultando el cierre en Poster…'));
      try {
        const response = await fetch('/api/inventory?action=poster-close&date=' + encodeURIComponent(date), { cache: 'no-store' });
        const report = await response.json();
        if (!response.ok) throw new Error(report.error || 'No se pudo consultar el cierre.');
        if (!current()) return;
        host.replaceChildren(element('p', dateLabel(report.date), 'poster-close-date'));
        if (report.pending) host.append(element('p', 'Hay un turno pendiente de cierre.'));
        if (!report.shifts.length && !report.pending) host.append(element('p', 'Poster no devolvió turnos cerrados para esta fecha.'));
        for (const shift of report.shifts) host.append(render(report, shift, current));
      } catch (error) {
        if (current()) host.replaceChildren(element('p', error.message));
      }
    }
    panel.hidden = false;
    panel.addEventListener('toggle', () => { if (panel.open) load(); });
    dateInput.addEventListener('change', () => { if (panel.open) load(); });
    if (panel.open) load();
  };
})();
