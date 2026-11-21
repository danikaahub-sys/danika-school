import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { CenteredHero } from '@/features/landing/CenteredHero';
import { Section } from '@/features/landing/Section';
import { Link } from '@/libs/I18nNavigation';
import { cn } from '@/utils/Helpers';

export const Hero = () => {
  const t = useTranslations('Hero');

  return (
    <Section className="
      py-0 pt-40 pb-24
      md:pt-52 md:pb-36
    "
    >
      <CenteredHero
        banner={null}
        title={t.rich('title', {
          important: chunks => (
            <span className="text-primary">{chunks}</span>
          ),
        })}
        description={t('description')}
        buttons={(
          <>
            <Link
              className={cn(buttonVariants({ size: 'lg' }), `
                h-11 px-6 text-base
              `)}
              href="/school"
            >
              {t('primary_button')}
            </Link>

            <a
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), `
                h-11 px-6 text-base
              `)}
              href="#features"
            >
              {t('secondary_button')}
            </a>
          </>
        )}
      />
    </Section>
  );
};
