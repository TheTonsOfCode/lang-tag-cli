'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { i18nConfig } from './[locale]/layout';

// Import config from layout

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the default locale, e.g., /en
    router.replace(`/${i18nConfig.defaultLocale}`);
  }, [router]);

  // Render nothing or a loading indicator while redirecting
  return null;
}
