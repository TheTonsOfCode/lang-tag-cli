# Using Lang Tag

## Basic Usage

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

## Nested Translations

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