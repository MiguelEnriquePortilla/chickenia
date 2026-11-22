'use strict';

const { InventoryError } = require('./inventory-domain');

function cents(value) {
  const amount = /^-?\d+$/.test(String(value)) ? Number(value) : NaN;
  if (!Number.isSafeInteger(amount)) throw new Error('Invalid Poster amount');
  return amount;
}

async function posterRead(method, parameters) {
  const token = process.env.CHICKENIA_POSTER_TOKEN || process.env.POSTER_TOKEN;
  if (!token) throw new InventoryError('La consulta de Poster aún no está configurada.', 503);
  const url = new URL('https://joinposter.com/api/' + method);
  url.search = new URLSearchParams({ ...parameters, token });
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('Poster request failed');
  const body = await response.json();
  if (body.error || body.response == null) throw new Error('Poster response unavailable');
  return body.response;
}

async function getClose(date, read = posterRead) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
    throw new InventoryError('Selecciona una fecha válida.', 400);
  }
  const day = date.replaceAll('-', '');
  const dates = { dateFrom: day, dateTo: day };
  const shifts = (await read('finance.getCashShifts', dates)).filter(shift => String(shift.spot_id) === '1');
  const closed = shifts.filter(shift => /^\d{4}-\d{2}-\d{2} /.test(shift.date_end) && !shift.date_end.startsWith('0000'));
  if (!closed.length) return { date, pending: shifts.length > 0, shifts: [] };

  const [sales, ...reports] = await Promise.all([
    read('dash.getSpotsSales', dates),
    ...closed.map(async shift => {
      const id = String(shift.cash_shift_id);
      if (!/^\d+$/.test(id)) throw new Error('Invalid Poster shift');
      const cash = cents(shift.amount_sell_cash);
      const card = cents(shift.amount_sell_card);
      const initial = cents(shift.amount_start);
      const final = cents(shift.amount_end);
      const outgoing = cents(shift.amount_credit);
      const incoming = cents(shift.amount_debit);
      const collections = cents(shift.amount_collection);
      const movements = await read('finance.getCashShiftTransactions', { shift_id: id });
      const expenses = movements
        .filter(row => String(row.type) === '3' && String(row.delete) === '0' && (!row.shift_id || String(row.shift_id) === id))
        .map(row => ({ concept: String(row.comment ?? '').trim().slice(0, 300) || 'Salida sin concepto', amount: cents(row.tr_amount) }));
      const expected = initial + cash + incoming - outgoing - collections;
      return {
        id, cash, card, initial, final, outgoing, incoming, collections, expected, difference: final - expected,
        expenses, expensesComplete: expenses.reduce((sum, row) => sum + row.amount, 0) === outgoing,
      };
    }),
  ]);
  if (!Number.isSafeInteger(sales.clients) || sales.clients < 0 || !Number.isFinite(sales.revenue)) {
    throw new Error('Invalid Poster sales report');
  }
  return {
    date, pending: shifts.length > closed.length, shifts: reports,
    average: sales.clients ? Math.round(100 * sales.revenue / sales.clients) : null,
    tickets: sales.clients, revenue: Math.round(sales.revenue * 100),
  };
}

module.exports = { getClose };
