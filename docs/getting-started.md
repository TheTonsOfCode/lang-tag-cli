# Getting Started

## Initialize Configuration

Begin by running the initialization command in your project root:

```bash
langtag init
```

This creates a `.lang-tag.config.js` file with default settings that you can customize for your project needs.

## Configure Your Project

The configuration file contains several important settings:

```js
module.exports = {
  // Defines which files to scan for translations
  includes: ['src/**/*.{ts,tsx,js,jsx}'],
  
  // Files to exclude from scanning
  excludes: ['**/*.test.{ts,tsx,js,jsx}'],
  
  // Name of the tag function to use (default: 'lang')
  tagName: 'i18n',
  
  // Directory to output extracted translations
  outputDir: './public/locales/en',
  
  // Position of the translations parameter (default: 1)
  translationArgPosition: 1
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