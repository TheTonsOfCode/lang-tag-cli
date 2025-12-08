# Lang-tag: Component-Colocated Translation Management / Translation Engine Proxy

A professional solution for managing translations in modern JavaScript/TypeScript projects, especially those using component-based architectures. `lang-tag` simplifies internationalization by allowing you to define translation keys directly within the components where they are used. Translations become local, callable function objects with full TypeScript support, IntelliSense, and compile-time safety.

#### Installation

```shell
npm i lang-tag
npm i -D @lang-tag/cli
```

## Key Benefits

### Lightweight Core (~1KB)

The core is optimized for performance, with a bundle size of just **~1KB** ([check on Bundlephobia](https://bundlephobia.com/package/lang-tag)). It provides essential TypeScript types and minimal utilities to help you build a custom `lang-tag` setup tailored to your project.

- **Component-local translations** – define translations directly within components, avoiding scattered key structures
- **Light structure, full control** – only the translation object shape is enforced; naming, config, functions, and libraries are all up to you
- **Flexible library support** – integrate third-party packages effortlessly, with support for both classic mappings and fully customized `lang-tag` flows

### Effortless translation structure

Instead of manually managing centralized translation files, `lang-tag` lets you colocate keys within components and automatically organizes them into namespaces based on your project structure. For example, all components in `components/orders` or pages in `pages/order` share the `orders` namespace. You define a simple folder-to-namespace mapping once, and `lang-tag` handles merging and file organization—while you retain full control over how namespaces are merged.

> Set your rules, then let `lang-tag` do the rest.

### Advanced CLI

Full functionality is available through an advanced CLI that keeps your application bundle size untouched:

- **Automatic translation collection** – `lang-tag collect` scans your project for translation tags and aggregates them into organized JSON files (e.g., `public/locales/en/common.json`), based on your configuration
- **Dynamic configuration updates** – `lang-tag regenerate-tags` automatically refreshes translation settings in your code, using rules defined in your configuration (e.g., mapping namespaces based on folder structure)
- **Third-party translation import** – `lang-tag import` detects and integrates translations from external libraries, adapting them to your project’s translation system
- **Watch mode** – `lang-tag watch` monitors your source files for changes and automatically re-collects/re-generates translations when needed

### Practical and Flexible Architecture

The solution provides:

- **Framework agnostic** – works with any JavaScript/TypeScript project and integrates easily with libraries like react-i18next
- **Library ecosystem support** - create reusable component libraries with embedded lang-tag translations that consuming lang-tag applications can easily import/integrate and override
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

const translations = i18n(
    {
        greeting: 'Welcome {{name}} to our store!',
        orderSummary: 'You have {{count}} items in your cart.',
        actions: {
            proceed: 'Proceed to Payment',
            cancel: 'Cancel Order',
        },
    },
    {
        namespace: 'orders',
        path: 'components.checkout',
    }
);

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
