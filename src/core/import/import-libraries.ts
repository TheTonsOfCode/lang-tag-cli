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

    const generationFiles: Record<string /*fileName*/, Record<string /*export name*/, string>> = {}

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

                const param1 = config.translationArgPosition === 1 ? parsedTranslations : parsedConfig;
                const param2 = config.translationArgPosition === 1 ? parsedConfig : parsedTranslations;

                exports[exportName] = `${config.tagName}(${JSON5.stringify(param1, undefined, 4)}, ${JSON5.stringify(param2, undefined, 4)})`;
            }
        }
    }

    const filesData: ImportFileData[] = Object.entries(generationFiles).map(([fileName, exports]) => ({
        fileName,
        exports: Object.entries(exports).map(([name, tag]) => ({
            name,
            tag
        }))
    }));

    await generateImportFiles(config, logger, filesData);

    if (config.import.onImportFinish) config.import.onImportFinish();
}