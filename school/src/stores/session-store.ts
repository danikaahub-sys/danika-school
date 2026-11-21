import { create } from 'zustand'
import { type BaseRole } from '@/features/access/permissions'

const VIEW_AS_KEY = 'danika.viewAs'
const YEAR_KEY = 'danika.year'

function readViewAs(): BaseRole | null {
  try {
    const value = localStorage.getItem(VIEW_AS_KEY)
    return (value as BaseRole | null) || null
  } catch {
    return null
  }
}

function readYear(): string {
  try {
    return localStorage.getItem(YEAR_KEY) ?? ''
  } catch {
    return ''
  }
}

interface SessionState {
  viewAsRole: BaseRole | null
  yearId: string
  setViewAsRole: (role: BaseRole | null) => void
  setYearId: (yearId: string) => void
}

export const useSessionStore = create<SessionState>()((set) => ({
  viewAsRole: readViewAs(),
  yearId: readYear(),
  setViewAsRole: (role) => {
    try {
      if (role) localStorage.setItem(VIEW_AS_KEY, role)
      else localStorage.removeItem(VIEW_AS_KEY)
    } catch {
      /* private mode */
    }
    set({ viewAsRole: role })
  },
  setYearId: (yearId) => {
    try {
      localStorage.setItem(YEAR_KEY, yearId)
    } catch {
      /* private mode */
    }
    set({ yearId })
  },
}))
