import { LangTagCLIConfigGenerationEvent } from "@/config.ts";

const TRIGGER_NAME = "config-keeper";

export type ConfigKeeperMode = 'namespace' | 'path' | 'both';

export interface ConfigKeeperOptions {
    /**
     * The name of the property in the tag configuration that indicates what should be kept.
     * @default 'keep'
     * @example
     * ```tsx
     * lang({ click: "Click" }, { namespace: 'common', path: 'button', keep: 'namespace' })
     * ```
     */
    propertyName?: string;
}

/**
 * Creates a config keeper algorithm that preserves original configuration values
 * when they are marked to be kept using a special property (default: 'keep').
 * 
 * This algorithm should be applied AFTER other generation algorithms to prevent
 * them from overwriting values that should be preserved.
 * 
 * @example
 * ```ts
 * const pathAlgorithm = pathBasedConfigGenerator({ ... });
 * const keeper = configKeeper();
 * 
 * onConfigGeneration: async (event) => {
 *   // First, apply path-based generation
 *   await pathAlgorithm(event);
 *   
 *   // Then, restore any values marked to be kept
 *   await keeper(event);
 * }
 * ```
 * 
 * @example Usage in tag:
 * ```tsx
 * // This will keep the namespace even if path-based algorithm tries to change it
 * lang({ click: "Click" }, { namespace: 'common', path: 'button', keep: 'namespace' })
 * 
 * // This will keep the path even if path-based algorithm tries to change it
 * lang({ click: "Click" }, { namespace: 'common', path: 'old.path', keep: 'path' })
 * 
 * // This will keep both namespace and path
 * lang({ click: "Click" }, { namespace: 'common', path: 'button', keep: 'both' })
 * ```
 */
export function configKeeper(
    options: ConfigKeeperOptions = {}
): (event: LangTagCLIConfigGenerationEvent) => Promise<void> {
    const propertyName = options.propertyName ?? 'keep';

    return async (event: LangTagCLIConfigGenerationEvent) => {
        // Only proceed if save() was called by a previous algorithm
        if (!event.isSaved) {
            return;
        }

        // Only proceed if we have an original config
        if (!event.config) {
            return;
        }

        // Check if the original config has the keep property
        const keepMode = (event.config as any)[propertyName] as ConfigKeeperMode | undefined;
        
        if (!keepMode) {
            return;
        }

        // Validate keep mode
        if (keepMode !== 'namespace' && keepMode !== 'path' && keepMode !== 'both') {
            return;
        }

        // Get the saved config - if null, start from old config without namespace and path
        let restoredConfig: any;
        
        if (event.savedConfig === null) {
            // Algorithm wanted to remove config, so start from original but without namespace/path
            restoredConfig = { ...event.config };
            delete restoredConfig.namespace;
            delete restoredConfig.path;
        } else {
            // Use what was saved by the algorithm
            restoredConfig = { ...event.savedConfig };
        }

        // Track if any changes are needed
        // If 'keep' property didn't exist before, we need to save to add it
        const keepPropertyExistedBefore = event.savedConfig && (event.savedConfig as any)[propertyName] !== undefined;
        let needsSave = !keepPropertyExistedBefore;

        // Restore namespace if needed (only if it's different from what's already there)
        if ((keepMode === 'namespace' || keepMode === 'both') && event.config.namespace !== undefined) {
            if (restoredConfig.namespace !== event.config.namespace) {
                restoredConfig.namespace = event.config.namespace;
                needsSave = true;
            }
        }

        // Restore path if needed (only if it's different from what's already there)
        if ((keepMode === 'path' || keepMode === 'both') && event.config.path !== undefined) {
            if (restoredConfig.path !== event.config.path) {
                restoredConfig.path = event.config.path;
                needsSave = true;
            }
        }

        // Only save if something actually changed
        if (!needsSave) {
            return;
        }

        // Preserve the keep property itself
        restoredConfig[propertyName] = keepMode;

        // Save the restored config
        event.save(restoredConfig, TRIGGER_NAME);
    };
}

