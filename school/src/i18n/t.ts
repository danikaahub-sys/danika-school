import { fa, type FaKey } from './fa'

type Vars = Record<string, string | number>

/** Resolve a Persian UI string. Supports `{name}` interpolation. */
export function t(key: FaKey, vars?: Vars): string {
  let value: string = fa[key]
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return value
}

export type { FaKey }
