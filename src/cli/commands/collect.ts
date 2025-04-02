import {importLibraries} from "@/cli/commands/core/import-node-modules-libraries";
import {readConfig} from '@/cli/commands/utils/read-config';
import {globby} from 'globby';
import * as process from "node:process";
import {gatherTranslationsToNamespaces} from "./core/collect-namespaces";
import {saveNamespaces} from "./core/save-namespaces.ts";
import {
    messageCollectTranslations,
    messageFoundTranslationKeys,
    messageNamespacesUpdated,
    messageNoChangesMade
} from '@/cli/message';
import {saveAsLibrary} from "@/cli/commands/core/save-as-library.ts";

export async function collectTranslations(libraries: boolean = false) {
    messageCollectTranslations();

    const config = await readConfig(process.cwd());
    const files = await globby(config.includes, {
        cwd: process.cwd(),
        ignore: config.excludes,
        absolute: true
    });

    if (libraries) {
        await importLibraries(config);
    }

    if (config.isLibrary) {
        await saveAsLibrary(files, config)
    } else {
        const {namespaces, totalKeys} = gatherTranslationsToNamespaces(files, config);

        messageFoundTranslationKeys(totalKeys);

        // console.log(JSON.stringify(namespaces, null, 2));

        const changedNamespaces = await saveNamespaces(config, namespaces);

        if (changedNamespaces.length > 0) {
            messageNamespacesUpdated(config, changedNamespaces);
        } else {
            messageNoChangesMade();
        }
    }
}