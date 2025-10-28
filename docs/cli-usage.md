# CLI Usage

This section details the command-line interface (CLI) commands provided by `lang-tag` for managing your translations and automatically generating configurations.

> **Note:** The CLI command is available as `lang-tag` (recommended) or `langtag` (alias for backward compatibility).

## Translation Extraction & Management Commands

Lang Tag provides commands to extract and manage translations:

```bash
# Extract all translations to output directory
lang-tag collect # or langtag collect, alias: c

# Regenerate configuration for all language tags (applies onConfigGeneration)
lang-tag regenerate-tags # or langtag regenerate-tags, alias: rt

# Watch for changes and extract automatically
lang-tag watch # or langtag watch
```

The `collect` command gathers all translations from your source files (identified by `tagName` in your config) and merges them into namespace-based JSON files in your `outputDir`.

The `regenerate-tags` command (alias: `rt`) applies the `onConfigGeneration` function (if defined in your `lang-tag.config.js`) to all language tags in your project, updating their configuration inline within your source files. This is useful for standardizing translation structures.

The `watch` command monitors your source files for changes and automatically runs the `collect` process when changes related to your translation tags are detected.

## Automatic Configuration Generation (`onConfigGeneration`)

The `onConfigGeneration` option in your `lang-tag.config.js` allows you to define a function that automatically determines the `namespace` and `path` configuration for your `lang-tag` calls based on the file's location. This configuration is then written back into your source code by the `regenerate-tags` command.

### Example 1: Using a '!' Prefix for Manual Overrides

This approach uses a '!' prefix in the `path` config within your source file to signal that `onConfigGeneration` should *not* modify this specific tag's configuration. The actual stripping of the '!' from the path used for key generation would happen in your custom tag's `transform` function.

```javascript
// In lang-tag.config.js
module.exports = {
  // ... other config options (tagName, includes, outputDir, etc.)
  
  onConfigGeneration: (params) => {
    const { filePath, isImportedLibrary, currentConfig } = params; // params provided by lang-tag CLI
    
    // Don't modify imported library configurations or if path is manually set
    if (isImportedLibrary) return currentConfig;
    if (currentConfig.path && currentConfig.path.startsWith('!')) {
      // Return currentConfig as is, preserving the '!' for the tag function to handle
      return currentConfig;
    }
    
    // Example: Auto-generate configuration based on directory structure
    // e.g., src/features/authentication/components/LoginForm.tsx -> namespace: 'authentication', path: 'loginForm'
    const pathParts = filePath.replace(/^src\//, '').split('/'); // remove src/ and split
    let generatedNamespace = currentConfig.namespace;
    let generatedPath = currentConfig.path;

    if (pathParts.length > 1) {
      // Assuming a structure like features/featureName/...
      if (pathParts[0] === 'features' && pathParts.length > 2) {
        generatedNamespace = pathParts[1]; // e.g., 'authentication'
        const fileNameWithoutExt = pathParts[pathParts.length -1].split('.')[0];
        generatedPath = fileNameWithoutExt.charAt(0).toLowerCase() + fileNameWithoutExt.slice(1); // e.g., 'loginForm'
      } else {
        // Fallback or other structuring logic
        generatedNamespace = pathParts[0] || 'common';
        const fileNameWithoutExt = pathParts[pathParts.length -1].split('.')[0];
        generatedPath = pathParts.slice(1, -1).concat(fileNameWithoutExt).join('.');
      }
    }
    
    return {
      ...currentConfig,
      namespace: generatedNamespace || 'common', // Ensure namespace is always set
      path: generatedPath || undefined
    };
  }
};
```

Then in your custom tag definition (e.g., `src/utils/i18n-tag.ts`), you would handle the '!' prefix in the `transform` function of your `TranslationMappingStrategy`:

