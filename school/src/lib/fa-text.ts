const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

export function toFaDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => FA_DIGITS[Number(digit)] ?? digit)
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
