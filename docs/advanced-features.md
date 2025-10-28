# Advanced Features

This section explores more advanced capabilities of `lang-tag`, including pluralization handling and extending the configuration object.

## Pluralization Support (using `processKey`)

Implement pluralization by defining a `processKey` function within your `TranslationMappingStrategy`. This function can inspect original keys and use the `addProcessedKey` callback to generate new, simplified keys that your translation library (like `i18next`) can use for plural resolution.

For example, if your translation library expects keys like `product` for pluralization and you define `product_one` and `product_other` in your source, `processKey` can map these to a single `product` key at runtime.

```ts
// src/utils/i18n-tag.ts (example of your custom tag)
import {
  LangTagTranslations,
  LangTagTranslationsConfig,
  TranslationKeyProcessor,
  // For typing the processKey function
  TranslationKeyProcessorContext,
  // For typing the context passed to processKey
  createCallableTranslations,
  defaultTranslationTransformer,
} from 'lang-tag';
import { useTranslation } from 'react-i18next';

// Assuming integration with react-i18next

export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: LangTagTranslationsConfig
) {
  const keyProcessor: TranslationKeyProcessor<LangTagTranslationsConfig> = (
    context: TranslationKeyProcessorContext<LangTagTranslationsConfig>,
    addProcessedKey: (newKey: string, originalValue: string) => void
  ) => {
    const { key, path } = context; // original key and its full path
    // Here, 'value' from TranslationTransformContext is not available in TranslationKeyProcessorContext.
    // We need the original string value. The `transformTranslationsToFunctions` should pass it.
    // For now, we assume the `addProcessedKey` callback will receive the original value.

    // Example: if key is "product_other", create a "product" key.
    // The actual translation value for "product" will be taken from "product_other".
    // This assumes your i18next (or similar) setup handles plural forms based on the base key + count.
    if (
      key.endsWith('_one') ||
      key.endsWith('_other') ||
      key.endsWith('_many') ||
      key.endsWith('_zero') ||
      key.endsWith('_two') ||
      key.endsWith('_few')
    ) {
      const baseKey = key.substring(0, key.lastIndexOf('_'));
      // We need the original string value associated with `key` to pass to `addProcessedKey`.
      // This example assumes `addProcessedKey` can access it or it's passed correctly.
      // The `transformTranslationsToFunctions` needs to make `originalValue` available here.
      // Let's assume `context` also contains `originalValue` for the key being processed.
      // This requires a slight change in TranslationKeyProcessorContext or how it's called.
      // For now, this conceptual example proceeds with the assumption it can access the value.

      // A simplified `processKey` might look like this if it directly receives the value:
      // (Currently, `transformTranslationsToFunctions` calls `addProcessedKey` with the original value from `Object.entries`)
      // We are adding the baseKey (e.g., "product") and associating it with the value of the specific plural form (e.g., value of "product_other")
      // This might not be what i18next expects if it needs all plural forms under one key.
      // A more common i18next pattern is that `t('product', { count: 1 })` finds `product_one`.
      // So, `processKey` might just ensure the base key is accessible if needed, or do nothing if i18next handles suffixes.

      // Let's refine: If i18next uses keys like `key_plural`, `key_one`, then `processKey` might not be needed
      // for simple suffix stripping if the lookup path is already correct.
      // However, if you want `t.product()` to work and have i18next pick `product_one` or `product_other`,
      // you need to ensure `product` itself becomes a callable key.

      // This example demonstrates creating an ALIAS: `t.product()` becomes `t.product_other()` or `t.product_one()`
      // This is NOT standard i18next pluralization, but an example of key manipulation.
      // Standard i18next would use `t('product', {count})` and it would resolve to `product_one` or `product_other` etc.
      // In that standard case, processKey might not be needed if your keys are already structured like `product_one`.

      // If the goal is to have `t.product()` which then uses i18next's pluralization for `path.product`,
      // then `addProcessedKey(baseKey, originalValue)` is what you'd do. `originalValue` here is a bit tricky,
      // as it should be the *concept* of the translation, not a specific plural form string.
      // This example is more for aliasing based on suffixes.

      // Let's simplify the pluralization example to be more about key aliasing:
      // If you have `message_plural` and want `message()` to call it:
      if (key.endsWith('_plural')) {
        const baseName = key.substring(0, key.lastIndexOf('_plural'));
        // The `addProcessedKey` in `transformTranslationsToFunctions` gets `originalValue` from the loop.
        addProcessedKey(baseName, 'referencing_plural_form'); // The value here needs to be the actual string of `key`
        // The current `addProcessedKey` in my refactor of `index.ts` passes the correct value.
      }
      // Add the original key too, so `t.message_plural()` also works.
      // (The refactored `transformTranslationsToFunctions` adds the original key by default if not added by processKey)
    }
  };

  // This is a conceptual structure. The actual implementation of `keys()` and `useT()`
  // would depend on your integration (e.g., with react-i18next).
  return {
    // Example: direct key access (mainly for non-React contexts or to get raw keys)
    raw: createCallableTranslations(translations, config, {
      transform: defaultTranslationTransformer,
      processKey: keyProcessor,
    }),
    // Example: integration with react-i18next
    useT: () => {
      const { t } = useTranslation(config?.namespace || '');
      return createCallableTranslations(translations, config, {
        transform: ({ path, params }) => t(path, params), // `path` is the fully resolved key path
        processKey: keyProcessor, // Apply the same key processing logic
      });
    },
  };
}
```

