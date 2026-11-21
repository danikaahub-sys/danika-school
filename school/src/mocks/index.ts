import { type BaseRole, type PermissionSet, permissionsForRole } from '@/features/access/permissions'
import { type MoneyUnit } from '@/lib/money'

export type PersonKind = 'student' | 'staff' | 'guardian'
type PersonStatus = 'active' | 'invited' | 'deactivated'
export type AttendanceStatus = 'unmarked' | 'present' | 'absent' | 'late' | 'excused'
type SessionStatus = 'scheduled' | 'draft' | 'submitted'
type ReceiptStatus = 'pending' | 'posted' | 'reversed'
type InviteStatus = 'invited' | 'active' | 'deactivated'

export interface School {
  id: string
  name: string
  city: string
  moneyUnit: MoneyUnit
}

export interface AcademicYear {
  id: string
  label: string
  active: boolean
}

export interface Grade {
  id: string
  name: string
}

export interface SchoolClass {
  id: string
  name: string
  gradeId: string
}

export interface Subject {
  id: string
  name: string
}

export interface Person {
  id: string
  kind: PersonKind
  firstName: string
  lastName: string
  nationalId?: string
  phone?: string
  username: string
  classId?: string
  gradeId?: string
  role?: BaseRole
  positionId?: string
  status: PersonStatus
}

export interface GuardianLink {
  id: string
  guardianId: string
  studentId: string
  relation: string
  academicVisible: boolean
  financialVisible: boolean
  verified: boolean
}

export interface Assignment {
  id: string
  classId: string
  subjectId: string
  teacherId: string
}

export interface BellPeriod {
  id: string
  name: string
  start: string
  end: string
}

export interface TimetableCell {
  classId: string
  day: number
  periodId: string
  subjectId: string
  teacherId: string
}

export interface TeachingSession {
  id: string
  classId: string
  subjectId: string
  teacherId: string
  date: string
  periodId: string
  status: SessionStatus
  note?: string
}

export interface AttendanceRow {
  sessionId: string
  studentId: string
  status: AttendanceStatus
}

export interface Homework {
  id: string
  classId: string
  subjectId: string
  title: string
  due: string
  published: boolean
}

export interface DisciplineNote {
  id: string
  studentId: string
  classId: string
  title: string
  date: string
}

export interface Score {
  id: string
  studentId: string
  subjectId: string
  title: string
  earned: number | null
  maximum: number
  weight: number
  status: 'draft' | 'published' | 'missing' | 'exempt'
}

export interface TuitionPlan {
  id: string
  gradeId: string
  title: string
  amountIrr: number
}

export interface Charge {
  id: string
  studentId: string
  title: string
  amountIrr: number
  yearId: string
}

export interface Receipt {
  id: string
  studentId: string
  amountIrr: number
  status: ReceiptStatus
  ref: string
  date: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  channel: 'app' | 'sms' | 'both'
  sentAt: string
  audience: string
}

export interface Position {
  id: string
  name: string
  baseRole: BaseRole
  permissions: PermissionSet
}

export interface Membership {
  id: string
  personId: string
  positionId: string
  inviteStatus: InviteStatus
}

export interface AuditEvent {
  id: string
  at: string
  actor: string
  action: string
}

export interface AuthAccount {
  identifier: string
  personId: string
  role: BaseRole
}

export const school: School = {
  id: 's1',
  name: 'دبیرستان دانیکا',
  city: 'تهران',
  moneyUnit: 'toman',
}

export const years: AcademicYear[] = [
  { id: 'y1404', label: '۱۴۰۴–۱۴۰۵', active: false },
  { id: 'y1405', label: '۱۴۰۵–۱۴۰۶', active: true },
]

export const grades: Grade[] = [
  { id: 'g7', name: 'هفتم' },
  { id: 'g8', name: 'هشتم' },
  { id: 'g9', name: 'نهم' },
]

export const classes: SchoolClass[] = [
  { id: 'c7a', name: 'الف', gradeId: 'g7' },
  { id: 'c7b', name: 'ب', gradeId: 'g7' },
  { id: 'c8a', name: 'الف', gradeId: 'g8' },
  { id: 'c9a', name: 'الف', gradeId: 'g9' },
]

export const subjects: Subject[] = [
  { id: 'math', name: 'ریاضی' },
  { id: 'lit', name: 'فارسی' },
  { id: 'sci', name: 'علوم' },
  { id: 'eng', name: 'انگلیسی' },
]

