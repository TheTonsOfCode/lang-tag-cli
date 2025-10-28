import { LangTagCLIConfigGenerationEvent } from '@/type';

const TRIGGER_NAME = 'config-keeper';

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

  /**
   * When true, ensures the keep property is always placed at the end of the configuration object.
   * This improves readability by keeping metadata properties separate from core config.
   * @default true
   * @example
   * ```tsx
   * // With keepPropertyAtEnd: true
   * { namespace: 'common', path: 'button', keep: 'namespace' }
   *
   * // With keepPropertyAtEnd: false
   * // Order is not guaranteed
   * ```
   */
  keepPropertyAtEnd?: boolean;
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
  const keepPropertyAtEnd = options.keepPropertyAtEnd ?? true;

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
    const keepMode = (event.config as any)[propertyName] as
      | ConfigKeeperMode
      | undefined;

    if (!keepMode) {
      return;
    }

    // Validate keep mode
    if (
      keepMode !== 'namespace' &&
      keepMode !== 'path' &&
      keepMode !== 'both'
    ) {
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
    let needsSave = false;

    // Helper function to check and restore a property if needed
    const restorePropertyIfNeeded = (propertyKey: 'namespace' | 'path') => {
      if (!event.config) return;

      const shouldRestore =
        (keepMode === propertyKey || keepMode === 'both') &&
        event.config[propertyKey] !== undefined;

      if (
        shouldRestore &&
        restoredConfig[propertyKey] !== event.config[propertyKey]
      ) {
        restoredConfig[propertyKey] = event.config[propertyKey];
        needsSave = true;
      }
    };

    // Restore namespace and path if needed
    restorePropertyIfNeeded('namespace');
    restorePropertyIfNeeded('path');

    // Check if 'keep' property didn't exist before - we need to save to add it
    const keepPropertyExistedBefore =
      event.savedConfig &&
      (event.savedConfig as any)[propertyName] !== undefined;
    if (!keepPropertyExistedBefore) {
      needsSave = true;
    }

    // Check if keep property needs to be moved to the end
    if (keepPropertyAtEnd && event.savedConfig && !needsSave) {
      const savedKeys = Object.keys(event.savedConfig);
      const keepIndex = savedKeys.indexOf(propertyName);
      const isKeepAtEnd = keepIndex === savedKeys.length - 1;

      if (!isKeepAtEnd && keepIndex !== -1) {
        // Keep property exists but is not at the end
        needsSave = true;
      }
    }

    // Only save if something actually changed
    if (!needsSave) {
      return;
    }

    // Copy all properties from restored config
    const finalConfig: any = { ...restoredConfig };

    // If keepPropertyAtEnd is enabled, remove the keep property first
    if (keepPropertyAtEnd) {
      delete finalConfig[propertyName];
    }

    // Add keep property (will be at the end if we deleted it first)
    finalConfig[propertyName] = keepMode;

    // Save the restored config
    event.save(finalConfig, TRIGGER_NAME);
  };
}
