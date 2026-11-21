import { permissionsForRole } from '@/features/access/permissions'
import { fromFaDigits, normalizeFa } from '@/lib/fa-text'
import {
  accounts,
  displayName,
  people,
  school,
  type Person,
} from '@/mocks'
import { type AuthUser } from '@/stores/auth-store'

export function findAccount(identifier: string): Person | null {
  const needle = normalizeFa(fromFaDigits(identifier)).replace(/^0/, '0')
  const account = accounts.find(
    (item) =>
      normalizeFa(item.identifier) === needle ||
      fromFaDigits(item.identifier) === fromFaDigits(identifier)
  )
  if (!account) return null
  return people.find((person) => person.id === account.personId) ?? null
}

export function toAuthUser(person: Person): AuthUser {
  return {
    id: person.id,
    name: displayName(person),
    phone: person.phone,
    username: person.username,
    role: person.role ?? 'student',
    positionId: person.positionId,
    permissions: permissionsForRole(person.role ?? 'student'),
    schoolId: school.id,
    schoolName: school.name,
  }
}
