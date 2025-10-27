import {$LT_ReadJSON} from "@/core/io/file.ts";
import {LangTagCLIConfig, LangTagCLIExportData} from "@/config.ts";
import {LangTagTranslationsConfig} from "lang-tag";
import JSON5 from "json5";
import {LangTagCLILogger} from "@/logger.ts";
import {$LT_CollectExportFiles} from "@/core/import/collect-export-files.ts";
import {generateImportFiles, ImportFileData} from "@/core/import/import-file-generator.ts";

interface ImportedTag {
    variableName: string;

    translations: any;

    config: any;
}

interface ImportedTagsFile {
    pathRelativeToImportDir: string;

    tags: ImportedTag[]
}

export async function $LT_ImportLibraries(config: LangTagCLIConfig, logger: LangTagCLILogger): Promise<void> {
    const exportFiles = await $LT_CollectExportFiles(logger);

    const importedFiles: ImportedTagsFile[] = []

    function importTag(pathRelativeToImportDir: string, tag: ImportedTag) {
        let importedFile = importedFiles.find(file => file.pathRelativeToImportDir === pathRelativeToImportDir);
        if (!importedFile) {
            importedFile = {
                pathRelativeToImportDir,
                tags: []
            };
            importedFiles.push(importedFile);
        }
        importedFile.tags.push(tag)
    }

    const generationFiles: Record<string /*fileName*/, Record<string /*export name*/, {translations: any, config: any}>> = {}

    for (const {exportPath, packageJsonPath} of exportFiles) {
        const exportData: LangTagCLIExportData = await $LT_ReadJSON(exportPath);
        const packageJson: any = await $LT_ReadJSON(packageJsonPath);
        const packageName = packageJson.name || 'unknown-package';

        // TODO: if different language, translate to base language
        //  exportData.language

        for (const fileData of exportData.files) {
            const fileGenerationData = {};
            const langTagFilePath = fileData.relativeFilePath;

            for (const tag of fileData.tags) {
                let parsedTranslations = typeof tag.translations === 'string' ? JSON5.parse(tag.translations) : tag.translations;
                let parsedConfig = typeof tag.config === 'string' ? JSON5.parse(tag.config) : (tag.config === undefined ? {} : tag.config) as LangTagTranslationsConfig;

                let file: string = langTagFilePath;
                let exportName: string = tag.variableName || '';

                config.import.onImport({
                    packageName: packageName,
                    importedRelativePath: langTagFilePath,
                    originalExportName: tag.variableName,
                    translations: parsedTranslations,
                    config: parsedConfig,
                    fileGenerationData
                }, {
                    setFile: (f: string) => { file = f; },
                    setExportName: (name: string) => { exportName = name; },
                    setConfig: (newConfig: LangTagTranslationsConfig) => { parsedConfig = newConfig; }
                });

                if (!file || !exportName) {
                    throw new Error(`[lang-tag] onImport did not set fileName or exportName for package: ${packageName}, file: '${file}' (original: '${langTagFilePath}'), exportName: '${exportName}' (original: ${tag.variableName})`);
                }

                let exports = generationFiles[file];
                if (!exports) {
                    exports = {}
                    generationFiles[file] = exports;
                }

                exports[exportName] = {
                    translations: parsedTranslations,
                    config: parsedConfig
                };
            }
        }
    }

    const filesData: ImportFileData[] = Object.entries(generationFiles).map(([fileName, exports]) => ({
        fileName,
        exports: Object.entries(exports).map(([name, data]) => ({
            name,
            translations: data.translations,
            config: data.config
        }))
    }));

    await generateImportFiles(config, logger, filesData);

    if (config.import.onImportFinish) config.import.onImportFinish();
}