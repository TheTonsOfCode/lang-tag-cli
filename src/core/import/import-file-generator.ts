import * as process from 'node:process';

import { readFileSync } from 'fs';
import { writeFile } from 'fs/promises';
import JSON5 from 'json5';
import mustache from 'mustache';
import { dirname, join } from 'path';
import { resolve } from 'pathe';
import { fileURLToPath } from 'url';

import { $LT_EnsureDirectoryExists } from '@/core/io/file';
import { LangTagCLILogger } from '@/logger';
import {
    LangTagCLIConfig,
    LangTagCLIImportManager,
    LangTagCLIImportedTagsFile,
} from '@/type';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templatePath = join(
    __dirname,
    'templates',
    'import',
    'imported-tag.mustache'
);
const template = readFileSync(templatePath, 'utf-8');

function renderTemplate(data: Record<string, any>): string {
    return mustache.render(template, data, {}, { escape: (text) => text });
}

export async function generateImportFiles(
    config: LangTagCLIConfig,
    logger: LangTagCLILogger,
    importManager: LangTagCLIImportManager
): Promise<void> {
    const importedFiles: LangTagCLIImportedTagsFile[] =
        importManager.getImportedFiles();

    for (const importedFile of importedFiles) {
        const filePath = resolve(
            process.cwd(),
            config.import.dir,
            importedFile.pathRelativeToImportDir
        );

        const processedExports = importedFile.tags.map((tag) => {
            const parameter1 =
                config.translationArgPosition === 1
                    ? tag.translations
                    : tag.config;
            const parameter2 =
                config.translationArgPosition === 1
                    ? tag.config
                    : tag.translations;

            const hasParameter2 =
                parameter2 !== null &&
                parameter2 !== undefined &&
                (typeof parameter2 !== 'object' ||
                    Object.keys(parameter2).length > 0);

            return {
                name: tag.variableName,
                parameter1: JSON5.stringify(parameter1, undefined, 4),
                parameter2: hasParameter2
                    ? JSON5.stringify(parameter2, undefined, 4)
                    : null,
                hasParameter2,
                config: {
                    tagName: config.tagName,
                },
            };
        });

        const templateData = {
            tagImportPath: config.import.tagImportPath,
            exports: processedExports,
        };

        const content = renderTemplate(templateData);

        await $LT_EnsureDirectoryExists(dirname(filePath));
        await writeFile(filePath, content, 'utf-8');

        const encodedFilePath = encodeURI(filePath);

        logger.success('Created tag file: "{file}"', {
            file: importedFile.pathRelativeToImportDir,
        });
        logger.debug(' └── link: file://{path}', { path: encodedFilePath });
    }
}
