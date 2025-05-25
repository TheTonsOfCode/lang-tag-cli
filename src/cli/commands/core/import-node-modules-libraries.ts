import {CONFIG_FILE_NAME, EXPORTS_FILE_NAME} from "@/cli/constants.ts";
import {messageErrorReadingDirectory, messageImportedFile, messageNodeModulesNotFound} from '@/cli/message';
import fs from 'fs';
import * as process from "node:process";
import path, {dirname, resolve} from 'pathe';
import {LangTagExportData} from "@/cli";
import {ensureDirectoryExists, readJSON} from "@/cli/commands/utils/file.ts";
import {LangTagConfig} from "@/cli/config.ts";
import {writeFile} from "fs/promises";
import { LangTagTranslationsConfig } from "@/index.ts";
import JSON5 from "json5";

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

        // TODO: if different language, translate to base language
        //  exportData.language

        for (let langTagFilePath in exportData.files) {
            const fileGenerationData = {};

            const matches = exportData.files[langTagFilePath].matches;

            for (let match of matches) {
                let parsedTranslations = typeof match.translations === 'string' ? JSON5.parse(match.translations) : match.translations;
                let parsedConfig = typeof match.config === 'string' ? JSON5.parse(match.config) : (match.config === undefined ? {} : match.config) as LangTagTranslationsConfig;

                let file: string = langTagFilePath;
                let exportName: string = match.variableName || '';

                config.import.onImport({
                    packageName: exportData.packageName,
                    importedRelativePath: langTagFilePath,
                    originalExportName: match.variableName,
                    translations: parsedTranslations,
                    config: parsedConfig,
                    fileGenerationData
                }, {
                    setFile: (f: string) => { file = f; },
                    setExportName: (name: string) => { exportName = name; },
                    setConfig: (newConfig: LangTagTranslationsConfig) => { parsedConfig = newConfig; }
                });

                if (!file || !exportName) {
                    throw new Error(`[lang-tag] onImport did not set fileName or exportName for package: ${exportData.packageName}, file: '${file}' (original: '${langTagFilePath}'), exportName: '${exportName}' (original: ${match.variableName})`);
                }

                let exports = generationFiles[file];
                if (!exports) {
                    exports = {}
                    generationFiles[file] = exports;
                }

                const param1 = config.translationArgPosition === 1 ? parsedTranslations : parsedConfig;
                const param2 = config.translationArgPosition === 1 ? parsedConfig : parsedTranslations;

                exports[exportName] = `${config.tagName}(${JSON5.stringify(param1, undefined, 4)}, ${JSON5.stringify(param2, undefined, 4)})`;
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

        await ensureDirectoryExists(dirname(filePath));
        await writeFile(filePath, content, 'utf-8');
        messageImportedFile(file);
    }

    if (config.import.onImportFinish) config.import.onImportFinish();
}