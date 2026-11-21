/** Keep only same-app relative paths for post-login redirects. */
export function safeRedirectPath(value: string | null | undefined, fallback = '/'): string {
  if (!value) return fallback
  let path = value.trim()
  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path)
      path = `${url.pathname}${url.search}${url.hash}`
    } catch {
      return fallback
    }
  }
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    return fallback
  }
  if (path === '/sign-in' || path.startsWith('/sign-in?') || path.startsWith('/sign-in/')) {
    return fallback
  }
  return path
}

export function locationToRedirect(pathname: string, search = '', hash = ''): string {
  return safeRedirectPath(`${pathname}${search}${hash}`)
}
