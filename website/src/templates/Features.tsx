import {
  CalendarDaysIcon,
  ClipboardListIcon,
  FileTextIcon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Background } from '@/components/Background';
import { FeatureCard } from '@/features/landing/FeatureCard';
import { Section } from '@/features/landing/Section';

const FEATURES = [
  { key: 'students', icon: UsersIcon },
  { key: 'classes', icon: CalendarDaysIcon },
  { key: 'attendance', icon: ClipboardListIcon },
  { key: 'grades', icon: FileTextIcon },
  { key: 'parents', icon: MessageSquareTextIcon },
  { key: 'roles', icon: ShieldCheckIcon },
] as const;

export const Features = () => {
  const t = useTranslations('Features');

  return (
    <Background>
      <Section
        id="features"
        subtitle={t('section_subtitle')}
        title={t('section_title')}
        description={t('section_description')}
      >
        <div className="
          grid grid-cols-1 gap-x-3 gap-y-8
          md:grid-cols-3
        "
        >
          {FEATURES.map(feature => (
            <FeatureCard
              key={feature.key}
              icon={<feature.icon className="size-full" />}
              title={t(`${feature.key}_title`)}
            >
              {t(`${feature.key}_description`)}
            </FeatureCard>
          ))}
        </div>
      </Section>
    </Background>
  );
};
