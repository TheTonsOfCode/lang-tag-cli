import { LangTagCLIConfigGenerationEvent } from "@/config.ts";

export interface NamespaceIgnoreConfig {
    /**
     * List of namespaces to always ignore during config generation.
     * If a tag has a namespace that matches any of these, it will be skipped.
     * 
     * @example ['core', 'components', 'pages', 'app']
     */
    ignoreAlways?: string[];
    
    /**
     * Structured configuration for ignoring namespaces based on file path hierarchy.
     * Keys represent path segments, and values can be:
     * - An array of namespace names to ignore at that path level
     * - A nested object for deeper path matching
     * 
     * @example
     * {
     *   'app': {
     *     'components': ['orders', 'products'],
     *     'pages': true
     *   }
     * }
     * 
     * This will ignore:
     * - 'orders' and 'products' namespaces in files under 'app/components/'
     * - all namespaces in files under 'app/pages/'
     */
    ignoreStructured?: Record<string, any>;
}

interface NamespaceIgnoreOptions {
    /**
     * Configuration for namespace ignoring behavior
     */
    namespace: NamespaceIgnoreConfig;
}

/**
 * Creates a config generation handler that can selectively ignore namespaces
 * based on file path and namespace name.
 * 
 * This algorithm is useful for preventing namespace generation in certain
 * parts of your codebase, forcing those areas to use a common namespace instead.
 * 
 * @param options - Configuration options for namespace ignoring
 * @returns A function compatible with LangTagCLIConfig.onConfigGeneration
 * 
 * @example
 * ```typescript
 * import { namespaceIgnoreAlgorithm } from "lang-tag/cli/algorithms";
 * 
 * export default {
 *   onConfigGeneration: namespaceIgnoreAlgorithm({
 *     namespace: {
 *       ignoreAlways: ['core', 'app'],
 *       ignoreStructured: {
 *         'app': {
 *           'components': ['orders', 'products'],
 *           'pages': true
 *         }
 *       }
 *     }
 *   })
 * };
 * ```
 */
export function namespaceIgnoreAlgorithm(
    options: NamespaceIgnoreOptions
): (event: LangTagCLIConfigGenerationEvent) => Promise<void> {
    const { ignoreAlways = [], ignoreStructured = {} } = options.namespace;
    
    return async (event: LangTagCLIConfigGenerationEvent) => {
        const { config, relativePath } = event;
        
        // If there's no config or no namespace, nothing to check
        if (!config || !config.namespace) {
            return;
        }
        
        const namespace = config.namespace;
        
        // Check if namespace is in the ignoreAlways list
        if (ignoreAlways.includes(namespace)) {
            // Remove the namespace from the config by omitting it
            // This will cause the default namespace to be used
            const { namespace: _, ...updatedConfig } = config;
            event.save(updatedConfig as any);
            return;
        }
        
        // Check structured ignore rules
        if (shouldIgnoreStructured(relativePath, namespace, ignoreStructured)) {
            // Remove the namespace from the config by omitting it
            const { namespace: _, ...updatedConfig } = config;
            event.save(updatedConfig as any);
            return;
        }
        
        // If we reach here, don't call save() to keep the config as-is
    };
}

/**
 * Checks if a namespace should be ignored based on structured rules and file path.
 * 
 * @param relativePath - The relative path of the file being processed
 * @param namespace - The namespace to check
 * @param structure - The structured ignore configuration
 * @returns true if the namespace should be ignored, false otherwise
 */
function shouldIgnoreStructured(
    relativePath: string,
    namespace: string,
    structure: Record<string, any>
): boolean {
    // Normalize path separators to forward slashes
    const normalizedPath = relativePath.replace(/\\/g, '/');
    const pathSegments = normalizedPath.split('/').filter(Boolean);
    
    return checkPathRecursive(pathSegments, namespace, structure, 0);
}

/**
 * Recursively checks if a namespace should be ignored at the current path level.
 * 
 * @param pathSegments - Array of path segments to check
 * @param namespace - The namespace to check
 * @param structure - The current level of structured configuration
 * @param segmentIndex - Current index in pathSegments
 * @returns true if the namespace should be ignored, false otherwise
 */
function checkPathRecursive(
    pathSegments: string[],
    namespace: string,
    structure: Record<string, any>,
    segmentIndex: number
): boolean {
    // If we've exhausted all segments, we don't match
    if (segmentIndex >= pathSegments.length) {
        return false;
    }
    
    const currentSegment = pathSegments[segmentIndex];
    
    // Check if current segment exists in the structure
    if (!(currentSegment in structure)) {
        // Try to continue matching with remaining segments
        for (const key in structure) {
            const result = checkPathRecursive(pathSegments, namespace, structure, segmentIndex + 1);
            if (result) return true;
        }
        return false;
    }
    
    const value = structure[currentSegment];
    
    // If value is true, ignore all namespaces at this path
    if (value === true) {
        return true;
    }
    
    // If value is an array, check if namespace is in the array
    if (Array.isArray(value)) {
        return value.includes(namespace);
    }
    
    // If value is an object, recurse deeper into the structure
    if (typeof value === 'object' && value !== null) {
        // Check if we should continue matching deeper
        if (segmentIndex + 1 < pathSegments.length) {
            return checkPathRecursive(pathSegments, namespace, value, segmentIndex + 1);
        }
        
        // We're at the last segment, check if any child matches
        for (const key in value) {
            const childValue = value[key];
            
            if (childValue === true) {
                return true;
            }
            
            if (Array.isArray(childValue) && childValue.includes(namespace)) {
                return true;
            }
        }
    }
    
    return false;
}

