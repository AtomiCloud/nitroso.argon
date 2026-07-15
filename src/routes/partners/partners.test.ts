import { describe, expect, it } from 'vitest';
import type { UserPartnerPnlRowRes } from '$lib/api/core/data-contracts';
import {
  LIST_BOOST_PRICE,
  LIST_TICKET_PRICE,
  monthSortKey,
  partnerAverageTicketPaid,
  partnerBoostListGap,
  partnerBoostListValue,
  partnerPaidTotal,
  partnerPnlTotals,
  partnerPnlZeroFill,
  partnerStreetValue,
  partnerTheyProfitEst,
  partnerTicketMarginAtList,
  partnerTopUpOwed,
  partnerWeEarned,
  toPartnerPnlRow,
} from './partners';

function row(over: Partial<UserPartnerPnlRowRes>): UserPartnerPnlRowRes {
  return {
    month: '07-2026',
    bookings: 0,
    collected: 0,
    ktmbCost: 0,
    deposits: 0,
    withdrawalGross: 0,
    withdrawalFeeIncome: 0,
    boostCount: 0,
    boostAmount: 0,
    distinctPassengers: 0,
    ...over,
  };
}

describe('monthSortKey', () => {
  it('turns MM-yyyy into a sortable yyyyMM key', () => {
    expect(monthSortKey('07-2026')).toBe('202607');
    expect(monthSortKey('12-2025')).toBe('202512');
    expect(monthSortKey('01-2026') > monthSortKey('12-2025')).toBe(true);
  });

  it('returns "" for malformed months', () => {
    expect(monthSortKey('2026-07')).toBe('');
    expect(monthSortKey('')).toBe('');
    expect(monthSortKey('garbage')).toBe('');
  });

  it('rejects out-of-range months (defensive: 13-2026 must not produce a sort key)', () => {
    // structurally matches the regex but is semantically wrong — would
    // otherwise produce a nonsense key and let partnerPnlZeroFill's cursor
    // math loop forever on the from-key comparison
    expect(monthSortKey('13-2026')).toBe('');
    expect(monthSortKey('00-2026')).toBe('');
    expect(monthSortKey('99-2026')).toBe('');
  });
});

describe('partner arbitrage helpers', () => {
  it('names the public ticket and boost list prices as S$10', () => {
    expect(LIST_TICKET_PRICE).toBe(10);
    expect(LIST_BOOST_PRICE).toBe(10);
  });

  it('computes average ticket price paid and guards divide-by-zero', () => {
    expect(partnerAverageTicketPaid(4, 100)).toBe(25);
    expect(partnerAverageTicketPaid(0, 100)).toBe(0);
    expect(partnerAverageTicketPaid(0, 0)).toBe(0);
  });

  it('computes ticket margin at list without clamping and guards zero tickets', () => {
    expect(partnerTicketMarginAtList(4, 24)).toBe(16);
    expect(partnerTicketMarginAtList(4, 48)).toBe(-8);
    expect(partnerTicketMarginAtList(0, 0)).toBe(0);
  });

  it('values consumed boosts at list and exposes the gap versus paid', () => {
    expect(partnerBoostListValue(4)).toBe(40);
    expect(partnerBoostListGap(4, 0)).toBe(40);
    expect(partnerBoostListGap(4, 15)).toBe(25);
    expect(partnerBoostListGap(4, 45)).toBe(-5);
  });
});

describe('partner settlement helpers', () => {
  const settlement = row({
    bookings: 6,
    collected: 42,
    boostCount: 2,
    boostAmount: 10,
    ktmbCost: 30,
  });

  it('combines ticket and boost payments and computes street value from named list prices', () => {
    expect(partnerPaidTotal(settlement)).toBe(52);
    expect(partnerStreetValue(settlement)).toBe(80);
  });

  it('computes what we earned, their estimated profit, and the 50/50 top-up', () => {
    expect(partnerWeEarned(settlement)).toBe(22);
    expect(partnerTheyProfitEst(settlement)).toBe(28);
    expect(partnerTopUpOwed(settlement)).toBe(3);
  });

  it('floors the top-up at zero when we are already at or above our half', () => {
    const weAreAhead = row({ bookings: 10, collected: 90, ktmbCost: 10 });
    expect(partnerWeEarned(weAreAhead)).toBe(80);
    expect(partnerTheyProfitEst(weAreAhead)).toBe(10);
    expect(partnerTopUpOwed(weAreAhead)).toBe(0);
  });

  it('does not clamp their estimated profit when they paid above street value', () => {
    const aboveList = row({ bookings: 1, collected: 12 });
    expect(partnerStreetValue(aboveList)).toBe(10);
    expect(partnerTheyProfitEst(aboveList)).toBe(-2);
    expect(partnerTopUpOwed(aboveList)).toBe(0);
  });

  it('keeps an exactly balanced settlement at zero', () => {
    const balanced = row({ bookings: 10, collected: 80, ktmbCost: 60 });
    expect(partnerWeEarned(balanced)).toBe(20);
    expect(partnerTheyProfitEst(balanced)).toBe(20);
    expect(partnerTopUpOwed(balanced)).toBe(0);
  });
});

