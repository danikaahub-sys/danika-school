import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { CTABanner } from '@/features/landing/CTABanner';
import { Section } from '@/features/landing/Section';
import { AppConfig } from '@/utils/AppConfig';

export const CTA = () => {
  const t = useTranslations('CTA');

  return (
    <Section>
      <CTABanner
        title={t('title')}
        description={t('description')}
        buttons={(
          <a
            className={buttonVariants({ variant: 'secondary', size: 'lg', className: 'whitespace-pre-line' })}
            href={AppConfig.demoRequestUrl}
          >
            {t('button_text')}
          </a>
        )}
      />
    </Section>
  );
};
