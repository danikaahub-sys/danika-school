import type { OverviewRange } from './api'

/** DEV preview payload when the live period has no activity yet. */
export function sampleOverviewActivity(range: {
  key: OverviewRange
  from: string
  to: string
}) {
  const days = buildTrendDays(range)
  return {
    attendance: {
      present: 78,
      absent: 9,
      late: 4,
      excused: 2,
      unmarked: 5,
      rate: 86.7,
      prevRate: 82.1,
      prevAbsent: 12,
    },
    sessions: {
      total: 18,
      submitted: 14,
      pending: 4,
      prevTotal: 16,
      prevSubmitted: 11,
    },
    staff: { present: 7, absent: 1 },
    finance: {
      collectedIrr: 45_000_000,
      prevCollectedIrr: 38_000_000,
      postedCount: 6,
      pendingCount: 2,
      pendingIrr: 8_500_000,
    },
    activity: { homeworkDue: 5, announcementsSent: 2 },
    absencesByClass: [
      { classId: 'sample-c1', label: 'هفتم الف', absent: 4 },
      { classId: 'sample-c2', label: 'هشتم ب', absent: 3 },
      { classId: 'sample-c3', label: 'نهم الف', absent: 2 },
    ],
    trend: days.map((date, index) => ({
      date,
      attendanceRate: 80 + ((index * 3) % 12),
      collectedIrr: 4_000_000 + index * 1_200_000,
    })),
  }
}

export function isOverviewActivityEmpty(data: {
  sessions: { total: number }
  attendance: { present: number; absent: number; unmarked: number }
  finance: { collectedIrr: number }
}): boolean {
  return (
    data.sessions.total === 0 &&
    data.attendance.present +
      data.attendance.absent +
      data.attendance.unmarked ===
      0 &&
    data.finance.collectedIrr === 0
  )
}

function buildTrendDays(range: {
  key: OverviewRange
  from: string
  to: string
}): string[] {
  const end = range.to || range.from
  if (!end) return []
  const count = range.key === 'month' ? 14 : 7
  const out: string[] = []
  const cursor = new Date(`${end}T00:00:00.000Z`)
  for (let i = count - 1; i >= 0; i -= 1) {
    const day = new Date(cursor)
    day.setUTCDate(cursor.getUTCDate() - i)
    out.push(day.toISOString().slice(0, 10))
  }
  return out
}
