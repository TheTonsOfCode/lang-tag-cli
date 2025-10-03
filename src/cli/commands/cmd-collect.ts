import {$LT_GetCommandEssentials} from "./setup.ts";

import {$LT_CollectCandidateFilesWithTags} from "@/cli/core/collect/collect-tags.ts";
import {$LT_WriteAsExportFile} from "@/cli/core/io/write-as-export-file.ts";
import {$LT_GroupTagsToNamespaces} from "@/cli/core/collect/group-tags-to-namespaces.ts";
import {$LT_WriteToNamespaces} from "@/cli/core/io/write-to-namespaces.ts";

export async function $LT_CMD_Collect() {
    const {config, logger} = await $LT_GetCommandEssentials();

    logger.info('Collecting translations from source files...')

    const files = await $LT_CollectCandidateFilesWithTags({config, logger})

    if (config.isLibrary) {
        await $LT_WriteAsExportFile({config, logger, files})
        return;
    }

    const namespaces = await $LT_GroupTagsToNamespaces({logger, files})

    const totalTags = files.reduce((sum, file) => sum + file.tags.length, 0);
    logger.debug('Found {totalTags} translation tags', { totalTags });

    const changedNamespaces = await $LT_WriteToNamespaces({config, namespaces, logger});

    if (!changedNamespaces?.length) {
        logger.info('No changes were made based on the current configuration and files')
        return;
    }

    const n = changedNamespaces
        .map(n => `"${n}.json"`)
        .join(", ");

    logger.success('Updated namespaces {outputDir} ({namespaces})', {
        outputDir: config.outputDir,
        namespaces: n,
    });
}
