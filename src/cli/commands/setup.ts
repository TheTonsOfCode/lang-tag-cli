import {$LT_ReadConfig} from "@/cli/core/io/read-config.ts";
import process from "node:process";
import {$LT_CreateDefaultLogger, $LT_Logger} from "@/cli/core/logger.ts";

export async function $LT_GetCommandEssentials() {

    const config = await $LT_ReadConfig(process.cwd());

    const logger: $LT_Logger = $LT_CreateDefaultLogger(
        // config.debug // TODO
        true
    );

    return {
        config,
        logger
    }
}