import {LangTagCLIConfig} from "@/config.ts";
import {readFileSync} from "fs";
import {writeFile} from "fs/promises";
import JSON5 from "json5";
import {sep} from "path";
import {$LT_TagProcessor, $LT_TagReplaceData} from "@/core/processor.ts";
import {$LT_FilterInvalidTags} from "@/core/collect/fillters.ts";
import {LangTagCLILogger} from "@/logger.ts";
import {deepFreezeObject} from "@/core/utils.ts";
import {LangTagTranslationsConfig} from "lang-tag";

export async function checkAndRegenerateFileLangTags(
    config: LangTagCLIConfig,
    logger: LangTagCLILogger,
    file: string,
    path: string,
) {
    let libraryImportsDir = config.import.dir;
    if (!libraryImportsDir.endsWith(sep)) libraryImportsDir += sep;

    const fileContent = readFileSync(file, 'utf-8');

    const processor = new $LT_TagProcessor(config);
    let tags = processor.extractTags(fileContent);

    tags = $LT_FilterInvalidTags(tags, config, logger);

    if (!tags.length) {
        return false;
    }

    const replacements: $LT_TagReplaceData[] = [];

    let lastUpdatedLine = 0;

    for (let tag of tags) {
        let newConfig: any = undefined;
        let shouldUpdate = false;

        const frozenConfig = tag.parameterConfig ? deepFreezeObject(tag.parameterConfig) : tag.parameterConfig;

        await config.onConfigGeneration({
            langTagConfig: config,
            config: frozenConfig,
            absolutePath: file,
            relativePath: path,
            isImportedLibrary: path.startsWith(libraryImportsDir),
            save: (updatedConfig) => {
                if (!updatedConfig && updatedConfig !== null) throw new Error('Wrong config data');
                newConfig = updatedConfig;
                shouldUpdate = true;
                logger.debug('Called save for "{path}" with config "{config}"', {path, config: JSON.stringify(updatedConfig)});
            }
        });

        // If save was not called, configuration should stay as it was
        if (!shouldUpdate) {
            continue;
        }

        lastUpdatedLine = tag.line;

        if (!isConfigSame(tag.parameterConfig, newConfig)) {
            replacements.push({ tag, config: newConfig });
        }
    }

    if (replacements.length) {
        const newContent = processor.replaceTags(fileContent, replacements);
        await writeFile(file, newContent, 'utf-8');
        logger.info('Lang tag configurations written for file "{path}" (file://{file}:{line})', {path, file, line: lastUpdatedLine})
        return true;
    }

    return false;
}

function isConfigSame(c1: LangTagTranslationsConfig | any, c2: LangTagTranslationsConfig | any) {
    if (!c1 && !c2) return true;
    if (c1 && typeof c1 === "object" && c2 && typeof c2 === "object" && JSON5.stringify(c1) === JSON5.stringify(c2)) return true;
    return false;
}