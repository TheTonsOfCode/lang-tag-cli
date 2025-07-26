# Lang-tag: Component-Colocated Translation Management

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

### Practical and Flexible Architecture

The solution provides:
- **Framework agnostic** - works with any JavaScript/TypeScript project, with built-in examples for React and react-i18next integration
- **Library ecosystem support** - create reusable component libraries with embedded translations that consuming applications can easily integrate and override
- **Full TypeScript support** - complete type safety with IntelliSense for all translation keys and interpolation parameters
- **Flexible integration** - seamlessly integrates with existing i18n libraries (i18next, react-i18next) while maintaining your current translation workflow
- **Automation-first** - comprehensive CLI tools for collection, import, regeneration, and watch modes to streamline the entire translation workflow

## Core Concept

`lang-tag` allows translation management by enabling component-colocated translation definitions. This approach eliminates the traditional complexity of managing distributed translation files and hierarchical key structures, allowing developers to define translations directly where they are consumed.

### Component-Colocated Translation Pattern

Instead of maintaining separate translation files and complex key mappings, translations are defined inline within components:

```tsx
// Component with colocated translations using custom i18n tag
import { i18n } from '../utils/i18n';

const translations = i18n({
    greeting: 'Welcome {{name}} to our store!',
    orderSummary: 'You have {{count}} items in your cart.',
    actions: {
        proceed: 'Proceed to Payment',
        cancel: 'Cancel Order'
    }
}, {
    namespace: 'orders',
    path: 'components.checkout'
});

function CheckoutComponent({ name, count }) {
    const t = translations.useT();
    
    return (
        <div>
            <h2>{t.greeting({ name })}</h2>
            <p>{t.orderSummary({ count })}</p>
            <div>
                <button>{t.actions.proceed()}</button>
                <button>{t.actions.cancel()}</button>
            </div>
        </div>
    );
}
```

### Automated Translation Workflow

The `lang-tag` ecosystem provides tooling to transform colocated definitions into production-ready translation files:

**Intelligent Collection & Organization**
- The `lang-tag collect` command discovers translation tags throughout your codebase
- Translations are organized into namespace-based JSON files (e.g., `public/locales/en/orders.json`)
- Hierarchical key structures can be automatically generated based on configuration rules (eg.: based on component paths)

**Dynamic Configuration Management**
- Configuration parameters can be automatically generated using `onConfigGeneration` rules
- Namespace and path assignments can be derived from custom logic (eg.: by file structure, component location)
- The `lang-tag regenerate-tags` command updates source code configurations dynamically

**Development-Time Optimization**
- Watch mode (`lang-tag watch`) provides real-time translation collection during development
- Changes to translation definitions trigger automatic regeneration of translation files
- Full TypeScript integration ensures compile-time validation of translation keys and parameters

### Enterprise Integration Capabilities

**Framework Agnostic Architecture**
- Core library provides building blocks (like `createCallableTranslations`) for creating custom tag functions
- Seamless integration with existing i18n libraries (i18next, react-i18next, etc.)
- Maintains compatibility with current translation workflows while enhancing developer experience

**Library Ecosystem Support**
- Component libraries can embed translations using `.lang-tag.exports.json` manifests
- The `lang-tag import` command automatically discovers and integrates library translations
- Consuming applications maintain full control over translation overrides and customization

**Type-Safe Translation Experience**
- Complete TypeScript support with IntelliSense for all translation keys
- Compile-time validation of interpolation parameters
- Callable translation objects provide intuitive API with full type inference

## Installation

```bash
npm install lang-tag
# or
yarn add lang-tag
# or
pnpm add lang-tag
```

## Documentation

For detailed setup, usage, and advanced features, please refer to the documentation:

- [Getting Started & Basic Usage](docs/getting-started.md)
- [CLI Usage](docs/cli-usage.md)
- [Advanced Features](docs/advanced-features.md)
- [Integrations](docs/integrations.md)
- [React-i18next Example](docs/react-i18n-example.md)
- [Library Support](docs/library-support.md)
- [API Reference](docs/api-reference.md)
- [Flexible Translation Definitions](docs/flexible-translations.md)