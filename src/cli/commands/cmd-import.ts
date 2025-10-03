import {$LT_ImportLibraries} from "@/cli/core/import/import-libraries.ts";
import {$LT_GetCommandEssentials} from "@/cli/commands/setup.ts";
import {$LT_EnsureDirectoryExists} from "@/cli/core/io/file.ts";

export async function $LT_ImportTranslations() {
    const {config, logger} = await $LT_GetCommandEssentials();

    await $LT_EnsureDirectoryExists(config.import.dir);

    logger.info('Importing translations from libraries...')

    await $LT_ImportLibraries(config, logger);

    logger.success('Successfully imported translations from libraries.')
} 