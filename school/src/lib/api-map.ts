import type { Person, PersonKind } from '@/mocks'

export function lower<T extends string>(value: string): T {
  return value.toLowerCase() as T
}

export function money(value: unknown): number {
  return Number(value ?? 0)
}

export function isoDate(value: unknown): string {
  if (!value) return ''
  return String(value).slice(0, 10)
}

export function personName(
  person?: { firstName?: string; lastName?: string } | null
): string {
  if (!person) return ''
  return `${person.firstName ?? ''} ${person.lastName ?? ''}`.trim()
}

export function classLabelFrom(
  grade?: { name?: string } | string | null,
  name?: string
): string {
  const gradeName = typeof grade === 'string' ? grade : (grade?.name ?? '')
  return [gradeName, name].filter(Boolean).join(' ')
}

export function mapPerson(row: Record<string, unknown>): Person {
  const enrollments = Array.isArray(row.enrollments)
    ? (row.enrollments as Array<{
        classId?: string
        class?: { id?: string; name?: string; grade?: { name?: string } }
      }>)
    : []
  const enrollment = enrollments[0]
  return {
    id: String(row.id),
    kind: lower<PersonKind>(String(row.kind ?? 'student')),
    firstName: String(row.firstName ?? ''),
    lastName: String(row.lastName ?? ''),
    nationalId: row.nationalId ? String(row.nationalId) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    username: String(row.phone ?? row.id),
    classId: enrollment?.classId ?? enrollment?.class?.id,
    status: lower(String(row.status ?? 'active')) as Person['status'],
  }
}
