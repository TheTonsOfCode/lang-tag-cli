import chokidar from 'chokidar';
import path from 'path';
import micromatch from 'micromatch';
import {LangTagConfig} from '@/cli/config';
import {checkAndRegenerateFileLangTags} from "@/cli/core/regenerate/regenerate-config.ts";
import {$LT_WriteToNamespaces} from "@/cli/core/io/write-to-namespaces.ts";
import {messageLangTagTranslationConfigRegenerated, messageNamespacesUpdated} from "@/cli/message.ts";
import {$LT_GetCommandEssentials} from "@/cli/commands/setup.ts";
import {$LT_Logger} from "@/cli/core/logger.ts";
import {$LT_CMD_Collect} from "@/cli/commands/cmd-collect.ts";
import {$LT_CollectCandidateFilesWithTags} from "@/cli/core/collect/collect-tags.ts";
import {$LT_GroupTagsToNamespaces} from "@/cli/core/collect/group-tags-to-namespaces.ts";

function getBasePath(pattern: string): string {
    const globStartIndex = pattern.indexOf('*');
    const braceStartIndex = pattern.indexOf('{');
    let endIndex = -1;

    if (globStartIndex !== -1 && braceStartIndex !== -1) {
        endIndex = Math.min(globStartIndex, braceStartIndex);
    } else if (globStartIndex !== -1) {
        endIndex = globStartIndex;
    } else if (braceStartIndex !== -1) {
        endIndex = braceStartIndex;
    }

    // If there's no '*' or '{', return the whole pattern (it might be a file path)
    if (endIndex === -1) {
        // If the pattern contains '/', find the last '/'
        const lastSlashIndex = pattern.lastIndexOf('/');
        return lastSlashIndex !== -1 ? pattern.substring(0, lastSlashIndex) : '.'; // Return '.' if there's no slash
    }

    // Find the last directory separator before '*' or '{'
    const lastSeparatorIndex = pattern.lastIndexOf('/', endIndex);

    return lastSeparatorIndex === -1 ? '.' : pattern.substring(0, lastSeparatorIndex);
}

export async function watchTranslations() {
    const {config, logger} = await $LT_GetCommandEssentials();

    const cwd = process.cwd();

    // TODO: przerobic ze to bardziej per plik collectuje
    // TODO: to jest chyba dobrze bo watch przy pierwszym uruchomieniu powinien zgarnac translacje
    await $LT_CMD_Collect();

    // Chokidar doesn't seem to handle glob patterns reliably, especially during tests.
    // To unify watching behavior in both tests and production:
    // From patterns like ['src/**/*.{js,ts,jsx,tsx}', 'app/components/**/*.{js,ts}'],
    // we extract the base directories:
    // ['src', 'app/components']
    // Chokidar can handle watching these base directories more reliably.
    // Then, we check the full original pattern match inside 'handleFile' once a file change is detected.
    const baseDirsToWatch = [
        ...new Set(config.includes.map(pattern => getBasePath(pattern)))
    ];

    // If the base path is '.', replace it with an empty string or handle it differently,
    // depending on how chokidar interprets it in the cwd context
    // For now, let's leave '.', assuming chokidar with the cwd option can handle it
    const finalDirsToWatch = baseDirsToWatch.map(dir => dir === '.' ? cwd : dir); // Can be adjusted

    // Somehow on mac ignores does not work...
    // https://github.com/paulmillr/chokidar/issues/773
    const ignored = [...config.excludes, '**/.git/**'] // Keep ignored patterns

    // console.log('Original patterns:', config.includes);
    // console.log('Watching base directories:', finalDirsToWatch); // Log base directories
    // console.log('Ignoring patterns:', ignored);

    const watcher = chokidar.watch(finalDirsToWatch, { // Watch base directories
        cwd: cwd,
        ignored: ignored,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 100
        }
    });

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

async function handleFile(config: LangTagConfig, logger: $LT_Logger, cwdRelativeFilePath: string, event: string) {
    // Check if the path matches any of the original glob patterns
    if (!micromatch.isMatch(cwdRelativeFilePath, config.includes)) {
        return;
    }

    const cwd = process.cwd();

    const absoluteFilePath = path.join(cwd, cwdRelativeFilePath);

    const dirty = await checkAndRegenerateFileLangTags(config, logger, absoluteFilePath, cwdRelativeFilePath);

    if (dirty) {
        messageLangTagTranslationConfigRegenerated(cwdRelativeFilePath);
    }

    const files = await $LT_CollectCandidateFilesWithTags({filesToScan: [cwdRelativeFilePath], config, logger});

    const namespaces = await $LT_GroupTagsToNamespaces({logger, files})

    const changedNamespaces = await $LT_WriteToNamespaces({config, namespaces, logger});
    if (changedNamespaces.length > 0) {
        messageNamespacesUpdated(config, changedNamespaces)
    }
}