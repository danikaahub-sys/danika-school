export type MoneyUnit = 'irr' | 'toman'

export const TOMAN_PER_IRR = 10

export function tomanToIrr(toman: number): number {
  return Math.round(toman) * TOMAN_PER_IRR
}

export function irrToToman(irr: number): number {
  return irr / TOMAN_PER_IRR
}

export function parseMoneyInput(raw: string, unit: MoneyUnit): number {
  const normalized = raw.replace(/[^\d۰-۹]/g, '')
  const western = normalized.replace(/[۰-۹]/g, (d) =>
    String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
  )
  const amount = Number(western)
  if (!Number.isFinite(amount) || amount < 0) return 0
  return unit === 'toman' ? tomanToIrr(amount) : Math.round(amount)
}
