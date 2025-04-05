# CLI Usage

This section details the command-line interface (CLI) commands provided by `lang-tag` for managing your translations and automatically generating configurations.

## Translation Extraction & Management Commands

Lang Tag provides commands to extract and manage translations:

```bash
# Extract all translations to output directory
lang-tag collect

# Regenerate configuration for all language tags
lang-tag regenerate-tags
# or use the alias
lang-tag rt

# Watch for changes and extract automatically
lang-tag watch
```

The `collect` command gathers all translations from your source files and merges them into namespace-based JSON files in your `outputDir`.

The `regenerate-tags` command (alias: `rt`) applies the `onConfigGeneration` function from your configuration to all language tags in your project, updating their configuration based on the rules you've defined. This is useful for standardizing translation structures across your project.

The `watch` command monitors your source files for changes and automatically updates translation files when changes are detected.

## Automatic Configuration Generation (`onConfigGeneration`)

The `onConfigGeneration` option in your `.lang-tag.config.js` allows you to define a function that automatically determines the `namespace` and `path` configuration for your `lang-tag` calls based on the file's location. This is particularly useful for standardizing translation structures across large projects.

### Example 1: Using a '!' Prefix for Manual Overrides

This approach uses a '!' prefix in the `path` config within your source file to signal that `onConfigGeneration` should *not* modify this specific tag's configuration.

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
    return mapTranslationObjectToFunctions(
        translations,
        config,
        {transform: ({path}) => {
            if (path?.startsWith('!')) return path.substring(1);
            return path;
        }}
    );
}
```

### Example 2: Using a `manual: true` Flag for Manual Overrides

This approach adds a custom boolean flag (e.g., `manual: true`) to the configuration object within your source file to prevent `onConfigGeneration` from modifying it.

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
// Define an extended interface if using TypeScript
interface OurLangTagConfig extends LangTagTranslationsConfig {
  manual?: boolean;
}

// This tag's config won't be auto-generated
const manualTranslations = i18n({
  specialCase: "This needs a specific configuration"
}, { 
  namespace: 'special',
  path: 'custom.path.structure',
  manual: true // Flag indicates manual config
} as OurLangTagConfig); // Type assertion might be needed

// This tag's config *will* be processed by onConfigGeneration
const autoTranslations = i18n({
  regularCase: "This can use auto-generated configuration"
}, { 
  namespace: 'auto' // May be overridden by auto-generation logic
});
``` 