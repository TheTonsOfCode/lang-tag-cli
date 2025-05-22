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

Define a custom function (let's call it `i18n`) that uses `lang-tag`'s `createCallableTranslations` and integrates with `react-i18next`'s `useTranslation` hook. This function will serve as the marker for `lang-tag`'s CLI and provide hooks/utilities for your components.

```typescript
// src/lib/i18n.ts (or your preferred location)
import {
  LangTagTranslationsConfig,
  LangTagTranslations,
  createCallableTranslations,
  TranslationMappingStrategy // To type the strategy object
} from "lang-tag";
import { useTranslation } from 'react-i18next';

// Define your custom tag function
export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: LangTagTranslationsConfig
) {
  // Define the strategy for react-i18next integration
  const i18nextStrategy = (i18nInstance: any): TranslationMappingStrategy<LangTagTranslationsConfig> => ({
    transform: ({ path, params }) => i18nInstance.t(path, params),
    // processKey: ... // Add if you need advanced key processing like plural aliasing
  });

  const i18nextKeysStrategy: TranslationMappingStrategy<LangTagTranslationsConfig> = {
    transform: ({ path }) => path,
  };

  return {
    /**
     * Returns an object mapping original keys to their final translation paths (strings).
     * Useful for scenarios where the hook cannot be used (e.g., SSR, constants).
     * These paths are then passed to an i18next `t` function.
     */
    keys() {
      return createCallableTranslations(translations, config, i18nextKeysStrategy);
    },

    /**
     * A React hook that provides a typed `t` function object for client-side rendering.
     * It uses react-i18next's `useTranslation` internally.
     */
    useT() {
      const namespace = config?.namespace; // Or your default namespace logic
      const { t: i18nextT } = useTranslation(namespace);

      // Return a typed object where methods correspond to your keys
      // and call i18nextT internally.
      return createCallableTranslations(translations, config, i18nextStrategy({ t: i18nextT }));
    }
  };
}
```

**Explanation:**

*   It imports necessary types (`LangTagTranslations`, `LangTagTranslationsConfig`) and the core helper (`createCallableTranslations`) from `lang-tag`.
*   It accepts the `translations` object and an optional inline `config` (for `namespace` and `path` used by `lang-tag`).
*   `keys()`: Uses `createCallableTranslations` with a strategy where the `transform` function simply returns the final, fully-qualified key path (e.g., `myComponent.greeting`). This path is what `lang-tag` calculates based on `config.path`, `onConfigGeneration`, and the nested structure.
*   `useT()`: This is the primary hook for React components. It calls `react-i18next`'s `useTranslation` hook (passing the namespace from `lang-tag`'s config). It then uses `createCallableTranslations` again, but this time the `transform` function in the strategy calls the `t` function obtained from `useTranslation` to perform the actual translation lookup using the calculated path and any interpolation parameters.

### 2. Configure `react-i18next`

Set up `react-i18next` to load translation resources. Ensure the `loadPath` in the backend configuration points to where `lang-tag` will output the JSON files (defined by `outputDir` in `.lang-tag.config.js`).

```typescript
// src/i18next-config.ts (or your i18next setup file)
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend'; // For loading translations over http
import LanguageDetector from 'i18next-browser-languagedetector'; // To detect user language

i18n
  .use(HttpApi) // Use backend to load translations from files or an API
  .use(LanguageDetector) // Detect user language in the browser
  .use(initReactI18next) // Passes i18n instance to react-i18next
  .init({
    fallbackLng: 'en', // Default language if detected language is not available
    debug: process.env.NODE_ENV === 'development', // Enable debug output in development

    // Define all namespaces used in your project that i18next should be aware of.
    // These should correspond to the namespaces you use in your lang-tag `i18n` calls.
    ns: ['common', 'auth', 'dashboard', 'products', 'profile', 'userDetails'], 
    defaultNS: 'common', // Default namespace if not specified in useTranslation or t calls

    backend: {
      // Path to load translation files from.
      // {{lng}} will be replaced with the language code (e.g., 'en')
      // {{ns}} will be replaced with the namespace (e.g., 'auth')
      // This MUST match lang-tag's outputDir structure (e.g., public/locales/en/auth.json)
      loadPath: '/locales/{{lng}}/{{ns}}.json', 
    },

    interpolation: {
      escapeValue: false, // React already protects against XSS
    },
    
    // It's good practice to set saveMissing to true during development
    // to automatically send missing keys to your backend or handler.
    // saveMissing: true, // process.env.NODE_ENV === 'development',
    // missingKeyHandler: (lng, ns, key, fallbackValue) => { /* ... report missing key ... */ }
  });

export default i18n;
```
*Remember to initialize this configuration in your application's entry point (e.g., `main.tsx`, `app.tsx`, or `_app.js`).*

