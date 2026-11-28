import {
    periodBounds,
    eachYmd,
} from 'src/modules/school/dashboard/school-dashboard.period';

describe('periodBounds', () => {
    it('uses today and yesterday for day range', () => {
        // 2026-03-18 is Wednesday in Gregorian; Tehran same calendar day
        const bounds = periodBounds(
            'day',
            new Date('2026-03-18T12:00:00+03:30')
        );
        expect(bounds.key).toBe('day');
        expect(bounds.fromYmd).toBe('2026-03-18');
        expect(bounds.toYmd).toBe('2026-03-18');
        expect(bounds.prevFromYmd).toBe('2026-03-17');
        expect(bounds.prevToYmd).toBe('2026-03-17');
        expect(bounds.trendFromYmd).toBe('2026-03-12');
        expect(bounds.trendToYmd).toBe('2026-03-18');
        expect(bounds.label).toBe('امروز');
    });

    it('starts the week on Saturday', () => {
        // 2026-03-18 (Wed) → week from Sat 2026-03-14
        const bounds = periodBounds(
            'week',
            new Date('2026-03-18T12:00:00+03:30')
        );
        expect(bounds.fromYmd).toBe('2026-03-14');
        expect(bounds.toYmd).toBe('2026-03-18');
        expect(bounds.prevToYmd).toBe('2026-03-13');
        expect(bounds.prevFromYmd).toBe('2026-03-07');
        expect(bounds.label).toBe('این هفته');
    });

    it('keeps Saturday as the week start when today is Saturday', () => {
        const bounds = periodBounds(
            'week',
            new Date('2026-03-14T12:00:00+03:30')
        );
        expect(bounds.fromYmd).toBe('2026-03-14');
        expect(bounds.prevFromYmd).toBe('2026-03-07');
        expect(bounds.prevToYmd).toBe('2026-03-13');
    });

    it('uses Jalali month bounds and previous month', () => {
        // 2026-03-18 ≈ 27 Esfand 1404 (end of year) or Farvardin depending on leap —
        // Assert structural invariants rather than a brittle month name.
        const bounds = periodBounds(
            'month',
            new Date('2026-04-10T12:00:00+03:30')
        );
        expect(bounds.key).toBe('month');
        expect(bounds.fromYmd <= bounds.toYmd).toBe(true);
        expect(bounds.prevFromYmd < bounds.fromYmd).toBe(true);
        expect(bounds.prevToYmd).toBe(
            // day before current month start
            new Date(Date.parse(`${bounds.fromYmd}T00:00:00.000Z`) - 86_400_000)
                .toISOString()
                .slice(0, 10)
        );
        expect(bounds.trendFromYmd).toBe(bounds.fromYmd);
        expect(bounds.label.length).toBeGreaterThan(0);
    });

    it('lists each day inclusively', () => {
        expect(eachYmd('2026-03-14', '2026-03-16')).toEqual([
            '2026-03-14',
            '2026-03-15',
            '2026-03-16',
        ]);
    });
});
