import {$LT_ReadJSON} from "@/core/io/file.ts";
import {LangTagCLIConfig, LangTagCLIExportData, LangTagCLIImportedTag, LangTagCLIImportedTagsFile} from "@/config.ts";
import {LangTagCLILogger} from "@/logger.ts";
import {$LT_CollectExportFiles} from "@/core/import/collect-export-files.ts";
import {generateImportFiles, ImportFileData} from "@/core/import/import-file-generator.ts";

export async function $LT_ImportLibraries(config: LangTagCLIConfig, logger: LangTagCLILogger): Promise<void> {
    const exportFiles = await $LT_CollectExportFiles(logger);

    const importedFiles: LangTagCLIImportedTagsFile[] = []

    function importTag(pathRelativeToImportDir: string, tag: LangTagCLIImportedTag) {
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

    let exports = [];
    for (const {exportPath, packageJsonPath} of exportFiles) {
        const exportData: LangTagCLIExportData = await $LT_ReadJSON(exportPath);
        const packageJSON: any = await $LT_ReadJSON(packageJsonPath);

        // TODO: if different language, translate to base language
        //  exportData.baseLanguageCode

        exports.push({ packageJSON, exportData });
    }

    config.import.onImport({
        exports,
        importTag
    })

    //TODO: check imported files
    // if (!file || !exportName) {
    //     throw new Error(`[lang-tag] onImport did not set fileName or exportName for package: ${packageName}, file: '${file}' (original: '${langTagFilePath}'), exportName: '${exportName}' (original: ${tag.variableName})`);
    // }

    const generationFiles: Record<string /*fileName*/, Record<string /*export name*/, {translations: any, config: any}>> = {}

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