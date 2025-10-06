import path from 'path';
import micromatch from 'micromatch';
import {LangTagCLIConfig} from '@/cli/config.ts';
import {checkAndRegenerateFileLangTags} from "@/cli/core/regenerate/regenerate-config.ts";
import {$LT_WriteToNamespaces} from "@/cli/core/io/write-to-namespaces.ts";
import {$LT_GetCommandEssentials} from "@/cli/commands/setup.ts";
import {LangTagCLILogger} from "@/cli/logger.ts";
import {$LT_CMD_Collect} from "@/cli/commands/cmd-collect.ts";
import {$LT_CollectCandidateFilesWithTags} from "@/cli/core/collect/collect-tags.ts";
import {$LT_GroupTagsToNamespaces} from "@/cli/core/collect/group-tags-to-namespaces.ts";
import {$LT_CreateChokidarWatcher} from "@/cli/core/watch/chokidar-watcher.ts";

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

    const dirty = await checkAndRegenerateFileLangTags(config, logger, absoluteFilePath, cwdRelativeFilePath);

    if (dirty) {
        logger.info(`Lang tag configurations written for file "{filePath}"`, {filePath: cwdRelativeFilePath});
    }

    const files = await $LT_CollectCandidateFilesWithTags({filesToScan: [cwdRelativeFilePath], config, logger});

    const namespaces = await $LT_GroupTagsToNamespaces({logger, files, config})

    const changedNamespaces = await $LT_WriteToNamespaces({config, namespaces, logger});

    if (changedNamespaces.length > 0) {
        const n = changedNamespaces
            .map(n => `"${n}.json"`)
            .join(", ");

        logger.success('Updated namespaces {outputDir} ({namespaces})', {
            outputDir: config.outputDir,
            namespaces: n,
        });
    }
}