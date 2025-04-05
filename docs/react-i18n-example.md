# Integrating `lang-tag` with `react-i18next`

This guide demonstrates how to leverage `lang-tag`'s component-colocated translation definitions alongside the popular `react-i18next` library. This approach allows you to define translations directly within your React components and use `lang-tag`'s CLI tools to automatically generate the namespace-based resource files that `react-i18next` consumes.

## Prerequisites

*   `lang-tag` installed in your project.
*   `react-i18next` and `i18next` installed:
    ```bash
    npm install react-i18next i18next --save
    # or
    yarn add react-i18next i18next
    # or
    pnpm add react-i18next i18next
    ```

## Setup Steps

### 1. Create Your Custom Translation Tag Function

Define a custom function (let's call it `i18n`) that uses `lang-tag`'s `mapTranslationObjectToFunctions` and integrates with `react-i18next`'s `useTranslation` hook. This function will serve as the marker for `lang-tag`'s CLI and provide hooks/utilities for your components.

```typescript
// src/lib/i18n.ts (or your preferred location)
import {
  LangTagTranslationsConfig,
  LangTagTranslations,
  mapTranslationObjectToFunctions
} from "lang-tag";
import { useTranslation } from 'react-i18next';

// Define your custom tag function
export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: LangTagTranslationsConfig
) {
  return {
    /**
     * Returns an object mapping original keys to their final translation paths.
     * Useful for scenarios where the hook cannot be used (e.g., SSR, constants).
     * Note: This only provides the key path, not the translated string.
     */
    keys() {
      return mapTranslationObjectToFunctions(translations, config, {
        // The transform function here simply returns the final calculated path
        transform: ({ path }) => path
      });
    },

    /**
     * A React hook that provides a typed `t` function for client-side rendering.
     * It uses react-i18next's `useTranslation` internally.
     */
    useT() {
      // Determine the namespace to pass to useTranslation.
      // It uses the namespace from the inline config if provided,
      // otherwise, it falls back to an empty string (relying on react-i18next's defaultNS or key format).
      // The namespace might also be set/overridden by `onConfigGeneration` in .lang-tag.config.js
      const namespace = config?.namespace || ''; 
      const { t } = useTranslation(namespace);

      // Return a typed object where methods correspond to your keys
      return mapTranslationObjectToFunctions(translations, config, {
        // The transform function calls react-i18next's `t` function
        // with the calculated path and any provided parameters.
        transform: ({ path, params }) => t(path, params)
      });
    }
  };
}
```

**Explanation:**

*   It imports necessary types (`LangTagTranslations`, `LangTagTranslationsConfig`) and the core helper (`mapTranslationObjectToFunctions`) from `lang-tag`.
*   It accepts the `translations` object and an optional inline `config` (`{ namespace?: string, path?: string }`).
*   `keys()`: Uses `mapTranslationObjectToFunctions` with a simple transform to return the final key path (e.g., `myComponent.greeting`). This path incorporates the base path potentially derived from the filename (via `onConfigGeneration`) and any path specified in the inline `config`.
*   `useT()`: This is the primary hook for components. It calls `react-i18next`'s `useTranslation` hook, optionally passing the namespace derived from the inline `config`. It then uses `mapTranslationObjectToFunctions` again, but this time the transform function actually calls the `t` function from `react-i18next` to perform the translation lookup using the final calculated path.

### 2. Configure `react-i18next`

Set up `react-i18next` to load translation resources. Ensure the `loadPath` in the backend configuration points to where `lang-tag` will output the JSON files.

```typescript
// src/i18next-config.ts (or your config file)
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpApi) // Use backend to load translations
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Passes i18n instance to react-i18next
  .init({
    fallbackLng: 'en', // Use 'en' if detected language is not available
    debug: process.env.NODE_ENV === 'development',

    // Define namespaces used in your project
    ns: ['common', 'auth', 'dashboard', 'products'], 
    defaultNS: 'common', // Default namespace used if not specified

    backend: {
      // Path to load translation files from
      // {{lng}} = language code (e.g., 'en')
      // {{ns}} = namespace (e.g., 'auth')
      // This MUST match lang-tag's output structure
      loadPath: '/locales/{{lng}}/{{ns}}.json', 
    },

    interpolation: {
      escapeValue: false, // React already safes from xss
    },
  });

export default i18n;
```
*Remember to initialize this configuration in your application's entry point (e.g., `main.tsx` or `index.js`).*

### 3. Configure `lang-tag` (`.lang-tag.config.js`)

Create a `.lang-tag.config.js` file in your project root to tell the `lang-tag` CLI how to find your translations and where to put the generated files.

```javascript
// .lang-tag.config.js
const path = require('path');

/** @type {import('lang-tag').LangTagConfig} */
module.exports = {
  // Tell lang-tag to look for our custom 'i18n' function calls.
  // NOTE: The mechanism for detecting custom tags might evolve.
  // Ensure this aligns with how lang-tag identifies your function calls.
  // If your function is named `lang`, the default `tagName: 'lang'` might suffice.
  // For this example, assuming we need to specify 'i18n':
  // tagName: 'i18n', // Adjust if needed based on lang-tag's detection mechanism

  includes: ['src/**/*.{ts,tsx}'], // Scan these files
  excludes: [
    'node_modules/**',
    'dist/**',
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
  ],

  // Output directory for the base language (e.g., English)
  // Structure should match react-i18next loadPath: locales/en/common.json, locales/en/auth.json etc.
  outputDir: 'public/locales/en',

  // Automatic config generation based on file path
  onConfigGeneration: (params) => {
    const { path: relativeFilePath, config: inlineConfig } = params;
    // `relativeFilePath` is like: 'src/components/Auth/LoginForm.tsx'
    // `inlineConfig` is the { namespace?, path? } object passed directly to i18n()

    // Default namespace
    let calculatedNamespace = 'common'; 
    // Default path derived from filename (e.g., LoginForm -> loginForm)
    let calculatedPath = path.parse(relativeFilePath).name;
    calculatedPath = calculatedPath.charAt(0).toLowerCase() + calculatedPath.slice(1);

    const parts = relativeFilePath.split('/');

    // Example logic: Use directory name after 'components' or 'features' as namespace
    const componentDirIndex = parts.findIndex(p => p.toLowerCase() === 'components');
    const featureDirIndex = parts.findIndex(p => p.toLowerCase() === 'features');

    if (componentDirIndex !== -1 && parts.length > componentDirIndex + 2) {
      calculatedNamespace = parts[componentDirIndex + 1].toLowerCase();
    } else if (featureDirIndex !== -1 && parts.length > featureDirIndex + 2) {
      calculatedNamespace = parts[featureDirIndex + 1].toLowerCase();
    }
    
    // --- Determine final config --- 
    // Priority: Inline config > Generated config
    const finalNamespace = inlineConfig.namespace ?? calculatedNamespace;
    const finalPath = inlineConfig.path ?? calculatedPath;

    // Return the final config object to be used by lang-tag
    return {
      namespace: finalNamespace,
      path: finalPath,
    };
  },
};
```

**Explanation of `onConfigGeneration`:**

*   It receives the `relativeFilePath` and any `inlineConfig` passed directly to the `i18n()` call.
*   It calculates a default `namespace` and `path` based on the file's location and name (customize this logic for your project structure).
*   It gives priority to the `inlineConfig`. If `i18n({}, { namespace: 'override' })` is used, `'override'` will be used instead of the calculated namespace.
*   It returns the final `{ namespace, path }` object, which `lang-tag` uses to place the translations correctly in the output JSON files.

## Usage in React Components

Now, import and use your custom `i18n` tag within your components:

```tsx
// src/components/Auth/LoginForm.tsx
import React from 'react';
import { i18n } from '@/lib/i18n'; // Adjust import path

// Define translations right here!
// `onConfigGeneration` will infer namespace='auth', path='loginForm'
const translations = i18n({
  title: 'Login to Your Account',
  emailLabel: 'Email Address',
  passwordLabel: 'Password',
  submitButton: 'Log In',
});

export const LoginForm: React.FC = () => {
  const t = translations.useT(); // Use the hook

  return (
    <form>
      <h2>{t.title()}</h2> 
      <label>
        {t.emailLabel()}:
        <input type="email" />
      </label>
      <label>
        {t.passwordLabel()}:
        <input type="password" />
      </label>
      <button type="submit">{t.submitButton()}</button>
    </form>
  );
};

// --- 

// src/features/Products/ProductDetail.tsx
import React from 'react';
import { i18n } from '@/lib/i18n'; // Adjust import path

// Example with interpolation and overriding the path
// `onConfigGeneration` will infer namespace='products', but we override path
const translations = i18n({
  productTitle: '{{productName}} Details',
  addToCart: 'Add to Cart',
  stockStatus: 'In Stock: {{count}} available',
}, { path: 'detailView' }); // Override path

interface ProductDetailProps {
  product: { id: string; name: string; stock: number };
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ product }) => {
  const t = translations.useT();

  return (
    <div>
      <h1>{t.productTitle({ productName: product.name })}</h1>
      <p>{t.stockStatus({ count: product.stock })}</p>
      <button>{t.addToCart()}</button>
    </div>
  );
};
```

## Collecting Translations

Run the `lang-tag` CLI to scan your project based on `.lang-tag.config.js` and generate the translation files:

```bash
npx lang-tag collect
# or the alias:
npx lang-tag c
```

This command reads files specified in `includes`, finds calls to your `i18n` function, runs `onConfigGeneration` for each tag to determine the final namespace and path, extracts the translation texts, and writes them to the appropriate JSON files within your `outputDir` (`public/locales/en` in this example).

## Generated Files Example

After running `collect`, you'll find files like these, ready for `react-i18next`:

```json
// public/locales/en/auth.json
{
  "loginForm": {
    "title": "Login to Your Account",
    "emailLabel": "Email Address",
    "passwordLabel": "Password",
    "submitButton": "Log In"
  }
  // ...other keys in the 'auth' namespace
}
```

```json
// public/locales/en/products.json
{
  "detailView": {
    "productTitle": "{{productName}} Details",
    "addToCart": "Add to Cart",
    "stockStatus": "In Stock: {{count}} available"
  }
  // ...other keys in the 'products' namespace
}
```

## Benefits Summary

*   **Colocation:** Translations live with the components that use them.
*   **Developer Experience:** Define translations naturally without manually managing namespaces/files.
*   **Automation:** `lang-tag collect` handles the aggregation into `react-i18next` compatible files.
*   **Flexibility:** Use `onConfigGeneration` and inline config options for precise control.
*   **Leverage `react-i18next`:** Benefit from the extensive features of `react-i18next` for language handling, interpolation, formatting, etc. 