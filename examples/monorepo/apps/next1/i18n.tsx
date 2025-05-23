'use client';

import i18n from 'i18next';
import { initReactI18next, useTranslation as useTranslationOrg } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { type ReactNode, useEffect } from 'react';

// Import your translations
import enCommon from './locales/en/common.json';
import plCommon from './locales/pl/common.json';

export const resources = {
  en: {
    common: enCommon,
  },
  pl: {
    common: plCommon,
  },
} as const;

i18n
  // .use(LanguageDetector) // Temporarily disable to test if it interferes
  .use(initReactI18next)
  .init({
    // debug: process.env.NODE_ENV === 'development',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    resources,
    // ns: ['common'], // default namespace
    // defaultNS: 'common',
  });

// Custom hook to ensure type safety with your resources
export function useTranslation(ns?: keyof (typeof resources)['en'], lng?: string) {
  return useTranslationOrg(ns, { lng });
}

// Provider component to wrap your layout or specific parts of the app
export function I18nProviderClient({ children, locale }: { children: ReactNode, locale: string }): JSX.Element {
  useEffect(() => {
    if (i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  return <>{children}</>;
}

export default i18n; 