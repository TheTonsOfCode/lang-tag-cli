import { CallableTranslations, ParameterizedTranslation } from './types';

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

    return typeof current === 'function'
        ? (current as ParameterizedTranslation)
        : null;
}

/**
 * Retrieves a translation function from a nested translation object using a dot-separated path.
 * It is recommended to use an unprefixed path (a path that does not include the base path from the configuration)
 * with this function, as it operates on the structure of the callable translations object where keys are unprefixed.
 * @template T - The type of the translations object.
 * @param translations The object containing translation functions.
 * @param dottedPath A string path using dot notation (e.g., "user.profile.greeting"). This path should generally be unprefixed.
 * @returns The translation function, or null if not found or invalid.
 */
export function lookupTranslation<T>(
    translations: CallableTranslations<T>,
    dottedPath: string
): ParameterizedTranslation | null {
    const pathSegments = dottedPath.split('.');
    return resolveTranslationFunction(translations, pathSegments);
}
