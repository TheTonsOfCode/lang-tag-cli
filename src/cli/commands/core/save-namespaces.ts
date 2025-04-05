import {LangTagConfig} from "@/cli/config.ts";
import {ensureDirectoryExists, readJSON, writeJSON} from "@/cli/commands/utils/file.ts";
import {resolve} from "pathe";
import process from "node:process";
import {messageOriginalNamespaceNotFound, messageWrittenExportsFile} from "@/cli/message";
import {deepMergeTranslations} from "@/cli/commands/utils/merge";

export async function saveNamespaces(config: LangTagConfig, namespaces: Record<string, Record<string, any>>): Promise<string[]> {

    const changedNamespaces: string[] = [];

    await ensureDirectoryExists(config.outputDir);

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
            originalJSON = await readJSON(filePath);
        } catch (e) {
            messageOriginalNamespaceNotFound(filePath);
        }

        if (deepMergeTranslations(originalJSON, namespaces[namespace])) {
            changedNamespaces.push(namespace);
            await writeJSON(filePath, originalJSON);
        }
    }

    return changedNamespaces;
}