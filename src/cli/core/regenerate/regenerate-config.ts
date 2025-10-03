import {LangTagConfig} from "@/cli/config.ts";
import {readFileSync} from "fs";
import {writeFile} from "fs/promises";
import JSON5 from "json5";
import {sep} from "path";
import {$LT_TagProcessor, $LT_TagReplaceData} from "@/cli/core/processor.ts";
import {$LT_FilterInvalidTags} from "@/cli/core/collect/fillters.ts";
import {$LT_Logger} from "@/cli/core/logger.ts";

export async function checkAndRegenerateFileLangTags(
    config: LangTagConfig,
    logger: $LT_Logger,
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

    for (let tag of tags) {
        const newConfig = config.onConfigGeneration({
            config: tag.parameterConfig,
            fullPath: file,
            path,
            isImportedLibrary: path.startsWith(libraryImportsDir)
        });

        // undefined means, configuration should stay as it was
        if (newConfig === undefined) {
            continue;
        }

        if (JSON5.stringify(tag.parameterConfig) !== JSON5.stringify(newConfig)) {
            replacements.push({ tag, config: newConfig });
        }
    }

    if (replacements.length) {
        const newContent = processor.replaceTags(fileContent, replacements);
        await writeFile(file, newContent, 'utf-8');
        return true;
    }

    return false;
}
