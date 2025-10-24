import {$LT_ReadConfig} from "@/core/io/read-config.ts";
import process from "node:process";
import {LangTagCLILogger} from "@/logger.ts";
import {$LT_CreateDefaultLogger} from "@/core/logger/default-logger.ts";

export async function $LT_GetCommandEssentials() {

    const config = await $LT_ReadConfig(process.cwd());
    const logger: LangTagCLILogger = $LT_CreateDefaultLogger(config.debug, config.translationArgPosition);

    config.collect!.collector!.config = config;
    config.collect!.collector!.logger = logger;

    return {
        config,
        logger
    }
}