### 3. Configure `lang-tag` (`.lang-tag.config.js`)

Create or update your `.lang-tag.config.js` file in your project root. This tells the `lang-tag` CLI how to find your translations and where to output the generated JSON files.

```javascript
// .lang-tag.config.js
const path = require('path'); // Optional, if you need to resolve paths

/** @type {import('lang-tag').LangTagConfig} */
module.exports = {
  // Name of your custom tag function (e.g., 'i18n') that lang-tag should scan for.
  tagName: 'i18n', 

  // Files to scan for translation tags.
  includes: ['src/**/*.{ts,tsx,js,jsx}'], 
  // Files/directories to exclude from scanning.
  excludes: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '**/*.test.{ts,tsx,js,jsx}',
    '**/*.spec.{ts,tsx,js,jsx}',
    'src/i18next-config.ts', // Exclude i18next config file itself
    'src/lib/i18n.ts'       // Exclude the tag definition file
  ],

  // Output directory for the base language (e.g., English).
  // The structure should match react-i18next's `loadPath` format.
  // For example, if outputDir is 'public/locales/en', translations for the 'common' namespace
  // will be in 'public/locales/en/common.json'.
  outputDir: 'public/locales/en',

  // Optional: Automatic config generation based on file path.
  // This function runs when you use `lang-tag regenerate-tags`.
  onConfigGeneration: (params) => {
    const { filePath, isImportedLibrary, currentConfig } = params;
    // `filePath` is like: 'src/components/Auth/LoginForm.tsx'
    // `currentConfig` is the { namespace?, path? } object passed directly to your i18n() tag.

    if (isImportedLibrary) return currentConfig; // Don't alter imported library configs

    // Example: Skip if path is manually overridden (e.g., starts with '!')
    if (currentConfig.path && currentConfig.path.startsWith('!')) {
      return currentConfig; 
    }

    // --- Default/Calculated Values ---
    let calculatedNamespace = 'common'; 
    // Derive path from filename (e.g., LoginForm.tsx -> loginForm)
    let calculatedPath = path.parse(filePath).name;
    calculatedPath = calculatedPath.charAt(0).toLowerCase() + calculatedPath.slice(1);
    if (calculatedPath === 'index') { // Avoid 'index' as path if it's an index file
        const parentDir = path.basename(path.dirname(filePath));
        calculatedPath = parentDir.charAt(0).toLowerCase() + parentDir.slice(1);
    }

    // --- Logic to Determine Namespace & Path ---
    const relativeFilePath = filePath.startsWith('src/') ? filePath.substring(4) : filePath;
    const parts = relativeFilePath.split('/');

    // Example: Use directory name after 'components' or 'features' as namespace
    // e.g., features/auth/LoginForm.tsx -> namespace: auth
    const featureOrComponentIndex = parts.findIndex(p => ['components', 'features', 'pages', 'views'].includes(p.toLowerCase()));
    if (featureOrComponentIndex !== -1 && parts.length > featureOrComponentIndex + 1) {
      // Check if the next part is not a file itself (implying it's a feature/module folder)
      if (!parts[featureOrComponentIndex + 1].includes('.')) {
         calculatedNamespace = parts[featureOrComponentIndex + 1].toLowerCase();
      }
    }
    
    // --- Determine Final Config (Give priority to inline config) ---
    const finalNamespace = currentConfig.namespace ?? calculatedNamespace;
    const finalPath = currentConfig.path ?? calculatedPath;

    return {
      namespace: finalNamespace,
      path: finalPath,
    };
  },
};
```

