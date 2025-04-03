import {CONFIG_FILE_NAME, EXPORTS_FILE_NAME} from "@/cli/constants.ts";
import {messageErrorReadingDirectory, messageImportedFile, messageNodeModulesNotFound} from '@/cli/message';
import fs from 'fs';
import * as process from "node:process";
import path, {resolve} from 'pathe';
import {LangTagExportData} from "@/cli";
import {ensureDirectoryExists, readJSON} from "@/cli/commands/utils/file.ts";
import {LangTagConfig} from "@/cli/config.ts";
import {writeFile} from "fs/promises";

function findExportJson(dir: string, depth: number = 0, maxDepth: number = 3): string[] {
    if (depth > maxDepth) return [];
    let results: string[] = [];

    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                results = results.concat(findExportJson(fullPath, depth + 1, maxDepth));
            } else if (file === EXPORTS_FILE_NAME) {
                results.push(fullPath);
            }
        }
    } catch (error) {
        messageErrorReadingDirectory(dir, error);
    }

    return results;
}

function getExportFiles(): string[] {
    const nodeModulesPath: string = path.join(process.cwd(), 'node_modules');

    if (!fs.existsSync(nodeModulesPath)) {
        messageNodeModulesNotFound();
        return [];
    }

    return findExportJson(nodeModulesPath);
}

export async function importLibraries(config: LangTagConfig): Promise<void> {
    const files = getExportFiles();

    await ensureDirectoryExists(config.import.dir);

    const generationFiles: Record<string /*fileName*/, Record<string /*export name*/, string>> = {}

    for (const filePath of files) {
        const exportData: LangTagExportData = await readJSON(filePath);

        // if different language, translate  to base language
        // exportData.language

        for (let langTagFilePath in exportData.files) {
            const fileGenerationData = {};

            const matches = exportData.files[langTagFilePath].matches;

            for (let match of matches) {
                const result = config.import.onImport(
                    langTagFilePath,
                    match.variableName,
                    fileGenerationData
                );

                let exports = generationFiles[result.fileName];
                if (!exports) {
                    exports = {}
                    generationFiles[result.fileName] = exports;
                }

                const param1 = config.translationArgPosition === 1 ? match.translations : match.config;
                const param2 = config.translationArgPosition === 1 ? match.config : match.translations;

                exports[result.exportName] = `${config.tagName}(${param1}, ${param2})`;
            }
        }
    }

    for (let file of Object.keys(generationFiles)) {
        const filePath = resolve(
            process.cwd(),
            config.import.dir,
            file
        );

        const exports = Object.entries(generationFiles[file]).map(([name, tag]) => {
            return `export const ${name} = ${tag};`;
        }).join('\n\n');

        const content = `${config.import.tagImportPath}\n\n${exports}`;

        await writeFile(filePath, content, 'utf-8');
        messageImportedFile(file);
    }
}