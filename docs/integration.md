# Integration with Translation Libraries

## Example with react-i18next

Lang Tag works seamlessly with popular translation libraries like react-i18next:

```ts
import {
  LangTagTranslationsConfig,
  LangTagTranslations,
  mapTranslationObjectToFunctions
} from "lang-tag";
import { useTranslation } from 'react-i18next';

export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: LangTagTranslationsConfig
) {
  const prefix = config.path ? config.path + '.' : '';

  return {
    // For server-side use cases
    keys() {
      return mapTranslationObjectToFunctions(translations, config, {
        transform: ({path}) => prefix + path
      });
    },

    // For client-side use cases
    useT() {
      const {t} = useTranslation(config?.namespace || '');
      
      return mapTranslationObjectToFunctions(translations, config, {
        transform: ({path, params}) => t(prefix + path, params)
      });
    }
  };
}
```

### Client-side Usage:

```tsx
'use client'

const translations = i18n({
  title: "Member profile"
}, { namespace: 'profile' });

export function ProfileComponent() {
  const t = translations.useT();
  
  return <h1>{t.title()}</h1>;
}
```

### Server-side Usage:

```tsx
const translations = i18n({
  title: "Member profile"
}, { namespace: 'profile' });

export async function Page({lang}) {
  const { t } = await initTranslations({ language: lang });
  
  return <h1>{t(translations.keys().title())}</h1>;
}
``` 