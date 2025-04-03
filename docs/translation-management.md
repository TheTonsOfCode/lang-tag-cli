# Translation Management

## Extracting Translations

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

## Automatic Configuration Generation

You can automatically generate configurations for your tags with the `onConfigGeneration` option. Here are two approaches for mixing automatic and manual configurations:

### Example 1: Using '!' Prefix

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

### Example 2: Using config.manual Flag

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