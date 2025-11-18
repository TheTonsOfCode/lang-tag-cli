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

export function formatExecutionTime(milliseconds: number): string {
    if (milliseconds >= 1000) {
        const seconds = milliseconds / 1000;
        return `${seconds.toFixed(1)}s`;
    }
    return `${Math.round(milliseconds)}ms`;
}
