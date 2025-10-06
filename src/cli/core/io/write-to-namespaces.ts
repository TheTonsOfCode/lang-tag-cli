import {LangTagCLIConfig} from "@/cli/config.ts";
import {$LT_EnsureDirectoryExists, $LT_ReadJSON, $LT_WriteJSON} from "@/cli/core/io/file.ts";
import {resolve} from "pathe";
import process from "node:process";
import {deepMergeTranslations} from "@/cli/core/merge.ts";
import {LangTagCLILogger} from "@/cli/logger.ts";

export async function $LT_WriteToNamespaces({config, namespaces, logger}: {
    config: LangTagCLIConfig,
    namespaces: Record<string, Record<string, any>>
    logger: LangTagCLILogger
}): Promise<string[]> {

    const changedNamespaces: string[] = [];

    await $LT_EnsureDirectoryExists(config.outputDir);

    for (let namespace of Object.keys(namespaces)) {
        if (!namespace) {
            continue;
        }

        const filePath = resolve(
            process.cwd(),
            config.outputDir,
            namespace + '.json'
        );

        let originalJSON = {};
        try {
            originalJSON = await $LT_ReadJSON(filePath);
        } catch (e) {
            logger.warn(`Original namespace file "{namespace}.json" not found. A new one will be created.`, { namespace })
        }

        if (deepMergeTranslations(originalJSON, namespaces[namespace])) {
            changedNamespaces.push(namespace);
            await $LT_WriteJSON(filePath, originalJSON);
        }
    }

    return changedNamespaces;
}