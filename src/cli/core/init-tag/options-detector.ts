import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { InitTagRenderOptions } from './renderer.ts';

export interface InitTagOptions {
    name?: string;
    library?: boolean;
    react?: boolean;
    typescript?: boolean;
    output?: string;
}

interface Config {
    isLibrary: boolean;
    tagName: string;
}

async function readPackageJson(): Promise<any> {
    const packageJsonPath = join(process.cwd(), 'package.json');
    
    if (!existsSync(packageJsonPath)) {
        return null;
    }
    
    try {
        const content = await readFile(packageJsonPath, 'utf-8');
        return JSON.parse(content);
    } catch (error) {
        return null;
    }
}

function detectTypeScript(packageJson: any): boolean {
    if (!packageJson) return false;
    
    const hasTypeScript = packageJson.devDependencies?.typescript || 
                         packageJson.dependencies?.typescript;
    
    const hasTsConfig = existsSync(join(process.cwd(), 'tsconfig.json'));
    
    return Boolean(hasTypeScript || hasTsConfig);
}

function detectReact(packageJson: any): boolean {
    if (!packageJson) return false;
    
    return Boolean(
        packageJson.dependencies?.react || 
        packageJson.devDependencies?.react ||
        packageJson.dependencies?.['@types/react'] ||
        packageJson.devDependencies?.['@types/react']
    );
}

export async function detectInitTagOptions(
    options: InitTagOptions,
    config: Config
): Promise<InitTagRenderOptions> {
    const packageJson = await readPackageJson();
    
    const isTypeScript = options.typescript !== undefined ? options.typescript : detectTypeScript(packageJson);
    const isReact = options.react !== undefined ? options.react : detectReact(packageJson);
    const isLibrary = options.library !== undefined ? options.library : config.isLibrary;
    
    const tagName = options.name || config.tagName || 'lang';
    const fileExtension = isTypeScript ? 'ts' : 'js';
    
    return {
        tagName,
        isLibrary,
        isReact,
        isTypeScript,
        fileExtension,
        packageName: packageJson?.name || 'my-project',
        packageVersion: packageJson?.version || '1.0.0',
    };
}