describe('toPartnerPnlRow', () => {
  it('shapes zinc payload into the UI row with settlement values derived', () => {
    const r = toPartnerPnlRow(
      row({
        month: '07-2026',
        bookings: 12,
        collected: 1000,
        ktmbCost: 200,
        deposits: 500,
        withdrawalGross: 100,
        withdrawalFeeIncome: 10,
      }),
    );
    expect(r.month).toBe('07-2026');
    expect(r.bookings).toBe(12);
    expect(r.averageTicketPaid).toBeCloseTo(1000 / 12, 5);
    expect(r.ticketMarginAtList).toBe(-880);
    expect(r.collected).toBe(1000);
    expect(r.paidTotal).toBe(1000);
    expect(r.ktmbCost).toBe(200);
    expect(r.streetValue).toBe(120);
    expect(r.weEarned).toBe(800);
    expect(r.theyProfitEst).toBe(-880);
    expect(r.topUpOwed).toBe(0);
    expect(r.deposits).toBe(500);
    expect(r.withdrawalGross).toBe(100);
    expect(r.withdrawalFeeIncome).toBe(10);
    // boostCount / boostAmount / distinctPassengers are additive (zinc PR
    // #57) — passed through before the list-value fields are derived
    expect(r.boostCount).toBe(0);
    expect(r.boostAmount).toBe(0);
    expect(r.boostListValue).toBe(0);
    expect(r.boostListGap).toBe(0);
    expect(r.distinctPassengers).toBe(0);
  });

  it('keeps FREE boost consumption and passenger signals visible', () => {
    // Four consumed FREE boosts have a zero paid amount but S$40 list value.
    const r = toPartnerPnlRow(
      row({
        month: '08-2026',
        bookings: 5,
        boostCount: 4,
        boostAmount: 0,
        distinctPassengers: 5,
      }),
    );
    expect(r.boostCount).toBe(4);
    expect(r.boostAmount).toBe(0);
    expect(r.boostListValue).toBe(40);
    expect(r.boostListGap).toBe(40);
    expect(r.distinctPassengers).toBe(5);
    expect(r.streetValue).toBe(90);
    expect(r.theyProfitEst).toBe(90);
    expect(r.topUpOwed).toBe(45);
  });
});

describe('partnerPnlZeroFill', () => {
  it('inserts an all-zeros row for every calendar month in the range', () => {
    // zinc only returns months with activity; the page reads better as
    // a continuous series, so the renderer wants one row per month.
    const rows = partnerPnlZeroFill([row({ month: '02-2026', collected: 100 })], '01-2026', '04-2026');
    expect(rows.map(r => r.month)).toEqual(['01-2026', '02-2026', '03-2026', '04-2026']);
    expect(rows[0].collected).toBe(0);
    expect(rows[1].collected).toBe(100);
    expect(rows[2].collected).toBe(0);
    expect(rows[3].collected).toBe(0);
    // zero rows also carry a zeroed settlement
    expect(rows[0].weEarned).toBe(0);
    expect(rows[0].theyProfitEst).toBe(0);
    expect(rows[0].topUpOwed).toBe(0);
  });

  it('keeps the payload verbatim when its months already cover the range', () => {
    const rows = partnerPnlZeroFill([row({ month: '03-2026' }), row({ month: '01-2026' })], '01-2026', '03-2026');
    expect(rows.map(r => r.month)).toEqual(['01-2026', '02-2026', '03-2026']);
    expect(rows[1].collected).toBe(0);
  });

  it('handles year boundaries correctly', () => {
    const rows = partnerPnlZeroFill([row({ month: '01-2027', collected: 50 })], '11-2026', '02-2027');
    expect(rows.map(r => r.month)).toEqual(['11-2026', '12-2026', '01-2027', '02-2027']);
    expect(rows[2].collected).toBe(50);
  });

  it('falls back to a pass-through ascending sort when bounds are malformed', () => {
    // defensive: a malformed URL or an empty range should still yield a
    // usable table from whatever zinc returned
    const rows = partnerPnlZeroFill([row({ month: '04-2026' }), row({ month: '02-2026' })], '', '');
    expect(rows.map(r => r.month)).toEqual(['02-2026', '04-2026']);
  });

  it('fallback sort orders correctly across year boundaries', () => {
    // localeCompare on "MM-yyyy" happens to give the right order for
    // 12-2025 < 01-2026 (12 < 01 in the first two chars, "12-2025" < "01-2026"
    // is true lexicographically), but it's accidental and brittle — the
    // sort must use the numeric yyyyMM key, which is the only correct way
    const rows = partnerPnlZeroFill(
      [row({ month: '01-2026' }), row({ month: '11-2025' }), row({ month: '02-2026' })],
      '',
      '',
    );
    expect(rows.map(r => r.month)).toEqual(['11-2025', '01-2026', '02-2026']);
  });

  it('zero-fills boost and passenger signals together with the rest', () => {
    const rows = partnerPnlZeroFill(
      [row({ month: '07-2026', bookings: 10, boostCount: 4, boostAmount: 0, distinctPassengers: 7 })],
      '06-2026',
      '08-2026',
    );
    expect(rows.map(r => ({ m: r.month, b: r.boostCount, list: r.boostListValue, p: r.distinctPassengers }))).toEqual([
      { m: '06-2026', b: 0, list: 0, p: 0 },
      { m: '07-2026', b: 4, list: 40, p: 7 },
      { m: '08-2026', b: 0, list: 0, p: 0 },
    ]);
  });
});

