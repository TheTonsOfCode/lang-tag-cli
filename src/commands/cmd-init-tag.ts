import {$LT_GetCommandEssentials} from "@/commands/setup.ts";
import {existsSync} from 'fs';
import {renderInitTagTemplates} from '@/core/init-tag/renderer.ts';
import {detectInitTagOptions, InitTagOptions} from '@/core/init-tag/options-detector.ts';
import {$LT_WriteFileWithDirs} from '@/core/io/file.ts';

export async function $LT_CMD_InitTagFile(options: InitTagOptions = {}) {
    const {config, logger} = await $LT_GetCommandEssentials();
    
    const renderOptions = await detectInitTagOptions(options, config);
    const outputPath = options.output || `${renderOptions.tagName}.${renderOptions.fileExtension}`;
    
    logger.info('Initializing lang-tag with the following options:');
    logger.info('  Tag name: {tagName}', { tagName: renderOptions.tagName });
    logger.info('  Library mode: {isLibrary}', { isLibrary: renderOptions.isLibrary ? 'Yes' : 'No' });
    logger.info('  React: {isReact}', { isReact: renderOptions.isReact ? 'Yes' : 'No' });
    logger.info('  TypeScript: {isTypeScript}', { isTypeScript: renderOptions.isTypeScript ? 'Yes' : 'No' });
    logger.info('  Output path: {outputPath}', { outputPath });
    let renderedContent: string;
    try {
        renderedContent = renderInitTagTemplates(renderOptions);
    } catch (error: any) {
        logger.error('Failed to render templates: {error}', { error: error?.message });
        return;
    }

    if (existsSync(outputPath)) {
        logger.warn('File already exists: {outputPath}', { outputPath });
        logger.info('Use --output to specify a different path or remove the existing file');
        return;
    }
    
    try {
        await $LT_WriteFileWithDirs(outputPath, renderedContent);
        logger.success('Lang-tag file created successfully: {outputPath}', { outputPath });
        
        logger.info('Next steps:');
        logger.info('1. Import the {tagName} function in your files:', { tagName: renderOptions.tagName });
        logger.info('   import { {tagName} } from \'./{importPath}\';', { 
            tagName: renderOptions.tagName, 
            importPath: outputPath.replace(/^src\//, '') 
        });
        logger.info('2. Create your translation objects and use the tag function');
        logger.info('3. Run "lang-tag collect" to extract translations');
        
    } catch (error: any) {
        logger.error('Failed to write file: {error}', { error: error?.message });
    }
}