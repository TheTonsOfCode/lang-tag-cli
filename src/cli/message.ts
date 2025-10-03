import {miniChalk} from "@/cli/commands-old/utils/mini-chalk.ts";
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

export function messageSkippingInvalidJson(invalid: string, match: LangTagMatch) {
    warning(`Skipping invalid JSON "${invalid}" at match "${match.fullMatch}"`);
}
