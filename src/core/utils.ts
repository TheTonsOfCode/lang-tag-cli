import { pathToFileURL } from 'url';

export function deepFreezeObject<T>(obj: T): T {
    const propNames = Object.getOwnPropertyNames(obj);

    for (const name of propNames) {
        const value = (obj as any)[name];

        if (value && typeof value === 'object') {
            deepFreezeObject(value);
        }
    }

    return Object.freeze(obj);
}

/**
 * Converts a file path to a file:// URL and encodes special characters
 * that can break URL parsing in terminals and editors.
 *
 * Encodes the following characters:
 * - `[` → `%5B`
 * - `]` → `%5D`
 * - `(` → `%28`
 * - `)` → `%29`
 *
 * @param filePath - The absolute file path to convert
 * @returns A properly encoded file:// URL string
 *
 * @example
 * ```ts
 * formatFileUrlForDisplay('/path/to/[lang]/file.tsx')
 * // Returns: 'file:///path/to/%5Blang%5D/file.tsx'
 * ```
 */
export function formatFileUrlForDisplay(filePath: string): string {
    return pathToFileURL(filePath)
        .href.replace(/\[/g, '%5B')
        .replace(/\]/g, '%5D')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29');
}
