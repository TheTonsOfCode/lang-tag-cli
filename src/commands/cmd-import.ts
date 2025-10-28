import { $LT_GetCommandEssentials } from '@/commands/setup';
import { $LT_ImportLibraries } from '@/core/import/import-libraries';
import { $LT_EnsureDirectoryExists } from '@/core/io/file';

export async function $LT_ImportTranslations() {
  const { config, logger } = await $LT_GetCommandEssentials();

  await $LT_EnsureDirectoryExists(config.import.dir);

  logger.info('Importing translations from libraries...');

  await $LT_ImportLibraries(config, logger);

  logger.success('Successfully imported translations from libraries.');
}
