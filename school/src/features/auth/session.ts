import { api } from '@/lib/api-client'
import { type AuthUser, useAuthStore } from '@/stores/auth-store'
import { useSessionStore } from '@/stores/session-store'

export type Membership = {
  id: string
  schoolId: string
  schoolName: string
  city: string
  baseRole: string
  positionName: string
  status: string
}

type TokenUser = {
  accessToken: string
  refreshToken: string
}

type MeResponse = {
  user: AuthUser
  years: Array<{ id: string; label: string; active: boolean }>
  yearId: string
  person: { id: string }
  school: { id: string; name: string; city: string; moneyUnit: 'irr' | 'toman' }
}

export async function loginWithPassword(identifier: string, password: string) {
  const tokens = await api<TokenUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
    skipAuth: true,
  })
  return finishGlobalAuth(tokens)
}

export async function sendOtp(phone: string, purpose: 'login' | 'reset') {
  return api<{ sent: true }>('/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone, purpose }),
    skipAuth: true,
  })
}

export async function verifyOtp(phone: string, code: string, purpose: 'login' | 'reset') {
  return api<TokenUser | { proof: string }>('/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, purpose, code }),
    skipAuth: true,
  })
}

export async function resetPassword(phone: string, proof: string, password: string) {
  return api<{ success: true }>('/auth/password/reset', {
    method: 'POST',
    body: JSON.stringify({ phone, proof, password }),
    skipAuth: true,
  })
}

export async function acceptInvitation(token: string, password: string) {
  const tokens = await api<TokenUser>(`/school/invitations/${token}/accept`, {
    method: 'POST',
    body: JSON.stringify({ password }),
    skipAuth: true,
  })
  return finishGlobalAuth(tokens)
}

export async function listMemberships() {
  return api<Membership[]>('/school/memberships')
}

export async function enterSchool(schoolId: string) {
  const session = await api<{ accessToken: string; schoolId: string }>(
    '/school/session',
    {
      method: 'POST',
      body: JSON.stringify({ schoolId }),
    }
  )
  const { auth } = useAuthStore.getState()
  auth.setAccessToken(session.accessToken)
  auth.setSchoolId(schoolId)
  const me = await api<MeResponse>('/school/me')
  auth.setUser({
    ...me.user,
    id: me.person.id,
    years: me.years,
    schoolId: me.school.id,
    schoolName: me.school.name,
    city: me.school.city,
    moneyUnit: me.school.moneyUnit,
  })
  const active = me.years.find((year) => year.active)?.id ?? me.yearId
  useSessionStore.getState().setYearId(active)
  return me.user
}

export async function finishGlobalAuth(tokens: TokenUser) {
  const { auth } = useAuthStore.getState()
  auth.setAccessToken(tokens.accessToken)
  auth.setRefreshToken(tokens.refreshToken)
  const memberships = await listMemberships()
  if (memberships.length === 1) {
    await enterSchool(memberships[0].schoolId)
    return { memberships, entered: true as const }
  }
  return { memberships, entered: false as const }
}
