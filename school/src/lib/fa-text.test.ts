import { describe, expect, it } from 'vitest'
import { faIncludes, fromFaDigits, normalizeFa, toFaDigits } from './fa-text'

describe('fa-text', () => {
  it('round-trips digits', () => {
    expect(toFaDigits(1405)).toBe('۱۴۰۵')
    expect(fromFaDigits('۱۴۰۵')).toBe('1405')
  })

  it('normalizes Arabic yeh/kaf so search still matches', () => {
    expect(normalizeFa('علي كريم')).toBe('علی کریم')
    expect(faIncludes('علی کریمی', 'علي')).toBe(true)
  })
})
