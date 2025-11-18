import { $LT_CollectCandidateFilesWithTags } from '@/core/collect/collect-tags';
import { $LT_GroupTagsToCollections } from '@/core/collect/group-tags-to-collections';
import { $LT_WriteAsExportFile } from '@/core/io/write-as-export-file';
import { $LT_WriteToCollections } from '@/core/io/write-to-collections';
import { formatExecutionTime } from '@/core/utils';

import { $LT_GetCommandEssentials } from './setup';

export async function $LT_CMD_Collect(options?: { clean?: boolean }) {
    const startTime = Date.now();
    const { config, logger } = await $LT_GetCommandEssentials();

    logger.info('Collecting translations from source files...');

    const files = await $LT_CollectCandidateFilesWithTags({
        config,
        logger,
        skipEmptyNamespaceCheck: config.isLibrary,
    });
    if (config.debug) {
        for (let file of files) {
            logger.debug('Found {count} translations tags inside: {file}', {
                count: file.tags.length,
                file: file.relativeFilePath,
            });
        }
    }

    if (config.isLibrary) {
        await $LT_WriteAsExportFile({ config, logger, files });
        const executionTime = formatExecutionTime(Date.now() - startTime);
        logger.debug('Collection completed ({time})', { time: executionTime });
        return;
    }

    try {
        const collections = await $LT_GroupTagsToCollections({
            logger,
            files,
            config,
        });

        const totalTags = files.reduce(
            (sum, file) => sum + file.tags.length,
            0
        );
        logger.debug('Found {totalTags} translation tags', { totalTags });

        await $LT_WriteToCollections({
            config,
            collections,
            logger,
            clean: options?.clean,
        });

        const executionTime = formatExecutionTime(Date.now() - startTime);
        logger.debug('Collection completed ({time})', { time: executionTime });
    } catch (e: any) {
        const prefix = 'LangTagConflictResolution:';
        if (e.message.startsWith(prefix)) {
            logger.error(e.message.substring(prefix.length));
            const executionTime = formatExecutionTime(Date.now() - startTime);
            logger.debug('Collection completed ({time})', {
                time: executionTime,
            });
            return;
        }
        throw e;
    }
}
