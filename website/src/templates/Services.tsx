import { BuildingIcon, ClipboardCheckIcon, MonitorPlayIcon, SchoolIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FeatureCard } from '@/features/landing/FeatureCard';
import { Section } from '@/features/landing/Section';

const SERVICES = [
  { key: 'school', icon: SchoolIcon, isLive: true },
  { key: 'exam', icon: ClipboardCheckIcon, isLive: false },
  { key: 'classroom', icon: MonitorPlayIcon, isLive: false },
  { key: 'institute', icon: BuildingIcon, isLive: false },
] as const;

export const Services = () => {
  const t = useTranslations('Services');

  return (
    <Section
      id="services"
      subtitle={t('section_subtitle')}
      title={t('section_title')}
      description={t('section_description')}
    >
      <div className="
        grid grid-cols-1 gap-x-3 gap-y-8
        md:grid-cols-2
      "
      >
        {SERVICES.map(service => (
          <FeatureCard
            key={service.key}
            icon={<service.icon className="size-full" />}
            title={`${t(`${service.key}_title`)} (${t(service.isLive ? 'status_live' : 'status_soon')})`}
          >
            {t(`${service.key}_description`)}
          </FeatureCard>
        ))}
      </div>
    </Section>
  );
};
