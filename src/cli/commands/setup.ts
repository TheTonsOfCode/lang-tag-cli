import {$LT_ReadConfig} from "@/cli/core/io/read-config.ts";
import process from "node:process";
import {$LT_CreateDefaultLogger, LangTagLogger} from "@/cli/logger.ts";

export async function $LT_GetCommandEssentials() {

    const config = await $LT_ReadConfig(process.cwd());

    const logger: LangTagLogger = $LT_CreateDefaultLogger(config.debug);

    return {
        config,
        logger
    }
}