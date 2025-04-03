# Lang-tag: Translation Management Library for Component-Based i18n

A robust solution for managing translations in JavaScript/TypeScript projects with a structured tagging system. This library streamlines managing translations by moving i18n keys directly into the component files where they are used, automating organization based on predefined rules.

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

# Overview

Lang Tag helps you manage translations in a type-safe and organized way. It allows you to define translations inline in your code, extract them automatically, and use them efficiently in both client and server environments.

## Key Features
- Developers write simple translation keys, and the algorithm determines the appropriate namespace or path.
- The library allows developers to configure how namespaces are automatically overridden or how paths are aggregated within the namespace.
- The library does not provide a predefined tag but offers simple functions to construct a tagging system according to project needs, avoiding unnecessary dependencies.
- A developer tool aggregates all translations from the project into a structured i18n directory.
- This tool also enables the automatic generation of namespace and path configurations within source files.
- The developer tool can treat project as library which uses lang tags, so it allows to create exportable file containg tags used across library, which can be added into package build,
then later in main project if you install package with that file, the tool can import tags with default translations and same structure
ensuring consistency in translation keys and structure

## Example: Common namespaces naming with Next.js
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

# Installation

```bash
npm install lang-tag
```

## Documentation

For more detailed information, please refer to the documentation files:

- [Getting Started](docs/getting-started.md)
- [Usage](docs/usage.md)
- [Integration with Translation Libraries](docs/integration.md)
- [Advanced Features](docs/advanced-features.md)
- [Translation Management](docs/translation-management.md)
- [API Reference](docs/api-reference.md)
- [Using Translations in Library Projects](docs/library-usage.md)
