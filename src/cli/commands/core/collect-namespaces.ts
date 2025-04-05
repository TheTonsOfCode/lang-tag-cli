import {LangTagConfig} from "@/cli/config.ts";
import {readFileSync} from "fs";
import {extractLangTagData, findLangTags} from "@/cli/processor.ts";
import {deepMergeTranslations} from "@/cli/commands/utils/merge.ts";
import {messageErrorInFile} from "@/cli/message.ts";

export function gatherTranslationsToNamespaces(files: string[], config: LangTagConfig) {
    const namespaces: Record<string, Record<string, any>> = {};

    const pos = config.translationArgPosition;
    let totalKeys = 0;

    for (const file of files) {
        const content = readFileSync(file, 'utf-8');

        const matches = findLangTags(config, content);
        totalKeys += matches.length;

        for (let match of matches) {
            const {tagTranslations, tagConfig} = extractLangTagData(config, match, () => {
                messageErrorInFile(`Translations at ${pos} argument position are not defined`, file, match);
            });

            const namespaceTranslations: Record<string, any> = namespaces[tagConfig.namespace] || {};
            if (!(tagConfig.namespace in namespaces)) {
                namespaces[tagConfig.namespace] = namespaceTranslations;
            }

            try {
                const translations = digToSection(tagConfig.path, namespaceTranslations);
                deepMergeTranslations(translations, tagTranslations);
            } catch (e: any) {
                messageErrorInFile(e.message + `, path: "${tagConfig.path}"`, file, match);
                throw e;
            }
        }
    }

    return {namespaces, totalKeys};
}

function digToSection(key: string | undefined, translations: Record<string, any>): Record<string, any> {
    if (!key) return translations;
    const sp = key.split('.');
    let currentValue = translations[sp[0]];
    if (currentValue && typeof currentValue != 'object') {
        throw new Error(`Key "${sp[0]}" is not an object (found value: "${currentValue}")`);
    }
    if (!currentValue) {
        currentValue = {};
        translations[sp[0]] = currentValue;
    }
    sp.shift();
    return digToSection(sp.join('.'), currentValue);
}