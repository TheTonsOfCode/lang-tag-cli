/**
 * Configuration for LangTag translations.
 * @template Namespaces - The type used for namespaces, defaults to string.
 */
export interface LangTagTranslationsConfig<Namespaces = string> {
    /** Optional base path for translation keys. */
    path?: string;
    /** The namespace for the translations. */
    namespace: Namespaces;
}

/**
 * Represents a collection of translations.
 * Keys are strings, and values can be either strings (translations)
 * or nested LangTagTranslations objects for hierarchical translations.
 */
export type LangTagTranslations = {
    [key: string]: string | LangTagTranslations;
};

// export type LangTag<Config extends LangTagConfig = LangTagConfig, T = any> = (translations: LangTagTranslations, config?: Config) => T;

/**
 * Defines the structure for parameters used in interpolation.
 * It's a record where keys are placeholders and values are their replacements.
 */
export type InterpolationParams = Record<string, any>;
/**
 * Represents a function that takes optional interpolation parameters
 * and returns a translated string.
 */
export type ParameterizedTranslation = (params?: InterpolationParams) => string;

/**
 * Transforms a static translation object into an object where each
 * translation string or nested object is converted into a callable function
 * or a nested structure of callable functions.
 * @template T - The structure of the input translations.
 */
export type CallableTranslations<T> = {
    [P in keyof T]:
        T[P] extends ParameterizedTranslation ? ParameterizedTranslation :
        // Allow for pre-existing functions that might not strictly be ParameterizedTranslation
        // but are still callable and return a string, or a nested structure.
        T[P] extends (...args: any[]) => string ? T[P] :
        T[P] extends Record<string, any> ? CallableTranslations<T[P]> :
        ParameterizedTranslation; // Fallback for basic strings that will be converted
};

/**
 * Context provided to a translation transformer function.
 * @template Config - The LangTag translations configuration type.
 */
export interface TranslationTransformContext<Config extends LangTagTranslationsConfig> {
    /** The LangTag configuration object. */
    config: Config | undefined;
    /** The path of the direct parent object of the current translation key. */
    parentPath: string;
    /** The full path to the current translation key. */
    path: string;
    /** The current translation key. */
    key: string;
    /** The raw string value of the translation. */
    value: string; // The raw string value of the translation
    /** Optional interpolation parameters for the translation. */
    params?: InterpolationParams;
}

/**
 * Defines the signature for a function that transforms a raw translation string.
 * @template Config - The LangTag translations configuration type.
 * @param transformContext - The context for the transformation.
 * @returns The transformed translation string.
 */
type TranslationTransformer<Config extends LangTagTranslationsConfig> = (transformContext: TranslationTransformContext<Config>) => string;

/**
 * Context provided to a translation key processor function.
 * It omits the 'params' field from `TranslationTransformContext`.
 * @template Config - The LangTag translations configuration type.
 */
export type TranslationKeyProcessorContext<Config extends LangTagTranslationsConfig> = Omit<TranslationTransformContext<Config>, 'params'>;

/**
 * Defines the signature for a function that processes translation keys.
 * This allows for modifying or generating new keys based on the original key and value.
 * @template Config - The LangTag translations configuration type.
 */
export type TranslationKeyProcessor<
    Config extends LangTagTranslationsConfig = LangTagTranslationsConfig
> = (
    /** Context for processing the key. */
    context: TranslationKeyProcessorContext<Config>,
    /**
     * Callback to add a processed key.
     * @param newKey - The new key to be added to the result.
     * @param originalValue - The original string value associated with the key being processed.
     */
    addProcessedKey: (newKey: string, originalValue: string) => void
) => void;

/**
 * Defines the strategy for mapping and transforming translations.
 * @template Config - The LangTag translations configuration type.
 */
export interface TranslationMappingStrategy<Config extends LangTagTranslationsConfig> {
    /** The function used to transform raw translation strings. */
    transform: TranslationTransformer<Config>;
    /** Optional function to process translation keys. */
    processKey?: TranslationKeyProcessor<Config>;
}

/**
 * Recursively transforms a nested object of translation strings into an object
 * of callable translation functions.
 * @template T - The type of the input translations object.
 * @template Config - The LangTag translations configuration type.
 * @param config - The LangTag configuration object.
 * @param strategy - The translation mapping strategy.
 * @param input - The translations object to transform.
 * @param currentParentPath - The current parent path for building full translation keys.
 * @returns An object with the same structure as input, but with strings replaced by callable functions.
 * @internal
 */
function transformTranslationsToFunctions<
    T extends LangTagTranslations,
    Config extends LangTagTranslationsConfig
