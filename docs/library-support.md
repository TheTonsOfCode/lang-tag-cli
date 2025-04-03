# Library Support

`lang-tag` provides features specifically designed for projects that act as libraries, exporting components that utilize `lang-tag` for their internal translations. This allows consuming applications to easily integrate and potentially override the library's default translations.

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

To use translations from an installed library package in your main application:

1. Install the library package (e.g., `npm install my-lang-tag-library`).
2. Ensure the library included the `.lang-tag.exports.json` file in its published package (check its `package.json` "files" array).
3. Run `langtag collect --lib` in your main project's root directory.
4. This command reads the `.lang-tag.exports.json` from the installed library (in `node_modules`) and generates corresponding tag definition files within your application, using your local `lang-tag` configuration.

The generated tag files will be placed in the directory specified by the `import.dir` option in *your* main application's `.lang-tag.config.js`. This directory must be included in your project's `includes` paths for the tags to be discoverable.

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

## Import Configuration Options

Configure how library tags are imported into your main application using the `import` key in your `.lang-tag.config.js`:

```js
// .lang-tag.config.js (in the consuming application)
module.exports = {
  // ... other config
  import: {
    /**
     * Directory where the generated tag files for imported libraries will be created.
     * Must be within your project's `includes` paths.
     * @default 'src/lang-libraries'
     */
    dir: 'src/lang-libraries',

    /**
     * The import statement for *your* project's lang tag function.
     * This will be added at the top of each generated library tag file.
     */
    tagImportPath: 'import { i18n } from "@/utils/i18n"', // Example

    /**
     * Optional function to customize the generated filename and the export name
     * for each imported tag definition.
     */
    onImport: (relativePath, originalExportName, fileGenerationData) => {
      // relativePath: Path of the original file within the library package
      // originalExportName: The original export name from the library (if available)
      // fileGenerationData: Contains raw data like translations and config

      // Example: Customize names based on the library's structure
      const parts = relativePath.split('/');
      const fileName = `lib-${parts.join('-')}.ts`;
      const exportName = `lib${parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')}Tag`;

      return {
        fileName: fileName,  // e.g., lib-components-profile.ts
        exportName: exportName // e.g., LibComponentsProfileTag
      };
    }
  }
  // ...
};
```

| Option | Description | Default |
|--------|-------------|---------|
| `import.dir` | Output directory for generated library tag files. | `'src/lang-libraries'` |
| `import.tagImportPath` | Import statement for the consuming project's tag function. | `'import { lang } from "@/my-lang-tag-path"'` |
| `import.onImport` | Function to customize generated file and export names. |  |