import process from 'node:process';

import { $LT_ReadConfig } from '@/core/io/read-config';
import { $LT_CreateDefaultLogger } from '@/core/logger/default-logger';
import { LangTagCLILogger } from '@/logger';

export async function $LT_GetCommandEssentials() {
    const config = await $LT_ReadConfig(process.cwd());
    const logger: LangTagCLILogger = $LT_CreateDefaultLogger(
        config.debug,
        config.translationArgPosition
    );

    config.collect!.collector!.config = config;
    config.collect!.collector!.logger = logger;

    return {
        config,
        logger,
    };
}
