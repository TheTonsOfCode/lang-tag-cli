import { existsSync } from 'fs';

import { $LT_GetCommandEssentials } from '@/commands/setup';
import {
    InitTagOptions,
    detectInitTagOptions,
} from '@/core/init-tag/options-detector';
import { renderInitTagTemplates } from '@/core/init-tag/renderer';
import { $LT_WriteFileWithDirs } from '@/core/io/file';

export async function $LT_CMD_InitTagFile(options: InitTagOptions = {}) {
    const { config, logger } = await $LT_GetCommandEssentials();

    const renderOptions = await detectInitTagOptions(options, config);
    const outputPath =
        options.output ||
        `${renderOptions.tagName}.${renderOptions.fileExtension}`;

    logger.info('Initializing lang-tag with the following options:');
    logger.info('  Tag name: {tagName}', { tagName: renderOptions.tagName });
    logger.info('  Library mode: {isLibrary}', {
        isLibrary: renderOptions.isLibrary ? 'Yes' : 'No',
    });
    logger.info('  React: {isReact}', {
        isReact: renderOptions.isReact ? 'Yes' : 'No',
    });
    logger.info('  TypeScript: {isTypeScript}', {
        isTypeScript: renderOptions.isTypeScript ? 'Yes' : 'No',
    });
    logger.info('  Output path: {outputPath}', { outputPath });
    let renderedContent: string;
    try {
        renderedContent = renderInitTagTemplates(renderOptions);
    } catch (error: any) {
        logger.error('Failed to render templates: {error}', {
            error: error?.message,
        });
        return;
    }

    if (existsSync(outputPath)) {
        logger.warn('File already exists: {outputPath}', { outputPath });
        logger.info(
            'Use --output to specify a different path or remove the existing file'
        );
        return;
    }

    try {
        await $LT_WriteFileWithDirs(outputPath, renderedContent);
        logger.success('Lang-tag file created successfully: {outputPath}', {
            outputPath,
        });

        logger.info('Next steps:');
        logger.info('1. Import the {tagName} function in your files:', {
            tagName: renderOptions.tagName,
        });
        logger.info("   import { {tagName} } from './{importPath}';", {
            tagName: renderOptions.tagName,
            importPath: outputPath.replace(/^src\//, ''),
        });
        logger.info(
            '2. Create your translation objects and use the tag function'
        );
        logger.info('3. Run "lang-tag collect" to extract translations');

        // Show info about prefix enforcement for libraries
        if (
            renderOptions.isLibrary &&
            renderOptions.tagName.startsWith('_') &&
            (config.enforceLibraryTagPrefix ?? true)
        ) {
            console.log('');
            logger.info(
                '📌 Important: Library tag prefix enforcement is enabled\n' +
                    '\tYour tag uses "_" prefix: {tagName} (instead of {baseTagName})\n' +
                    '\tThis prevents the tag from appearing in TypeScript autocomplete after compilation\n' +
                    '\tAlways use {tagName} (with prefix) in your library code\n' +
                    '\tThis is a best practice for library internals - it keeps your API clean\n' +
                    '\tThe prefix is automatically added by the enforceLibraryTagPrefix option\n' +
                    '\tTo disable this behavior, set enforceLibraryTagPrefix: false in your config',
                {
                    tagName: renderOptions.tagName,
                    baseTagName: renderOptions.tagName.substring(1),
                }
            );
        }
    } catch (error: any) {
        logger.error('Failed to write file: {error}', {
            error: error?.message,
        });
    }
}
