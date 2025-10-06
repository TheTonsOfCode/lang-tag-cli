import * as process from "node:process";
import {dirname, resolve} from 'pathe';
import {LangTagExportData} from "@/cli/core/type";
import {$LT_EnsureDirectoryExists, $LT_ReadJSON} from "@/cli/core/io/file.ts";
import {LangTagCLIConfig} from "@/cli/config.ts";
import {writeFile} from "fs/promises";
import {LangTagTranslationsConfig} from "@/index.ts";
import JSON5 from "json5";
import {$LT_CollectNodeModulesExportFilePaths} from "@/cli/core/import/collect-node-modules-export-files.ts";
import {LangTagCLILogger} from "@/cli/logger.ts";

export async function $LT_ImportLibraries(config: LangTagCLIConfig, logger: LangTagCLILogger): Promise<void> {
    const files = $LT_CollectNodeModulesExportFilePaths(logger);

    const generationFiles: Record<string /*fileName*/, Record<string /*export name*/, string>> = {}

    for (const filePath of files) {
        const exportData: LangTagExportData = await $LT_ReadJSON(filePath);

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

    for (let fileName of Object.keys(generationFiles)) {
        const filePath = resolve(
            process.cwd(),
            config.import.dir,
            fileName
        );

        const exports = Object.entries(generationFiles[fileName]).map(([name, tag]) => {
            return `export const ${name} = ${tag};`;
        }).join('\n\n');

        const content = `${config.import.tagImportPath}\n\n${exports}`;

        await $LT_EnsureDirectoryExists(dirname(filePath));
        await writeFile(filePath, content, 'utf-8');

        logger.success('Imported node_modules file: "{fileName}"', {fileName})
    }

    if (config.import.onImportFinish) config.import.onImportFinish();
}