import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { isoDate, lower } from '@/lib/api-map'
import type { AuditEvent, Membership, Person, Position } from '@/mocks'
import type { BaseRole } from '@/features/access/permissions'

type MembershipRow = {
  id: string
  personId: string
  positionId: string
  status: string
  person?: Person
  position?: Position
}

export function useAdmin() {
  return useQuery({
    queryKey: ['admin'],
    queryFn: async () => {
      const [users, positions, audit] = await Promise.all([
        api<{ items: MembershipRow[] }>('/school/admin/users?page=1&limit=100'),
        api<Position[]>('/school/admin/positions'),
        api<{ items: Array<{ id: string; createdAt: string; actorUserId?: string; action: string }> }>(
          '/school/admin/audit?page=1&limit=50'
        ),
      ])
      const mappedPositions = positions.map((item) => ({
        ...item,
        baseRole: lower<BaseRole>(String(item.baseRole)),
      }))
      const people = users.items
        .map((row) => row.person)
        .filter((item): item is Person => Boolean(item))
      const memberships: Membership[] = users.items.map((row) => ({
        id: row.id,
        personId: row.personId,
        positionId: row.positionId,
        inviteStatus: lower(String(row.status)) === 'invited' ? 'invited' : 'active',
      }))
      const auditLog: AuditEvent[] = audit.items.map((item) => ({
        id: item.id,
        at: isoDate(item.createdAt),
        actor: item.actorUserId ?? '',
        action: item.action,
      }))
      return { people, positions: mappedPositions, memberships, auditLog }
    },
  })
}

export function useDeactivateUser() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api(`/school/admin/users/${id}/deactivate`, { method: 'POST' }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin'] }),
  })
}
