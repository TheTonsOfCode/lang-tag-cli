import { sep } from 'pathe';

import { LangTagCLIConfigGenerationEvent } from '@/type';

import { CaseType, applyCaseTransform } from '../case-utils';

const TRIGGER_NAME = 'path-based-config-generator';

export interface PathBasedConfigGeneratorOptions {
    /**
     * Whether to include the filename (without extension) as part of the path segments.
     * @default false
     */
    includeFileName?: boolean;

    /**
     * Whether to completely remove directories wrapped in brackets () or [].
     * If false, only the brackets are removed from directory names.
     * @default true
     *
     * @example
     * - true: 'app/(admin)/users' -> 'app/users'
     * - false: 'app/(admin)/users' -> 'app/admin/users'
     */
    removeBracketedDirectories?: boolean;

    /**
     * List of directory names to completely ignore globally.
     * These will be removed from all paths regardless of their position.
     * @default []
     *
     * @example ['src', 'app', 'components']
     */
    ignoreDirectories?: string[];

    /**
     * When true, automatically removes the root directory from the path if it matches
     * one of the root directories extracted from config.includes patterns.
     * Unlike ignoreDirectories, this only removes the FIRST occurrence if the path starts with it.
     *
     * @default false
     *
     * @example
     * // With includes: ['src/**\/*.{js,ts,jsx,tsx}']
     * // Path: 'src/components/Button.tsx' → removes root 'src' → 'components/Button.tsx'
     *
     * // With includes: ['app/**\/*.{js,ts,jsx,tsx}', 'components/**\/*.{jsx,tsx}']
     * // Path: 'app/dashboard/components/utils.tsx' → removes root 'app' → 'dashboard/components/utils.tsx'
     * // Note: 'components' in the middle is NOT removed (only root occurrences)
     *
     * // With includes: ['(src|app)/**\/*.{js,ts,jsx,tsx}']
     * // Extracts root directories: ['src', 'app']
     * // Path: 'src/features/auth.tsx' → removes root 'src' → 'features/auth.tsx'
     * // Path: 'app/pages/home.tsx' → removes root 'app' → 'pages/home.tsx'
     */
    ignoreIncludesRootDirectories?: boolean;

    /**
     * Hierarchical structure for ignoring specific directory patterns.
     * Keys represent path segments to match, values indicate what to ignore at that level.
     * Supports special key `_` when set to `true` to ignore current segment but continue hierarchy.
     *
     * @example
     * {
     *   'src': {
     *     'app': true,  // ignore 'app' when under 'src'
     *     'features': ['auth', 'admin'],  // ignore 'auth' and 'admin' under 'src/features'
     *     'dashboard': {
     *       _: true,  // ignore 'dashboard' but continue with nested rules
     *       modules: true  // also ignore 'modules' under 'dashboard'
     *     }
     *   }
     * }
     */
    ignoreStructured?: Record<string, any>;

    /**
     * Advanced hierarchical rules for transforming path segments.
     * Supports ignoring and renaming segments with special keys:
     * - `_`: when `false`, ignores the current segment but continues hierarchy
     * - `>`: renames the current segment to the specified value
     * - `>>`: namespace redirect - jumps to a different namespace and continues processing remaining path segments
     *   - String: `>>: 'namespace'` - redirects to specified namespace, remaining segments become path
     *   - Object: `>>: { namespace: 'name', pathPrefix: 'prefix.' }` - redirects with optional path prefix
     *   - Empty: `>>: ''` or `>>: null/undefined` - uses current segment as namespace
     *   - Missing namespace: `>>: { pathPrefix: 'prefix.' }` - uses current segment as namespace with prefix
     *   - Nested: deepest `>>` in hierarchy takes precedence
     * - Regular keys: nested rules or boolean/string for child segments
     *
     * @example
     * {
     *   app: {
     *     dashboard: {
     *       _: false,          // ignore "dashboard" segment
     *       modules: false     // ignore "modules" when under "dashboard"
     *     },
     *     admin: {
     *       '>': 'management', // rename "admin" to "management"
     *       users: true        // keep "users" as is (does nothing)
     *     },
     *     layout: {
     *       '>>': 'dashboard'  // redirect: everything below layout jumps to "dashboard" namespace
     *     },
     *     components: {
     *       '>>': {           // redirect: jump to "ui" namespace with "components." path prefix
     *         namespace: 'ui',
     *         pathPrefix: 'components'
     *       }
     *     },
     *     features: {
     *       '>>': {           // redirect: use current segment as namespace with "feature." prefix
     *         pathPrefix: 'feature.'
     *       }
     *     },
     *     auth: {
     *       '>>': '',         // redirect: use current segment as namespace
     *       '>>': null,       // same as empty string
     *       '>>': undefined   // same as empty string
     *     }
     *   }
     * }
     */
    pathRules?: Record<string, any>;

