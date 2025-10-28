import { $LT_CollectCandidateFilesWithTags } from '@/core/collect/collect-tags';
import { $LT_GroupTagsToCollections } from '@/core/collect/group-tags-to-collections';
import { $LT_WriteAsExportFile } from '@/core/io/write-as-export-file';
import { $LT_WriteToCollections } from '@/core/io/write-to-collections';

import { $LT_GetCommandEssentials } from './setup';

export async function $LT_CMD_Collect(options?: { clean?: boolean }) {
  const { config, logger } = await $LT_GetCommandEssentials();

  logger.info('Collecting translations from source files...');

  const files = await $LT_CollectCandidateFilesWithTags({ config, logger });
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
    return;
  }

  try {
    const collections = await $LT_GroupTagsToCollections({
      logger,
      files,
      config,
    });

    const totalTags = files.reduce((sum, file) => sum + file.tags.length, 0);
    logger.debug('Found {totalTags} translation tags', { totalTags });

    await $LT_WriteToCollections({
      config,
      collections,
      logger,
      clean: options?.clean,
    });
  } catch (e: any) {
    const prefix = 'LangTagConflictResolution:';
    if (e.message.startsWith(prefix)) {
      logger.error(e.message.substring(prefix.length));
      return;
    }
    throw e;
  }
}
