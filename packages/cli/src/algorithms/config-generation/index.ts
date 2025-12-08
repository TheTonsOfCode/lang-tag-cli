/**
 * Predefined algorithms for onConfigGeneration hook.
 *
 * These algorithms customize how translation tag configurations are generated
 * during collection and regeneration.
 */

export {
    pathBasedConfigGenerator,
    type PathBasedConfigGeneratorOptions,
} from './path-based-config-generator';
export {
    configKeeper,
    type ConfigKeeperOptions,
    type ConfigKeeperMode,
} from './config-keeper';
export {
    prependNamespaceToPath,
    type PrependNamespaceToPathOptions,
} from './prepend-namespace-to-path';
