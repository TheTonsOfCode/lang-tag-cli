import {miniChalk} from "@/cli/commands/utils/mini-chalk.ts";
import {LangTagConfig} from "@/cli/config.ts";
import {LangTagMatch} from "@/cli/processor.ts";

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
    info(`Lang tag configurations written for file "${filePath}"`);
}

export function messageWatchMode() {
    info('Starting watch mode for translations...');
    info('Watching for changes...');
    info('Press Ctrl+C to stop watching');
}

export function messageNoChangesMade() {
    info('No changes were made based on the current configuration and files.');
}

export function messageNodeModulesNotFound() {
    warning('"node_modules" directory not found.');
}

export function messageImportedFile(fileName: string) {
    success(`Imported node_modules file: "${fileName}"`);
}


export function messageErrorInFile(e: string, file: string, match: LangTagMatch) {
    error(e + `
  Tag: ${match.fullMatch}
  File: ${file}
  Index: ${match.index}`);
}

export function messageErrorInFileWatcher(e: unknown) {
    error(`Error in file watcher: ${String(e)}`);
}

export function messageErrorReadingConfig(error: unknown) {
    warning(`Error reading configuration file: ${String(error)}`);
}

export function messageSkippingInvalidJson(invalid: string, match: LangTagMatch) {
    warning(`Skipping invalid JSON "${invalid}" at match "${match.fullMatch}"`);
}

export function messageErrorReadingDirectory(dir: string, e: unknown) {
    error(`Error reading directory "${dir}": ${String(e)}`);
}


export function messageImportLibraries() {
    info('Importing translations from libraries...');
}

export function messageLibrariesImportedSuccessfully() {
    success('Successfully imported translations from libraries.');
}
