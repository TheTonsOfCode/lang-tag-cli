import { globby } from 'globby';

import { $LT_GetCommandEssentials } from '@/commands/setup';
import { checkAndRegenerateFileLangTags } from '@/core/regenerate/regenerate-config';
import { formatExecutionTime } from '@/core/utils';

export async function $LT_CMD_RegenerateTags() {
    const startTime = Date.now();
    const { config, logger } = await $LT_GetCommandEssentials();

    const files = await globby(config.includes, {
        cwd: process.cwd(),
        ignore: config.excludes,
        absolute: true,
    });
    const charactersToSkip = process.cwd().length + 1;

    let dirty = false;

    for (const file of files) {
        const path = file.substring(charactersToSkip);

        const localDirty = await checkAndRegenerateFileLangTags(
            config,
            logger,
            file,
            path
        );

        if (localDirty) {
            dirty = true;
        }
    }

    const executionTime = formatExecutionTime(Date.now() - startTime);

    if (!dirty) {
        logger.info(
            'No changes were made based on the current configuration and files'
        );
    }

    logger.debug('Regeneration completed ({time})', { time: executionTime });
}
