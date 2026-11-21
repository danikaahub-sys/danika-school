import { describe, expect, it } from 'vitest'
import { firstAllowedPath } from './guard'
import {
  ACTIONS,
  ROLE_GRANTS,
  allPermissionKeys,
  canRole,
  hasPermission,
  permissionsForRole,
} from './permissions'

describe('permissions', () => {
  it('gives the principal every catalog key', () => {
    const keys = allPermissionKeys()
    expect(keys.length).toBeGreaterThan(20)
    expect(permissionsForRole('principal')).toEqual(keys)
  })

  it('hides finance from teachers and students', () => {
    expect(canRole('teacher', 'finance.ledger.view')).toBe(false)
    expect(canRole('student', 'admin.users.view')).toBe(false)
    expect(canRole('student', 'classroom.grades.view')).toBe(true)
  })

  it('treats an explicit all-set as unrestricted', () => {
    expect(hasPermission('all', 'admin.positions.edit')).toBe(true)
    expect(hasPermission(['home.dashboard.view'], 'admin.positions.edit')).toBe(
      false
    )
  })

  it('keeps the catalog actions and role grants aligned', () => {
    expect(ACTIONS).toContain('view')
    expect(ROLE_GRANTS.teacher).toContain('classroom.workspace.view')
    expect(firstAllowedPath(ROLE_GRANTS.student)).toBe('/')
    expect(firstAllowedPath([])).toBeNull()
  })
})
