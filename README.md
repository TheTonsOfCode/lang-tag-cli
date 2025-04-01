# Lang-tag: Translation Management Library for Component-Based i18n

A robust solution for managing translations in JavaScript/TypeScript projects with a structured tagging system.

This library is designed to streamline the process of managing translations by moving i18n keys from namespace-specific translation files directly into the component files where they are used. One of the common challenges developers face is determining appropriate key names, paths, or selecting the correct file to store the final translation. This library addresses that challenge by providing an automated way to organize translations based on predefined rules.

### Example lang tag:
```tsx
const translations = lang({
    hello: 'Welcome {{name}}, in our world'
}, {
    path: 'components.heros', namespace: 'orders'  // This part can be handled by script
})

function MyHeroComppnent() {
    return <div>
        {translations.hello({name: 'Joe'})}
    </div>
}
// or you can define your tag to work like this:
function MyHeroComppnent() {
    const t = translations.useT(); // And code it for some react-i18next underhood
    return <div>
        {t.hello({name: 'Joe'})}
    </div>
}
```
When you run `lantag collect` it will add translation to `{configuration.outputDir}/orders.json` under the key `components.heros.hello` with value: `Welcome {{name}}, in our world`.

### Key Features
- Developers write simple translation keys, and the algorithm determines the appropriate namespace or path.
- The library allows developers to configure how namespaces are automatically overridden or how paths are aggregated within the namespace.
- The library does not provide a predefined tag but offers simple functions to construct a tagging system according to project needs, avoiding unnecessary dependencies.
- A developer tool aggregates all translations from the project into a structured i18n directory.
- This tool also enables the automatic generation of namespace and path configurations within source files.
- The developer tool can treat project as library which uses lang tags, so it allows to create exportable file containg tags used across library, which can be added into package build,
then later in main project if you install package with that file, the tool can import tags with default translations and same structure
ensuring consistency in translation keys and structure

### Example: Common namespaces naming with Next.js
For instance in a Next.js project, translations are often stored in a structured directory:

```
/app
  - orders
  - profile
  - users
```

Typically, pages and components under these directories load translations from corresponding locale files, such as:

```
locale/en/orders.json
locale/en/profile.json
locale/en/users.json
```

By using this library, developers can write translation keys directly in their components, and the system will determine the correct namespace or path. With the `onConfigGeneration` setting, developers can specify how namespaces should be overridden or how paths should be structured automatically.

## Installation

```bash
npm install lang-tag
```

## Overview

Lang Tag helps you manage translations in a type-safe and organized way. It allows you to define translations inline in your code, extract them automatically, and use them efficiently in both client and server environments.

## Getting Started

### Initialize Configuration

Begin by running the initialization command in your project root:

```bash
langtag init
```

This creates a `.lang-tag.config.js` file with default settings that you can customize for your project needs.

### Configure Your Project

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

### Create Your Tag Definition

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

## Using Lang Tag

### Basic Usage

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

### Nested Translations

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

## Integration with Translation Libraries

### Example with react-i18next

Lang Tag works seamlessly with popular translation libraries like react-i18next:

```ts
import {
  LangTagTranslationsConfig,
  LangTagTranslations,
  mapTranslationObjectToFunctions
} from "lang-tag";
import { useTranslation } from 'react-i18next';

export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: LangTagTranslationsConfig
) {
  const prefix = config.path ? config.path + '.' : '';

  return {
    // For server-side use cases
    keys() {
      return mapTranslationObjectToFunctions(translations, config, {
        transform: ({path}) => prefix + path
      });
    },

    // For client-side use cases
    useT() {
      const {t} = useTranslation(config?.namespace || '');
      
      return mapTranslationObjectToFunctions(translations, config, {
        transform: ({path, params}) => t(prefix + path, params)
      });
    }
  };
}
```

#### Client-side Usage:

```tsx
'use client'

const translations = i18n({
  title: "Member profile"
}, { namespace: 'profile' });

export function ProfileComponent() {
  const t = translations.useT();
  
  return <h1>{t.title()}</h1>;
}
```

#### Server-side Usage:

```tsx
const translations = i18n({
  title: "Member profile"
}, { namespace: 'profile' });

export async function Page({lang}) {
  const { t } = await initTranslations({ language: lang });
  
  return <h1>{t(translations.keys().title())}</h1>;
}
```

## Advanced Features

### Pluralization Support

Implement pluralization using the `onKeyAppend` option:

```ts
import {
  LangTagTranslationsConfig,
  LangTagTranslations,
  mapTranslationObjectToFunctions,
  TranslationsToFunctionsMapperOnKeyAppend
} from "lang-tag";

export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: LangTagTranslationsConfig
) {
  const onKeyAppend: TranslationsToFunctionsMapperOnKeyAppend = ({key}, appendKey) => {
    if (key.endsWith('_other')) {
      const shorten = key.slice(0, key.lastIndexOf('_other'));
      appendKey(shorten);
    }
  };

  return {
    keys() {
      return mapTranslationObjectToFunctions(translations, config, {
        transform: ({path}) => path,
        onKeyAppend
      });
    },
    useT() {
      const {t} = useTranslation(config?.namespace || '');
      
      return mapTranslationObjectToFunctions(translations, config, {
        transform: ({path, params}) => t(path, params),
        onKeyAppend
      });
    }
  };
}
```

Usage example:

```tsx
const translations = i18n({
  product_one: "{{count}} product",
  product_other: "{{count}} products"
}, { namespace: 'shop' });

function ProductCount({ count }) {
  const t = translations.useT();
  
  return <span>{t.product({ count })}</span>;
}
```

