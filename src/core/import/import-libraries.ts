import {$LT_ReadJSON} from "@/core/io/file.ts";
import {LangTagCLIConfig, LangTagCLIExportData, LangTagCLIImportedTag, LangTagCLIImportedTagsFile} from "@/config.ts";
import {LangTagCLILogger} from "@/logger.ts";
import {$LT_CollectExportFiles} from "@/core/import/collect-export-files.ts";
import {generateImportFiles} from "@/core/import/import-file-generator.ts";

export async function $LT_ImportLibraries(config: LangTagCLIConfig, logger: LangTagCLILogger): Promise<void> {
    const exportFiles = await $LT_CollectExportFiles(logger);

    const importedFiles: LangTagCLIImportedTagsFile[] = []

    function importTag(pathRelativeToImportDir: string, tag: LangTagCLIImportedTag) {
        if (!pathRelativeToImportDir) throw new Error(`pathRelativeToImportDir required, got: ${pathRelativeToImportDir}`);
        if (!tag?.variableName) throw new Error(`tag.variableName required, got: ${tag?.variableName}`);
        if (tag.translations == null) throw new Error(`tag.translations required`);

        let importedFile = importedFiles.find(file => file.pathRelativeToImportDir === pathRelativeToImportDir);
        if (!importedFile) {
            importedFile = {pathRelativeToImportDir, tags: []};
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

        exports.push({packageJSON, exportData});
    }

    config.import.onImport({exports, logger, importTag, langTagConfig: config})

    if (importedFiles.length === 0) {
        logger.warn('No tags were imported from any library files');
        return;
    }

    // TODO: load current imported tag files
    //       check for current tags
    //       prioritize current project translations, old one comment, add new ones

    await generateImportFiles(config, logger, importedFiles);

    if (config.import.onImportFinish) config.import.onImportFinish();
}