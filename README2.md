# Lang-tag: Minimalist Translation Management API

Professional solution for efficient translation management in JavaScript/TypeScript projects. `lang-tag` enables working with translations as callable function objects directly in code, offering high flexibility and performance. Since translations are object-based, all translation calls are fully typed, providing excellent developer experience with IntelliSense support and compile-time safety.

## Key Benefits

### Ultra-lightweight Core (~1KB)

The library core is designed with performance in mind - bundled weighs only **~1KB** ([verify on bundlephobia](https://bundlephobia.com/package/lang-tag)). Contains only essential TypeScript types and minimal functions enabling creation of custom `lang-tag` tailored to project specifics.

- **Minimal structural constraints** - the core enforces only the translation object structure (key-value pairs where values are strings or nested key-value objects). Everything else - naming conventions, configuration parameters, translation functions, and underlying translation libraries - is entirely developer-configurable, enabling rapid creation of custom `lang-tag` implementations
- **Flexible library mapping** - library packages created with `lang-tag` can ultimately be mapped classically translation by translation, but projects which also have their own `lang-tag` can have instant translation experience for everything within those libraries while maintaining full control over each translation

### Advanced CLI (zero bundle impact)

Full functionality is available through advanced CLI tooling that doesn't affect your application bundle size:

- **Automatic translation collection** - project scanning and translation aggregation into i18n-compliant structure (fully configurable)
- **Dynamic configuration regeneration** - automatic updating of translation settings in source code according to defined rules (e.g. namespaces based on folder structure)
- **Seamless library integration** - instant importing of translations from `node_modules` packages using `lang-tag`. Ability to pass local `lang-tag` instance to external libraries, eliminating the need for manual mapping of each translation - just one instance compatible with project configuration

### Enterprise-ready Architecture

The solution provides:
- **Zero overhead** - minimal impact on application size and performance
- **Full control** - complete control over configuration and translation structure
- **Standards compliance** - compatibility with any project standards and conventions
- **Automation-first** - advanced CLI tools for full translation workflow automation