    /**
     * Convert the final namespace to lowercase.
     * @default false
     */
    lowercaseNamespace?: boolean;

    /**
     * Case transformation to apply to the namespace.
     * Available options: 'camel', 'capital', 'constant', 'dot', 'header', 'kebab',
     * 'lower', 'no', 'param', 'pascal', 'path', 'sentence', 'snake', 'swap', 'title', 'upper'
     * @default undefined (no transformation)
     */
    namespaceCase?: CaseType;

    /**
     * Case transformation to apply to the path segments.
     * Available options: 'camel', 'capital', 'constant', 'dot', 'header', 'kebab',
     * 'lower', 'no', 'param', 'pascal', 'path', 'sentence', 'snake', 'swap', 'title', 'upper'
     * @default undefined (no transformation)
     */
    pathCase?: CaseType;

    /**
     * Fallback namespace to use when no segments remain after filtering.
     * Defaults to the defaultNamespace from langTagConfig.collect.defaultNamespace if not provided.
     * @default undefined
     */
    fallbackNamespace?: string;

    /**
     * When true and the generated namespace equals the fallback/default namespace,
     * the namespace will be omitted from the configuration as it's redundant.
     * @default true
     */
    clearOnDefaultNamespace?: boolean;
}

/**
 * Automatically generates namespace and path configuration based on file path structure.
 *
 * This algorithm analyzes the relative file path and intelligently extracts namespace
 * and path segments according to configurable rules.
 *
 * @param options - Configuration options for path-based generation
 * @returns A function compatible with LangTagCLIConfig.onConfigGeneration
 *
 * @example
 * ```typescript
 * import { pathBasedConfigGenerator } from '@lang-tag/cli/algorithms';
 *
 * export default {
 *   onConfigGeneration: pathBasedConfigGenerator({
 *     includeFileName: false,
 *     removeBracketedDirectories: true,
 *     ignoreDirectories: ['lib', 'utils'],
 *     ignoreIncludesRootDirectories: true, // Auto-ignores root directories from includes
 *     lowercaseNamespace: true,
 *     fallbackNamespace: 'common'
 *   })
 * };
 * ```
 */
