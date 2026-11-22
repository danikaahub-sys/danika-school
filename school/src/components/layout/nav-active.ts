/** Path only — querystring ignored for matching. */
export function navPath(href: string): string {
  return href.split('?')[0] || '/'
}

/**
 * True when `url` is the best (longest) match for `href` among `candidates`.
 * Prevents `/classroom` staying active on `/classroom/attendance`.
 */
export function linkActive(
  href: string,
  url: string | undefined,
  candidates: string[] = []
): boolean {
  const path = navPath(href)
  const target = navPath(url ?? '/')

  if (target === '/') return path === '/'

  const pool = (candidates.length ? candidates : [target]).map(navPath)
  const matches = pool.filter(
    (candidate) =>
      candidate !== '/' &&
      (path === candidate || path.startsWith(`${candidate}/`))
  )
  if (!matches.length) return false

  const best = matches.reduce((a, b) => (a.length >= b.length ? a : b))
  return best === target
}
