# Lang-tag: Component-Colocated Translation Management

`lang-tag` is a robust solution for managing translations in JavaScript/TypeScript projects, especially those using component-based architectures. It simplifies i18n by allowing you to define translation keys directly within the components where they are used, rather than in separate, namespace-specific files.

## Core Concept

The primary goal is to colocate translation definitions with their usage. Instead of managing complex key structures and deciding which translation file (`orders.json`, `profile.json`, etc.) a key belongs to, you define translations inline:

```tsx
// Example component using a custom `i18n` tag built with lang-tag
import { i18n } from '../utils/i18n';

const translations = i18n({
    greeting: 'Welcome {{name}} to our store!',
    orderSummary: 'You have {{count}} items in your cart.'
}, {
    // Configuration like path/namespace can often be automated!
    namespace: 'orders',
    path: 'components.checkout' 
});

function CheckoutComponent({ name, count }) {
    // Option 1: Direct function calls
    // return (
    //   <p>{translations.greeting({ name })}</p>
    //   <p>{translations.orderSummary({ count })}</p>
    // );

    // Option 2: Using a hook (e.g., integrating with react-i18next)
    const t = translations.useT(); 
    return (
        <div>
            <p>{t.greeting({ name })}</p>
            <p>{t.orderSummary({ count })}</p>
        </div>
    );
}
```

`lang-tag` provides the building blocks (`mapTranslationObjectToFunctions`) and CLI tools (`lang-tag`) to make this work seamlessly:

*   **Automated Organization:** The `lang-tag collect` command scans your project for these tags and automatically aggregates the translations into the correct namespace files (e.g., `public/locales/en/orders.json`) based on the tag's configuration or rules you define (`onConfigGeneration`). For the example above, it would place the translations under the key `components.checkout.greeting` and `components.checkout.orderSummary` within `orders.json`.
*   **Simplified Key Management:** Developers focus on meaningful keys within the component's context, letting the tools handle the final path and namespace.
*   **Flexibility:** Build your own tag functions (like the `i18n` function shown) tailored to your project's needs and integrate with existing i18n libraries (like `react-i18next`).
*   **CLI Tooling:** Includes commands to collect translations, watch for changes, and automatically generate configuration within source files.
*   **Library Support:** Enables creating reusable libraries with embedded translations that consuming applications can easily integrate.

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
- [Library Support](docs/library-support.md)
- [API Reference](docs/api-reference.md)
