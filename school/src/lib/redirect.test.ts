import { describe, expect, it } from 'vitest'
import { locationToRedirect, safeRedirectPath } from './redirect'

describe('safeRedirectPath', () => {
  it('keeps relative app paths', () => {
    expect(safeRedirectPath('/people')).toBe('/people')
    expect(safeRedirectPath('/finance?tab=queue')).toBe('/finance?tab=queue')
  })

  it('rejects absolute and protocol-relative URLs by stripping to a path', () => {
    expect(safeRedirectPath('http://localhost:5173')).toBe('/')
    expect(safeRedirectPath('http://localhost:5173/people')).toBe('/people')
    expect(safeRedirectPath('//evil.example/phish')).toBe('/')
  })

  it('falls back for empty or sign-in loops', () => {
    expect(safeRedirectPath(undefined)).toBe('/')
    expect(safeRedirectPath('/sign-in')).toBe('/')
    expect(safeRedirectPath('/sign-in?redirect=/')).toBe('/')
  })

  it('builds a redirect from location parts', () => {
    expect(locationToRedirect('/admin', '?tab=users')).toBe('/admin?tab=users')
  })
})
