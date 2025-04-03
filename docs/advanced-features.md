# Advanced Features

## Pluralization Support

Implement pluralization using the `onKeyAppend` option:

```ts
import {
  LangTagTranslationsConfig,
  LangTagTranslations,
  mapTranslationObjectToFunctions,
  TranslationsToFunctionsMapperOnKeyAppend
} from "lang-tag";

export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: LangTagTranslationsConfig
) {
  const onKeyAppend: TranslationsToFunctionsMapperOnKeyAppend = ({key}, appendKey) => {
    if (key.endsWith('_other')) {
      const shorten = key.slice(0, key.lastIndexOf('_other'));
      appendKey(shorten);
    }
  };

  return {
    keys() {
      return mapTranslationObjectToFunctions(translations, config, {
        transform: ({path}) => path,
        onKeyAppend
      });
    },
    useT() {
      const {t} = useTranslation(config?.namespace || '');
      
      return mapTranslationObjectToFunctions(translations, config, {
        transform: ({path, params}) => t(path, params),
        onKeyAppend
      });
    }
  };
}
```

Usage example:

```tsx
const translations = i18n({
  product_one: "{{count}} product",
  product_other: "{{count}} products"
}, { namespace: 'shop' });

function ProductCount({ count }) {
  const t = translations.useT();
  
  return <span>{t.product({ count })}</span>;
}
```

## Custom Configuration Extensions

You can extend the configuration with custom properties:

```ts
interface CustomLangTagConfig extends LangTagTranslationsConfig {
  debugMode?: boolean;
  manual?: boolean; // Flag to indicate manual configuration
}

export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: CustomLangTagConfig
) {
  // Custom prefix '!' functionalities
  const actualPath = config?.path?.startsWith('!') 
    ? config.path.substring(1) 
    : config?.path;
  
  // Rest of implementation using actualPath instead of config.path
  // ...
}
``` 