export function pathBasedConfigGenerator(
    options: PathBasedConfigGeneratorOptions = {}
): (event: LangTagCLIConfigGenerationEvent) => Promise<void> {
    const {
        includeFileName = false,
        removeBracketedDirectories = true,
        ignoreDirectories = [],
        ignoreIncludesRootDirectories = false,
        ignoreStructured = {},
        pathRules = {},
        lowercaseNamespace = false,
        namespaceCase,
        pathCase,
        fallbackNamespace,
        clearOnDefaultNamespace = true,
    } = options;

    // Validate that both pathRules and ignoreStructured are not used together
    const hasPathRules = Object.keys(pathRules).length > 0;
    const hasIgnoreStructured = Object.keys(ignoreStructured).length > 0;

    if (hasPathRules && hasIgnoreStructured) {
        throw new Error(
            'pathBasedConfigGenerator: Cannot use both "pathRules" and "ignoreStructured" options simultaneously. ' +
                'Please use "pathRules" (recommended) or "ignoreStructured" (legacy), but not both.'
        );
    }

    return async (event: LangTagCLIConfigGenerationEvent) => {
        const { relativePath, langTagConfig } = event;

        // Determine the actual fallback namespace from options or config default
        const actualFallbackNamespace =
            fallbackNamespace ?? langTagConfig.collect?.defaultNamespace;

        // Extract path segments from relative path using path library for cross-platform compatibility
        let pathSegments = relativePath.split(sep).filter(Boolean);

        if (pathSegments.length === 0) {
            return;
        }

        // Handle filename inclusion
        const fileName = pathSegments[pathSegments.length - 1];
        const fileNameWithoutExt = fileName.replace(/\.[^.]+$/, '');

        if (includeFileName) {
            // Include filename without extension as a segment
            pathSegments[pathSegments.length - 1] = fileNameWithoutExt;
        } else {
            // Remove filename from segments
            pathSegments = pathSegments.slice(0, -1);
        }

        // Process bracketed directories
        pathSegments = pathSegments
            .map((segment) => {
                const bracketMatch = segment.match(/^[\(\[](.+)[\)\]]$/);
                if (bracketMatch) {
                    // Directory is wrapped in brackets
                    return removeBracketedDirectories ? null : bracketMatch[1];
                }
                return segment;
            })
            .filter((seg): seg is string => seg !== null);

        // Apply hierarchical path rules BEFORE removing root directories
        // This allows rules to work with the full path structure
        if (hasPathRules) {
            pathSegments = applyPathRules(pathSegments, pathRules);
        } else {
            pathSegments = applyStructuredIgnore(
                pathSegments,
                ignoreStructured
            );
        }

        // Remove root directories from includes (only first occurrence)
        if (
            ignoreIncludesRootDirectories &&
            langTagConfig.includes &&
            pathSegments.length > 0
        ) {
            const extractedDirectories = extractRootDirectoriesFromIncludes(
                langTagConfig.includes
            );
            // Only remove if the first segment matches one of the root directories
            if (extractedDirectories.includes(pathSegments[0])) {
                pathSegments = pathSegments.slice(1);
            }
        }

        // Apply global ignore rules
        pathSegments = pathSegments.filter(
            (seg) => !ignoreDirectories.includes(seg)
        );

        // Generate namespace and path from remaining segments
        let namespace: string | undefined;
        let path: string | undefined;

        if (pathSegments.length >= 1) {
            // First segment becomes the namespace
            namespace = pathSegments[0];

            // Remaining segments form the path
            if (pathSegments.length > 1) {
                path = pathSegments.slice(1).join('.');
            } else {
                // No remaining segments, path is empty
                path = '';
            }
        } else {
            // No segments remain, use fallback
            namespace = actualFallbackNamespace;
        }

        // Apply case transformations
        if (namespace) {
            if (lowercaseNamespace) {
                namespace = namespace.toLowerCase();
            }
            if (namespaceCase) {
                namespace = applyCaseTransform(namespace, namespaceCase);
            }
        }

        if (path && pathCase) {
            const pathParts = path.split('.');
            const transformedParts = pathParts.map((part) =>
                applyCaseTransform(part, pathCase)
            );
            path = transformedParts.join('.');
        }

        // Build the configuration object, preserving existing properties
        const newConfig: any = event.getCurrentConfig();

        // Handle default namespace clearing
        if (clearOnDefaultNamespace && namespace === actualFallbackNamespace) {
            // Omit namespace when it equals the default
            if (path) {
                newConfig.path = path;
                // Remove namespace since it equals default
                delete newConfig.namespace;
            } else {
                // No namespace, no path - check if there are any other custom properties
                const hasOtherProperties =
                    event.config &&
                    Object.keys(event.config).some(
                        (key) => key !== 'namespace' && key !== 'path'
                    );

                if (!hasOtherProperties) {
                    // No other properties - clear entire config
                    event.save(null, TRIGGER_NAME);
                    return;
                } else {
                    // Preserve other properties but remove namespace and path
                    delete newConfig.namespace;
                    delete newConfig.path;
                }
            }
        } else {
            if (namespace) {
                newConfig.namespace = namespace;
            }
            if (path) {
                newConfig.path = path;
            } else {
                // If no new path was generated, remove any existing path
                delete newConfig.path;
            }
        }

        // Save configuration if we have any fields
        if (Object.keys(newConfig).length > 0) {
            event.save(newConfig, TRIGGER_NAME);
        }
    };
}

/**
 * Applies hierarchical structured ignore rules to path segments.
 * Processes segments depth-first, removing matches according to the structure.
 * Supports special key `_` when set to `true` to ignore current segment but continue hierarchy.
 */
function applyStructuredIgnore(
    segments: string[],
    structure: Record<string, any>
): string[] {
    const result: string[] = [];
    let currentStructure = structure;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        // Check if current segment matches any key in current structure level
        if (segment in currentStructure) {
            const rule = currentStructure[segment];

            if (rule === true) {
                // Skip this segment (don't add to result)
                // Reset structure for next iteration
                currentStructure = structure;
                continue;
            } else if (Array.isArray(rule)) {
                // Add current segment to result
                result.push(segment);

                // Check if next segment should be removed
                if (i + 1 < segments.length && rule.includes(segments[i + 1])) {
                    // Skip next segment
                    i++;
                }
                // Reset structure
                currentStructure = structure;
                continue;
            } else if (typeof rule === 'object' && rule !== null) {
                // Check for special _ key to ignore current segment but continue
                const ignoreSelf = rule['_'] === true;

                if (ignoreSelf) {
                    // Skip this segment but continue with nested structure
                    currentStructure = rule;
                    continue;
                } else {
                    // Add current segment and go deeper into structure
                    result.push(segment);
                    currentStructure = rule;
                    continue;
                }
            }
        }

        // No match - add segment and reset structure
        result.push(segment);
        currentStructure = structure;
    }

    return result;
}