### Custom Configuration Extensions

You can extend the configuration with custom properties:

```ts
interface CustomLangTagConfig extends LangTagTranslationsConfig {
  debugMode?: boolean;
  manual?: boolean; // Flag to indicate manual configuration
}

export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: CustomLangTagConfig
) {
  // Handle paths with '!' prefix if using that approach
  const actualPath = config?.path?.startsWith('!') 
    ? config.path.substring(1) 
    : config?.path;
  
  // Rest of implementation using actualPath instead of config.path
  // ...
}
```

## Translation Management

### Extracting Translations

Lang Tag provides commands to extract and manage translations:

```bash
# Extract all translations to output directory
langtag collect

# Regenerate all lang tags configurations
langtag generate-config

# Watch for changes and extract automatically
langtag watch
```

The `collect` command gathers all translations from your source files and merges them into namespace-based JSON files in your `outputDir`.

The `watch` command monitors your source files for changes and automatically updates translation files when changes are detected.

### Automatic Configuration Generation

You can automatically generate configurations for your tags with the `onConfigGeneration` option. Here are two approaches for mixing automatic and manual configurations:

#### Example 1: Using '!' Prefix

This approach uses a '!' prefix to mark paths that should not be automatically modified:

```js
// In .lang-tag.config.js
module.exports = {
  // ... other config options
  
  onConfigGeneration: (params) => {
    const { path, isImportedLibrary, config } = params;
    
    // Don't modify imported library configurations
    if (isImportedLibrary) return config;
    
    // Skip auto-generation for paths starting with '!'
    if (config.path && config.path.startsWith('!')) {
      return config;
    }
    
    // Auto-generate configuration for other paths
    const pathParts = path.split('/');
    
    return {
      ...config,
      namespace: pathParts[0] || 'common',
      path: pathParts.slice(1).join('.') || undefined
    };
  }
};
```

Then in your tag definition, you would handle the '!' prefix:

```ts
export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: LangTagTranslationsConfig
) {
  // Remove '!' from the path if present
  const cleanPath = config?.path?.startsWith('!') 
    ? config.path.substring(1) 
    : config?.path;
  
  const prefix = cleanPath ? cleanPath + '.' : '';
  
  // Rest of implementation using cleanPath
  // ...
}
```

Usage example:

```tsx
// This translation's path won't be auto-generated
const manualTranslations = i18n({
  specialCase: "This needs a specific path"
}, { 
  namespace: 'special',
  path: '!custom.path.structure'  // '!' indicates manual path
});

// This translation's path will be auto-generated
const autoTranslations = i18n({
  regularCase: "This can use auto-generated path"
}, { 
  namespace: 'auto'  // No path specified, will be auto-generated
});
```

#### Example 2: Using config.manual Flag

This approach uses a custom `manual` flag in the configuration:

```js
// In .lang-tag.config.js
module.exports = {
  // ... other config options
  
  onConfigGeneration: (params) => {
    const { path, isImportedLibrary, config } = params;
    
    // Don't modify imported library configurations
    if (isImportedLibrary) return config;
    
    // Skip auto-generation for configurations marked as manual
    if (config.manual === true) {
      return config;
    }
    
    // Auto-generate configuration for other paths
    const fileDir = path.split('/').slice(0, -1).join('/');
    const moduleName = fileDir.split('/')[0] || 'common';
    const subPath = fileDir.split('/').slice(1).join('.');
    
    return {
      ...config,
      namespace: config.namespace || moduleName,
      path: config.path || subPath || undefined
    };
  }
};
```

Usage example:

```tsx
// Extended configuration interface
interface OurLangTagConfig extends LangTagTranslationsConfig {
  manual?: boolean;
}

// This translation's configuration won't be auto-generated
const manualTranslations = i18n({
  specialCase: "This needs a specific configuration"
}, { 
  namespace: 'special',
  path: 'custom.path.structure',
  manual: true  // Flag to skip auto-generation
});

// This translation's configuration will be auto-generated
const autoTranslations = i18n({
  regularCase: "This can use auto-generated configuration"
}, { 
  namespace: 'auto'  // Will be potentially overridden by auto-generation
});
```

## API Reference

### mapTranslationObjectToFunctions

This core function transforms translation objects into callable functions:

```ts
function mapTranslationObjectToFunctions<T extends LangTagTranslations>(
  translations: T,
  config: LangTagTranslationsConfig,
  options: {
    transform: (info: {
      config: LangTagTranslationsConfig;
      path: string;
      key: string;
      keyPrefix: string;
      value: string;
      params: Record<string, any>;
    }) => any;
    onKeyAppend?: TranslationsToFunctionsMapperOnKeyAppend;
  }
): TranslationFunctions<T>
```

The `transform` function receives:
- `config`: The provided configuration object
- `path`: Full dot-notation path to the translation
- `key`: Current key name
- `keyPrefix`: Parent path
- `value`: Raw translation string
- `params`: Parameters passed when calling the translation function

Example values for `translations.foo.bar.hello({name: "Joe"})`:
- config: `{ path: 'some.path', namespace: 'test' }`
- path: `foo.bar.hello`
- key: `hello`
- keyPrefix: `foo.bar`
- value: `"Hello {{name}}, to world!"`
- params: `{name: "Joe"}`

---

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
2. Run `langtag collect --lib` in your main project
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

This configuration gives you precise control over how imported language tags are incorporated into your project.