export const periods: BellPeriod[] = [
  { id: 'p1', name: 'زنگ ۱', start: '۰۷:۴۵', end: '۰۸:۳۰' },
  { id: 'p2', name: 'زنگ ۲', start: '۰۸:۴۰', end: '۰۹:۲۵' },
  { id: 'p3', name: 'زنگ ۳', start: '۰۹:۳۵', end: '۱۰:۲۰' },
  { id: 'p4', name: 'زنگ ۴', start: '۱۰:۴۰', end: '۱۱:۲۵' },
]

export const positions: Position[] = [
  { id: 'pos-principal', name: 'مدیر مدرسه', baseRole: 'principal', permissions: 'all' },
  { id: 'pos-deputy', name: 'معاون', baseRole: 'deputy', permissions: permissionsForRole('deputy') },
  { id: 'pos-teacher', name: 'معلم', baseRole: 'teacher', permissions: permissionsForRole('teacher') },
  { id: 'pos-finance', name: 'حسابدار', baseRole: 'finance', permissions: permissionsForRole('finance') },
  { id: 'pos-student', name: 'دانش‌آموز', baseRole: 'student', permissions: permissionsForRole('student') },
]

const firstNames = ['علی', 'محمد', 'امیر', 'رضا', 'حسین', 'پارسا', 'آراد', 'کیان', 'سینا', 'نیما', 'یاسین', 'عرفان']
const lastNames = ['محمدی', 'حسینی', 'رضایی', 'کریمی', 'نوری', 'جعفری', 'کاظمی', 'موسوی', 'احمدی', 'نیکنام', 'شریفی', 'صادقی']

export const people: Person[] = [
  {
    id: 'staff-1',
    kind: 'staff',
    firstName: 'محمد',
    lastName: 'وحیدیان',
    phone: '09120000000',
    username: 'principal',
    role: 'principal',
    positionId: 'pos-principal',
    status: 'active',
  },
  {
    id: 'staff-2',
    kind: 'staff',
    firstName: 'سارا',
    lastName: 'احمدی',
    phone: '09121111111',
    username: 'deputy',
    role: 'deputy',
    positionId: 'pos-deputy',
    status: 'active',
  },
  {
    id: 'staff-3',
    kind: 'staff',
    firstName: 'رضا',
    lastName: 'نوری',
    phone: '09122222222',
    username: 'teacher',
    role: 'teacher',
    positionId: 'pos-teacher',
    status: 'active',
  },
  {
    id: 'staff-4',
    kind: 'staff',
    firstName: 'مینا',
    lastName: 'کاظمی',
    phone: '09123333333',
    username: 'teacher2',
    role: 'teacher',
    positionId: 'pos-teacher',
    status: 'active',
  },
  {
    id: 'staff-5',
    kind: 'staff',
    firstName: 'لیلا',
    lastName: 'جعفری',
    phone: '09124444444',
    username: 'finance',
    role: 'finance',
    positionId: 'pos-finance',
    status: 'active',
  },
]

const STUDENTS_PER_CLASS = 23

classes.forEach((schoolClass, classIndex) => {
  for (let i = 0; i < STUDENTS_PER_CLASS; i++) {
    const n = classIndex * STUDENTS_PER_CLASS + i
    people.push({
      id: `st-${n + 1}`,
      kind: 'student',
      firstName: firstNames[n % firstNames.length],
      lastName: lastNames[n % lastNames.length],
      nationalId: `00178789${String(n).padStart(2, '0')}`,
      phone: n === 0 ? '09125555555' : undefined,
      username: `student${n + 1}`,
      classId: schoolClass.id,
      gradeId: schoolClass.gradeId,
      role: 'student',
      positionId: 'pos-student',
      status: i % 11 === 10 ? 'invited' : 'active',
    })
  }
})

people.push(
  {
    id: 'g-1',
    kind: 'guardian',
    firstName: 'حسین',
    lastName: 'محمدی',
    phone: '09126666666',
    username: 'guardian1',
    role: 'guardian',
    status: 'active',
  },
  {
    id: 'g-2',
    kind: 'guardian',
    firstName: 'زهرا',
    lastName: 'حسینی',
    phone: '09127777777',
    username: 'guardian2',
    role: 'guardian',
    status: 'invited',
  }
)

export const guardianLinks: GuardianLink[] = [
  {
    id: 'gl-1',
    guardianId: 'g-1',
    studentId: 'st-1',
    relation: 'پدر',
    academicVisible: true,
    financialVisible: true,
    verified: true,
  },
  {
    id: 'gl-2',
    guardianId: 'g-1',
    studentId: 'st-2',
    relation: 'پدر',
    academicVisible: true,
    financialVisible: false,
    verified: false,
  },
  {
    id: 'gl-3',
    guardianId: 'g-2',
    studentId: 'st-7',
    relation: 'مادر',
    academicVisible: true,
    financialVisible: true,
    verified: false,
  },
]