/**
 * Helper function to add pathPrefix and remaining segments to result array.
 * Handles pathPrefix normalization (removes trailing dot if present).
 */
function addPathPrefixAndSegments(
    result: string[],
    pathPrefix: string,
    remainingSegments: string[]
): void {
    if (pathPrefix && remainingSegments.length > 0) {
        const cleanPrefix = pathPrefix.endsWith('.')
            ? pathPrefix.slice(0, -1)
            : pathPrefix;
        result.push(cleanPrefix, ...remainingSegments);
    } else if (pathPrefix && remainingSegments.length === 0) {
        const cleanPrefix = pathPrefix.endsWith('.')
            ? pathPrefix.slice(0, -1)
            : pathPrefix;
        result.push(cleanPrefix);
    } else if (remainingSegments.length > 0) {
        result.push(...remainingSegments);
    }
}

/**
 * Processes >> namespace redirect operator and returns the result array.
 * The redirect operator jumps to a different namespace and continues processing remaining path segments.
 *
 * @param redirectRule - The redirect configuration (string or object)
 * @param remainingSegments - Path segments that come after the redirect point
 * @param options - Optional context when redirect is inside a segment rule
 * @returns Array of processed segments (first element becomes namespace, rest become path)
 */
function processNamespaceRedirect(
    redirectRule: any,
    remainingSegments: string[],
    options?: {
        currentSegment?: string;
        renameTo?: string;
        ignoreSelf?: boolean;
    }
): string[] {
    const result: string[] = [];

    // Handle null/undefined redirect - treat as empty string redirect
    if (redirectRule === null || redirectRule === undefined) {
        // Treat as empty string redirect - use current segment as namespace
        if (options?.currentSegment !== undefined) {
            // Add current segment (if not ignored)
            if (!options.ignoreSelf) {
                result.push(options.renameTo || options.currentSegment);
            }
        }
        // Add remaining segments
        result.push(...remainingSegments);
    } else if (typeof redirectRule === 'string') {
        // Simple redirect: >>: 'namespace'
        if (redirectRule === '') {
            // Empty string - special handling
            if (options?.currentSegment !== undefined) {
                // We're inside a segment rule - use current segment as namespace
                if (!options.ignoreSelf) {
                    result.push(options.renameTo || options.currentSegment);
                }
            }
            // Add remaining segments
            result.push(...remainingSegments);
        } else {
            result.push(redirectRule);
            result.push(...remainingSegments);
        }
    } else if (typeof redirectRule === 'object' && redirectRule !== null) {
        // Complex redirect: >>: { namespace: 'name', pathPrefix: 'prefix.' }
        const namespace = redirectRule.namespace;
        const pathPrefix = redirectRule.pathPrefix || '';

        // If namespace is missing, null, or empty, use current segment (if available)
        if (namespace === undefined || namespace === null || namespace === '') {
            if (options?.currentSegment !== undefined) {
                // Add current segment (if not ignored)
                if (!options.ignoreSelf) {
                    result.push(options.renameTo || options.currentSegment);
                }
            }
            addPathPrefixAndSegments(result, pathPrefix, remainingSegments);
        } else {
            // Use provided namespace
            result.push(namespace);
            addPathPrefixAndSegments(result, pathPrefix, remainingSegments);
        }
    }

    return result;
}

/**
 * Applies hierarchical path transformation rules to path segments.
 * Supports ignoring and renaming segments with special keys:
 * - `_`: when `false`, ignores the current segment but continues hierarchy
 * - `>`: renames the current segment to the specified value
 * - `>>`: namespace redirect - jumps to a different namespace and continues processing remaining segments
 *   - String: `>>: 'namespace'` - redirects to specified namespace, remaining segments become path
 *   - Object: `>>: { namespace: 'name', pathPrefix: 'prefix.' }` - redirects with optional path prefix
 *   - Empty: `>>: ''` or `>>: null/undefined` - uses current segment as namespace
 *   - Missing namespace: `>>: { pathPrefix: 'prefix.' }` - uses current segment as namespace with prefix
 *   - Nested: deepest `>>` in hierarchy takes precedence
 */
