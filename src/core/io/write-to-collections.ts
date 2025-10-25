import {LangTagCLIConfig} from "@/config.ts";
import {$LT_ReadJSON, $LT_WriteJSON} from "@/core/io/file.ts";
import {deepMergeTranslations} from "@/core/merge.ts";
import {LangTagCLILogger} from "@/logger.ts";

export async function $LT_WriteToCollections({config, collections, logger, clean}: {
    config: LangTagCLIConfig,
    collections: Record<string, Record<string, any>>
    logger: LangTagCLILogger,
    clean?: boolean
}): Promise<void> {

    await config.collect!.collector!.preWrite(clean);

    const changedCollections: string[] = [];

    for (let namespace of Object.keys(collections)) {
        if (!namespace) {
            continue;
        }

        const filePath = await config.collect!.collector!.resolveCollectionFilePath(namespace);

        let originalJSON = {};
        try {
            originalJSON = await $LT_ReadJSON(filePath);
        } catch (e) {
            await config.collect!.collector!.onMissingCollection(namespace);
        }

        if (deepMergeTranslations(originalJSON, collections[namespace])) {
            changedCollections.push(namespace);
            await $LT_WriteJSON(filePath, originalJSON);
        }
    }

    await config.collect!.collector!.postWrite(changedCollections);
}