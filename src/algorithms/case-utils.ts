import * as caseLib from 'case';

/**
 * Available case transformation types supported by the case library.
 */
export type CaseType =
    | 'no'
    | 'camel'
    | 'capital'
    | 'constant'
    | 'dot'
    | 'header'
    | 'kebab'
    | 'lower'
    | 'param'
    | 'pascal'
    | 'path'
    | 'sentence'
    | 'snake'
    | 'swap'
    | 'title'
    | 'upper';

/**
 * Applies case transformation to a string using the case library.
 *
 * @param str - The string to transform
 * @param caseType - The case transformation type
 * @returns The transformed string
 */
export function applyCaseTransform(str: string, caseType: CaseType): string {
    if (caseType === 'no') {
        return str;
    }

    const caseFunction = (caseLib as any)[caseType];
    if (typeof caseFunction === 'function') {
        return caseFunction(str);
    }
    return str;
}
