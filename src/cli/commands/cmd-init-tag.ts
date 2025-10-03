

// Brac plik z mustache

import {$LT_GetCommandEssentials} from "@/cli/commands/setup.ts";

export async function $LT_CMD_InitTagFile() {
    const {config, logger} = await $LT_GetCommandEssentials();



    // TODO: jesli typescript w projekcie to .ts, a jak nie ma to .js
    // TODO: nazwa taga to cos
    // TODO: brac pod uwage arg
    // TODO: if library to cos (np. InputType)
    // TODO: if react to useMemo

    // Options
    const tagName = config.tagName;
    const isLibrary = config.isLibrary;
    const isJS = false;
}