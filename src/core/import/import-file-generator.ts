import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mustache from 'mustache';
import { writeFile } from 'fs/promises';
import { resolve } from 'pathe';
import * as process from "node:process";
import { $LT_EnsureDirectoryExists } from '@/core/io/file.ts';
import { LangTagCLIConfig } from '@/config.ts';
import { LangTagCLILogger } from '@/logger.ts';

export interface ImportFileData {
    fileName: string;
    exports: Array<{
        name: string;
        tag: string;
    }>;
}

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
    filesData: ImportFileData[]
): Promise<void> {
    for (const fileData of filesData) {
        const filePath = resolve(
            process.cwd(),
            config.import.dir,
            fileData.fileName
        );

        const templateData = {
            tagImportPath: config.import.tagImportPath,
            exports: fileData.exports
        };

        const content = renderTemplate(templateData);

        await $LT_EnsureDirectoryExists(dirname(filePath));
        await writeFile(filePath, content, 'utf-8');

        logger.success('Imported node_modules file: "{fileName}"', {fileName: fileData.fileName});
    }
}