>(
    config: Config | undefined,
    strategy: TranslationMappingStrategy<Config>,
    input: T,
    currentParentPath: string
): CallableTranslations<T> {
    const result: Record<string, any> = {};

    for (const [originalKey, originalValue] of Object.entries(input)) {
        const currentPath = `${currentParentPath}${originalKey}`;

        if (typeof originalValue === 'object' && originalValue !== null) {
            result[originalKey] = transformTranslationsToFunctions(config, strategy, originalValue, `${currentPath}.`);
        } else if (typeof originalValue === 'string') {
            const createTranslationFunction = (pathForFunc: string, keyForFunc: string, valueForFunc: string) => {
                return (params?: InterpolationParams) => strategy.transform({
                    config,
                    parentPath: currentParentPath, // The path of the direct parent object
                    path: pathForFunc,        // The full path to this specific translation
                    key: keyForFunc,          // The key for this specific translation
                    value: valueForFunc,      // The raw string for this translation
                    params
                });
            };

            if (strategy.processKey) {
                strategy.processKey(
                    { config, parentPath: currentParentPath, path: currentPath, key: originalKey, value: originalValue},
                    (newKeyToAdd: string, valueForNewKey: string) => {
                        const pathForNewKey = currentParentPath + newKeyToAdd;
                        result[newKeyToAdd] = createTranslationFunction(pathForNewKey, newKeyToAdd, valueForNewKey);
                    }
                );
                // If processKey is used, it might replace or augment the original key.
                // We add the original key only if it wasn't added by processKey.
                if (!result[originalKey]) {
                     result[originalKey] = createTranslationFunction(currentPath, originalKey, originalValue);
                }
            } else {
                // Default behavior: always add the original key
                result[originalKey] = createTranslationFunction(currentPath, originalKey, originalValue);
            }
        }
        // If originalValue is neither an object nor a string, it's skipped.
        // This aligns with LangTagTranslations allowing only string or nested LangTagTranslations.
    }
    return result as CallableTranslations<T>;
}

/**
 * Creates a callable translations object from a static translations object.
 * This function initializes the transformation process.
 * @template T - The type of the input translations object.
 * @template Config - The LangTag translations configuration type.
 * @param translations - The static translations object.
 * @param config - The LangTag configuration object.
 * @param strategy - The translation mapping strategy.
 * @returns A callable translations object.
 */
export function createCallableTranslations<
    T extends LangTagTranslations,
    Config extends LangTagTranslationsConfig
>(
    translations: T,
    config: Config | undefined,
    strategy: TranslationMappingStrategy<Config>,
): CallableTranslations<T> {
    let basePath = config?.path || '';
    if (basePath && !basePath.endsWith('.')) basePath += '.';
    return transformTranslationsToFunctions(
        config,
        strategy,
        translations,
        basePath
    );
}

/**
 * Helper type to determine the flexible value of a translation property.
 * If `T` is a function returning a string, it can be `T` or `string`.
 * If `T` is a record, it recursively applies `RecursiveFlexibleTranslations`.
 * Otherwise, it can be `ParameterizedTranslation`, `T`, or `string`.
 * @template T - The type of the property value.
 * @template IsPartial - A boolean indicating whether properties should be optional.
 */
type FlexibleValue<T, IsPartial extends boolean> =
    T extends (...args: any[]) => string
        ? T | string
        : T extends Record<string, any>
            ? RecursiveFlexibleTranslations<T, IsPartial>
            : ParameterizedTranslation | T | string;

/**
 * Core type for flexible translations, allowing properties to be optional recursively.
 * This type serves as the foundation for `FlexibleTranslations` and `PartialFlexibleTranslations`.
 * It transforms a given translation structure `T` into a flexible version where each property
 * can be its original type, a string, or a `ParameterizedTranslation` function.
 * If `IsPartial` is true, all properties at all levels of nesting become optional.
 *
 * @template T The original, un-transformed, structure of the translations.
 * @template IsPartial A boolean indicating whether properties should be optional. 
 *   If true, all properties at all levels become optional (e.g., `string | undefined`).
 *   If false, properties are required (e.g., `string`).
 */
export type RecursiveFlexibleTranslations<T, IsPartial extends boolean> = {
    [P in keyof T]: IsPartial extends true
        ? FlexibleValue<T[P], IsPartial> | undefined
        : FlexibleValue<T[P], IsPartial>;
};

/**
 * Represents a flexible structure for translations where all properties are required, based on an original type `T`.
 * Allows for strings, `ParameterizedTranslation` functions, or other compatible functions
 * at any level of the translation object. This provides flexibility in how translations
 * are initially defined.
 * This type is an alias for `RecursiveFlexibleTranslations<T, false>`.
 * @template T - The original structure of the translations.
 */
