# Using Translations in Library Projects

## Project Configuration

To set up your project as a library, include the following option in your configuration:

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
2. Use `langtag collect` to generate a `.lang-tag.exports.json` file instead of namespace files
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

To use translations from an installed library:

1. Install the package containing the exported tags
2. Run `langtag collect --libraries` in your main project
3. This recreates the library's tags in your project according to your local configuration

The imported tags will be generated in the directory specified by `import.dir` (which must be within your project's `includes` paths).

### Example of an Imported Tag

```tsx
export const importedTranslations1 = mainProjectLangTag({
  title: "Member profile",
  description: "Some description"
}, { namespace: 'profile' });
```

You can modify translations and namespace settings while maintaining the original key structure.

### Using Components with Imported Translations

```tsx
export function MyProfilePage() {
    const t = importedTranslations1.useT()
    
    return <div>
        <ProfileComponent t={t}/>
    </div>;
}
```

This approach preserves the translation structure, allowing you to pass complete translation objects rather than individual translations:

```tsx
// Not necessary:
<ProfileComponent t={{title: t.title(), description: t.description()}}/>
```

## Configuration Options

Configure imported tags with these settings:

| Option | Description |
|--------|-------------|
| `import.dir` | Directory where imported tags will be created |
| `import.tagImportPath` | Path added to the beginning of imported tag files (e.g., `import { lang } from "@/my-lang-tag-path"`) |
| `import.onImport` | Function for configuring file and export names |

### onImport Function Signature

```ts
{
  import: {
    onImport: (relativePath: string, fileGenerationData: any) => {
      return {
        fileName: string;  // Output filename for the imported tag
        exportName: string;  // Export name within the file
      }
    }
  }
}
```