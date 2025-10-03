import {LangTagConfig} from "@/cli/config.ts";
import {$LT_TagCandidateFile} from "@/cli/core/collect/collect-tags.ts";
import {$LT_ReadJSON, $LT_WriteJSON} from "@/cli/core/io/file.ts";
import {LangTagExportData, LangTagExportFiles} from "@/cli";
import {EXPORTS_FILE_NAME} from "@/cli/core/constants.ts";
import path from "path";
import {$LT_Logger} from "@/cli/core/logger.ts";

export async function $LT_WriteAsExportFile({config, logger, files}: {
    config: LangTagConfig,
    logger: $LT_Logger,
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
        language: config.language,
        packageName: packageJson.name || '',
        files: langTagFiles
    };

    await $LT_WriteJSON(EXPORTS_FILE_NAME, data);
    logger.success(`Written {file}`, {file: EXPORTS_FILE_NAME})
}