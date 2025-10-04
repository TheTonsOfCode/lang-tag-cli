import {$LT_TagCandidateFile} from "@/cli/core/collect/collect-tags.ts";
import {$LT_Logger} from "@/cli/core/logger.ts";
import {deepMergeTranslations} from "@/cli/core/merge.ts";

export async function $LT_GroupTagsToNamespaces({logger, files}: {
    logger: $LT_Logger,
    files: $LT_TagCandidateFile[]
}) {
    let totalTags = 0;
    const namespaces: Record<string, Record<string, any>> = {};

    for (const file of files) {
        totalTags += file.tags.length;

        for (let tag of file.tags) {

            const config = tag.parameterConfig;
            const namespace = config.namespace;

            const namespaceTranslations: Record<string, any> = namespaces[namespace] || {};
            if (!(namespace in namespaces)) {
                namespaces[namespace] = namespaceTranslations;
            }

            try {
                const translations = digToSection(config.path, namespaceTranslations);
                deepMergeTranslations(translations, tag.parameterTranslations);
            } catch (e: any) {
                logger.error([
                    `{errorMessage},`,
                    `path: "{configPath}",`,
                    `relativeFilePath: "{relativeFilePath}"`,
                    `tagAtIndex: "{tagIndexAt}"`,
                    `tag: "{tag}"`
                ].join("\n"), {
                    errorMessage: e.message,
                    configPath: config.path,
                    relativeFilePath: file.relativeFilePath,
                    tagIndexAt: tag.index,
                    tag: tag.fullMatch,
                });
                throw e;
            }
        }
    }

    return namespaces;
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