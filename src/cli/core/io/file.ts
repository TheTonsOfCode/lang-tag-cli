import {mkdir, readFile, writeFile} from 'fs/promises';

export async function $LT_EnsureDirectoryExists(filePath: string): Promise<void> {
    await mkdir(filePath, {recursive: true});
}

export async function $LT_WriteJSON(filePath: string, data: unknown): Promise<void> {
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function $LT_ReadJSON<T>(filePath: string): Promise<T> {
    const content = await readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
}