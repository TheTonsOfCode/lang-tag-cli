import {$LT_ReadConfig} from '@/cli/core/io/read-config.ts';
import {globby} from 'globby';
import * as process from "node:process";
import {gatherTranslationsToNamespaces} from "./core/collect-namespaces";
import {$LT_WriteToNamespaces} from "@/cli/core/io/write-to-namespaces.ts";
import {
    messageCollectTranslations,
    messageFoundTranslationKeys,
    messageNamespacesUpdated,
    messageNoChangesMade
} from '@/cli/message';
import {saveAsLibrary} from "@/cli/commands/core/save-as-library.ts";

export async function collectTranslations() {
    messageCollectTranslations();

    const config = await $LT_ReadConfig(process.cwd());

    const files = await globby(config.includes, {
        cwd: process.cwd(),
        ignore: config.excludes,
        absolute: true
    });

    if (config.isLibrary) {
        await saveAsLibrary(files, config)
    } else {
        const {namespaces, totalKeys} = gatherTranslationsToNamespaces(files, config);

        messageFoundTranslationKeys(totalKeys);

        const changedNamespaces = await $LT_WriteToNamespaces(config, namespaces);

        if (changedNamespaces.length > 0) {
            messageNamespacesUpdated(config, changedNamespaces);
        } else {
            messageNoChangesMade();
        }
    }
}