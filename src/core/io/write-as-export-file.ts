import {LangTagCLIConfig} from "@/config.ts";
import {$LT_TagCandidateFile} from "@/core/collect/collect-tags.ts";
import {$LT_ReadJSON, $LT_WriteJSON} from "@/core/io/file.ts";
import {LangTagExportData, LangTagExportFiles} from "@/core/type.ts";
import {EXPORTS_FILE_NAME} from "@/core/constants.ts";
import path from "path";
import {LangTagCLILogger} from "@/logger.ts";

export async function $LT_WriteAsExportFile({config, logger, files}: {
    config: LangTagCLIConfig,
    logger: LangTagCLILogger,
    files: $LT_TagCandidateFile[]
}) {
    const packageJson: any = await $LT_ReadJSON(path.resolve(process.cwd(), 'package.json'));

    if (!packageJson) {
        throw new Error('package.json not found');
    }

    const langTagFiles: LangTagExportFiles = {};

    for (const file of files) {
        langTagFiles[file.relativeFilePath] = {
            matches: file.tags.map(tag => {
                let T = config.translationArgPosition === 1 ? tag.parameter1Text : tag.parameter2Text;
                let C = config.translationArgPosition === 1 ? tag.parameter2Text : tag.parameter1Text;

                // TODO: resolve default config and etc.
                if (!T) T = "{}";
                if (!C) C = "{}";

                return ({
                    translations: T,
                    config: C,
                    variableName: tag.variableName
                });
            })
        };
    }

    const data: LangTagExportData = {
        language: config.baseLanguageCode,
        packageName: packageJson.name || '',
        files: langTagFiles
    };

    await $LT_WriteJSON(EXPORTS_FILE_NAME, data);
    logger.success(`Written {file}`, {file: EXPORTS_FILE_NAME})
}