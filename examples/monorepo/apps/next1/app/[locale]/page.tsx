'use client';

import { Button } from 'lib1';
import { useTranslation } from '@/i18n';
// import i18nInstance from '@/i18n'; // No longer needed directly if i18n from hook is sufficient
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface HomePageProps {
  params: { locale: string };
}

export default function HomePage({ params }: HomePageProps) {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const pathname = usePathname(); // Pathname will include the locale, e.g., /en or /pl
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Ensure i18next instance is synchronized with the locale from URL params on client mount
    if (params.locale && i18n.language !== params.locale) {
      i18n.changeLanguage(params.locale);
    }
  }, [params.locale, i18n]);

  const changeLanguage = (newLocale: string) => {
    // Pathname is like /en/about or /pl. We need to replace the current locale part.
    const newPath = pathname.replace(/^\/[^\/]+/, `/${newLocale}`);
    router.push(newPath);
  };

  if (!isMounted) {
    return null; 
  }

  return (
    <div>
      <h1>{t('homePageTitle')}</h1>
      <p>{t('homePageContent')}</p>
      <div className="my-4">
        <Button variant="primary" onClick={() => alert('Lib1 Button Clicked!')}>
          {t('buttonText')}
        </Button>
      </div>
      <div className="mt-4">
        <p>{t('currentLanguage', { lng: i18n.language })}</p>
        {i18n.language !== 'en' && (
          <button 
            onClick={() => changeLanguage('en')} 
            className="mr-2 p-2 bg-green-500 text-white rounded hover:bg-green-600">
            {t('changeToEnglish')}
          </button>
        )}
        {i18n.language !== 'pl' && (
          <button 
            onClick={() => changeLanguage('pl')} 
            className="p-2 bg-red-500 text-white rounded hover:bg-red-600">
            {t('changeToPolish')}
          </button>
        )}
      </div>
    </div>
  );
} 