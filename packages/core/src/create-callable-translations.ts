import {
    CallableTranslations,
    InterpolationParams,
    LangTagOptionalTranslations,
    LangTagTranslationsConfig,
    TranslationKeyProcessorContext,
    TranslationMappingStrategy,
} from './types';

/**
 * Recursively transforms a nested object of translation strings into an object
 * of callable translation functions.
 * @template T - The type of the input translations object.
 * @template Config - The LangTag translations configuration type.
 * @param config - The LangTag configuration object.
 * @param strategy - The translation mapping strategy.
 * @param input - The translations object to transform.
 * @param currentParentPath - The current parent path for building full translation keys.
 * @param currentRelativeParentPath - The current relative parent path for building full translation keys.
 * @returns An object with the same structure as input, but with strings replaced by callable functions.
 * @internal
 */
function transformTranslationsToFunctions<
    T extends LangTagOptionalTranslations,
    Config extends LangTagTranslationsConfig,
>(
    config: Config | undefined,
    strategy: TranslationMappingStrategy<Config>,
    input: T,
    currentParentPath: string, // This includes config.path prefix
    currentRelativeParentPath: string // This is the path relative to translations root
): CallableTranslations<T> {
    const result: Record<string, any> = {};

    for (const [originalKey, originalValue] of Object.entries(input)) {
        const currentFullPath = `${currentParentPath}${originalKey}`;
        const currentRelativePath = currentRelativeParentPath
            ? `${currentRelativeParentPath}.${originalKey}`
            : originalKey;

        if (typeof originalValue === 'object' && originalValue !== null) {
            result[originalKey] = transformTranslationsToFunctions(
                config,
                strategy,
                originalValue,
                `${currentFullPath}.`,
                currentRelativePath
            );
        } else if (typeof originalValue === 'string') {
            const createTranslationFunction = (
                pathForFunc: string,
                unprefixedPathForFunc: string,
                keyForFunc: string,
                valueForFunc: string
            ) => {
                return (params?: InterpolationParams) =>
                    strategy.transform({
                        config,
                        parentPath: currentParentPath,
                        path: pathForFunc,
                        unprefixedPath: unprefixedPathForFunc,
                        key: keyForFunc,
                        value: valueForFunc,
                        params,
                    });
            };

            if (strategy.processKey) {
                const keyProcessingContext: TranslationKeyProcessorContext<Config> =
                    {
                        config,
                        parentPath: currentParentPath,
                        path: currentFullPath,
                        unprefixedPath: currentRelativePath,
                        key: originalKey,
                        value: originalValue,
                    };

                strategy.processKey(
                    keyProcessingContext,
                    (newKeyToAdd: string, valueForNewKey: string) => {
                        const pathForNewKey = currentParentPath + newKeyToAdd;
                        const unprefixedPathForNewKey =
                            currentRelativeParentPath
                                ? `${currentRelativeParentPath}.${newKeyToAdd}`
                                : newKeyToAdd;
                        result[newKeyToAdd] = createTranslationFunction(
                            pathForNewKey,
                            unprefixedPathForNewKey,
                            newKeyToAdd,
                            valueForNewKey
                        );
                    }
                );

                if (!result.hasOwnProperty(originalKey)) {
                    result[originalKey] = createTranslationFunction(
                        currentFullPath,
                        currentRelativePath,
                        originalKey,
                        originalValue
                    );
                }
            } else {
                result[originalKey] = createTranslationFunction(
                    currentFullPath,
                    currentRelativePath,
                    originalKey,
                    originalValue
                );
            }
        }
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
    T extends LangTagOptionalTranslations,
    Config extends LangTagTranslationsConfig,
>(
    translations: T,
    config: Config | undefined,
    strategy: TranslationMappingStrategy<Config>
): CallableTranslations<T> {
    let basePath = config?.path || '';
    if (basePath && !basePath.endsWith('.')) basePath += '.';
    return transformTranslationsToFunctions(
        config,
        strategy,
        translations,
        basePath,
        ''
    );
}
