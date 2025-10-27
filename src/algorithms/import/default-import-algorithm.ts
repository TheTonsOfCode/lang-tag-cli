import { LangTagCLIImportEvent } from "@/config.ts";
import { join } from "pathe";
import * as caseLib from "case";
import micromatch from "micromatch";

/**
 * Available case transformation options.
 */
export type CaseType = 'camel' | 'capital' | 'constant' | 'dot' | 'header' | 'kebab' | 'lower' | 'no' | 'param' | 'pascal' | 'path' | 'sentence' | 'snake' | 'swap' | 'title' | 'upper';

/**
 * Case transformation configuration for file paths.
 * Can be a string for uniform case transformation, or an object with separate
 * case transformations for directories and files.
 */
export type FilePathCaseType = CaseType | {
    directories?: CaseType;
    files?: CaseType;
};

export interface VariableNameOptions {
    /**
     * Whether to prefix variable names with package name to avoid conflicts.
     * @default false
     */
    prefixWithPackageName?: boolean;

    /**
     * How to handle scoped package names (e.g., '@scope/package').
     * - 'remove-scope': Remove @scope/ part, keep only package name
     * - 'replace': Remove @ and replace / with underscores
     * @default 'replace'
     */
    scopedPackageHandling?: 'remove-scope' | 'replace';

    /**
     * Case transformation to apply to variable names.
     * Available options: 'camel', 'capital', 'constant', 'dot', 'header', 'kebab', 
     * 'lower', 'no', 'param', 'pascal', 'path', 'sentence', 'snake', 'swap', 'title', 'upper'
     * @default 'no'
     */
    case?: CaseType;

    /**
     * How to handle tags without variableName.
     * - 'skip': Skip tags without variableName
     * - 'auto-generate': Generate names like 'translations1', 'translations2', etc. (default)
     * - Function: Custom function to generate variable names
     * @default 'auto-generate'
     */
    handleMissingVariableName?: 'skip' | 'auto-generate' | ((tag: any, packageName: string, fileName: string, index: number) => string);
}

export interface FilePathOptions {
    /**
     * Whether to group all translations from each package into a single file.
     * If false, preserves the original file structure from the library.
     * @default false
     */
    groupByPackage?: boolean;

    /**
     * Whether to include package name in the file path.
     * @default false
     */
    includePackageInPath?: boolean;

    /**
     * How to handle scoped package names in file paths (e.g., '@scope/package').
     * - 'remove-scope': Remove @scope/ part, keep only package name
     * - 'replace': Remove @ and replace / with underscores
     * @default 'replace'
     */
    scopedPackageHandling?: 'remove-scope' | 'replace';

    /**
     * Case transformation to apply to file names and path segments.
     * Can be a string for uniform case transformation, or an object with separate
     * case transformations for directories and files.
     * Available options: 'camel', 'capital', 'constant', 'dot', 'header', 'kebab', 
     * 'lower', 'no', 'param', 'pascal', 'path', 'sentence', 'snake', 'swap', 'title', 'upper'
     * @default 'no'
     */
    case?: FilePathCaseType;
}

export interface DefaultImportAlgorithmOptions {
    /**
     * Options for controlling variable name generation.
     */
    variableName?: VariableNameOptions;

    /**
     * Options for controlling file path generation.
     */
    filePath?: FilePathOptions;

    /**
     * Exclusion rules for filtering imports.
     */
    exclude?: {
        /**
         * List of package names to exclude from import.
         * @default []
         */
        packages?: string[];

        /**
         * List of namespace patterns to exclude from import.
         * Supports wildcards with * (e.g., 'admin.*', '*.internal')
         * @default []
         */
        namespaces?: string[];
    };

}

