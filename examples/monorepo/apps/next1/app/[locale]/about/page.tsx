'use client';

import { useTranslation } from '@/i18n';
import { useEffect, useState } from 'react';

interface AboutPageProps {
  params: { locale: string };
}

export default function AboutPage({ params }: AboutPageProps) {
  console.log('[AboutPage] Rendering with params.locale:', params.locale);
  const { t, i18n } = useTranslation('common', params.locale);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    console.log('[AboutPage] useEffect: current i18n.language:', i18n.language, 'desired params.locale:', params.locale);
    setIsMounted(true);
    if (params.locale && i18n.language !== params.locale) {
      console.log('[AboutPage] useEffect: Changing language to', params.locale);
      i18n.changeLanguage(params.locale).then(() => {
        console.log('[AboutPage] useEffect: Language changed to', i18n.language, 'Does it have pl common bundle?', i18n.hasResourceBundle('pl', 'common'));
        // Force re-render if necessary, though useTranslation should handle it
        // This might be an aggressive way, usually not needed.
        // router.refresh(); // or a state update that causes re-render
      });
    } else {
      console.log('[AboutPage] useEffect: No language change needed or params.locale is missing.');
    }
  }, [params.locale, i18n]);

  if (!isMounted) {
    console.log('[AboutPage] Not mounted yet, returning null.');
    return null;
  }

  console.log('[AboutPage] Mounted, rendering. Current i18n.language for t():', i18n.language);
  return (
    <div>
      <h1>{t('aboutPageTitle')}</h1>
      <p>{t('aboutPageContent')}</p>
    </div>
  );
} 