function applyPathRules(
    segments: string[],
    structure: Record<string, any>
): string[] {
    const result: string[] = [];
    let currentStructure = structure;
    let deepestRedirect: {
        rule: any;
        remainingSegments: string[];
        context?: any;
    } | null = null;

    for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];

        // Check for >> namespace redirect at current structure level
        // Skip if we already have a redirect with context (from nested object)
        if (
            '>>' in currentStructure &&
            (!deepestRedirect || !deepestRedirect.context)
        ) {
            const redirectRule = currentStructure['>>'];
            const remainingSegments = segments.slice(i);
            // Store this as the deepest redirect found so far
            deepestRedirect = {
                rule: redirectRule,
                remainingSegments: remainingSegments,
            };
        }

        // Check if current segment matches any key in current structure level
        if (segment in currentStructure) {
            const rule = currentStructure[segment];

            // Handle simple boolean/string values
            if (rule === true) {
                // Skip this segment (don't add to result)
                currentStructure = structure;
                continue;
            } else if (rule === false) {
                // false means ignore, same as true
                currentStructure = structure;
                continue;
            } else if (typeof rule === 'string') {
                // String means rename
                result.push(rule);
                currentStructure = structure;
                continue;
            } else if (Array.isArray(rule)) {
                // Add current segment to result
                result.push(segment);

                // Check if next segment should be removed
                if (i + 1 < segments.length && rule.includes(segments[i + 1])) {
                    // Skip next segment
                    i++;
                }
                currentStructure = structure;
                continue;
            } else if (typeof rule === 'object' && rule !== null) {
                // Object with special keys _, >, and >>
                const ignoreSelf = rule['_'] === false;
                const renameTo = rule['>'];
                const redirectRule = rule['>>'];

                // Check for >> namespace redirect in nested object
                if ('>>' in rule) {
                    const remainingSegments = segments.slice(i + 1); // Segments after current one
                    // Process remaining segments through nested rules (without >>)
                    const ruleWithoutRedirect = { ...rule };
                    delete ruleWithoutRedirect['>>'];
                    const processedRemaining = applyPathRules(
                        remainingSegments,
                        ruleWithoutRedirect
                    );
                    // Store this as the deepest redirect found so far
                    deepestRedirect = {
                        rule: redirectRule,
                        remainingSegments: processedRemaining,
                        context: {
                            currentSegment: segment,
                            renameTo: renameTo,
                            ignoreSelf: ignoreSelf,
                        },
                    };
                }

                // Add or rename current segment (unless _ is false)
                if (!ignoreSelf) {
                    if (typeof renameTo === 'string') {
                        result.push(renameTo);
                    } else {
                        result.push(segment);
                    }
                }

                // Continue with the nested structure
                currentStructure = rule;
                continue;
            }
        }

        // No match - add segment and reset structure
        result.push(segment);
        currentStructure = structure;
    }

    // If we found a redirect, use the deepest one
    if (deepestRedirect) {
        return processNamespaceRedirect(
            deepestRedirect.rule,
            deepestRedirect.remainingSegments,
            deepestRedirect.context
        );
    }

    return result;
}

/**
 * Extracts root directory names from include glob patterns.
 * Handles patterns like:
 * - 'src/**\/*.{js,ts}' → ['src']
 * - '(src|app)/**\/*.ts' → ['src', 'app']
 * - 'components/**\/*.tsx' → ['components']
 */
function extractRootDirectoriesFromIncludes(includes: string[]): string[] {
    const directories = new Set<string>();

    for (const pattern of includes) {
        // Remove leading ./ if present
        let cleanPattern = pattern.replace(/^\.\//, '');

        // Extract the first segment before /**
        const match = cleanPattern.match(/^([^/]+)/);
        if (!match) continue;

        const firstSegment = match[1];

        // Check if it's a group pattern like (src|app) or [src|app]
        const groupMatch = firstSegment.match(/^[\(\[]([^\)\]]+)[\)\]]$/);
        if (groupMatch) {
            // Split by | and add each directory
            const groupDirectories = groupMatch[1]
                .split('|')
                .map((f) => f.trim());
            groupDirectories.forEach((directory) => directories.add(directory));
        } else {
            // Regular directory name
            directories.add(firstSegment);
        }
    }

    return Array.from(directories);
}
