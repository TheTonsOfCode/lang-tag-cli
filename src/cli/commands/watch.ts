import chokidar from 'chokidar';
import path from 'path';
import {LangTagConfig} from '@/cli/config';
import {readConfig} from '@/cli/commands/utils/read-config';
import {collectTranslations} from './collect';
import {miniChalk} from './utils/mini-chalk';
import {checkAndRegenerateFileLangTags} from "@/cli/commands/core/regenerate-config.ts";
import {gatherTranslationsToNamespaces} from "@/cli/commands/core/collect-namespaces.ts";
import {saveNamespaces} from "@/cli/commands/core/save-namespaces.ts";
import {messageLangTagTranslationConfigRegenerated, messageNamespacesUpdated, messageWatchMode, messageErrorInFileWatcher} from "@/cli/message.ts";

export async function watchTranslations() {
    const cwd = process.cwd();
    const config = await readConfig(cwd);

    await collectTranslations(false);

    const includes = config.includes.map(pattern => {
        if (pattern.startsWith('/')) {
            return pattern;
        }
        return path.join(cwd, pattern);
    });

    // Somehow on mac ignores does not work...
    // https://github.com/paulmillr/chokidar/issues/773
    const ignored = [...config.excludes, '**/.git/**']

    const watcher = chokidar.watch(includes, {
        // ignored: ignored,
        // persistent: true,
        // ignoreInitial: true,
        // awaitWriteFinish: {
        //     stabilityThreshold: 300,
        //     pollInterval: 100
        // }
    });

    messageWatchMode();

    watcher
        .on('change', async filePath => await handleFile(config, filePath, 'change'))
        .on('add', async filePath => await handleFile(config, filePath, 'add'))
        // .on('unlink', async filePath => await handleFile(config, filePath, 'unlink'))
        .on('error', error => {
            messageErrorInFileWatcher(error);
        });
}

async function handleFile(config: LangTagConfig, filePath: string, event: string) {
    console.log(filePath);
    // Force check for only js/ts files
    if (!filePath.match(/\.(js|ts|jsx|tsx)$/)) {
        // console.log('Ignored', filePath);
        return
    }

    const cwd = process.cwd();
    const p = path.relative(cwd, filePath)

    const dirty = await checkAndRegenerateFileLangTags(config, filePath, p)

    if (dirty) {
        messageLangTagTranslationConfigRegenerated(p);
    }

    const {namespaces} = gatherTranslationsToNamespaces([filePath], config);

    const changedNamespaces = await saveNamespaces(config, namespaces);
    if (changedNamespaces.length > 0) {
        messageNamespacesUpdated(config, changedNamespaces)
    }
}