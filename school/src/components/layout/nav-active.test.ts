import { describe, expect, it } from 'vitest'
import { linkActive } from './nav-active'

const classroomNav = [
  '/classroom',
  '/classroom/attendance',
  '/classroom/results',
]

describe('linkActive', () => {
  it('activates only the longest matching nav url', () => {
    expect(
      linkActive('/classroom/attendance', '/classroom', classroomNav)
    ).toBe(false)
    expect(
      linkActive('/classroom/attendance', '/classroom/attendance', classroomNav)
    ).toBe(true)
  })

  it('keeps parent active on nested workspace routes', () => {
    expect(
      linkActive('/classroom/abc-123', '/classroom', classroomNav)
    ).toBe(true)
    expect(
      linkActive('/classroom/abc-123', '/classroom/attendance', classroomNav)
    ).toBe(false)
  })

  it('only matches home exactly', () => {
    expect(linkActive('/', '/', classroomNav)).toBe(true)
    expect(linkActive('/classroom', '/', classroomNav)).toBe(false)
  })
})
