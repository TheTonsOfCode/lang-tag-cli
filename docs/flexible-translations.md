# Flexible Translation Definitions

Lang-tag primarily works with translation objects where each leaf node is a function that takes optional parameters and returns a string. However, for simpler cases or when dealing with static translations, defining every single string as a function `() => 'My static string'` can be verbose.

To address this, `lang-tag` introduces the `FlexibleTranslations` type and the `normalizeTranslations` utility function.

## `FlexibleTranslations<T>`

This utility type allows you to define your translation objects more leniently. Leaf nodes (the actual translations) can be either:

1.  A standard `ParametrizedFunction`: `(params) => \`Hello ${params.name}\``
2.  A plain `string`: `'This is a static message.'`

### Basic Example

```tsx 
// Assume 'lang' is your custom tag function built with lang-tag
import { lang } from './path/to/your/lang-function';
import { FlexibleTranslations, normalizeTranslations } from 'lang-tag';

const translations = lang({
    title: "Member profile",
    description: "Some description",
    welcomeMessage: "Hello, {{name}}!",
    footer: {
        copyright: "© 2024 Company",
        contact: "Contact us at {{email}}"
    }
}, { namespace: 'profile' });

// Type component props using FlexibleTranslations and typeof
interface ProfileComponentProps {
    t: FlexibleTranslations<typeof translations>;
}

// Component using the translations
export function ProfileComponent({t}: ProfileComponentProps) {
    const nt = normalizeTranslations(t);

    return <div>
        <h1>{nt.title()}</h1>
        <h2>{nt.description()}</h2>
        <p>{nt.welcomeMessage({ name: 'User' })}</p>
        <footer>
            <div>{nt.footer.copyright()}</div>
            <div>{nt.footer.contact({ email: 'support@example.com' })}</div>
        </footer>
    </div>;
}
```

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
I'll translate the Polish text into professional English:

### Usage in Projects Importing the Library:

##### Project Using lang-tag

```shell
lang-tag collect -l
```

A file with the tag will be created in the imported tags directory:
```typescript
const importedLibraryTranslations = mainProjectLangTag({
    title: "Default title when tag will be imported to project",
    hello: "Hello {{name}}",
}, { namespace: 'profile' });
```

This can be customized:
```typescript
const importedLibraryTranslations = mainProjectLangTag({
    title: "Profile page",
    hello: "Welcome {{name}}!",
}, { namespace: 'profile' });
```

Then, we can use it in the project like this:
```tsx
function ProfilePage() {
   const t = importedLibraryTranslations.useT();
   return <ProfileComponent t={t}/>
}
```

Since the translation object structure is preserved, we can simply pass the entire object from the tag.

##### Project Not Relying on Tags

Flexible translation enables projects that don't rely on tags to still implement translations in the traditional way commonly used in libraries by passing raw translations:

```tsx
function ProfilePage() {
   return <ProfileComponent t={{title: "My title", hello: 'Hello Adam!'}}/>
}
```

We can also mix approaches:
```tsx
function ProfilePage() {
   return <ProfileComponent t={{title: "Another title", hello: (params) => `Welcome ${params.name}!` }}/>
}
```