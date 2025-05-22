# Flexible Translation Definitions

`lang-tag` primarily helps you create `CallableTranslations` where each leaf node is a `ParameterizedTranslation` function (e.g., `(params) => \`Hello \${params.name}\``). This is typically achieved using the `createCallableTranslations` function, often wrapped in your custom tag function (e.g., `i18n` or `lang`).

However, when defining translations, especially static ones, or when designing components that *receive* translations, it can be verbose to always pre-define everything as a function. `FlexibleTranslations<T>` and `normalizeTranslations` offer a more lenient way to handle these inputs.

## `FlexibleTranslations<T>` Type

This utility type allows you to define translation input objects where leaf nodes can be:

1.  A `ParameterizedTranslation` function: `(params) => \`Hello \${params.name}\``
2.  A plain `string`: `"This is a static message."`

`T` represents the expected shape of your translations object. You can often derive `T` using `typeof` on a base translation object that defines the structure and keys you expect.

## `normalizeTranslations<T>` Function

This function takes an object of type `FlexibleTranslations<T>` and converts it into a `CallableTranslations<T>` object. This ensures that:

*   Plain strings are converted into parameter-less `ParameterizedTranslation` functions (e.g., `"text"` becomes `() => "text"`).
*   Existing `ParameterizedTranslation` functions (or compatible ones) are preserved.
*   Nested objects are recursively normalized.

## Core Use Case: Library Components Accepting Flexible Translations

A common scenario for `FlexibleTranslations` is when creating reusable components (e.g., in a UI library) that need to be internationalized. The component can define the *shape* of translations it expects and accept a more flexible input from its consumers.

```tsx
// --- Library: src/components/ProfileCard.tsx ---
import React from 'react';
import {
  FlexibleTranslations,
  normalizeTranslations,
  CallableTranslations,
  ParameterizedTranslation,
  InterpolationParams
} from 'lang-tag'; // Assuming lang-tag is a dependency of the library

// 1. Define the SHAPE of translations your component expects.
// This object's structure will be used with typeof.
const profileCardTranslation = lang({
    title: "Member profile",
    description: "Some description",
    welcomeMessage: "Hello, {{name}}!",
    footer: {
        copyright: "© 2024 Company",
        contact: "Contact us at {{email}}"
    }
}, { namespace: 'profile' });

// 2. Define Prop types for your component
export interface ProfileCardProps {
  userName?: string;
  lastUpdateDate: string;
  // The component accepts FlexibleTranslations based on the defined shape
  translations: FlexibleTranslations<typeof profileCardTranslation>;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
  userName,
  email,
  translations
}) => {
  // 3. Normalize translations internally before use
  const t = normalizeTranslations(translations);

  return (
    <div className="profile-card">
      <h1>{t.title()}</h1>
      <p>{t.welcomeMessage({ name: userName })}</p>
      <footer>
        <p>{t.footer.contact({ email })}</p>
      </footer>
    </div>
  );
};
```

In this example:
*   `profileCardTranslationShape` is a plain object defining the keys and the type of values (string or function) the `ProfileCard` component expects for its translations.
*   `ProfileCardProps` uses `FlexibleTranslations<typeof profileCardTranslationShape>` for its `translations` prop. This tells consumers that they can provide an object matching this shape, where individual translations can be strings or functions.
*   Internally, `ProfileCard` calls `normalizeTranslations` to ensure all translation leaves are callable functions before rendering.

### How It Works Internally

The `normalizeTranslations` function is used internally to transform string values into parameterless functions:

```typescript
import { normalizeTranslations } from 'lang-tag';

// A translation object with mixed strings and functions
const flexibleTranslations = {
    title: "Member profile",
    description: "Some description",
    welcomeMessage: (params) => `Hello, ${params.name}!`
};

// Normalize converts strings to functions
const normalized = normalizeTranslations(flexibleTranslations);

// Result is equivalent to:
// {
//    title: () => "Member profile",
//    description: () => "Some description",
//    welcomeMessage: (params) => `Hello, ${params.name}!`
// }
```

## Consuming the Library Component

Now, let's see how different applications can consume `ProfileCard`.

### 1. Consuming Project Uses `lang-tag`

If the consuming project also uses `lang-tag` with its own tag function (e.g., `app_i18n`), it can prepare translations that match the `profileCardTranslationShape`.