/**
 * Default import algorithm that imports translations from libraries.
 * 
 * This algorithm provides flexible options for organizing imported translations
 * while preserving the ability to customize the import process.
 * 
 * @param options - Configuration options for the import algorithm
 * @returns A function compatible with LangTagCLIConfig.import.onImport
 * 
 * @example
 * ```typescript
 * import { defaultImportAlgorithm } from '@lang-tag/cli/algorithms';
 * 
 * export default {
 *   import: {
 *     onImport: defaultImportAlgorithm({
 *       variableName: {
 *         prefixWithPackageName: true,
 *         scopedPackageHandling: 'replace', // '@scope/package' -> 'scope_package'
 *         case: 'camel', // 'scope_package_myVar' -> 'scopePackageMyVar'
 *         handleMissingVariableName: 'auto-generate' // Generate 'translations1', 'translations2', etc.
 *       },
 *       filePath: {
 *         groupByPackage: true,
 *         scopedPackageHandling: 'remove-scope', // '@scope/package' -> 'package'
 *         case: 'kebab' // 'package.ts' -> 'package.ts' (no change), 'my-file.ts' -> 'my-file.ts'
 *       },
 *       exclude: {
 *         packages: ['internal-lib'],
 *         namespaces: ['admin.*', '*.internal']
 *       }
 *     })
 *   }
 * };
 * ```
 * 
 * @example
 * ```typescript
 * // Custom function for handling missing variable names
 * export default {
 *   import: {
 *     onImport: defaultImportAlgorithm({
 *       variableName: {
 *         handleMissingVariableName: (tag, packageName, fileName, index) => {
 *           // Generate predictable names based on package and file
 *           const baseName = fileName.replace('.ts', '');
 *           return `${packageName}_${baseName}_${index + 1}`;
 *         }
 *       }
 *     })
 *   }
 * };
 * ```
 */
export function defaultImportAlgorithm(
    options: DefaultImportAlgorithmOptions = {}
): (event: LangTagCLIImportEvent) => void {
    const {
        variableName = {},
        filePath = {},
        exclude = {}
    } = options;

    const { packages: excludePackages = [], namespaces: excludeNamespaces = [] } = exclude;

    return (event: LangTagCLIImportEvent) => {
        const { exports, importTag, logger } = event;
        
        for (const { packageJSON, exportData } of exports) {
            const packageName = packageJSON.name || 'unknown-package';
            
            if (excludePackages.includes(packageName)) {
                logger.debug(`Skipping excluded package: ${packageName}`);
                continue;
            }

            logger.debug(`Processing library: ${packageName}`);

            for (const file of exportData.files) {
                const originalFileName = file.relativeFilePath;
                
                const targetFilePath = generateFilePath(packageName, originalFileName, filePath);

                for (let i = 0; i < file.tags.length; i++) {
                    const tag = file.tags[i];
                    
                    const tagNamespace = (tag.config as any)?.namespace;
                    if (tagNamespace && isNamespaceExcluded(tagNamespace, excludeNamespaces)) {
                        logger.debug(`Skipping excluded namespace: ${tagNamespace}`);
                        continue;
                    }

                    const finalVariableName = generateVariableName(tag.variableName, packageName, originalFileName, i, variableName);

                    if (finalVariableName === null) {
                        logger.debug(`Skipping tag without variableName in ${join(packageName, originalFileName)}`);
                        continue;
                    }

                    importTag(targetFilePath, {
                        variableName: finalVariableName,
                        translations: tag.translations,
                        config: tag.config
                    });

                    logger.debug(`Imported: ${finalVariableName} -> ${targetFilePath}`);
                }
            }
        }
    };
}

/**
 * Applies case transformation to a string using the case library.
 */
function applyCaseTransform(str: string, caseType: string): string {
    if (caseType === 'no') {
        return str;
    }
    
    const caseFunction = (caseLib as any)[caseType];
    if (typeof caseFunction === 'function') {
        return caseFunction(str);
    }
    return str;
}

/**
 * Applies case transformation to file path segments.
 * If caseType is a string, applies uniform transformation per segment.
 * If caseType is an object, applies separate transformations for directories and files.
 */
function applyCaseTransformToPath(filePath: string, caseType: FilePathCaseType): string {
    if (typeof caseType === 'string') {
        // Apply case per segment (both directories and files)
        const segments = filePath.split('/');
        const fileName = segments[segments.length - 1];
        const directorySegments = segments.slice(0, -1);
        
        // Apply case to directories
        const transformedDirectories = directorySegments.map(dir => applyCaseTransform(dir, caseType));
        
        // Apply case to filename
        const transformedFileName = applyCaseTransformToFileName(fileName, caseType);
        
        // Reconstruct path
        if (transformedDirectories.length === 0) {
            return transformedFileName;
        }
        
        return [...transformedDirectories, transformedFileName].join('/');
    }
    
    if (typeof caseType === 'object') {
        const { directories = 'no', files = 'no' } = caseType;
        
        // Split path into segments
        const segments = filePath.split('/');
        const fileName = segments[segments.length - 1];
        const directorySegments = segments.slice(0, -1);
        
        // Apply case to directories
        const transformedDirectories = directorySegments.map(dir => applyCaseTransform(dir, directories));
        
        // Apply case to filename
        const transformedFileName = applyCaseTransformToFileName(fileName, files);
        
        // Reconstruct path
        if (transformedDirectories.length === 0) {
            return transformedFileName;
        }
        
        return [...transformedDirectories, transformedFileName].join('/');
    }
    
    return filePath;
}

