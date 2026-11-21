import type { Metadata } from 'next';
import {
  CalendarDaysIcon,
  ClipboardListIcon,
  FileTextIcon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Background } from '@/components/Background';
import { buttonVariants } from '@/components/ui/buttonVariants';
import { CenteredHero } from '@/features/landing/CenteredHero';
import { FeatureCard } from '@/features/landing/FeatureCard';
import { Section } from '@/features/landing/Section';
import { Footer } from '@/templates/Footer';
import { Navbar } from '@/templates/Navbar';
import { AppConfig } from '@/utils/AppConfig';
import { cn } from '@/utils/Helpers';

const FEATURES = [
  { key: 'students', icon: UsersIcon },
  { key: 'classes', icon: CalendarDaysIcon },
  { key: 'attendance', icon: ClipboardListIcon },
  { key: 'grades', icon: FileTextIcon },
  { key: 'parents', icon: MessageSquareTextIcon },
  { key: 'roles', icon: ShieldCheckIcon },
] as const;

type SchoolPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: SchoolPageProps): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({
    locale,
    namespace: 'SchoolPage',
  });

  return {
    title: t('meta_title'),
    description: t('meta_description'),
  };
}

export default async function SchoolPage(props: SchoolPageProps) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const t = await getTranslations({
    locale,
    namespace: 'SchoolPage',
  });
  const tFeatures = await getTranslations({
    locale,
    namespace: 'Features',
  });

  const demoSignInUrl = `${AppConfig.schoolUrl.replace(/\/$/, '')}/sign-in`;

  return (
    <>
      <Navbar />

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
              <a
                className={cn(buttonVariants({ size: 'lg' }), `
                  h-11 px-6 text-base
                `)}
                href={demoSignInUrl}
              >
                {t('view_demo')}
              </a>

              <a
                className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), `
                  h-11 px-6 text-base
                `)}
                href={AppConfig.demoRequestUrl}
              >
                {t('request_demo')}
              </a>
            </>
          )}
        />
      </Section>

      <Background>
        <Section
          subtitle={t('features_subtitle')}
          title={t('features_title')}
          description={t('features_description')}
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
                title={tFeatures(`${feature.key}_title`)}
              >
                {tFeatures(`${feature.key}_description`)}
              </FeatureCard>
            ))}
          </div>
        </Section>
      </Background>

      <Footer />
    </>
  );
}
