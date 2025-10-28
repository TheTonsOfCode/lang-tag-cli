import { LangTagCLIImportEvent } from "@/config.ts";

/**
 * Mapping for a specific file within a package.
 * Defines which variables to import and optionally rename them.
 */
export interface FileMapping {
    /**
     * Source file path within the package
     * @example 'components/button.ts'
     */
    sourceFile: string;

    /**
     * Target file path where variables should be imported
     * @example 'ui/buttons.ts'
     */
    targetFile: string;

    /**
     * Map of variable names to import and their optional new names.
     * If no new name is provided, the original name is used.
     * @example { 'primaryButton': 'button', 'secondaryButton': 'secondary' }
     */
    variables: Record<string, string | undefined>;
}

/**
 * Mapping for a specific package.
 * Defines which files to import and how to map their variables.
 */
export interface PackageMapping {
    /**
     * Package name to match
     * @example '@company/ui-components'
     */
    packageName: string;

    /**
     * Array of file mappings for this package
     */
    files: FileMapping[];
}

/**
 * Options for the simple mapping import algorithm.
 */
export interface SimpleMappingImportAlgorithmOptions {
    /**
     * Array of package mappings defining how to import from each package
     */
    mappings: PackageMapping[];


    /**
     * Global config remapping function applied to all imported tags
     */
    configRemap?: (originalConfig: any, context: {
        packageName: string;
        sourceFile: string;
        targetFile: string;
        variableName: string;
        originalVariableName: string;
    }) => any | null;
}

/**
 * Simple mapping import algorithm that provides straightforward control over
 * how library translations are imported based on explicit package->file->variable mappings.
 * 
 * This algorithm allows you to:
 * - Specify exactly which packages to import from
 * - Map specific files from packages to target files
 * - Select which variables to import and optionally rename them
 * - Skip packages/files/variables not explicitly mapped
 * 
 * @param options - Configuration options for the simple mapping algorithm
 * @returns A function compatible with LangTagCLIConfig.import.onImport
 * 
 * @example
 * ```typescript
 * import { simpleMappingImportAlgorithm } from '@lang-tag/cli/algorithms';
 * 
 * export default {
 *   import: {
 *     onImport: simpleMappingImportAlgorithm({
 *       mappings: [
 *         {
 *           packageName: '@company/ui-components',
 *           files: [
 *             {
 *               sourceFile: 'components/button.ts',
 *               targetFile: 'ui/buttons.ts',
 *               variables: {
 *                 'primaryButton': 'button',
 *                 'secondaryButton': 'secondary',
 *                 'tertiaryButton': undefined // keep original name
 *               }
 *             },
 *             {
 *               sourceFile: 'components/input.ts',
 *               targetFile: 'ui/inputs.ts',
 *               variables: {
 *                 'textInput': 'input',
 *                 'passwordInput': 'password'
 *               }
 *             }
 *           ]
 *         },
 *         {
 *           packageName: '@company/utils',
 *           files: [
 *             {
 *               sourceFile: 'helpers.ts',
 *               targetFile: 'utils/helpers.ts',
 *               variables: {
 *                 'formatDate': undefined,
 *                 'formatCurrency': 'currency'
 *               }
 *             }
 *           ]
 *         }
 *       ]
 *     })
 *   }
 * };
 * ```
 */
export function simpleMappingImportAlgorithm(
    options: SimpleMappingImportAlgorithmOptions
): (event: LangTagCLIImportEvent) => void {
    const { mappings, configRemap } = options;

    const packageMap = new Map<string, PackageMapping>();
    const fileMap = new Map<string, Map<string, FileMapping>>();

    for (const mapping of mappings) {
        packageMap.set(mapping.packageName, mapping);
        const files = new Map<string, FileMapping>();
        for (const file of mapping.files) {
            files.set(file.sourceFile, file);
        }
        fileMap.set(mapping.packageName, files);
    }

    return (event: LangTagCLIImportEvent) => {
        const { exports, importManager, logger } = event;
        
        for (const { packageJSON, exportData } of exports) {
            const packageName = packageJSON.name || 'unknown-package';
        
            const packageMapping = packageMap.get(packageName);
            if (!packageMapping) {
                logger.debug(`Skipping unmapped package: ${packageName}`);
                continue;
            }

            logger.debug(`Processing mapped package: ${packageName}`);

            for (const file of exportData.files) {
                const sourceFile = file.relativeFilePath;
                
                const packageFiles = fileMap.get(packageName);
                if (!packageFiles) continue;
                
                const fileMapping = packageFiles.get(sourceFile);
                if (!fileMapping) {
                    logger.debug(`Skipping unmapped file: ${packageName}/${sourceFile}`);
                    continue;
                }

                logger.debug(`Processing mapped file: ${packageName}/${sourceFile} -> ${fileMapping.targetFile}`);

                for (const tag of file.tags) {
                    const originalVariableName = tag.variableName;
                    
                    if (!originalVariableName || !(originalVariableName in fileMapping.variables)) {
                        logger.debug(`Skipping unmapped variable: ${originalVariableName} in ${packageName}/${sourceFile}`);
                        continue;
                    }

                    const newVariableName = fileMapping.variables[originalVariableName] || originalVariableName;

                    const targetFilePath = fileMapping.targetFile;

                    let finalConfig = tag.config;
                    if (configRemap) {
                        finalConfig = configRemap(tag.config, {
                            packageName,
                            sourceFile,
                            targetFile: targetFilePath,
                            variableName: newVariableName,
                            originalVariableName
                        });
                    }

                    importManager.importTag(targetFilePath, {
                        variableName: newVariableName,
                        translations: tag.translations,
                        config: finalConfig
                    });

                    logger.debug(`Imported: ${originalVariableName} -> ${newVariableName} in ${targetFilePath}`);
                }
            }
        }
    };
}

