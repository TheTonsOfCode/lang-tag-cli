
import {$LT_GetCommandEssentials} from "@/cli/commands/setup.ts";
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { renderInitTagTemplates, InitTagRenderOptions } from '@/cli/core/init-tag/renderer.ts';

// Define command line options interface
interface InitTagOptions {
    name?: string;
    library?: boolean;
    react?: boolean;
    typescript?: boolean;
    output?: string;
}

// Read package.json to get project information
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

// Detect if project uses TypeScript
function detectTypeScript(packageJson: any): boolean {
    if (!packageJson) return false;
    
    // Check devDependencies for typescript
    const hasTypeScript = packageJson.devDependencies?.typescript || 
                         packageJson.dependencies?.typescript;
    
    // Check for tsconfig.json
    const hasTsConfig = existsSync(join(process.cwd(), 'tsconfig.json'));
    
    return Boolean(hasTypeScript || hasTsConfig);
}

// Detect if project uses React
function detectReact(packageJson: any): boolean {
    if (!packageJson) return false;
    
    return Boolean(
        packageJson.dependencies?.react || 
        packageJson.devDependencies?.react ||
        packageJson.dependencies?.['@types/react'] ||
        packageJson.devDependencies?.['@types/react']
    );
}


// Write file with directory creation
async function writeFileWithDirs(filePath: string, content: string): Promise<void> {
    const dir = dirname(filePath);
    
    // Create directory if it doesn't exist
    try {
        await mkdir(dir, { recursive: true });
    } catch (error) {
        // Directory might already exist, ignore error
    }
    
    // Write the file
    await writeFile(filePath, content, 'utf-8');
}

export async function $LT_CMD_InitTagFile(options: InitTagOptions = {}) {
    const {config, logger} = await $LT_GetCommandEssentials();
    
    // Read package.json for project information
    const packageJson = await readPackageJson();
    
    // Auto-detect project characteristics
    const isTypeScript = options.typescript !== undefined ? options.typescript : detectTypeScript(packageJson);
    const isReact = options.react !== undefined ? options.react : detectReact(packageJson);
    const isLibrary = options.library !== undefined ? options.library : config.isLibrary;
    
    // Determine tag name
    const tagName = options.name || config.tagName || 'lang';
    
    // Determine file extension
    const fileExtension = isTypeScript ? 'ts' : 'js';
    
    // Determine output path
    const outputPath = options.output || `${tagName}.${fileExtension}`;
    
    // Display selected options
    logger.info('Initializing lang-tag with the following options:');
    logger.info('  Tag name: {tagName}', { tagName });
    logger.info('  Library mode: {isLibrary}', { isLibrary: isLibrary ? 'Yes' : 'No' });
    logger.info('  React: {isReact}', { isReact: isReact ? 'Yes' : 'No' });
    logger.info('  TypeScript: {isTypeScript}', { isTypeScript: isTypeScript ? 'Yes' : 'No' });
    logger.info('  Output path: {outputPath}', { outputPath });
    
    // Prepare render options
    const renderOptions: InitTagRenderOptions = {
        tagName,
        isLibrary,
        isReact,
        isTypeScript,
        fileExtension,
        packageName: packageJson?.name || 'my-project',
        packageVersion: packageJson?.version || '1.0.0',
    };
    
    // Render templates using the new renderer
    let renderedContent: string;
    try {
        renderedContent = renderInitTagTemplates(renderOptions);
    } catch (error: any) {
        logger.error('Failed to render templates: {error}', { error: error?.message });
        return;
    }

    // Check if output file already exists
    if (existsSync(outputPath)) {
        logger.warn('File already exists: {outputPath}', { outputPath });
        logger.info('Use --output to specify a different path or remove the existing file');
        return;
    }
    
    // Write the rendered content to the output file
    try {
        await writeFileWithDirs(outputPath, renderedContent);
        logger.success('Lang-tag file created successfully: {outputPath}', { outputPath });
        
        // Display usage instructions
        logger.info('Next steps:');
        logger.info('1. Import the {tagName} function in your files:', { tagName });
        logger.info('   import { {tagName} } from \'./{importPath}\';', { 
            tagName, 
            importPath: outputPath.replace(/^src\//, '') 
        });
        logger.info('2. Create your translation objects and use the tag function');
        logger.info('3. Run "lang-tag collect" to extract translations');
        
    } catch (error: any) {
        logger.error('Failed to write file: {error}', { error: error?.message });
    }
}