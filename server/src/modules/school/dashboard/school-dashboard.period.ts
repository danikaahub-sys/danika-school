export type OverviewRange = 'day' | 'week' | 'month';

export type PeriodBounds = {
    key: OverviewRange;
    from: Date;
    to: Date;
    prevFrom: Date;
    prevTo: Date;
    /** Inclusive YYYY-MM-DD in Asia/Tehran calendar. */
    fromYmd: string;
    toYmd: string;
    prevFromYmd: string;
    prevToYmd: string;
    /** Trend window (daily buckets). For day, last 7 days ending today. */
    trendFromYmd: string;
    trendToYmd: string;
    label: string;
};

const TEHRAN = 'Asia/Tehran';

const JALALI_MONTHS_FA = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
];

function tehranYmd(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: TEHRAN,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

function parseYmd(ymd: string): Date {
    return new Date(`${ymd}T00:00:00.000Z`);
}

function addDaysYmd(ymd: string, days: number): string {
    const date = parseYmd(ymd);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

function weekdayUtc(ymd: string): number {
    return parseYmd(ymd).getUTCDay();
}

/** Iranian week starts Saturday. */
function startOfSaturdayWeek(ymd: string): string {
    const sinceSaturday = (weekdayUtc(ymd) + 1) % 7;
    return addDaysYmd(ymd, -sinceSaturday);
}

function jalaliParts(date: Date): { year: number; month: number; day: number } {
    const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
        timeZone: TEHRAN,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
    }).formatToParts(date);
    const num = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find(part => part.type === type)?.value ?? NaN);
    return { year: num('year'), month: num('month'), day: num('day') };
}

function compareJalali(
    a: { year: number; month: number; day: number },
    b: { year: number; month: number; day: number }
): number {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
}

/** Find the Gregorian YYYY-MM-DD (Tehran calendar day) for a Jalali Y/M/D. */
function ymdForJalali(year: number, month: number, day: number): string {
    const target = { year, month, day };
    let lo = Date.UTC(year + 621, 1, 1);
    let hi = Date.UTC(year + 622, 5, 1);
    while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const midDate = new Date(mid);
        const parts = jalaliParts(midDate);
        const cmp = compareJalali(parts, target);
        if (cmp < 0) lo = mid + 86_400_000;
        else if (cmp > 0) hi = mid - 86_400_000;
        else return tehranYmd(midDate);
    }
    return tehranYmd(new Date(lo));
}

function shiftJalaliMonth(
    year: number,
    month: number,
    delta: number
): { year: number; month: number } {
    const index = year * 12 + (month - 1) + delta;
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function periodBounds(
    range: OverviewRange,
    now: Date = new Date()
): PeriodBounds {
    const today = tehranYmd(now);
    let fromYmd: string;
    let toYmd: string;
    let prevFromYmd: string;
    let prevToYmd: string;
    let label: string;

    if (range === 'day') {
        fromYmd = today;
        toYmd = today;
        prevFromYmd = addDaysYmd(today, -1);
        prevToYmd = prevFromYmd;
        label = 'امروز';
    } else if (range === 'week') {
        fromYmd = startOfSaturdayWeek(today);
        toYmd = today;
        prevToYmd = addDaysYmd(fromYmd, -1);
        prevFromYmd = startOfSaturdayWeek(prevToYmd);
        label = 'این هفته';
    } else {
        const { year, month } = jalaliParts(now);
        fromYmd = ymdForJalali(year, month, 1);
        const next = shiftJalaliMonth(year, month, 1);
        toYmd = today;
        const monthEnd = addDaysYmd(ymdForJalali(next.year, next.month, 1), -1);
        if (toYmd > monthEnd) toYmd = monthEnd;
        const prev = shiftJalaliMonth(year, month, -1);
        prevFromYmd = ymdForJalali(prev.year, prev.month, 1);
        prevToYmd = addDaysYmd(fromYmd, -1);
        label = JALALI_MONTHS_FA[month - 1] ?? 'این ماه';
    }

    const trendToYmd = toYmd;
    const trendFromYmd = range === 'day' ? addDaysYmd(toYmd, -6) : fromYmd;

    return {
        key: range,
        from: parseYmd(fromYmd),
        to: parseYmd(toYmd),
        prevFrom: parseYmd(prevFromYmd),
        prevTo: parseYmd(prevToYmd),
        fromYmd,
        toYmd,
        prevFromYmd,
        prevToYmd,
        trendFromYmd,
        trendToYmd,
        label,
    };
}

export function eachYmd(fromYmd: string, toYmd: string): string[] {
    const out: string[] = [];
    let cursor = fromYmd;
    while (cursor <= toYmd) {
        out.push(cursor);
        cursor = addDaysYmd(cursor, 1);
    }
    return out;
}
