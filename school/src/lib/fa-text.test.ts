import { describe, expect, it } from 'vitest'
import {
  faIncludes,
  formatScore,
  fromFaDigits,
  normalizeFa,
  toFaDigits,
} from './fa-text'

describe('fa-text', () => {
  it('round-trips digits', () => {
    expect(toFaDigits(1405)).toBe('۱۴۰۵')
    expect(fromFaDigits('۱۴۰۵')).toBe('1405')
  })

  it('normalizes Arabic yeh/kaf so search still matches', () => {
    expect(normalizeFa('علي كريم')).toBe('علی کریم')
    expect(faIncludes('علی کریمی', 'علي')).toBe(true)
  })

  it('formats scores and hides invalid earned values', () => {
    expect(formatScore(16, 20)).toBe('۱۶/۲۰')
    expect(formatScore(null, 20)).toBe('—')
    expect(formatScore(Number.NaN, 20)).toBe('—')
  })
})
