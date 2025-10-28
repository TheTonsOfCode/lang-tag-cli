import {$LT_ReadJSON} from "@/core/io/file.ts";
import {LangTagCLIConfig, LangTagCLIExportData, LangTagCLIImportedTag, LangTagCLIImportedTagsFile} from "@/type.ts";
import {LangTagCLILogger} from "@/logger.ts";
import {$LT_CollectExportFiles} from "@/core/import/collect-export-files.ts";
import {generateImportFiles} from "@/core/import/import-file-generator.ts";
import {ImportManager} from "@/core/import/import-manager.ts";

export async function $LT_ImportLibraries(config: LangTagCLIConfig, logger: LangTagCLILogger): Promise<void> {
    const exportFiles = await $LT_CollectExportFiles(logger);

    const importManager = new ImportManager();

    let exports = [];
    for (const {exportPath, packageJsonPath} of exportFiles) {
        const exportData: LangTagCLIExportData = await $LT_ReadJSON(exportPath);
        const packageJSON: any = await $LT_ReadJSON(packageJsonPath);

        // TODO: if different language, translate to base language
        //  exportData.baseLanguageCode

        exports.push({packageJSON, exportData});
    }

    config.import.onImport({exports, importManager, logger, langTagConfig: config})

    if (!importManager.hasImportedFiles()) {
        logger.warn('No tags were imported from any library files');
        return;
    }

    // TODO: load current imported tag files
    //       check for current tags
    //       prioritize current project translations, old one comment, add new ones

    await generateImportFiles(config, logger, importManager);

    if (config.import.onImportFinish) config.import.onImportFinish();
}