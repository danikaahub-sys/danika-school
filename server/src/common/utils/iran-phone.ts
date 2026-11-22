const IRAN_MOBILE_DIGITS = /^(?:98|0)?9\d{9}$/;

/** Canonical Iranian mobile: `09xxxxxxxxx`. Other values are returned trimmed. */
export function normalizeIranPhone(value: string): string {
    const trimmed = value.trim();
    const digits = trimmed.replace(/\D/g, '');
    if (!IRAN_MOBILE_DIGITS.test(digits)) {
        return trimmed;
    }
    return `0${digits.replace(/^(?:98|0)/, '')}`;
}