```ts
// src/utils/i18n-tag.ts
import {
  LangTagTranslationsConfig,
  LangTagTranslations,
  createCallableTranslations,
  TranslationTransformContext // Import this to type the transform context
} from "lang-tag";

export function i18n<T extends LangTagTranslations>(
  translations: T,
  config?: LangTagTranslationsConfig
) {
  return createCallableTranslations(translations, config, {
    transform: (context: TranslationTransformContext<LangTagTranslationsConfig>) => {
      let keyPath = context.path; // context.path is the fully resolved path including config.path
      if (context.config?.path?.startsWith('!')) {
        // If the original config.path started with '!', we need to strip it from the final key path.
        // The logic here assumes config.path is a prefix. Careful adjustment might be needed based on how paths are constructed.
        // This example naively assumes the '!' is at the very start of the base path part.
        // A more robust way would be to check if context.path starts with config.path with '!' removed.
        // For this example, let's assume context.path is like "!components.checkout.greeting"
        // and we want to use "components.checkout.greeting" for lookup.
        // This requires careful path reconstruction if the original config.path was just '!'.
        // A simpler approach for the transform: rely on the CLI to generate the correct config.path without '!'
        // and the tag function simply uses context.path as is. 
        // The '!' in config.path in the source file is a marker for onConfigGeneration.
        // If onConfigGeneration preserves it, the tag must handle it or it becomes part of the key.

        // Simpler transform: Assume `onConfigGeneration` already provided the correct `config.path` (without '!')
        // OR, if `onConfigGeneration` is not used / skips this tag, the `config.path` might still have '!'.
        // The `defaultTranslationTransformer` does not handle '!' prefixes in paths.
        // For robust '!' handling, you'd make a custom transformer.
        // This example will just use the path as is, implying '!' might become part of the key path if not stripped before `createCallableTranslations`.
      }
      // Replace placeholders
      return context.value.replace(/{{(.*?)}}/g, (_: any, placeholder: string) => context.params?.[placeholder.trim()] ?? '');
    }
  });
}
```
*Note: The example above for handling `!` in `transform` is simplified. A robust implementation needs careful consideration of how `onConfigGeneration` and `createCallableTranslations` interact with path manipulation.*

### Example 2: Using a `manual: true` Flag for Manual Overrides

This approach adds a custom boolean flag (e.g., `manual: true`) to the configuration object within your source file to prevent `onConfigGeneration` from modifying it. Your `LangTagTranslationsConfig` would need to be extended.

```javascript
// In lang-tag.config.js
module.exports = {
  // ... other config options
  onConfigGeneration: (params) => {
    const { filePath, isImportedLibrary, currentConfig } = params;
    if (isImportedLibrary || currentConfig.manual === true) {
      return currentConfig; // Don't modify
    }
    // ... (auto-generation logic as in Example 1)
    // Auto-generate configuration for other paths
    const fileDir = filePath.split('/').slice(0, -1).join('/');
    const moduleName = fileDir.split('/')[0] || 'common';
    const subPath = fileDir.split('/').slice(1).join('.');
    
    return {
      ...currentConfig,
      namespace: currentConfig.namespace || moduleName,
      path: currentConfig.path || subPath || undefined
    };
  }
};
```

Usage example in your component/module:

```tsx
// src/components/SpecialComponent.tsx
import { i18n } from '../../utils/i18n-tag'; // Adjust path
import { LangTagTranslationsConfig } from 'lang-tag';

// Define an extended interface for your i18n tag's config, if using TypeScript
interface CustomAppConfig extends LangTagTranslationsConfig {
  manual?: boolean;
}

// This tag's config won't be auto-generated by onConfigGeneration
const manualTranslations = i18n({
  specialCase: "This needs a specific configuration (manual)"
}, {
  namespace: 'specialNamespace',
  path: 'custom.path.for.specialCasePrefix',
  manual: true // Flag indicates manual config, onConfigGeneration will ignore this
} as CustomAppConfig); // Type assertion if using an extended config type

// This tag's config *will* be processed by onConfigGeneration (if manual is not true)
const autoTranslations = i18n({
  regularCase: "This can use auto-generated configuration"
}, {
  namespace: 'auto' // May be overridden or augmented by onConfigGeneration logic
});

// Example component (optional)
function SpecialComponent() {
  return (
    <div>
      <p>{manualTranslations.specialCase()}</p>
      <p>{autoTranslations.regularCase()}</p>
    </div>
  );
}
``` 