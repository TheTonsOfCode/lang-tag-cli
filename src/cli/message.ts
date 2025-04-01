import {miniChalk} from "@/cli/commands/utils/mini-chalk.ts";
import {LangTagConfig} from "@/cli/config.ts";
import {LangTagMatch} from "@/cli/processor.ts";
import {EXPORTS_FILE_NAME} from "@/cli/constants.ts";

function time(): string {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0') + ":" + now.getSeconds().toString().padStart(2, '0') + ' ';
}

function success(message: string) {
    console.log(time() + miniChalk.green('Success: ') + message);
}

function info(message: string) {
    console.log(time() + miniChalk.cyan('Info: ') + message);
}

function warning(message: string) {
    console.warn(time() + miniChalk.yellow('Warning: ') + message);
}

function error(message: string) {
    console.error(time() + miniChalk.bgRedWhite('Error: ') + message);
}

export function messageNamespacesUpdated(config: LangTagConfig, namespaces: string[]) {
    let n = namespaces
        .map(n => miniChalk.yellow('"') + miniChalk.cyan(n + '.json') + miniChalk.yellow('"') )
        .join(miniChalk.yellow(', '));

    success('Updated namespaces ' + miniChalk.yellow(config.outputDir) + miniChalk.yellow('(') + n + miniChalk.yellow(')'));
}

export function messageLangTagTranslationConfigRegenerated(filePath: string) {
    info(`Lang tags inside file "${filePath}" written`);
}

export function messageCollectTranslations() {
    info('Collecting translations from source files...');
}

export function messageWatchMode() {
    info('Starting watch mode for translations...');
    info('Watching for changes...');
    info('Press Ctrl+C to stop watching');
}

export function messageFoundTranslationKeys(totalKeys: number) {
    info(`Found ${totalKeys} translation keys`);
}

export function messageInitializedConfiguration() {
    success(`Configuration file created successfully`);
}

export function messageNoChangesMade() {
    warning(`No changes made`);
}

export function messageNodeModulesNotFound() {
    warning('"node_modules" directory not found.');
}

export function messageWrittenExportsFile() {
    success(`Written ${EXPORTS_FILE_NAME}`);
}

export function messageImportedFile(fileName: string) {
    success(`Imported node_modules file: "${fileName}"`);
}

export function messageOriginalNamespaceNotFound(filePath: string) {
    warning(`Original namespace file "${filePath}" not found. We will create new one.`);
}

export function messageErrorInFile(e: string, file: string, match: LangTagMatch) {
    error(e + `
- tag: ${match.fullMatch},
- at file: ${file},
- at index: ${match.index}`);
}

export function messageErrorInFileWatcher(e: unknown) {
    error('Error in file watcher:' + String(e));
}

export function messageErrorReadingConfig(error: unknown) {
    warning('Error reading config file:' + String(error));
}

export function messageSkippingInvalidJson(invalid: string, match: LangTagMatch) {
    warning(`Skipping invalid JSON "${invalid}" at match "${match.fullMatch}"`);
}

export function messageErrorReadingDirectory(dir: string, e: unknown) {
    error(`Error reading directory: ${dir}` + String(e));
}

export function messageSkippedEmptyNamespace(namespace: string, keysCount: number) {
    warning(`Skipped empty namespace "${namespace}" with ${keysCount} keys.`);
}
