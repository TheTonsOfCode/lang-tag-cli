# API Reference

This section provides reference details for the core functions exported by `lang-tag`.

## createCallableTranslations

This core function transforms translation objects (of type `LangTagTranslations`) into a deeply nested object where each string translation becomes a `ParameterizedTranslation` function. The result is of type `CallableTranslations<T>`.

```ts
import {
  CallableTranslations,
  InterpolationParams,
  LangTagTranslations,
  LangTagTranslationsConfig,
  TranslationKeyProcessor,
  TranslationMappingStrategy,
  TranslationTransformContext,
  // Supporting types that might be used when defining a strategy:
  TranslationTransformer,
} from 'lang-tag';

function createCallableTranslations<T extends LangTagTranslations>(
  translations: T,
  config: LangTagTranslationsConfig | undefined,
  strategy: TranslationMappingStrategy<LangTagTranslationsConfig>
): CallableTranslations<T>;
```

**Parameters:**

- `translations: T`: The input object containing translation strings and nested objects.
- `config: LangTagTranslationsConfig | undefined`: Configuration object, often including `namespace` and a base `path` for the translations.
- `strategy: TranslationMappingStrategy<LangTagTranslationsConfig>`: An object defining the transformation behavior:
  - `transform: TranslationTransformer`: A function that takes a `TranslationTransformContext` and returns the final string. This is where you define how placeholders are replaced.
  - `processKey?: TranslationKeyProcessor`: An optional function to customize how keys are processed, e.g., for handling pluralization by generating multiple keys from a single input key.

**`TranslationTransformContext` (passed to `strategy.transform`):**

```ts
interface TranslationTransformContext<
  Config extends LangTagTranslationsConfig,
> {
  config: Config | undefined; // The config object passed to createCallableTranslations.
  parentPath: string; // Dot-notation path of the parent object (e.g., "myFeature.greetings.").
  path: string; // Full dot-notation path to the current translation (e.g., "myFeature.greetings.hello").
  key: string; // The specific key of the current translation (e.g., "hello").
  value: string; // The raw string value of the translation (e.g., "Hello {{name}}!").
  params?: InterpolationParams; // Parameters passed when the resulting translation function is called (e.g., { name: "Joe" }).
}
```

**`TranslationKeyProcessorContext` (passed to `strategy.processKey`):**

```ts
interface TranslationKeyProcessorContext<
  Config extends LangTagTranslationsConfig,
> {
  config: Config | undefined;
  parentPath: string;
  path: string; // Full path to the original key being processed.
  key: string; // The original key being processed.
  value: string; // The original value being processed.
}
```

**`TranslationKeyProcessor` signature:**

```ts
type TranslationKeyProcessor<Config extends LangTagTranslationsConfig> = (
  context: TranslationKeyProcessorContext<Config>,
  addProcessedKey: (newKey: string, originalValue: string) => void
) => void;
```

- `addProcessedKey`: A callback to register a new key (and its associated original string value) in the output `CallableTranslations` object.

**Example `TranslationTransformContext` values for `translations.foo.bar.hello({name: "Joe"})` where `config = { path: 'myApp.', namespace: 'test' }` and `hello`'s value is `"Hello {{name}}!"`:**

- `config`: `{ path: 'myApp.', namespace: 'test' }`
- `parentPath`: `myApp.foo.bar.`
- `path`: `myApp.foo.bar.hello`
- `key`: `hello`
- `value`: `"Hello {{name}}!"`
- `params`: `{name: "Joe"}`

## normalizeTranslations

Converts a `FlexibleTranslations<T>` object (where translations can be strings or `ParameterizedTranslation` functions) into a `CallableTranslations<T>` object (where all translations are guaranteed to be `ParameterizedTranslation` functions).

```ts
import { CallableTranslations, FlexibleTranslations } from 'lang-tag';

function normalizeTranslations<T>(
  translations: FlexibleTranslations<T>
): CallableTranslations<T>;
```

## defaultTranslationTransformer

A pre-defined `TranslationTransformer` that implements basic placeholder replacement (e.g., `{{name}}`).

```ts
import {
  LangTagTranslationsConfig,
  TranslationTransformer,
  defaultTranslationTransformer,
} from 'lang-tag';

const myTransformer: TranslationTransformer<LangTagTranslationsConfig> =
  defaultTranslationTransformer;
```

## Core Types

- `LangTagTranslationsConfig`: Configuration for translation processing.
- `LangTagTranslations`: The raw input type for translation objects.
- `InterpolationParams`: Type for parameters passed to translation functions (typically `Record<string, any>`).
- `ParameterizedTranslation`: Type for a function that takes `InterpolationParams` and returns a string.
- `CallableTranslations<T>`: The output type where all translations are `ParameterizedTranslation` functions.
- `FlexibleTranslations<T>`: An input type allowing strings or `ParameterizedTranslation` functions.
- `TranslationMappingStrategy`: Defines how translations are transformed.
- `TranslationTransformer`: Function type for the core transformation logic.
- `TranslationKeyProcessor`: Function type for advanced key processing (e.g., pluralization).
