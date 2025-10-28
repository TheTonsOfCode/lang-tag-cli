import { LangTagCLIConfigGenerationEvent } from '@/type';

const TRIGGER_NAME = 'prepend-namespace-to-path';

/**
 * Options for the prependNamespaceToPath algorithm.
 */
export interface PrependNamespaceToPathOptions {}

/**
 * Algorithm that prepends the namespace to the path in translation tag configurations.
 *
 * This is useful when you want to flatten the namespace structure by moving the namespace
 * into the path, effectively removing the namespace separation.
 *
 * @example
 * ```typescript
 * // Before: { namespace: 'common', path: 'hello.world' }
 * // After:  { path: 'common.hello.world' }
 *
 * // Before: { namespace: 'common' }
 * // After:  { path: 'common' }
 *
 * // Before: {}
 * // After:  { path: 'common' }
 * ```
 *
 * @param options Configuration options for the algorithm
 * @returns A function compatible with LangTagCLIConfigGenerationEvent
 */
export function prependNamespaceToPath(
  options: PrependNamespaceToPathOptions = {}
): (event: LangTagCLIConfigGenerationEvent) => Promise<void> {
  return async (event: LangTagCLIConfigGenerationEvent) => {
    const currentConfig = event.savedConfig;
    const { namespace, path } = currentConfig || {};

    const actualNamespace =
      namespace || event.langTagConfig.collect?.defaultNamespace;

    if (!actualNamespace) {
      return;
    }

    let newPath: string;

    if (path) {
      newPath = `${actualNamespace}.${path}`;
    } else {
      newPath = actualNamespace;
    }

    event.save(
      {
        ...(currentConfig || {}),
        path: newPath,
        namespace: undefined,
      },
      TRIGGER_NAME
    );
  };
}
