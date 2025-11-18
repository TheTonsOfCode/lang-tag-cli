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

export function formatFileUrlForDisplay(filePath: string): string {
    return pathToFileURL(filePath)
        .href.replace(/\[/g, '%5B')
        .replace(/\]/g, '%5D')
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29');
}

/**
 * Formats execution time in a human-readable format.
 * - If >= 1 second: shows seconds with decimal precision (e.g., "2.5s")
 * - If < 1 second: shows milliseconds only (e.g., "500ms")
 *
 * @param milliseconds - Execution time in milliseconds
 * @returns Formatted time string
 *
 * @example
 * ```ts
 * formatExecutionTime(2500) // Returns: "2.5s"
 * formatExecutionTime(500)  // Returns: "500ms"
 * formatExecutionTime(1500) // Returns: "1.5s"
 * ```
 */
export function formatExecutionTime(milliseconds: number): string {
    if (milliseconds >= 1000) {
        const seconds = milliseconds / 1000;
        return `${seconds.toFixed(1)}s`;
    }
    return `${Math.round(milliseconds)}ms`;
}
