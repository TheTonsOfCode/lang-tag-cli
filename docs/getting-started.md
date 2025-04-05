# Getting Started & Basic Usage

This guide covers the initial setup and basic usage patterns for `lang-tag`.

## Installation

```bash
npm install lang-tag
```

## Initialize Configuration

Begin by running the initialization command in your project root:

```bash
lang-tag init
```

This creates a `.lang-tag.config.js` file with default settings that you can customize for your project needs.

## Configure Your Project

The configuration file (`.lang-tag.config.js`) contains several important settings. Here's an example with default values:

```js
module.exports = {
  // Defines which files to scan for translations
  includes: ['src/**/*.{ts,tsx,js,jsx}'], 
  
  // Files/directories to exclude from scanning
  // Default: ['node_modules', 'dist', 'build']
  excludes: ['node_modules', 'dist', 'build', '**/*.test.{ts,tsx,js,jsx}'], // Added common test exclusion
  
  // Name of the tag function to search for
  // Default: 'lang'
  tagName: 'i18n', // Keeping example value
  
  // Directory to output extracted translations
  // Default: 'locales/en'
  outputDir: './public/locales/en', // Keeping example value
  
  // Position of the translations object argument in the tag function call (1 or 2)
  // Default: 1
  translationArgPosition: 1,

  // Primary language used, especially in library mode
  // Default: 'en'
  language: 'en',

  // Set to true if this project is a library exporting translations
  // Default: false
  isLibrary: false,

  // Configuration for importing translations from libraries (See Library Support docs)
  import: {
    // Directory to generate imported tag files
    // Default: 'src/lang-libraries'
    dir: 'src/lang-libraries',
    // Import statement for the project's tag function in generated files
    // Default: 'import { lang } from "@/my-lang-tag-path"'
    tagImportPath: 'import { i18n } from "@/utils/i18n"',
    // Function to customize imported file/export names
    onImport: undefined // (See Library Support docs for details)
  },

  // Function to automatically generate path/namespace configs (See CLI Usage docs)
  onConfigGeneration: undefined // (See CLI Usage docs for details)
}
```

## Create Your Tag Definition

Create a file to define your tag function, for example `src/utils/i18n.ts`:

```ts
import {
  LangTagTranslationsConfig,
  LangTagTranslations,
  mapTranslationObjectToFunctions
} from "lang-tag";

export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: LangTagTranslationsConfig
) {
  return mapTranslationObjectToFunctions(
    translations,
    config,
    {transform: ({path}) => path}
  );
}
```

## Basic Usage

Once your tag is defined, you can use it to define translations in your components:

```tsx
import { i18n } from '../utils/i18n';

const translations = i18n({
  title: "Welcome to our application",
  description: "This is a sample application using Lang Tag"
}, { namespace: 'common' });

function Welcome() {
  return (
    <div>
      <h1>{translations.title()}</h1>
      <p>{translations.description()}</p>
    </div>
  );
}
```

## Nested Translations

You can organize translations in nested structures:

```tsx
const translations = i18n({
  header: {
    title: "Dashboard",
    subtitle: "Your personal overview"
  },
  content: {
    welcome: "Welcome back, {{name}}!"
  }
}, { namespace: 'dashboard' });

// Usage: translations.header.title()
// Usage with parameters: translations.content.welcome({ name: "John" })
``` 