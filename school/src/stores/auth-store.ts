import { create } from 'zustand'
import { getCookie, setCookie, removeCookie } from '@/lib/cookies'
import { type BaseRole, type PermissionSet } from '@/features/access/permissions'
import { type MoneyUnit } from '@/lib/money'

const ACCESS_TOKEN = 'danika.access'
const REFRESH_TOKEN = 'danika.refresh'
const AUTH_USER = 'danika.user'
const SCHOOL_ID = 'danika.schoolId'

export interface AuthUser {
  id: string
  name: string
  phone?: string
  username: string
  role: BaseRole
  positionId?: string
  permissions: PermissionSet
  schoolId: string
  schoolName: string
  city?: string
  moneyUnit?: MoneyUnit
  years?: Array<{ id: string; label: string; active: boolean }>
}

interface AuthState {
  auth: {
    user: AuthUser | null
    setUser: (user: AuthUser | null) => void
    accessToken: string
    refreshToken: string
    schoolId: string
    setAccessToken: (accessToken: string) => void
    setRefreshToken: (refreshToken: string) => void
    setSchoolId: (schoolId: string) => void
    resetAccessToken: () => void
    reset: () => void
  }
}

function readUser(): AuthUser | null {
  const raw = getCookie(AUTH_USER)
  if (!raw) return null
  try {
    return JSON.parse(decodeURIComponent(raw)) as AuthUser
  } catch {
    return null
  }
}

function readToken(key: string): string {
  const raw = getCookie(key)
  if (!raw) return ''
  try {
    return JSON.parse(decodeURIComponent(raw)) as string
  } catch {
    return raw
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  auth: {
    user: readUser(),
    setUser: (user) =>
      set((state) => {
        if (user) setCookie(AUTH_USER, encodeURIComponent(JSON.stringify(user)))
        else removeCookie(AUTH_USER)
        return { ...state, auth: { ...state.auth, user } }
      }),
    accessToken: readToken(ACCESS_TOKEN),
    refreshToken: readToken(REFRESH_TOKEN),
    schoolId: readToken(SCHOOL_ID),
    setAccessToken: (accessToken) =>
      set((state) => {
        setCookie(ACCESS_TOKEN, encodeURIComponent(JSON.stringify(accessToken)))
        return { ...state, auth: { ...state.auth, accessToken } }
      }),
    setRefreshToken: (refreshToken) =>
      set((state) => {
        setCookie(REFRESH_TOKEN, encodeURIComponent(JSON.stringify(refreshToken)))
        return { ...state, auth: { ...state.auth, refreshToken } }
      }),
    setSchoolId: (schoolId) =>
      set((state) => {
        setCookie(SCHOOL_ID, encodeURIComponent(JSON.stringify(schoolId)))
        return { ...state, auth: { ...state.auth, schoolId } }
      }),
    resetAccessToken: () =>
      set((state) => {
        removeCookie(ACCESS_TOKEN)
        return { ...state, auth: { ...state.auth, accessToken: '' } }
      }),
    reset: () =>
      set((state) => {
        removeCookie(ACCESS_TOKEN)
        removeCookie(REFRESH_TOKEN)
        removeCookie(AUTH_USER)
        removeCookie(SCHOOL_ID)
        return {
          ...state,
          auth: {
            ...state.auth,
            user: null,
            accessToken: '',
            refreshToken: '',
            schoolId: '',
          },
        }
      }),
  },
}))
