import { useTranslations } from 'next-intl';
import { CenteredFooter } from '@/features/landing/CenteredFooter';
import { Section } from '@/features/landing/Section';
import { Link } from '@/libs/I18nNavigation';
import { AppConfig } from '@/utils/AppConfig';
import { Logo } from './Logo';

export const Footer = () => {
  const t = useTranslations('Footer');

  return (
    <Section className="pt-0 pb-16">
      <CenteredFooter
        logo={<Logo />}
        name={AppConfig.name}
        iconList={null}
        legalLinks={(
          <>
            <li>
              <Link href="/">{t('terms_of_service')}</Link>
            </li>
            <li>
              <Link href="/">{t('privacy_policy')}</Link>
            </li>
          </>
        )}
      >
        <li>
          <Link href="/#services">{t('services')}</Link>
        </li>

        <li>
          <Link href="/school">{t('school')}</Link>
        </li>

        <li>
          <Link href="/#faq">{t('faq')}</Link>
        </li>

        <li>
          <a href={`mailto:${AppConfig.email.support}`} dir="ltr">
            {AppConfig.email.support}
          </a>
        </li>
      </CenteredFooter>
    </Section>
  );
};
