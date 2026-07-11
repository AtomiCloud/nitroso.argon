import { describe, expect, it } from 'vitest';
import type { BookingStatRes } from '$lib/api/core/data-contracts';
import { aggregate, deliveryMeetsCutoff, failedOf, rateOf, toStatRow } from './stats';
import { DELIVERY_BUCKETS, demandBucketOf, leadBucketOf } from '$lib/stats/buckets';

function row(over: Partial<BookingStatRes>): BookingStatRes {
  return {
    dayOfWeek: 'Monday',
    time: '08:00:00',
    direction: 'WToJ',
    bucket: '24h',
    priority: false,
    demandBucket: '0-5',
    deliveryBucket: null,
    total: 0,
    completed: 0,
    refunded: 0,
    cancelled: 0,
    terminated: 0,
    other: 0,
    ...over,
  };
}

describe('deliveryMeetsCutoff', () => {
  it('passes buckets at or above the cutoff', () => {
    expect(deliveryMeetsCutoff('2h', '2h')).toBe(true);
    expect(deliveryMeetsCutoff('12h', '2h')).toBe(true);
    expect(deliveryMeetsCutoff('48h+', '2h')).toBe(true);
  });

  it('fails buckets below the cutoff', () => {
    expect(deliveryMeetsCutoff('1h', '2h')).toBe(false);
    expect(deliveryMeetsCutoff('6h', '12h')).toBe(false);
  });

  it('fails null/unknown delivery buckets (unverifiable = not timely)', () => {
    expect(deliveryMeetsCutoff(null, '2h')).toBe(false);
    expect(deliveryMeetsCutoff(undefined, '2h')).toBe(false);
    expect(deliveryMeetsCutoff('garbage', '2h')).toBe(false);
  });
});

describe('aggregate + rateOf without a delivery cutoff', () => {
  const rs = [
    row({ deliveryBucket: '12h', total: 10, completed: 6, refunded: 2, cancelled: 1 }),
    row({ deliveryBucket: '1h', total: 5, completed: 3, refunded: 1, cancelled: 1 }),
    row({ deliveryBucket: null, total: 4, completed: 0, refunded: 3, cancelled: 0 }),
  ];

  it('keeps timely === completed so the rate is the classic definition', () => {
    const a = aggregate(rs);
    expect(a.completed).toBe(9);
    expect(a.timely).toBe(9);
    // refund only: 9 / (9 + 6)
    expect(rateOf(a, 'refund')).toBeCloseTo(60);
    // refund + cancel: 9 / (9 + 6 + 2)
    expect(rateOf(a, 'refundCancel')).toBeCloseTo((9 / 17) * 100);
  });
});

describe('aggregate + rateOf with a delivery cutoff', () => {
  const rs = [
    // delivered 12h out: timely under a 2h cutoff
    row({ deliveryBucket: '12h', total: 10, completed: 6, refunded: 2, cancelled: 1 }),
    // delivered 1h out: below the 2h cutoff → completed but NOT timely
    row({ deliveryBucket: '1h', total: 5, completed: 3, refunded: 1, cancelled: 1 }),
    // legacy completed row without a delivery bucket → NOT timely
    row({ deliveryBucket: null, total: 4, completed: 2, refunded: 1, cancelled: 0 }),
  ];

  it('shrinks the numerator to timely completions, denominator unchanged', () => {
    const a = aggregate(rs, '2h');
    expect(a.completed).toBe(11);
    expect(a.timely).toBe(6);
    expect(failedOf(a, 'refund')).toBe(4);
    // numerator = 6 timely; denominator = completed(11) + refunded(4) = 15
    expect(rateOf(a, 'refund')).toBeCloseTo(40);
    // refund + cancel denominator: 11 + 4 + 2 = 17
    expect(rateOf(a, 'refundCancel')).toBeCloseTo((6 / 17) * 100);
  });

  it('a stricter cutoff can only lower the rate', () => {
    const loose = rateOf(aggregate(rs, '2h'), 'refund') ?? 0;
    const strict = rateOf(aggregate(rs, '24h'), 'refund') ?? 0;
    expect(strict).toBeLessThanOrEqual(loose);
  });

  it('cutoff at the tightest offered bucket (2h) still fails 1h deliveries', () => {
    const a = aggregate([row({ deliveryBucket: '1h', total: 2, completed: 2 })], '2h');
    expect(a.timely).toBe(0);
    expect(rateOf(a, 'refund')).toBe(0);
  });

  it('rate can hit 0% while completions exist (all late)', () => {
    const a = aggregate([row({ deliveryBucket: '1h', total: 3, completed: 2, refunded: 1 })], '48h+');
    expect(rateOf(a, 'refund')).toBe(0);
  });

  it('null rate only when nothing resolved', () => {
    const a = aggregate([row({ total: 5, completed: 0, refunded: 0, cancelled: 3 })], '2h');
    expect(rateOf(a, 'refund')).toBeNull();
    expect(rateOf(a, 'refundCancel')).toBe(0);
  });
});

describe('toStatRow with a delivery cutoff', () => {
  it('surfaces timely as num and the unchanged denominator as den', () => {
    const rs = [
      row({ deliveryBucket: '24h', total: 8, completed: 5, refunded: 2, cancelled: 1 }),
      row({ deliveryBucket: '1h', total: 4, completed: 2, refunded: 1, cancelled: 0 }),
    ];
    const r = toStatRow('k', 'label', '', rs, 'refund', '12h');
    expect(r.num).toBe(5);
    expect(r.den).toBe(10); // completed 7 + refunded 3
    expect(r.rate).toBeCloseTo(50);
    // without a cutoff the same slice reads 70%
    const r0 = toStatRow('k', 'label', '', rs, 'refund');
    expect(r0.num).toBe(7);
    expect(r0.rate).toBeCloseTo(70);
  });
});

describe('shared bucket ladders (zinc twins)', () => {
  it('lead bucket boundaries are inclusive on the tight side', () => {
    expect(leadBucketOf(6)).toBe('6h');
    expect(leadBucketOf(6.01)).toBe('12h');
    expect(leadBucketOf(0)).toBe('6h');
    expect(leadBucketOf(-1)).toBe('6h'); // past departure → tightest bucket
    expect(leadBucketOf(24)).toBe('24h');
    expect(leadBucketOf(24 * 7)).toBe('1w');
    expect(leadBucketOf(24 * 200)).toBe('6m+');
  });

  it('demand bucket boundaries match zinc', () => {
    expect(demandBucketOf(0)).toBe('0-5');
    expect(demandBucketOf(5)).toBe('0-5');
    expect(demandBucketOf(6)).toBe('5-10');
    expect(demandBucketOf(20)).toBe('10-20');
    expect(demandBucketOf(30)).toBe('20-30');
    expect(demandBucketOf(31)).toBe('30+');
  });

  it('delivery ladder order is shortest first', () => {
    expect(DELIVERY_BUCKETS[0]).toBe('1h');
    expect(DELIVERY_BUCKETS.at(-1)).toBe('48h+');
  });
});
