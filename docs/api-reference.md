# API Reference

This section provides reference details for the core functions exported by `lang-tag`.

## mapTranslationObjectToFunctions

This core function transforms translation objects into callable functions:

```ts
function mapTranslationObjectToFunctions<T extends LangTagTranslations>(
  translations: T,
  config: LangTagTranslationsConfig,
  options: {
    transform: (info: {
      config: LangTagTranslationsConfig;
      path: string;
      key: string;
      keyPrefix: string;
      value: string;
      params: Record<string, any>;
    }) => any;
    onKeyAppend?: TranslationsToFunctionsMapperOnKeyAppend;
  }
): TranslationFunctions<T>
```

The `transform` function receives:
- `config`: The provided configuration object
- `path`: Full dot-notation path to the translation
- `key`: Current key name
- `keyPrefix`: Parent path
- `value`: Raw translation string
- `params`: Parameters passed when calling the translation function

Example values for `translations.foo.bar.hello({name: "Joe"})`:
- config: `{ path: 'some.path', namespace: 'test' }`
- path: `some.path.foo.bar.hello`
- key: `hello`
- keyPrefix: `some.path.foo.bar`
- value: `"Hello {{name}}, to world!"`
- params: `{name: "Joe"}` 