describe('partnerPnlTotals', () => {
  it('sums every column across the rows', () => {
    const total = partnerPnlTotals([
      toPartnerPnlRow(
        row({
          month: '01-2026',
          bookings: 5,
          boostCount: 2,
          boostAmount: 30,
          distinctPassengers: 4,
          collected: 1000,
          ktmbCost: 200,
          deposits: 500,
          withdrawalGross: 100,
          withdrawalFeeIncome: 10,
        }),
      ),
      toPartnerPnlRow(
        row({
          month: '02-2026',
          bookings: 3,
          boostCount: 1,
          boostAmount: 15,
          distinctPassengers: 2,
          collected: 400,
          ktmbCost: 100,
          deposits: 200,
          withdrawalGross: 50,
          withdrawalFeeIncome: 5,
        }),
      ),
    ]);
    expect(total.bookings).toBe(8);
    expect(total.averageTicketPaid).toBe(175);
    expect(total.ticketMarginAtList).toBe(-1320);
    expect(total.boostCount).toBe(3);
    expect(total.boostAmount).toBe(45);
    expect(total.boostListValue).toBe(30);
    expect(total.boostListGap).toBe(-15);
    expect(total.distinctPassengers).toBe(6);
    expect(total.collected).toBe(1400);
    expect(total.paidTotal).toBe(1445);
    expect(total.ktmbCost).toBe(300);
    expect(total.streetValue).toBe(110);
    expect(total.weEarned).toBe(1145);
    expect(total.theyProfitEst).toBe(-1335);
    expect(total.topUpOwed).toBe(0);
    expect(total.deposits).toBe(700);
    expect(total.withdrawalGross).toBe(150);
    expect(total.withdrawalFeeIncome).toBe(15);
  });

  it('returns zeros for empty input', () => {
    expect(partnerPnlTotals([])).toEqual({
      month: '',
      bookings: 0,
      averageTicketPaid: 0,
      ticketMarginAtList: 0,
      boostCount: 0,
      boostAmount: 0,
      boostListValue: 0,
      boostListGap: 0,
      distinctPassengers: 0,
      collected: 0,
      paidTotal: 0,
      ktmbCost: 0,
      streetValue: 0,
      weEarned: 0,
      theyProfitEst: 0,
      topUpOwed: 0,
      deposits: 0,
      withdrawalGross: 0,
      withdrawalFeeIncome: 0,
    });
  });

  it('re-derives the range top-up instead of summing monthly floors', () => {
    const rows = [
      toPartnerPnlRow(row({ month: '01-2026', bookings: 10, collected: 60, ktmbCost: 60 })),
      toPartnerPnlRow(row({ month: '02-2026', bookings: 10, collected: 100, ktmbCost: 60 })),
    ];

    // January says they are S$20 ahead; February puts us S$40 ahead. Across
    // the selected range both sides earned S$40, so no settlement is owed.
    expect(rows.map(r => r.topUpOwed)).toEqual([20, 0]);
    expect(rows.reduce((sum, r) => sum + r.topUpOwed, 0)).toBe(20);

    const total = partnerPnlTotals(rows);
    expect(total.weEarned).toBe(40);
    expect(total.theyProfitEst).toBe(40);
    expect(total.topUpOwed).toBe(0);
  });
});