```tsx
// --- Consuming App: src/pages/UserProfilePage.tsx ---
import React from 'react';
import { ProfileCard } from 'my-ui-library'; // Your library component
import { app_i18n } from '../utils/app_i18n'; // App's own lang-tag setup

// Define translations for the ProfileCard, matching its expected shape.
// This `cardTranslations` object will be of type CallableTranslations<typeof profileCardTranslationShape>
const cardTranslations = app_i18n({
  // These keys must match 'profileCardTranslationShape'
  title: "My Application Profile",
  greeting: (params) => `Welcome back, ${params.name}!`,
  description: "Tell us about yourself...",
  footer: {
    contact: "Constact us at: {{email}}"
  }
}, { namespace: 'userViews', path: 'profilePage.card' });


export function UserProfilePage() {
  const currentUser = { name: "Alice", lastSeen: "2024-03-10" };

  // The output of app_i18n (cardTranslations) is already CallableTranslations.
  // normalizeTranslations inside ProfileCard will handle this fine.
  return (
    <ProfileCard
      userName={currentUser.name}
      lastUpdateDate={currentUser.lastSeen}
      translations={cardTranslations} // Pass the fully callable translations
    />
  );
}
```
In this case, `cardTranslations` (output of `app_i18n`) is already a `CallableTranslations` object. When passed to `ProfileCard`, the internal `normalizeTranslations` will essentially be a no-op for the already callable functions, ensuring consistency.

### 2. Consuming Project Provides Raw Translations (Does Not Use `lang-tag` Tags)

If the consuming project doesn't use `lang-tag`'s tag system for this specific component, or prefers to provide translations manually, it can pass a plain object that conforms to `FlexibleTranslations<typeof profileCardTranslation>`.

```tsx
// --- Consuming App: src/pages/AnotherProfilePage.tsx ---
import React from 'react';
import { ProfileCard } from 'my-ui-library';
// No lang-tag import needed here if providing raw translations

export function AnotherProfilePage() {
  const currentUser = { name: "Bob", email: "2024-03-11" };

  return (
    <ProfileCard
      userName={currentUser.name}
      lastUpdateDate={currentUser.lastSeen}
      translations={{ // This is a FlexibleTranslations object
        title: "Bob's View", // string
        welcomeMessage: (params) => `Hey ${params.name}, what's up?`, // function
        description: "Some description", // string
        footer: {
          // Can mix strings and functions even in nested objects
          contact: "Contact at: {{email}}"
        }
      }}
    />
  );
}
```
Here, `ProfileCard` receives a mix of strings and functions. Its internal `normalizeTranslations` call will convert the strings (`title`, `description`, `footer.contact`) into callable functions, making the component work as expected.

## Summary of `FlexibleTranslations` Usage

*   **Define Expected Shape:** When creating a reusable component that needs translations, define a constant object representing the *shape* and default/example values for its translations (e.g., `myComponentTranslationShape as const`).
*   **Type Component Props:** Use `FlexibleTranslations<typeof myComponentTranslation>` for the prop that accepts translations.
*   **Normalize Internally:** Inside your component, call `normalizeTranslations` on the received prop before using the translations.
*   **Consumer Flexibility:** This allows consumers of your component to provide translations either as fully `CallableTranslations` (e.g., from their own `lang-tag` setup) or as more lenient `FlexibleTranslations` objects (plain strings mixed with functions).

This approach decouples your reusable component from the specific translation management strategy of its consuming applications, while still ensuring type safety and a consistent internal API via `CallableTranslations`.

## `PartialFlexibleTranslations<T>`

The `PartialFlexibleTranslations<T>` type represents a deeply partial version of an original translation structure `T`, after being processed by the flexible translation logic.

This type makes all properties at all levels of nesting optional. The transformation rules for the types of these properties mirror those in `FlexibleTranslations<T>` (e.g., a `string` in `T` becomes `ParameterizedTranslation | string` here, but optional).

It is an alias for `RecursiveFlexibleTranslations<T, true>` (defined in `src/index.ts`).

This is useful when you want to provide only a subset of translations for a given structure, for example, when overriding a few specific translations from a larger set or when defining translations incrementally.

**Type Parameter:**

*   `T`: The original, un-transformed, structure of the translations. This is the same kind of type argument that `FlexibleTranslations<T>` expects. It defines the shape and types of the translations *before* they are made flexible or partial.

**Usage Example:**

```typescript
import { PartialFlexibleTranslations, normalizeTranslations } from './src/index'; // Assuming the path is correct

interface MyTranslations {
  greeting: string;
  farewell: string;
  user: {
    name: string;
    age: string; // Represented as a string for translation purposes
  };
}

const partialMsgs: PartialFlexibleTranslations<MyTranslations> = {
  greeting: "Hi there!", // string becomes ParameterizedTranslation | string
  user: { // user itself is optional, and its properties are also optional
    age: (params) => `Age: ${params?.years}` // can be a ParameterizedTranslation directly
  }
  // farewell is omitted, which is allowed
  // user.name is omitted, also allowed
};

// This can then be passed to normalizeTranslations:
const normalized = normalizeTranslations(partialMsgs);
// normalized will be:
// {
//   greeting: Function,
//   user: {
//     age: Function
//   }
// }
```