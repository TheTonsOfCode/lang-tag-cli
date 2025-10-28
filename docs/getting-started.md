# Getting Started & Basic Usage

This guide covers the initial setup and basic usage patterns for `lang-tag`.

> **Note:** The CLI command is available as `lang-tag` (recommended) or `langtag` (alias for backward compatibility).

## Installation

```bash
npm install lang-tag
# or
yarn add lang-tag
# or
pnpm add lang-tag
```

## Initialize Configuration

Begin by running the initialization command in your project root:

```bash
lang-tag init # or langtag init
```

This creates a `lang-tag.config.js` file with default settings that you can customize for your project needs.

## Configure Your Project

The configuration file (`lang-tag.config.js`) contains several important settings. Here's an example with default values:

```js
module.exports = {
  // Defines which files to scan for translations tagged with `tagName`
  includes: ['src/**/*.{ts,tsx,js,jsx}'],

  // Files/directories to exclude from scanning
  excludes: ['node_modules', 'dist', 'build', '**/*.test.{ts,tsx,js,jsx}'],

  // Name of the tag function (e.g., i18n) to search for in your code
  tagName: 'i18n',

  // Directory to output extracted translations (e.g., public/locales/en/common.json)
  outputDir: './public/locales/en',

  // Position of the translations object argument in the tag function call (1 or 2)
  translationArgPosition: 1,

  // Primary language used, especially relevant in library mode
  language: 'en',

  // Set to true if this project is a library exporting translations
  isLibrary: false,

  // Configuration for importing translations from other lang-tag enabled libraries
  import: {
    // Directory to generate imported tag files within your project
    dir: 'src/lang-tag-libs',
    // Import statement for your project's main tag function (used in generated files)
    // Example: 'import { i18n } from "@/utils/i18n-tag"'
    tagImportPath: 'import { i18n } from "@/utils/i18n-tag"', // Adjust to your project
    // Optional function to customize imported file/export names (see Library Support docs)
    onImport: undefined,
  },

  // Optional function to automatically generate path/namespace configs for your tags (see CLI Usage docs)
  onConfigGeneration: undefined,
};
```

## Create Your Tag Definition

Create a file to define your custom "tag" function (e.g., `i18n`). This function will use `lang-tag`'s core utilities to process your inline translations. For example, `src/utils/i18n-tag.ts`:

```ts
// src/utils/i18n-tag.ts
import {
  LangTagTranslations,
  LangTagTranslationsConfig,
  createCallableTranslations,
  defaultTranslationTransformer, // A sensible default transformer
} from 'lang-tag';

// This is your custom "tag" function
export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: LangTagTranslationsConfig
) {
  return createCallableTranslations(translations, config, {
    // Use the default transformer for {{placeholder}} style interpolation
    transform: defaultTranslationTransformer,
    // No special key processing (like pluralization) in this basic example
    // processKey: (context, addProcessedKey) => { /* ... */ }
  });
}
```

**Explanation:**

- Your `i18n` function (or whatever you name it and specify in `tagName`) is the core of how you define translations inline.
- It uses `createCallableTranslations` from `lang-tag` to convert your translation object into an object of callable functions.
- `defaultTranslationTransformer` is provided by `lang-tag` for basic `{{placeholder}}` replacements.

## Basic Usage

Once your tag function (`i18n` in this case) is defined, you can use it to define translations directly in your components or modules:

```tsx
// src/components/Welcome.tsx
import { i18n } from '../utils/i18n-tag';

// Path to your tag definition

// Define translations inline using your i18n tag
const translations = i18n(
  {
    title: 'Welcome to our application',
    description: 'This is a sample application using Lang Tag.',
    greeting: 'Hello, {{name}}!',
  },
  {
    namespace: 'common', // This helps organize output files (e.g., common.json)
    path: 'welcomeComponent', // Optional: sub-path within the namespace (e.g., common.welcomeComponent.title)
  }
);

interface WelcomeProps {
  userName: string;
}

function Welcome({ userName }: WelcomeProps) {
  return (
    <div>
      <h1>{translations.title()}</h1>
      <p>{translations.description()}</p>
      <p>{translations.greeting({ name: userName })}</p>{' '}
      {/* Pass interpolation params */}
    </div>
  );
}

export default Welcome;
```

After running `lang-tag collect`, the CLI will find this `i18n` call and extract the translations into, for example, `public/locales/en/common.json` under a structure like:

```json
{
  "welcomeComponent": {
    "title": "Welcome to our application",
    "description": "This is a sample application using Lang Tag.",
    "greeting": "Hello, {{name}}!"
  }
}
```

## Nested Translations

You can organize translations in nested structures within your `i18n` tag call:

```tsx
// src/features/dashboard/DashboardHeader.tsx
import { i18n } from '../../utils/i18n-tag';

const translations = i18n(
  {
    header: {
      title: 'Dashboard',
      subtitle: 'Your personal overview',
    },
    userActions: {
      viewProfile: 'View Profile',
      settings: 'Settings',
    },
    alerts: {
      newMessages: 'You have {{count}} new messages.',
    },
  },
  {
    namespace: 'dashboard',
    path: 'headerArea',
  }
);

function DashboardHeader({ messageCount }: { messageCount: number }) {
  return (
    <header>
      <h2>
        {translations.header.title()} - {translations.header.subtitle()}
      </h2>
      <nav>
        <button>{translations.userActions.viewProfile()}</button>
        <button>{translations.userActions.settings()}</button>
      </nav>
      {messageCount > 0 && (
        <p>{translations.alerts.newMessages({ count: messageCount })}</p>
      )}
    </header>
  );
}

export default DashboardHeader;
```

**Usage Examples:**

- `translations.header.title()`
- `translations.alerts.newMessages({ count: 5 })`

This structure will also be reflected in the generated JSON files (e.g., under `dashboard.headerArea.header.title`).
