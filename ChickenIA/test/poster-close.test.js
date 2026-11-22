const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getClose } = require('../lib/poster-close');

test('reconciles the recorded shift in cents and omits deleted expenses', async () => {
  const read = async (method) => ({
    'finance.getCashShifts': [{ cash_shift_id: '321', spot_id: '1', date_end: '2026-01-02 04:01:54',
      amount_start: 0, amount_sell_cash: 140020, amount_sell_card: 25000, amount_end: 129985,
      amount_credit: 10000, amount_debit: 0, amount_collection: 0 }],
    'dash.getSpotsSales': { revenue: 1650.20, clients: 10 },
    'finance.getCashShiftTransactions': [
      { type: '3', comment: 'Insumos', tr_amount: 3000, delete: '0' },
      { type: '3', comment: 'Otras salidas', tr_amount: 7000, delete: '0' },
      { type: '3', comment: 'Eliminado', tr_amount: 50, delete: '1' },
    ],
  })[method];
  const result = await getClose('2026-01-01', read);
  assert.equal(result.average, 16502);
  assert.equal(result.shifts[0].expected, 130020);
  assert.equal(result.shifts[0].difference, -35);
  assert.equal(result.shifts[0].expenses.length, 2);
  assert.equal(result.shifts[0].expensesComplete, true);
});
