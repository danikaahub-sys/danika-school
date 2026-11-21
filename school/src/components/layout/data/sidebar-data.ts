import {
  BookOpen,
  Building2,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  Home,
  Landmark,
  LayoutDashboard,
  Megaphone,
  School,
  Settings,
  Users,
} from 'lucide-react'
import { type PermissionKey } from '@/features/access/permissions'
import { type BaseRole } from '@/features/access/permissions'
import { type AttentionCounts } from '@/mocks'
import { t } from '@/i18n/t'
import { type NavGroup, type NavItem } from '../types'

function item(
  partial: NavItem & { permission?: PermissionKey }
): NavItem {
  return partial
}

export function getNavGroups(role: BaseRole, attention: AttentionCounts): NavGroup[] {
  const workdeskItems: NavItem[] = {
    principal: [
      item({ id: 'home', title: t('nav.home'), url: '/', icon: Home, permission: 'home.dashboard.view' }),
      item({
        id: 'attn',
        title: t('nav.attention'),
        url: '/',
        icon: ClipboardCheck,
        permission: 'home.dashboard.view',
        badge:
          attention.attendance +
            attention.receipts +
            attention.grades +
            attention.importErrors +
            attention.guardians || undefined,
        badgeTone: 'bad',
      }),
    ],
    deputy: [
      item({ id: 'home', title: t('nav.home'), url: '/', icon: Home, permission: 'home.dashboard.view' }),
      item({
        id: 'import',
        title: t('nav.import'),
        url: '/people/import',
        icon: FileSpreadsheet,
        permission: 'people.import.view',
        badge: attention.importErrors || undefined,
        badgeTone: 'warn',
      }),
    ],
    teacher: [
      item({ id: 'home', title: t('nav.home'), url: '/', icon: Home, permission: 'home.dashboard.view' }),
      item({
        id: 'class',
        title: t('nav.classroom'),
        url: '/classroom',
        icon: GraduationCap,
        permission: 'classroom.workspace.view',
      }),
      item({
        id: 'att',
        title: t('nav.attendance'),
        url: '/classroom/attendance',
        icon: ClipboardCheck,
        permission: 'classroom.attendance.view',
        badge: attention.attendance || undefined,
        badgeTone: 'warn',
      }),
    ],
    finance: [
      item({ id: 'home', title: t('nav.home'), url: '/', icon: Home, permission: 'home.dashboard.view' }),
      item({
        id: 'fin',
        title: t('nav.finance'),
        url: '/finance',
        icon: Landmark,
        permission: 'finance.ledger.view',
      }),
      item({
        id: 'queue',
        title: t('nav.verifyQueue'),
        url: '/finance',
        icon: ClipboardCheck,
        permission: 'finance.receipts.approve',
        badge: attention.receipts || undefined,
        badgeTone: 'bad',
      }),
    ],
    counselor: [
      item({ id: 'home', title: t('nav.home'), url: '/', icon: Home, permission: 'home.dashboard.view' }),
      item({
        id: 'people',
        title: t('nav.people'),
        url: '/people',
        icon: Users,
        permission: 'people.directory.view',
      }),
    ],
    staff: [
      item({ id: 'home', title: t('nav.home'), url: '/', icon: Home, permission: 'home.dashboard.view' }),
    ],
    guardian: [
      item({ id: 'home', title: t('nav.home'), url: '/', icon: Home, permission: 'home.dashboard.view' }),
      item({
        id: 'class',
        title: t('nav.classroom'),
        url: '/classroom',
        icon: BookOpen,
        permission: 'classroom.workspace.view',
      }),
    ],
    student: [
      item({ id: 'home', title: t('nav.home'), url: '/', icon: Home, permission: 'home.dashboard.view' }),
      item({
        id: 'class',
        title: t('nav.classroom'),
        url: '/classroom',
        icon: BookOpen,
        permission: 'classroom.workspace.view',
      }),
      item({
        id: 'hw',
        title: t('classroom.homework'),
        url: '/classroom',
        icon: BookOpen,
        permission: 'classroom.workspace.view',
      }),
      item({
        id: 'grades',
        title: t('nav.results'),
        url: '/classroom/results',
        icon: GraduationCap,
        permission: 'classroom.grades.view',
      }),
      item({
        id: 'comms',
        title: t('nav.comms'),
        url: '/communications',
        icon: Megaphone,
        permission: 'communications.compose.view',
      }),
    ],
  }[role]

  return [
    {
      id: 'workdesk',
      title: t('nav.workdesk'),
      icon: Home,
      pinned: true,
      items: workdeskItems,
    },
    {
      id: 'setup',
      title: t('nav.setup'),
      icon: School,
      items: [
        item({
          id: 'setup',
          title: t('nav.setup'),
          url: '/setup',
          icon: School,
          permission: 'setup.school.view',
        }),
      ],
    },
    {
      id: 'people',
      title: t('nav.people'),
      icon: Users,
      items: [
        item({
          id: 'directory',
          title: t('nav.people'),
          url: '/people',
          icon: Users,
          permission: 'people.directory.view',
        }),
        item({
          id: 'import',
          title: t('nav.import'),
          url: '/people/import',
          icon: FileSpreadsheet,
          permission: 'people.import.view',
          badge: attention.importErrors || undefined,
          badgeTone: 'warn',
        }),
      ],
    },
    {
      id: 'classroom',
      title: t('nav.classroom'),
      icon: GraduationCap,
      items: [
        item({
          id: 'classes',
          title: t('nav.classroom'),
          url: '/classroom',
          icon: GraduationCap,
          permission: 'classroom.workspace.view',
        }),
        item({
          id: 'attendance',
          title: t('nav.attendance'),
          url: '/classroom/attendance',
          icon: ClipboardCheck,
          permission: 'classroom.attendance.view',
        }),
        item({
          id: 'results',
          title: t('nav.results'),
          url: '/classroom/results',
          icon: BookOpen,
          permission: 'classroom.grades.view',
        }),
        item({
          id: 'exams',
          title: t('nav.exams'),
          url: '/coming-soon',
          search: { item: 'exams' },
          icon: LayoutDashboard,
          permission: 'stubs.exams.view',
          comingSoon: true,
        }),
        item({
          id: 'online',
          title: t('nav.online'),
          url: '/coming-soon',
          search: { item: 'online' },
          icon: LayoutDashboard,
          permission: 'stubs.online.view',
          comingSoon: true,
        }),
      ],
    },
    {
      id: 'finance',
      title: t('nav.finance'),
      icon: Landmark,
      items: [
        item({
          id: 'finance',
          title: t('nav.finance'),
          url: '/finance',
          icon: Landmark,
          permission: 'finance.ledger.view',
          badge: attention.receipts || undefined,
          badgeTone: 'bad',
        }),
      ],
    },
    {
      id: 'comms',
      title: t('nav.comms'),
      icon: Megaphone,
      items: [
        item({
          id: 'comms',
          title: t('nav.comms'),
          url: '/communications',
          icon: Megaphone,
          permission: 'communications.compose.view',
        }),
        item({
          id: 'admissions',
          title: t('nav.admissions'),
          url: '/coming-soon',
          search: { item: 'admissions' },
          icon: FileSpreadsheet,
          permission: 'stubs.admissions.view',
          comingSoon: true,
        }),
        item({
          id: 'website',
          title: t('nav.website'),
          url: '/coming-soon',
          search: { item: 'website' },
          icon: Building2,
          permission: 'stubs.website.view',
          comingSoon: true,
        }),
      ],
    },
    {
      id: 'admin',
      title: t('nav.admin'),
      icon: Settings,
      items: [
        item({
          id: 'admin',
          title: t('nav.admin'),
          url: '/admin',
          icon: Settings,
          permission: 'admin.users.view',
        }),
      ],
    },
  ]
}