**Usage Example (Conceptual):**

Assuming `processKey` is set up to alias `product_other` to `product`:

```tsx
// Define translations with plural forms that your `processKey` understands
const translations = i18n(
  {
    product_one: '{{count}} product',
    product_other: '{{count}} products', // This might be aliased to 'product' by processKey
  },
  { namespace: 'shop' }
);

function ProductCount({ count }: { count: number }) {
  const t = translations.useT(); // Get the i18next integrated t-function object

  // If processKey aliased product_other to product, and react-i18next is configured for pluralization:
  // Calling t.product({ count }) could potentially work if i18next resolves it.
  // Or, if processKey simply created t.product() as an alias for t.product_other():
  // return <span>{t.product({ count })}</span>;

  // More standard i18next: rely on i18next to pick the right key based on count
  // Here, `t.product_other` or `t.product_one` would be the direct keys from lang-tag.
  // If your keys are named `product_one`, `product_other`, you might call directly:
  let textToShow = '';
  if (count === 1) {
    textToShow = t.product_one({ count });
  } else {
    textToShow = t.product_other({ count });
  }
  return <span>{textToShow}</span>;
  // OR, if i18next is set up to resolve "product" with a count param to product_one/product_other:
  // return <span>{t.product({ count })}</span>; // This requires that 'product' is a known key to i18next.
  // `lang-tag` primarily gives you the typed accessor `t.product_one`, `t.product_other`.
  // How these are used with i18next plural rules depends on your i18next setup.
}
```

_The `processKey` functionality is powerful for advanced key transformations. The example above is illustrative; real-world pluralization often relies heavily on the i18n library's specific conventions (e.g., `i18next` looking for `_plural`, `_0`, `_1` suffixes based on a base key). `processKey` can help bridge gaps or implement custom schemes._

## Custom Configuration Extensions

You can extend the `LangTagTranslationsConfig` interface to include custom properties specific to your project's needs. This allows you to pass additional flags or settings through the configuration object when you call your custom tag function (e.g., `i18n`).

Example: Adding `debugMode` and `manual` flags (as seen in CLI Usage docs for `onConfigGeneration`).

```ts
// src/types/app-i18n-config.ts
import { LangTagTranslationsConfig } from 'lang-tag';

// Define your custom interface, extending the base type
export interface MyAppTranslationsConfig extends LangTagTranslationsConfig {
  debugMode?: boolean;
  manual?: boolean; // Example: Flag to indicate manual configuration (see CLI Usage doc)
}
```

```ts
// src/utils/i18n-tag.ts (your custom tag definition)
import {
  LangTagTranslations,
  createCallableTranslations,
  defaultTranslationTransformer,
} from 'lang-tag';

import { MyAppTranslationsConfig } from '../types/app-i18n-config';

// Import your custom config type

export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: MyAppTranslationsConfig // Use the extended interface here
) {
  if (config?.debugMode) {
    console.log('Lang-tag i18n (debug mode ON):', {
      translations,
      config,
    });
  }

  // Example: custom logic based on the extended config
  let effectivePath = config?.path;
  if (config?.manual && config.path?.startsWith('!')) {
    effectivePath = config.path.substring(1); // Strip '!' if manual
  }

  const finalConfig = { ...config, path: effectivePath };

  return createCallableTranslations(translations, finalConfig, {
    transform: defaultTranslationTransformer,
    // You could also make the transform function behave differently based on `config` flags
  });
}
```

**Usage with custom config:**

```tsx
// myComponent.tsx
import { i18n } from '../utils/i18n-tag';

const translations = i18n(
  { title: 'My Component Title' },
  {
    namespace: 'myFeature',
    path: '!myComponentPath', // Manual path, starts with '!'
    debugMode: true,
    manual: true,
  }
);

// console output from i18n function due to debugMode: true
// translations.title() will use the path 'myComponentPath' (without '!') if handled by the tag.
```