/**
 * Normalizes package name based on scoped package handling option.
 */
function normalizePackageName(
    packageName: string,
    scopedPackageHandling: 'remove-scope' | 'replace' = 'replace'
): string {
    switch (scopedPackageHandling) {
        case 'remove-scope':
            // Remove @scope/ part, keep only package name
            return packageName.replace(/^@[^/]+\//, '');
        case 'replace':
        default:
            // Remove @ and replace / with underscores
            return packageName.replace(/@/g, '').replace(/\//g, '_');
    }
}

/**
 * Generates the final variable name based on options.
 */
function generateVariableName(
    originalVariableName: string | undefined,
    packageName: string,
    fileName: string,
    index: number,
    options: VariableNameOptions
): string | null {
    const { 
        prefixWithPackageName = false, 
        scopedPackageHandling = 'replace', 
        case: caseType = 'no',
        handleMissingVariableName = 'auto-generate'
    } = options;

    // Handle missing variable name
    if (!originalVariableName) {
        switch (handleMissingVariableName) {
            case 'skip':
                return null;
            case 'auto-generate':
                originalVariableName = `translations${index + 1}`;
                break;
            default:
                if (typeof handleMissingVariableName === 'function') {
                    originalVariableName = handleMissingVariableName({}, packageName, fileName, index);
                } else {
                    return null;
                }
        }
    }

    let finalName = originalVariableName;

    if (prefixWithPackageName) {
        const normalizedPackageName = normalizePackageName(packageName, scopedPackageHandling);
        finalName = `${normalizedPackageName}_${originalVariableName}`;
    }

    return applyCaseTransform(finalName, caseType);
}

/**
 * Generates the target file path for imported translations based on options.
 */
function generateFilePath(
    packageName: string,
    originalFileName: string,
    options: FilePathOptions
): string {
    const { groupByPackage = false, includePackageInPath = false, scopedPackageHandling = 'replace', case: caseType = 'no' } = options;

    if (groupByPackage) {
        // Group all translations from this package into one file
        const normalizedPackageName = normalizePackageName(packageName, scopedPackageHandling);
        const fileName = `${normalizedPackageName}.ts`;
        return applyCaseTransformToFileName(fileName, typeof caseType === 'string' ? caseType : caseType.files || 'no');
    } else if (includePackageInPath) {
        // Include package name in the path
        const normalizedPackageName = normalizePackageName(packageName, scopedPackageHandling);
        
        if (typeof caseType === 'string') {
            // Apply case per segment for both package name and file path
            const transformedPackageName = applyCaseTransform(normalizedPackageName, caseType);
            const transformedFilePath = applyCaseTransformToPath(originalFileName, caseType);
            return join(transformedPackageName, transformedFilePath);
        } else {
            // New behavior: apply case per segment
            const transformedPackageName = applyCaseTransform(normalizedPackageName, caseType.directories || 'no');
            const transformedFilePath = applyCaseTransformToPath(originalFileName, caseType);
            return join(transformedPackageName, transformedFilePath);
        }
    } else {
        // Preserve original file structure with per-segment case transformation
        return applyCaseTransformToPath(originalFileName, caseType);
    }
}

/**
 * Applies case transformation to a file name while preserving the extension.
 */
function applyCaseTransformToFileName(fileName: string, caseType: string): string {
    if (caseType === 'no') {
        return fileName;
    }
    
    // Split filename and extension
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
        // No extension, apply case to whole name
        return applyCaseTransform(fileName, caseType);
    }
    
    const nameWithoutExt = fileName.substring(0, lastDotIndex);
    const extension = fileName.substring(lastDotIndex);
    
    // Apply case only to the name part, preserve extension
    const transformedName = applyCaseTransform(nameWithoutExt, caseType);
    return transformedName + extension;
}

/**
 * Checks if a namespace matches any of the exclusion patterns.
 * Supports wildcards with * (e.g., 'admin.*', '*.internal')
 */
function isNamespaceExcluded(namespace: string, excludePatterns: string[]): boolean {
    return micromatch.isMatch(namespace, excludePatterns);
}
