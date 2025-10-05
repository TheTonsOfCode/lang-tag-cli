import {$LT_TagCandidateFile} from "@/cli/core/collect/collect-tags.ts";
import {$LT_Logger} from "@/cli/core/logger.ts";
import {ProcessedTag} from "@/cli/config.ts";

type TagConflictInfo = {
    tag: ProcessedTag;
    relativeFilePath: string;
    value: any;
};

type Conflict = {
    path: string;
    tagA: TagConflictInfo;
    tagB: TagConflictInfo;
    conflictType: 'path_overwrite' | 'type_mismatch';
};

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

    // Track conflicts across all files
    const allConflicts: Conflict[] = [];

    // Track existing values and their sources for conflict detection per namespace
    const existingValuesByNamespace: Map<string, Map<string, TagConflictInfo>> = new Map();

    for (const file of files) {
        totalTags += file.tags.length;

        for (const tag of file.tags) {
            const config = tag.parameterConfig;
            const namespaceTranslations = getTranslations(config.namespace);

            // Get or create existing values map for this namespace
            let existingValues = existingValuesByNamespace.get(config.namespace);
            if (!existingValues) {
                existingValues = new Map();
                existingValuesByNamespace.set(config.namespace, existingValues);
            }

            const { target, conflicts: pathConflicts } = ensureNestedObject(
                config.path, 
                namespaceTranslations,
                tag,
                file.relativeFilePath,
                existingValues
            );
            
            // Add path conflicts to global list
            allConflicts.push(...pathConflicts);
            
            const conflicts = mergeWithConflictDetection(
                target, 
                tag.parameterTranslations, 
                config.path || '',
                tag,
                file.relativeFilePath,
                existingValues
            );
            
            // Add merge conflicts to global list
            allConflicts.push(...conflicts);
        }
    }

    // Report all conflicts found
    if (allConflicts.length > 0) {
        logger.warn(`Found ${allConflicts.length} conflicts across files:`);
        for (const conflict of allConflicts) {
            logger.warn([
                `  - ${conflict.conflictType}: "${conflict.path}"`,
                `    TagA: ${conflict.tagA.relativeFilePath} (${conflict.tagA.tag.fullMatch})`,
                `    TagB: ${conflict.tagB.relativeFilePath} (${conflict.tagB.tag.fullMatch})`,
                `    ValueA: ${JSON.stringify(conflict.tagA.value)}`,
                `    ValueB: ${JSON.stringify(conflict.tagB.value)}`
            ].join('\n'));
        }
    }

    return namespaces;
}

/**
 * Creates nested object structure for dot-notation path and returns target object.
 * Example: "buttons.primary" creates { buttons: { primary: {} } } and returns primary object.
 */
function ensureNestedObject(
    path: string | undefined, 
    root: Record<string, any>,
    currentTag: ProcessedTag,
    relativeFilePath: string,
    existingValues: Map<string, TagConflictInfo>
): { target: Record<string, any>; conflicts: Conflict[] } {
    if (!path || !path.trim()) return { target: root, conflicts: [] };
    
    let current = root;
    const conflicts: Conflict[] = [];
    let currentPath = '';
    
    for (const key of path.split('.')) {
        const previousPath = currentPath;
        currentPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (current[key] && typeof current[key] !== 'object') {
            // Found a conflict - trying to create object structure over existing value
            const existingInfo = existingValues.get(currentPath);
            if (existingInfo) {
                conflicts.push({
                    path: currentPath,
                    tagA: existingInfo,
                    tagB: { tag: currentTag, relativeFilePath: relativeFilePath, value: null }, // null because we're trying to create object structure
                    conflictType: 'type_mismatch'
                });
            }
            // Skip creating the nested structure if there's a conflict
            return { target: current, conflicts };
        }
        
        current[key] = current[key] || {};
        current = current[key];
    }
    
    return { target: current, conflicts };
}

/**
 * Merges translations with conflict detection.
 * Returns array of conflicts found during merge.
 */
function mergeWithConflictDetection(
    target: any,
    source: any,
    basePath: string = '',
    currentTag: ProcessedTag,
    relativeFilePath: string,
    existingValues: Map<string, TagConflictInfo>
): Conflict[] {
    if (typeof target !== 'object' || typeof source !== 'object') {
        return [];
    }

    const conflicts: Conflict[] = [];

    for (const key in source) {
        if (!source.hasOwnProperty(key)) {
            continue;
        }

        const currentPath = basePath ? `${basePath}.${key}` : key;
        let targetValue = target[key];
        const sourceValue = source[key];

        // Check for array conflicts
        if (Array.isArray(sourceValue)) {
            continue; // Skip arrays silently
        }

        // Check for conflicts if target already has a value
        if (targetValue !== undefined) {
            const targetType = typeof targetValue;
            const sourceType = typeof sourceValue;

            // Get existing value info from our tracking map
            const existingInfo = existingValues.get(currentPath);

            // Detect type mismatch conflicts (any type change)
            if (targetType !== sourceType) {
                if (existingInfo) {
                    conflicts.push({
                        path: currentPath,
                        tagA: existingInfo,
                        tagB: { tag: currentTag, relativeFilePath: relativeFilePath, value: sourceValue },
                        conflictType: 'type_mismatch'
                    });
                }
                continue; // Skip this merge
            }

            // Detect path overwrite conflicts (same type but different values)
            if (targetValue !== sourceValue) {
                if (existingInfo) {
                    conflicts.push({
                        path: currentPath,
                        tagA: existingInfo,
                        tagB: { tag: currentTag, relativeFilePath: relativeFilePath, value: sourceValue },
                        conflictType: 'path_overwrite'
                    });
                }
                continue; // Skip this merge
            }
        }

        // Merge objects recursively (but not null or arrays)
        if (typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue)) {
            if (!targetValue) {
                targetValue = {};
                target[key] = targetValue;
            }

            const subConflicts = mergeWithConflictDetection(
                targetValue, 
                sourceValue, 
                currentPath, 
                currentTag,
                relativeFilePath,
                existingValues
            );
            conflicts.push(...subConflicts);
        } else {
            // Set primitive value (string, number, boolean, null, undefined, function, array) and track it
            target[key] = sourceValue;
            existingValues.set(currentPath, { tag: currentTag, relativeFilePath, value: sourceValue });
        }
    }

    return conflicts;
}