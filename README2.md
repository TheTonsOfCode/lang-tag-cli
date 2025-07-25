# Lang-tag: Minimalist Component-Colocated Translation Management

Professional solution for managing translations in JavaScript/TypeScript projects, especially those using component-based architectures. `lang-tag` simplifies i18n by allowing you to define translation keys directly within the components where they are used, rather than in separate, namespace-specific files. Translations become callable function objects with full TypeScript support, providing excellent developer experience with IntelliSense and compile-time safety.

## Key Benefits

### Ultra-lightweight Core (~1KB)

The library core is designed with performance in mind - bundled weighs only **~1KB** ([verify on bundlephobia](https://bundlephobia.com/package/lang-tag)). Contains only essential TypeScript types and minimal functions enabling creation of custom `lang-tag` tailored to project specifics.

- **Component-colocated definitions** - define translations directly within components where they're used, eliminating the need to manage complex key structures across separate namespace files
- **Minimal structural constraints** - the core enforces only the translation object structure (key-value pairs where values are strings or nested key-value objects). Everything else - naming conventions, configuration parameters, translation functions, and underlying translation libraries - is entirely developer-configurable, enabling rapid creation of custom `lang-tag` implementations
- **Flexible library mapping** - library packages created with `lang-tag` can ultimately be mapped classically translation by translation, but projects which also have their own `lang-tag` can have instant translation experience for everything within those libraries while maintaining full control over each translation

### Advanced CLI (zero bundle impact)

Full functionality is available through advanced CLI tooling that doesn't affect your application bundle size:

- **Automatic translation collection** - `lang-tag collect` scans your project for translation tags and automatically aggregates them into namespace-based JSON files (e.g., `public/locales/en/common.json`) based on configuration rules
- **Dynamic configuration regeneration** - `lang-tag regenerate-tags` automatically updates translation settings in source code according to `onConfigGeneration` rules (e.g., namespaces based on folder structure)
- **Library translation import** - `lang-tag import` discovers and imports translations from `node_modules` packages with `.lang-tag.exports.json`, generating integration files that use your project's own tag function
- **Watch mode** - `lang-tag watch` monitors source files for changes and automatically runs collection when translation tags are modified

### Enterprise-ready Architecture

The solution provides:
- **Framework agnostic** - works with any JavaScript/TypeScript project, with built-in examples for React and react-i18next integration
- **Library ecosystem support** - create reusable component libraries with embedded translations that consuming applications can easily integrate and override
- **Full TypeScript support** - complete type safety with IntelliSense for all translation keys and interpolation parameters
- **Flexible integration** - seamlessly integrates with existing i18n libraries (i18next, react-i18next) while maintaining your current translation workflow
- **Automation-first** - comprehensive CLI tools for collection, import, regeneration, and watch modes to streamline the entire translation workflow