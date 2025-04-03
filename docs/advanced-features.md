# Advanced Features

This section explores more advanced capabilities of `lang-tag`, including pluralization handling and extending the configuration object.

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

You can extend the `LangTagTranslationsConfig` interface to include custom properties specific to your project's needs. This allows you to pass additional flags or settings through the configuration object.

Example: Adding `debugMode` and `manual` flags.

```ts
// Define your custom interface, extending the base type
interface CustomLangTagConfig extends LangTagTranslationsConfig {
  debugMode?: boolean;
  manual?: boolean; // Example: Flag to indicate manual configuration (see CLI Usage doc)
}

// Use the custom interface in your tag definition
export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: CustomLangTagConfig // Use the extended interface here
) {
  // You can now access your custom properties
  if (config?.debugMode) {
    console.log("Lang-tag debug:", config);
  }

  // Handle other logic, potentially using custom flags
  const actualPath = (config?.manual || config?.path?.startsWith('!')) 
    ? config.path?.substring(1) 
    : config?.path;
  
  // ... rest of implementation
}
``` 