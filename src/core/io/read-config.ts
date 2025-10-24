import {resolve} from "pathe";
import {CONFIG_FILE_NAME} from "@/core/constants.ts";
import {existsSync} from "fs";
import {pathToFileURL} from "url";
import {LANG_TAG_DEFAULT_CONFIG, LangTagCLIConfig} from "@/config.ts";

export async function $LT_ReadConfig(projectPath: string): Promise<LangTagCLIConfig> {
    const configPath = resolve(projectPath, CONFIG_FILE_NAME);

    if (!existsSync(configPath)) {
        throw new Error(`No "${CONFIG_FILE_NAME}" detected`)
    }

    try {
        const configModule = await import(pathToFileURL(configPath).href);

        if (!configModule.default || Object.keys(configModule.default).length === 0) {
            throw new Error(`Config found, but default export is undefined`)
        }

        const userConfig: Partial<LangTagCLIConfig> = configModule.default || {};

        const tn = (userConfig.tagName || '')
            .toLowerCase()
            .replace(/[-_\s]/g, '');

        // Block exact matches for "lang-tag" and "langtag"
        if (tn === 'langtag' || tn === 'lang-tag') {
            throw new Error('Custom tagName cannot be "lang-tag" or "langtag"! (It is not recommended for use with libraries)\n');
        }

        const config = {
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
        }

        if (!config.collect.collector) {
            throw new Error('Collector not found! (config.collect.collector)');
        }

        return config;
    } catch (error) {
        throw error;
    }
}