import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mustache from 'mustache';
import { writeFile } from 'fs/promises';
import { resolve } from 'pathe';
import * as process from "node:process";
import { $LT_EnsureDirectoryExists } from '@/core/io/file.ts';
import { LangTagCLIConfig, LangTagCLIImportedTagsFile } from '@/config.ts';
import { LangTagCLILogger } from '@/logger.ts';
import JSON5 from 'json5';

// Load template at the top of the file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const templatePath = join(__dirname, 'templates', 'import', 'imported-tag.mustache');
const template = readFileSync(templatePath, 'utf-8');

function renderTemplate(data: Record<string, any>): string {
    return mustache.render(template, data, {}, { escape: (text) => text });
}

export async function generateImportFiles(
    config: LangTagCLIConfig, 
    logger: LangTagCLILogger,
    importedFiles: LangTagCLIImportedTagsFile[]
): Promise<void> {
    for (const importedFile of importedFiles) {
        const filePath = resolve(
            process.cwd(),
            config.import.dir,
            importedFile.pathRelativeToImportDir
        );

        // Process exports with parameter positioning logic
        const processedExports = importedFile.tags.map(tag => {
            const parameter1 = config.translationArgPosition === 1 ? tag.translations : tag.config;
            const parameter2 = config.translationArgPosition === 1 ? tag.config : tag.translations;
            
            // Check if parameter2 should be included (not null, undefined, or empty object)
            const hasParameter2 = parameter2 !== null && 
                                 parameter2 !== undefined && 
                                 (typeof parameter2 !== 'object' || Object.keys(parameter2).length > 0);
            
            return {
                name: tag.variableName,
                parameter1: JSON5.stringify(parameter1, undefined, 4),
                parameter2: hasParameter2 ? JSON5.stringify(parameter2, undefined, 4) : null,
                hasParameter2,
                config: {
                    tagName: config.tagName
                }
            };
        });

        const templateData = {
            tagImportPath: config.import.tagImportPath,
            exports: processedExports
        };

        const content = renderTemplate(templateData);

        await $LT_EnsureDirectoryExists(dirname(filePath));
        await writeFile(filePath, content, 'utf-8');

        logger.success('Imported node_modules file: "{fileName}"', {fileName: importedFile.pathRelativeToImportDir});
    }
}
