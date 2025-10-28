import micromatch from 'micromatch';
import path from 'path';

import { $LT_CMD_Collect } from '@/commands/cmd-collect';
import { $LT_GetCommandEssentials } from '@/commands/setup';
import { $LT_CollectCandidateFilesWithTags } from '@/core/collect/collect-tags';
import { $LT_GroupTagsToCollections } from '@/core/collect/group-tags-to-collections';
import { $LT_WriteToCollections } from '@/core/io/write-to-collections';
import { checkAndRegenerateFileLangTags } from '@/core/regenerate/regenerate-config';
import { $LT_CreateChokidarWatcher } from '@/core/watch/chokidar-watcher';
import { LangTagCLILogger } from '@/logger';
import { LangTagCLIConfig } from '@/type';

export async function $LT_WatchTranslations() {
  const { config, logger } = await $LT_GetCommandEssentials();

  await $LT_CMD_Collect();

  const watcher = $LT_CreateChokidarWatcher(config);

  logger.info('Starting watch mode for translations...');
  logger.info('Watching for changes...');
  logger.info('Press Ctrl+C to stop watching');

  watcher
    .on(
      'change',
      async (filePath) => await handleFile(config, logger, filePath, 'change')
    )
    .on(
      'add',
      async (filePath) => await handleFile(config, logger, filePath, 'add')
    )
    // .on('unlink', async filePath => await handleFile(config, filePath, 'unlink'))
    .on('error', (error) => {
      logger.error('Error in file watcher: {error}', { error });
    });
}

async function handleFile(
  config: LangTagCLIConfig,
  logger: LangTagCLILogger,
  cwdRelativeFilePath: string,
  event: string
) {
  // Check if the path matches any of the original glob patterns
  if (!micromatch.isMatch(cwdRelativeFilePath, config.includes)) {
    return;
  }

  const cwd = process.cwd();

  const absoluteFilePath = path.join(cwd, cwdRelativeFilePath);

  await checkAndRegenerateFileLangTags(
    config,
    logger,
    absoluteFilePath,
    cwdRelativeFilePath
  );

  const files = await $LT_CollectCandidateFilesWithTags({
    filesToScan: [cwdRelativeFilePath],
    config,
    logger,
  });

  const namespaces = await $LT_GroupTagsToCollections({
    logger,
    files,
    config,
  });

  await $LT_WriteToCollections({ config, collections: namespaces, logger });
}
