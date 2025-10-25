/**
 * Predefined algorithms for onConfigGeneration hook.
 * 
 * These algorithms customize how translation tag configurations are generated
 * during collection and regeneration.
 */

export { pathBasedConfigGenerator, type PathBasedConfigGeneratorOptions } from './path-based-config-generator.ts';
export { configKeeper, type ConfigKeeperOptions, type ConfigKeeperMode } from './config-keeper.ts';
export { prependNamespaceToPath, type PrependNamespaceToPathOptions } from './prepend-namespace-to-path.ts';

