import {$LT_TagCandidateFile} from "@/cli/core/collect/collect-tags.ts";
import {$LT_Logger} from "@/cli/core/logger.ts";
import {deepMergeTranslations} from "@/cli/core/merge.ts";

export async function $LT_GroupTagsToNamespaces({logger, files}: {
    logger: $LT_Logger,
    files: $LT_TagCandidateFile[]
}) {
    let totalTags = 0;
    const namespaces: Record<string, Record<string, any>> = {};

    function getTranslations(namespace: string): Record<string, any> {
        const namespaceTranslations: Record<string, any> = namespaces[namespace] || {};
        if (!(namespace in namespaces)) {
            namespaces[namespace] = namespaceTranslations;
        }
        return namespaceTranslations;
    }


    // TODO: conflict resolution system
    // wykrywac czy gdzies w namespace np. "common" langtag z pliku A nie próbuje zmergować na tą samą ścieżkę langtaga z pliku B
    // wtedy wypisywac oba pliki

    for (const file of files) {
        totalTags += file.tags.length;

        for (let tag of file.tags) {

            const config = tag.parameterConfig;

            const namespaceTranslations = getTranslations(config.namespace);

            try {
                const translations = ensureNestedObject(config.path, namespaceTranslations);
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

/**
 * Ensures a nested object structure exists for the given dot-notation path.
 * Creates missing intermediate objects and returns the target object for merging.
 */
function ensureNestedObject(path: string | undefined, root: Record<string, any>): Record<string, any> {
    if (!path) return root;
    
    const keys = path.split('.');
    let current = root;
    
    for (const key of keys) {
        const existing = current[key];

        if (existing && typeof existing !== 'object') {
            throw new Error(`Key "${key}" is not an object (found value: "${existing}")`);
        }
        
        if (!existing) {
            current[key] = {};
        }
        
        current = current[key];
    }
    
    return current;
}