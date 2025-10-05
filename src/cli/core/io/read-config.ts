import {resolve} from "pathe";
import {CONFIG_FILE_NAME} from "@/cli/core/constants.ts";
import {existsSync} from "fs";
import {pathToFileURL} from "url";
import {LANG_TAG_DEFAULT_CONFIG, LangTagConfig} from "@/cli/config.ts";

export async function $LT_ReadConfig(projectPath: string): Promise<LangTagConfig> {
    const configPath = resolve(projectPath, CONFIG_FILE_NAME);

    if (!existsSync(configPath)) {
        throw new Error(`No "${CONFIG_FILE_NAME}" detected`)
    }

    try {
        const configModule = await import(pathToFileURL(configPath).href);

        if (!configModule.default || Object.keys(configModule.default).length === 0) {
            throw new Error(`Config found, but default export is undefined`)
        }

        const userConfig: Partial<LangTagConfig> = configModule.default || {};

        const tn = (userConfig.tagName || '')
            .toLowerCase()
            .replace(/[-_\s]/g, '');

        if (tn.includes('langtag')) {
            throw new Error('Custom tagName cannot include "langtag"! (It is not recommended for use with libraries)\n');
        }

        return {
            ...LANG_TAG_DEFAULT_CONFIG,
            ...userConfig,
            import: {
                ...LANG_TAG_DEFAULT_CONFIG.import,
                ...userConfig.import,
            },
            collect: {
                ...LANG_TAG_DEFAULT_CONFIG.collect,
                ...userConfig.collect,
            }
        };
    } catch (error) {
        throw error;
    }
}