**Explanation of `onConfigGeneration`:**

*   This function is optional. If provided, `lang-tag regenerate-tags` will use it to automatically fill in or update the `namespace` and `path` properties within your `i18n({...}, { namespace: ..., path: ... })` calls directly in your source code.
*   It receives the `filePath` (relative to project root), `isImportedLibrary` boolean, and any `currentConfig` already present in the tag call.
*   You should implement logic to calculate a `namespace` and `path` based on your project's file structure (the example provides a starting point).
*   It should give priority to any `currentConfig` values if they exist (e.g., if a developer manually specified a namespace, don't override it unless intended).
*   It returns the final `{ namespace, path }` object that will be written back to the source file.

## Usage in React Components

Now, import and use your custom `i18n` tag within your React components:

```tsx
// src/components/Auth/LoginForm.tsx
import React from 'react';
import { i18n } from '@/lib/i18n'; // Adjust import path to your tag definition

// Define translations right here!
// If onConfigGeneration is set up, it might infer namespace='auth', path='loginForm'
// or you can specify them explicitly.
const translations = i18n({
  title: 'Login to Your Account',
  emailLabel: 'Email Address',
  passwordLabel: 'Password',
  submitButton: 'Log In',
  loginError: 'Login failed: {{message}}'
}, {
  namespace: 'auth' // Explicit namespace
  // path: 'loginForm' // Explicit path, or let onConfigGeneration handle it
});

interface LoginFormProps {
  onLoginSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const t = translations.useT(); // Use the hook from your i18n tag
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    // ... login logic ...
    const success = false; // Replace with actual login attempt
    if (success) {
      onLoginSuccess();
    } else {
      setError('Invalid credentials'); // Example error message
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{t.title()}</h2> 
      {error && <p style={{color: 'red'}}>{t.loginError({ message: error })}</p>}
      <label>
        {t.emailLabel()}:
        <input type="email" name="email" required />
      </label>
      <label>
        {t.passwordLabel()}:
        <input type="password" name="password" required />
      </label>
      <button type="submit">{t.submitButton()}</button>
    </form>
  );
};

// --- 

// src/features/Products/ProductDetail.tsx
import React from 'react';
import { i18n } from '@/lib/i18n'; // Adjust import path

// Example with interpolation and overriding the path (if onConfigGeneration is active)
// onConfigGeneration might infer namespace='products'.
const translations = i18n({
  productTitle: '{{productName}} Details',
  addToCart: 'Add to Cart',
  stockStatus: 'In Stock: {{count}} available',
  features: {
    title: "Features",
    material: "Material: {{materialName}}"
  }
}, {
  namespace: 'products',
  path: 'detailView' // Explicitly set path for these translations under the 'products' namespace
});

interface ProductDetailProps {
  product: { id: string; name: string; stock: number; material: string };
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ product }) => {
  const t = translations.useT();

  return (
    <div>
      <h1>{t.productTitle({ productName: product.name })}</h1>
      <p>{t.stockStatus({ count: product.stock })}</p>
      <button>{t.addToCart()}</button>
      <div>
        <h3>{t.features.title()}</h3>
        <p>{t.features.material({ materialName: product.material })}</p>
      </div>
    </div>
  );
};
```

## Running `lang-tag` CLI

1.  **Collect translations:**
    ```bash
    npx lang-tag collect
    ```
    This will scan your `includes` files for `i18n` tags and generate JSON files in `outputDir` (e.g., `public/locales/en/auth.json`, `public/locales/en/products.json`).

2.  **(Optional) Regenerate tags:**
    ```bash
    npx lang-tag regenerate-tags
    ```
    If you have `onConfigGeneration` defined, this command will update the `namespace` and `path` properties within your `i18n({...}, { namespace: ..., path: ... })` calls in your source files based on your defined logic.

Now, `react-i18next` will be able to load these generated JSON files, and your components will use the typed `t` functions to display the correct translations.
