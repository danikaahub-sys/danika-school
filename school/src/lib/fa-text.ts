const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => FA_DIGITS[Number(digit)] ?? digit)
}

export function formatScore(
  earned: number | null | undefined,
  maximum: number | null | undefined
): string {
  if (earned == null || !Number.isFinite(earned)) return '—'
  const max = maximum != null && Number.isFinite(maximum) ? maximum : null
  return max == null
    ? toFaDigits(earned)
    : `${toFaDigits(earned)}/${toFaDigits(max)}`
}

export function fromFaDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (digit) => String(FA_DIGITS.indexOf(digit)))
}

export function normalizeFa(value: string): string {
  return fromFaDigits(value).replace(/ي/g, 'ی').replace(/ك/g, 'ک').trim()
}

export function faIncludes(haystack: string, needle: string): boolean {
  return normalizeFa(haystack).includes(normalizeFa(needle))
}
