import { writeFile } from 'fs/promises';
import path from 'path';

import { $LT_TagCandidateFile } from '@/core/collect/collect-tags';
import { EXPORTS_FILE_NAME } from '@/core/constants';
import { $LT_ReadJSON } from '@/core/io/file';
import { LangTagCLILogger } from '@/logger';
import { LangTagCLIConfig, LangTagCLIExportData } from '@/type';

export async function $LT_WriteAsExportFile({
    config,
    logger,
    files,
}: {
    config: LangTagCLIConfig;
    logger: LangTagCLILogger;
    files: $LT_TagCandidateFile[];
}) {
    const packageJson: any = await $LT_ReadJSON(
        path.resolve(process.cwd(), 'package.json')
    );

    if (!packageJson) {
        throw new Error('package.json not found');
    }

    const exportData: LangTagCLIExportData = {
        baseLanguageCode: config.baseLanguageCode,
        files: files.map(({ relativeFilePath, tags }) => ({
            relativeFilePath,

            tags: tags.map((tag) => ({
                variableName: tag.variableName,
                config: tag.parameterConfig,
                translations: tag.parameterTranslations,
            })),
        })),
    };

    await writeFile(EXPORTS_FILE_NAME, JSON.stringify(exportData), 'utf-8');

    logger.success(`Written {file}`, { file: EXPORTS_FILE_NAME });
}