export const assignments: Assignment[] = classes.flatMap((schoolClass) =>
  subjects.map((subject, index) => ({
    id: `as-${schoolClass.id}-${subject.id}`,
    classId: schoolClass.id,
    subjectId: subject.id,
    teacherId: index % 2 === 0 ? 'staff-3' : 'staff-4',
  }))
)

export const timetable: TimetableCell[] = classes.flatMap((schoolClass) =>
  periods.map((period, index) => ({
    classId: schoolClass.id,
    day: (index % 5) + 1,
    periodId: period.id,
    subjectId: subjects[index % subjects.length].id,
    teacherId: index % 2 === 0 ? 'staff-3' : 'staff-4',
  }))
)

export const sessions: TeachingSession[] = [
  {
    id: 'se-1',
    classId: 'c7a',
    subjectId: 'math',
    teacherId: 'staff-3',
    date: '2026-11-20',
    periodId: 'p1',
    status: 'draft',
    note: 'مرور معادله',
  },
  {
    id: 'se-2',
    classId: 'c7a',
    subjectId: 'lit',
    teacherId: 'staff-4',
    date: '2026-11-20',
    periodId: 'p2',
    status: 'scheduled',
  },
  {
    id: 'se-3',
    classId: 'c8a',
    subjectId: 'sci',
    teacherId: 'staff-3',
    date: '2026-11-20',
    periodId: 'p3',
    status: 'submitted',
  },
]

const studentsOf = (classId: string) =>
  people.filter((person) => person.kind === 'student' && person.classId === classId)

export const attendance: AttendanceRow[] = [
  ...studentsOf('c7a').map((student, index) => ({
    sessionId: 'se-1',
    studentId: student.id,
    status: (['present', 'present', 'late', 'absent', 'unmarked', 'excused'] as AttendanceStatus[])[
      index % 6
    ],
  })),
  ...studentsOf('c8a').map((student) => ({
    sessionId: 'se-3',
    studentId: student.id,
    status: 'present' as const,
  })),
]

export const homework: Homework[] = [
  {
    id: 'hw-1',
    classId: 'c7a',
    subjectId: 'math',
    title: 'تمرین صفحه ۴۲',
    due: '2026-11-22',
    published: true,
  },
  {
    id: 'hw-2',
    classId: 'c7a',
    subjectId: 'lit',
    title: 'خلاصه درس سوم',
    due: '2026-11-23',
    published: false,
  },
]

export const discipline: DisciplineNote[] = [
  {
    id: 'd-1',
    studentId: 'st-4',
    classId: 'c7a',
    title: 'تأخیر ورود به کلاس',
    date: '2026-11-18',
  },
]

export const scores: Score[] = studentsOf('c7a').flatMap((student, index) => [
  {
    id: `sc-${student.id}-1`,
    studentId: student.id,
    subjectId: 'math',
    title: 'آزمونک ۱',
    earned: index === 2 ? null : 16 + (index % 4),
    maximum: 20,
    weight: 1,
    status: index === 2 ? 'missing' : 'draft',
  },
  {
    id: `sc-${student.id}-2`,
    studentId: student.id,
    subjectId: 'math',
    title: 'فعالیت کلاسی',
    earned: 8,
    maximum: 10,
    weight: 1,
    status: 'published',
  },
])

export const tuitionPlans: TuitionPlan[] = [
  { id: 'tp-7', gradeId: 'g7', title: 'شهریه ترم اول', amountIrr: 180_000_000 },
  { id: 'tp-8', gradeId: 'g8', title: 'شهریه ترم اول', amountIrr: 190_000_000 },
  { id: 'tp-9', gradeId: 'g9', title: 'شهریه ترم اول', amountIrr: 200_000_000 },
]

export const charges: Charge[] = people
  .filter((person) => person.kind === 'student' && person.status === 'active')
  .map((student) => ({
    id: `ch-${student.id}`,
    studentId: student.id,
    title: 'شهریه ترم اول',
    amountIrr: tuitionPlans.find((plan) => plan.gradeId === student.gradeId)?.amountIrr ?? 0,
    yearId: 'y1405',
  }))