export type FlexibleTranslations<T> = RecursiveFlexibleTranslations<T, false>;

/**
 * Represents a deeply partial version of the structure that `FlexibleTranslations<T>` would produce, based on an original type `T`.
 * All properties at all levels of nesting are made optional.
 * The transformation rules for property types mirror those in `FlexibleTranslations<T>`.
 * This type is an alias for `RecursiveFlexibleTranslations<T, true>`.
 * @template T - The original, un-transformed, structure of the translations. This is the same kind of type argument that `FlexibleTranslations<T>` expects.
 */
export type PartialFlexibleTranslations<T> = RecursiveFlexibleTranslations<T, true>;

/**
 * Normalizes a `FlexibleTranslations` or `PartialFlexibleTranslations` object into a `CallableTranslations` object.
 * Converts plain strings into `ParameterizedTranslation` functions and ensures
 * that all callable elements conform to the `ParameterizedTranslation` signature.
 * Only properties present in the input `translations` object will be processed and included in the result.
 * @template T - The structure of the original translations.
 * @param translations - The flexible or partial flexible translations object to normalize.
 * @returns A `CallableTranslations` object. The returned object will only contain callable translations for properties that were present in the input `translations` object.
 */
export function normalizeTranslations<T>(
    translations: RecursiveFlexibleTranslations<T, boolean>
): CallableTranslations<T>  {
    const result = {} as CallableTranslations<T>;

    for (const key in translations) {
        if (Object.prototype.hasOwnProperty.call(translations, key)) {
            const value = translations[key];

            if (value === null || value === undefined) {
                continue;
            }

            if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Function)) {
                // Recursively normalize nested objects
                result[key] = normalizeTranslations(value as RecursiveFlexibleTranslations<any, boolean>) as any;
            } else if (typeof value === 'string') {
                // Convert string to a ParameterizedTranslation
                result[key] = ((_params?: InterpolationParams) => value) as any;
            } else if (typeof value === 'function') {
                // Assume functions are already ParameterizedTranslation or compatible
                result[key] = value as any;
            }
            // else {
            //     // For other types (e.g., number, boolean), convert to string and then to ParameterizedTranslation
            //     const stringValue = String(value);
            //     result[key] = ((_params?: InterpolationParams) => stringValue) as any;
            // }
        }
    }
    return result;
}

/**
 * Resolves a translation function from a nested translation object using a path array.
 * @template T - The type of the translations object.
 * @param translations The object containing translation functions.
 * @param path An array of keys representing the path to the function.
 * @returns The translation function, or null if not found or invalid.
 * @internal
 */
function resolveTranslationFunction<T>(
    translations: CallableTranslations<T>,
    path: string[]
): ParameterizedTranslation | null {
    let current: any = translations;

    for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return null;
        }
    }

    return typeof current === 'function' ? (current as ParameterizedTranslation) : null;
}

/**
 * Retrieves a translation function from a nested translation object using a dot-separated path.
 * @template T - The type of the translations object.
 * @param translations The object containing translation functions.
 * @param dottedPath A string path using dot notation (e.g., "user.profile.greeting").
 * @returns The translation function, or null if not found or invalid.
 */
export function lookupTranslation<T>(translations: CallableTranslations<T>, dottedPath: string): ParameterizedTranslation | null {
    const pathSegments = dottedPath.split('.');
    return resolveTranslationFunction(translations, pathSegments);
}

/**
 * Processes placeholders in a translation string.
 * If the input `translation` is not a string, it returns an empty string.
 * Otherwise, it replaces placeholders in the format `{{placeholder}}` with values from `params`.
 * If a placeholder is not found in `params`, it's replaced with an empty string.
 * @param translation The translation value to process. Can be of any type.
 * @param params Optional interpolation parameters.
 * @returns The processed string, or an empty string if the input was not a string.
 */
export function processPlaceholders(translation: any, params?: InterpolationParams): string {
    if (typeof translation !== 'string') {
        // As a safeguard, return an empty string if the input is not a string.
        return '';
    }
    return translation.replace(/{{(.*?)}}/g, (_: any, placeholder: string) => {
        const trimmedPlaceholder = placeholder.trim();
        return params?.[trimmedPlaceholder] !== undefined ? String(params[trimmedPlaceholder]) : '';
    });
}

// TODO: to remove
/**
 * Default transformer for translations.
 * Uses `processPlaceholders` to replace placeholders in the format `{{placeholder}}`
 * with values from `params`.
 */
export const defaultTranslationTransformer: TranslationTransformer<LangTagTranslationsConfig> = ({ value, params }) => {
    return processPlaceholders(value, params);
};
