import {LangTagConfig} from "@/cli/config.ts";
import {$LT_EnsureDirectoryExists, $LT_ReadJSON, $LT_WriteJSON} from "@/cli/core/io/file.ts";
import {resolve} from "pathe";
import process from "node:process";
import {messageOriginalNamespaceNotFound} from "@/cli/message.ts";
import {deepMergeTranslations} from "@/cli/commands/utils/merge.ts";

export async function $LT_WriteToNamespaces(config: LangTagConfig, namespaces: Record<string, Record<string, any>>): Promise<string[]> {

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
            messageOriginalNamespaceNotFound(filePath);
        }

        if (deepMergeTranslations(originalJSON, namespaces[namespace])) {
            changedNamespaces.push(namespace);
            await $LT_WriteJSON(filePath, originalJSON);
        }
    }

    return changedNamespaces;
}