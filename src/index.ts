export interface LangTagTranslationsConfig<Namespaces = string> {
    path?: string;
    namespace: Namespaces;
}

export type LangTagTranslations = {
    [key: string]: string | LangTagTranslations;
};

// export type LangTag<Config extends LangTagConfig = LangTagConfig, T = any> = (translations: LangTagTranslations, config?: Config) => T;

export type InterpolationParams = Record<string, any>;
export type ParameterizedTranslation = (params?: InterpolationParams) => string;

export type CallableTranslations<T> = {
    [P in keyof T]:
        T[P] extends ParameterizedTranslation ? ParameterizedTranslation :
        // Allow for pre-existing functions that might not strictly be ParameterizedTranslation
        // but are still callable and return a string, or a nested structure.
        T[P] extends (...args: any[]) => string ? T[P] :
        T[P] extends Record<string, any> ? CallableTranslations<T[P]> :
        ParameterizedTranslation; // Fallback for basic strings that will be converted
};

export interface TranslationTransformContext<Config extends LangTagTranslationsConfig> {
    config: Config | undefined;
    parentPath: string;
    path: string;
    key: string;
    value: string; // The raw string value of the translation
    params?: InterpolationParams;
}

type TranslationTransformer<Config extends LangTagTranslationsConfig> = (transformContext: TranslationTransformContext<Config>) => string;

export type TranslationKeyProcessorContext<Config extends LangTagTranslationsConfig> = Omit<TranslationTransformContext<Config>, 'params'>;

export type TranslationKeyProcessor<
    Config extends LangTagTranslationsConfig = LangTagTranslationsConfig
> = (
    context: TranslationKeyProcessorContext<Config>,
    // Callback to add a processed key.
    // newKey: the key to be added to the result.
    // originalValue: the original string value associated with the original key being processed.
    addProcessedKey: (newKey: string, originalValue: string) => void
) => void;

export interface TranslationMappingStrategy<Config extends LangTagTranslationsConfig> {
    transform: TranslationTransformer<Config>;
    processKey?: TranslationKeyProcessor<Config>;
}

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

export const defaultTranslationTransformer: TranslationTransformer<LangTagTranslationsConfig> = ({ value, params }) => {
    if (typeof value !== 'string') {
         // This case should ideally not be hit if input conforms to LangTagTranslations.
         // However, as a safeguard, return an empty string
        return '';
    }
    return value.replace(/{{(.*?)}}/g, (_: any, placeholder: string) => {
        const trimmedPlaceholder = placeholder.trim();
        return params?.[trimmedPlaceholder] !== undefined ? String(params[trimmedPlaceholder]) : '';
    });
};

export type FlexibleTranslations<T> = {
    [P in keyof T]: T[P] extends ParameterizedTranslation
        ? ParameterizedTranslation | string
        : T[P] extends (...args: any[]) => string ? T[P] | string // Allow functions returning string
        : T[P] extends Record<string, any>
            ? FlexibleTranslations<T[P]>
            : T[P] | string; // Allow plain strings or other primitive types if they make sense in some context
};

export function normalizeTranslations<T>(translations: FlexibleTranslations<T>): CallableTranslations<T>  {
    const result = {} as CallableTranslations<T>;

    for (const key in translations) {
        if (Object.prototype.hasOwnProperty.call(translations, key)) {
            const value = translations[key];

            if (value === null || value === undefined) {
                continue;
            }

            if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Function)) {
                // Recursively normalize nested objects
                result[key] = normalizeTranslations(value as FlexibleTranslations<any>) as any;
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