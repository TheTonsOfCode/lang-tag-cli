import path from 'path';
import micromatch from 'micromatch';
import {LangTagCLIConfig} from '@/type.ts';
import {checkAndRegenerateFileLangTags} from "@/core/regenerate/regenerate-config.ts";
import {$LT_WriteToCollections} from "@/core/io/write-to-collections.ts";
import {$LT_GetCommandEssentials} from "@/commands/setup.ts";
import {LangTagCLILogger} from "@/logger.ts";
import {$LT_CMD_Collect} from "@/commands/cmd-collect.ts";
import {$LT_CollectCandidateFilesWithTags} from "@/core/collect/collect-tags.ts";
import {$LT_GroupTagsToCollections} from "@/core/collect/group-tags-to-collections.ts";
import {$LT_CreateChokidarWatcher} from "@/core/watch/chokidar-watcher.ts";

export async function $LT_WatchTranslations() {
    const {config, logger} = await $LT_GetCommandEssentials();

    await $LT_CMD_Collect();

    const watcher = $LT_CreateChokidarWatcher(config);

    logger.info('Starting watch mode for translations...');
    logger.info('Watching for changes...');
    logger.info('Press Ctrl+C to stop watching');

    watcher
        .on('change', async filePath => await handleFile(config, logger, filePath, 'change'))
        .on('add', async filePath => await handleFile(config, logger, filePath, 'add'))
        // .on('unlink', async filePath => await handleFile(config, filePath, 'unlink'))
        .on('error', error => {
            logger.error('Error in file watcher: {error}', {error});
        });
}

async function handleFile(config: LangTagCLIConfig, logger: LangTagCLILogger, cwdRelativeFilePath: string, event: string) {
    // Check if the path matches any of the original glob patterns
    if (!micromatch.isMatch(cwdRelativeFilePath, config.includes)) {
        return;
    }

    const cwd = process.cwd();

    const absoluteFilePath = path.join(cwd, cwdRelativeFilePath);

    await checkAndRegenerateFileLangTags(config, logger, absoluteFilePath, cwdRelativeFilePath);

    const files = await $LT_CollectCandidateFilesWithTags({filesToScan: [cwdRelativeFilePath], config, logger});

    const namespaces = await $LT_GroupTagsToCollections({logger, files, config})

    await $LT_WriteToCollections({config, collections: namespaces, logger});
}