export const receipts: Receipt[] = [
  {
    id: 'rc-1',
    studentId: 'st-1',
    amountIrr: 50_000_000,
    status: 'pending',
    ref: 'R-1405-01',
    date: '2026-11-19',
  },
  {
    id: 'rc-2',
    studentId: 'st-3',
    amountIrr: 80_000_000,
    status: 'posted',
    ref: 'R-1405-02',
    date: '2026-11-12',
  },
  {
    id: 'rc-3',
    studentId: 'st-8',
    amountIrr: 20_000_000,
    status: 'pending',
    ref: 'R-1405-03',
    date: '2026-11-18',
  },
]

export const announcements: Announcement[] = [
  {
    id: 'an-1',
    title: 'تعطیلی پنجشنبه',
    body: 'پنجشنبه مدرسه تعطیل است.',
    channel: 'both',
    sentAt: '2026-11-17',
    audience: 'همه خانواده‌ها',
  },
  {
    id: 'an-2',
    title: 'یادآوری تکلیف ریاضی',
    body: 'تمرین صفحه ۴۲ تا شنبه تحویل داده شود.',
    channel: 'app',
    sentAt: '2026-11-18',
    audience: 'هفتم الف',
  },
]

export interface MessageTemplate {
  id: string
  title: string
  body: string
  channel: Announcement['channel']
}

export const templates: MessageTemplate[] = [
  {
    id: 'tpl-1',
    title: 'تعطیلی',
    body: 'مدرسه فردا تعطیل است.',
    channel: 'both',
  },
  {
    id: 'tpl-2',
    title: 'یادآوری شهریه',
    body: 'لطفاً شهریه را تا پایان ماه واریز کنید.',
    channel: 'sms',
  },
]

export interface Closure {
  id: string
  date: string
  title: string
}

export const closures: Closure[] = [
  { id: 'cl-1', date: '2026-11-19', title: 'تعطیلی رسمی' },
  { id: 'cl-2', date: '2026-12-06', title: 'جلسه اولیا' },
]

export interface StaffDay {
  personId: string
  status: AttendanceStatus
  date: string
}

export const staffAttendance: StaffDay[] = [
  { personId: 'staff-3', status: 'present', date: '2026-11-20' },
  { personId: 'staff-4', status: 'late', date: '2026-11-20' },
  { personId: 'staff-5', status: 'present', date: '2026-11-20' },
]

export const memberships: Membership[] = people
  .filter((person) => person.positionId)
  .map((person) => ({
    id: `m-${person.id}`,
    personId: person.id,
    positionId: person.positionId ?? 'pos-student',
    inviteStatus: person.status === 'invited' ? 'invited' : 'active',
  }))

export const auditLog: AuditEvent[] = [
  {
    id: 'au-1',
    at: '2026-11-20T07:10:00+03:30',
    actor: 'محمد وحیدیان',
    action: 'دعوت معلم ارسال شد',
  },
  {
    id: 'au-2',
    at: '2026-11-19T16:02:00+03:30',
    actor: 'لیلا جعفری',
    action: 'دریافت R-1405-02 ثبت شد',
  },
]

export const accounts: AuthAccount[] = [
  { identifier: '09120000000', personId: 'staff-1', role: 'principal' },
  { identifier: 'principal', personId: 'staff-1', role: 'principal' },
  { identifier: 'teacher', personId: 'staff-3', role: 'teacher' },
  { identifier: '09122222222', personId: 'staff-3', role: 'teacher' },
  { identifier: 'finance', personId: 'staff-5', role: 'finance' },
  { identifier: 'student', personId: 'st-1', role: 'student' },
  { identifier: '09125555555', personId: 'st-1', role: 'student' },
  { identifier: 'deputy', personId: 'staff-2', role: 'deputy' },
]

export function displayName(person: Person): string {
  return `${person.firstName} ${person.lastName}`
}

export function classLabel(classId: string): string {
  const schoolClass = classes.find((item) => item.id === classId)
  const grade = grades.find((item) => item.id === schoolClass?.gradeId)
  return schoolClass ? `${grade?.name} ${schoolClass.name}` : classId
}

export interface AttentionCounts {
  attendance: number
  receipts: number
  grades: number
  importErrors: number
  guardians: number
}

export function attentionCounts(): AttentionCounts {
  return {
    attendance: sessions.filter((session) => session.status !== 'submitted').length,
    receipts: receipts.filter((receipt) => receipt.status === 'pending').length,
    grades: scores.some((score) => score.status === 'draft') ? 1 : 0,
    importErrors: 2,
    guardians: guardianLinks.filter((link) => !link.verified).length,
  }
}
