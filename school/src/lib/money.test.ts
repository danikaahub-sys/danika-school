import { describe, expect, it } from 'vitest'
import { irrToToman, parseMoneyInput, TOMAN_PER_IRR, tomanToIrr } from './money'

describe('money', () => {
  it('converts toman to IRR by exactly 10', () => {
    expect(TOMAN_PER_IRR).toBe(10)
    expect(tomanToIrr(12000)).toBe(120000)
    expect(irrToToman(120000)).toBe(12000)
  })

  it('parses Persian digits and posts IRR', () => {
    expect(parseMoneyInput('۱۲٬۰۰۰', 'toman')).toBe(120000)
    expect(parseMoneyInput('120000', 'irr')).toBe(120000)
  })
})
