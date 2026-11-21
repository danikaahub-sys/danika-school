import { t } from '@/i18n/t'
import { ComingSoon } from '@/components/coming-soon'
import { Main } from '@/components/layout/main'

const TITLES: Record<string, string> = {
  exams: 'nav.exams',
  online: 'nav.online',
  admissions: 'nav.admissions',
  website: 'nav.website',
  help: 'nav.help',
}

export function ComingSoonPage({ item }: { item?: string }) {
  const key = item ? TITLES[item] : undefined
  return (
    <Main>
      <ComingSoon title={key ? t(key as 'nav.exams') : undefined} />
    </Main>
  )
}
