/**
 * Predefined algorithms for onImport hook.
 * 
 * These algorithms customize how library translations are imported
 * and organized in your project.
 */

export { 
    flexibleImportAlgorithm,
    type FlexibleImportAlgorithmOptions,
    type FilePathCaseType,
    type VariableNameCaseType
} from './flexible-import-algorithm.ts';

export {
    simpleMappingImportAlgorithm,
    type SimpleMappingImportAlgorithmOptions,
    type PackageMapping,
    type FileMapping
} from './simple-mapping-import-algorithm.ts';

