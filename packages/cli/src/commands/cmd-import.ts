import { $LT_GetCommandEssentials } from '@/commands/setup';
import { $LT_ImportLibraries } from '@/core/import/import-libraries';

export async function $LT_ImportTranslations() {
    const { config, logger } = await $LT_GetCommandEssentials();

    logger.info('Importing translations from libraries...');

    await $LT_ImportLibraries(config, logger);

    logger.success('Successfully imported translations from libraries.');
}
