import type { LocalizationResource } from '@clerk/shared/types';
import type { LocalePrefixMode } from 'next-intl/routing';
import type { AppLocale } from '@/types/I18n';
import { enUS } from '@clerk/localizations';

/** Locale prefix strategy for next-intl routing. */
const localePrefix: LocalePrefixMode = 'as-needed';
const locales = [
  {
    id: 'fa',
    name: 'فارسی',
  },
] satisfies AppLocale[];

const schoolUrlFromEnv = process.env.NEXT_PUBLIC_SCHOOL_URL?.trim();

/** Centralized application configuration */
export const AppConfig = {
  name: 'دانیکا',
  i18n: {
    locales,
    defaultLocale: 'fa',
    localePrefix,
  },
  email: {
    support: 'contact@danikahub.ir',
  },
  demoRequestUrl: `mailto:contact@danikahub.ir?subject=${encodeURIComponent('درخواست دمو دانیکا')}`,
  /** Public school app origin; validated optionally via Env.NEXT_PUBLIC_SCHOOL_URL. */
  schoolUrl: schoolUrlFromEnv && schoolUrlFromEnv.length > 0
    ? schoolUrlFromEnv
    : 'http://school.localhost:5173',
} as const;

/** Clerk UI stays English until auth is enabled; fa localization can be wired later. */
const supportedLocales: Record<string, LocalizationResource> = {
  fa: enUS,
};

export const ClerkLocalizations = {
  defaultLocale: enUS,
  supportedLocales,
};

export const AllLocales = AppConfig.i18n.locales.map(locale => locale.id);
