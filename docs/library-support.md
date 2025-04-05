# Library Support

`lang-tag` provides features specifically designed for projects that act as libraries, exporting components that utilize `lang-tag` for their internal translations. This allows consuming applications to easily integrate and potentially override the library's default translations.

> **Note:** The CLI command is available as `lang-tag` (recommended) or `langtag` (alias for backward compatibility).

## Project Configuration (`isLibrary`)

To designate your project as a library, set the `isLibrary` flag to `true` in your `.lang-tag.config.js`:

```json
{
  "isLibrary": true
}
```

This instructs the tool to process your project as a library, changing how language tags are handled during the build process.

## Language Tag Generation

### In Library Projects

When creating language tags in a library project:

1. Define language tags as you normally would
2. Use `lang-tag collect` (or langtag collect, alias: c) to generate a `.lang-tag.exports.json` file instead of namespace files
3. Ensure this file is included in your build before publishing to the registry

This file contains all language tag definitions from your project, making them available to consuming applications.

## Type Definitions

### Basic Component Typing

Components that consume translations should be properly typed:

```tsx
const translations = i18n({
  title: "Member profile",
  description: "Some description"
}, { namespace: 'profile' });

interface ProfileComponentProps {
    t: typeof translations;
}

export function ProfileComponent({t}: ProfileComponentProps) {
    return <div>
        <h1>{t.title()}</h1>
        <h2>{t.description()}</h2>
    </div>;
}
```

### Typing with Intermediate Functions

When translations are accessed through functions:

```tsx
export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: LangTagTranslationsConfig
) {
  return {
    useT() {
      const {t} = useTranslation(config?.namespace || '');
      
      return mapTranslationObjectToFunctions(translations, config, {
        //..
      });
    }
  };
}

// Component props definition
const translations = i18n({
  title: "Member profile",
  description: "Some description"
}, { namespace: 'profile' });

interface ProfileComponentProps {
    t: ReturnType<typeof translations.useT>;
}
```

## Consuming Library Translations

### Installation Process

To use translations from an installed library package in your main application:

1. Install the library package (e.g., `npm install my-lang-tag-library`).
2. Ensure the library included the `.lang-tag.exports.json` file in its published package (check its `package.json` "files" array).
3. Run `lang-tag collect --lib` (or langtag collect --lib, alias: c --lib) in your main project's root directory.
4. This command reads the `.lang-tag.exports.json`