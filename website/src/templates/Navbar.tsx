import { useTranslations } from 'next-intl';
import { CenteredMenu } from '@/features/landing/CenteredMenu';
import { Section } from '@/features/landing/Section';
import { Link } from '@/libs/I18nNavigation';
import { Logo } from './Logo';

export const Navbar = () => {
  const t = useTranslations('Navbar');

  return (
    <Section className="px-3 py-6">
      <CenteredMenu logo={<Logo />} rightMenu={null}>
        <li>
          <Link href="/#services">{t('services')}</Link>
        </li>

        <li>
          <Link href="/school">{t('school')}</Link>
        </li>

        <li>
          <Link href="/#pricing">{t('pricing')}</Link>
        </li>

        <li>
          <Link href="/#faq">{t('faq')}</Link>
        </li>
      </CenteredMenu>
    </Section>
  );
};
