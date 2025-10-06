import {mkdir, readFile, writeFile} from 'fs/promises';
import {dirname, resolve} from 'path';

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

export async function $LT_WriteFileWithDirs(filePath: string, content: string): Promise<void> {
    const dir = dirname(filePath);
    
    try {
        await mkdir(dir, { recursive: true });
    } catch (error) {
        // ignore error
    }
    
    await writeFile(filePath, content, 'utf-8');
}

export async function $LT_ReadFileContent(relativeFilePath: string): Promise<string> {
    const cwd = process.cwd();
    const absolutePath = resolve(cwd, relativeFilePath);
    return await readFile(absolutePath, 'utf-8');
}