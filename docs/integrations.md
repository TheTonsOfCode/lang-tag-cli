# Integrations

This section demonstrates how `lang-tag` can be integrated with popular translation libraries, using `react-i18next` as an example.

## Example with react-i18next

`lang-tag` works seamlessly with popular translation libraries like `react-i18next`. The core idea is to use `lang-tag` to define and collect translations, and then use `react-i18next` for the runtime translation capabilities (like language switching, loading resources, pluralization, context, etc.).

Your custom tag function (e.g., `i18n`) will use `createCallableTranslations` and can provide helper methods that integrate with `react-i18next`'s `useTranslation` hook.

```ts
// src/utils/i18n-tag.ts (or your preferred location for the custom tag)
import {
  LangTagTranslationsConfig,
  LangTagTranslations,
  createCallableTranslations,
  defaultTranslationTransformer,
  // You might also need TranslationMappingStrategy if you customize heavily
} from "lang-tag";
import { useTranslation } from 'react-i18next'; // Core hook from react-i18next

// This is your custom "tag" function, integrating lang-tag with react-i18next
export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: LangTagTranslationsConfig // This config is for lang-tag (namespace, path)
) {
  return {
    /**
     * For server-side use cases or scenarios where React hooks can't be used.
     * This method returns an object with the same structure as your translations,
     * but each value is the final, fully-qualified translation key (string path).
     * You would then pass this key to a server-side i18next `t` function.
     */
    keys() {
      return createCallableTranslations(translations, config, {
        // The transform function here simply returns the fully resolved path to the key
        transform: ({ path }) => path,
        // processKey: (context, addProcessedKey) => { /* advanced key processing if needed */ }
      });
    },

    /**
     * For client-side use cases in React components.
     * This method returns an object with the same structure as your translations,
     * where each value is a function that calls react-i18next's `t` function
     * with the appropriate key and parameters.
     */
    useT() {
      // The namespace for useTranslation can be derived from lang-tag's config.
      // If no namespace is in config, react-i18next will use its defaultNS.
      const { t } = useTranslation(config?.namespace);
      
      return createCallableTranslations(translations, config, {
        // The transform function calls react-i18next's `t` function
        // with the fully resolved path and any provided interpolation parameters.
        transform: ({ path, params }) => t(path, params),
        // processKey: (context, addProcessedKey) => { /* advanced key processing if needed */ }
      });
    }
  };
}
```

### Client-side Usage with `useT()`:

This is the most common scenario in React components.

```tsx
// src/components/ProfileComponent.tsx
'use client' // If using Next.js App Router

import { i18n } from '../utils/i18n-tag'; // Adjust path to your i18n tag definition

// Define translations inline using your i18n tag
const translations = i18n({
  title: "Member Profile",
  greeting: "Hello, {{name}}!",
  bio: "Update your bio here."
}, {
  namespace: 'profile', // This namespace will be used by useTranslation
  path: 'userView'       // Optional sub-path for key structure
});

interface ProfileComponentProps {
  userName: string;
}

export function ProfileComponent({ userName }: ProfileComponentProps) {
  // useT() provides a typed object mirroring your translations structure
  const t = translations.useT(); 
  
  return (
    <div>
      <h1>{t.title()}</h1>
      <p>{t.greeting({ name: userName })}</p>
      <button>{t.bio()}</button>
    </div>
  );
}
```

### Server-side Usage or Non-React Contexts with `keys()`:

In server components (e.g., Next.js App Router), Node.js scripts, or other non-React hook environments, you can use the `keys()` method to get the translation key paths. You would then use these paths with an i18next instance that you've configured for that environment.

```tsx
// app/user/[id]/page.tsx (Example for Next.js Server Component)
import { i18n } from '@/utils/i18n-tag'; // Adjust path
import { createServerSideI18n } from '@/lib/i18n-server-config'; // Your server-side i18n setup

// Define translations (lang-tag doesn't care about client/server here)
const translations = i18n({
  pageTitle: "User Details",
  welcomeMessage: "Welcome back, {{user}}."
}, {
  namespace: 'userDetails',
  path: 'mainContent'
});

export default async function UserPage({ params, searchParams }: any) {
  // Assuming `lang` comes from route or is detected
  const lang = params.lang || 'en'; 
  const { t } = await createServerSideI18n(lang, ['userDetails']); // Init server i18next

  const userName = "Server User"; // Fetch user data or similar

  return (
    <div>
      {/* Use server-side t() with keys from lang-tag */}
      <h1>{t(translations.keys().pageTitle())}</h1>
      <p>{t(translations.keys().welcomeMessage(), { user: userName })}</p>
    </div>
  );
}
```

**Key points for integration:**

1.  **`lang-tag` for definition & collection:** Use `lang-tag` (`i18n` calls + `lang-tag collect` CLI) to define translations inline and generate JSON files.
2.  **`i18next` for runtime:** Configure `i18next` (and `react-i18next`) to load these JSON files and handle the actual translation lookups, language switching, etc.
3.  **Custom Tag Function (`i18n`):** This acts as the bridge. It uses `createCallableTranslations` to structure the translation accessors and integrates with `useTranslation` (client-side) or provides raw keys (server-side).
4.  **Namespaces:** The `namespace` property in your `lang-tag` config is crucial as it typically maps directly to i18next namespaces, allowing `useTranslation(namespace)` to load the correct set of translations. 