import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { Section } from '@/features/landing/Section';
import { AppConfig } from '@/utils/AppConfig';
import { cn } from '@/utils/Helpers';

export const Pricing = () => {
  const t = useTranslations('Pricing');

  return (
    <Section
      id="pricing"
      subtitle={t('section_subtitle')}
      title={t('section_title')}
      description={t('section_description')}
    >
      <div className="text-center">
        <a
          className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-6 text-base')}
          href={AppConfig.demoRequestUrl}
        >
          {t('button_text')}
        </a>
      </div>
    </Section>
  );
};
