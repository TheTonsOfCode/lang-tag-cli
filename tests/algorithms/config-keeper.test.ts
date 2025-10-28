import { LangTagTranslationsConfig } from 'lang-tag';
import { describe, expect, it } from 'vitest';

import { configKeeper } from '@/algorithms/config-generation/config-keeper';
import { LangTagCLIConfigGenerationEvent } from '@/type';

describe('configKeeper', () => {
    const createMockEvent = (
        originalConfig: any,
        isSaved: boolean = false,
        savedConfig: any = undefined
    ): LangTagCLIConfigGenerationEvent => {
        let currentSavedConfig = savedConfig;
        let currentIsSaved = isSaved;

        return {
            absolutePath: '/test/file.tsx',
            relativePath: 'src/test/file.tsx',
            isImportedLibrary: false,
            logger: {
                info: () => {},
                success: () => {},
                warn: () => {},
                error: () => {},
                debug: () => {},
                conflict: async () => {},
            },
            config: originalConfig,
            langTagConfig: {} as any,
            isSaved: currentIsSaved,
            savedConfig: currentSavedConfig,
            save: (config: LangTagTranslationsConfig | null) => {
                currentSavedConfig = config;
                currentIsSaved = true;
            },
        };
    };

    describe('when save was not called (isSaved = false)', () => {
        it('should not do anything', async () => {
            const keeper = configKeeper();
            const event = createMockEvent(
                { namespace: 'common', path: 'button', keep: 'namespace' },
                false
            );

            let saveCalled = false;
            event.save = () => {
                saveCalled = true;
            };

            await keeper(event);

            expect(saveCalled).toBe(false);
        });
    });

    describe('when original config is undefined', () => {
        it('should not do anything', async () => {
            const keeper = configKeeper();
            const event = createMockEvent(undefined, true, {
                namespace: 'new',
            });

            let saveCalled = false;
            event.save = () => {
                saveCalled = true;
            };

            await keeper(event);

            expect(saveCalled).toBe(false);
        });
    });

    describe('when keep property is not present', () => {
        it('should not do anything', async () => {
            const keeper = configKeeper();
            const event = createMockEvent(
                { namespace: 'common', path: 'button' },
                true,
                { namespace: 'new', path: 'new.path' }
            );

            let saveCalled = false;
            event.save = () => {
                saveCalled = true;
            };

            await keeper(event);

            expect(saveCalled).toBe(false);
        });
    });

    describe('when keep = "namespace"', () => {
        it('should restore original namespace but keep new path', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'namespace' },
                true,
                { namespace: 'modified', path: 'new.path' }
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'new.path',
                keep: 'namespace',
            });
        });

        it('should restore namespace even if it was removed', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'namespace' },
                true,
                { path: 'new.path' } // namespace removed
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'new.path',
                keep: 'namespace',
            });
        });
    });

    describe('when keep = "path"', () => {
        it('should restore original path but keep new namespace', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'path' },
                true,
                { namespace: 'modified', path: 'new.path' }
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'modified',
                path: 'old.path',
                keep: 'path',
            });
        });

        it('should restore path even if it was removed', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'path' },
                true,
                { namespace: 'new' } // path removed
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'new',
                path: 'old.path',
                keep: 'path',
            });
        });
    });

    describe('when keep = "both"', () => {
        it('should restore both namespace and path', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'both' },
                true,
                { namespace: 'modified', path: 'new.path' }
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'old.path',
                keep: 'both',
            });
        });

        it('should restore both even if they were removed', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'both' },
                true,
                { someOtherProp: 'value' } // both removed
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'old.path',
                keep: 'both',
                someOtherProp: 'value',
            });
        });
    });

    describe('when savedConfig is null (config removal)', () => {
        it('should restore values according to keep mode and preserve other properties', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                {
                    namespace: 'original',
                    path: 'old.path',
                    keep: 'both',
                    manual: true,
                    someOther: 'value',
                },
                true,
                null // algorithm tried to remove config
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'old.path',
                keep: 'both',
                manual: true,
                someOther: 'value',
            });
        });

        it('should restore only namespace when keep is "namespace" and config was null', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                {
                    namespace: 'original',
                    path: 'old.path',
                    keep: 'namespace',
                    extra: 'prop',
                },
                true,
                null
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            // Should have namespace and other props, but NOT path
            expect(finalConfig).toEqual({
                namespace: 'original',
                keep: 'namespace',
                extra: 'prop',
            });
            expect(finalConfig.path).toBeUndefined();
        });

        it('should restore only path when keep is "path" and config was null', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                {
                    namespace: 'original',
                    path: 'old.path',
                    keep: 'path',
                    extra: 'prop',
                },
                true,
                null
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            // Should have path and other props, but NOT namespace
            expect(finalConfig).toEqual({
                path: 'old.path',
                keep: 'path',
                extra: 'prop',
            });
            expect(finalConfig.namespace).toBeUndefined();
        });

        it('should preserve all other properties except namespace and path when both are not kept', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                {
                    namespace: 'original',
                    path: 'old.path',
                    keep: 'namespace',
                    manual: true,
                    custom: 'value',
                },
                true,
                null
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig.manual).toBe(true);
            expect(finalConfig.custom).toBe('value');
            expect(finalConfig.keep).toBe('namespace');
            expect(finalConfig.namespace).toBe('original');
            expect(finalConfig.path).toBeUndefined();
        });
    });

    describe('with custom property name', () => {
        it('should use custom property name instead of "keep"', async () => {
            const keeper = configKeeper({ propertyName: 'keepOnGeneration' });
            let finalConfig: any = null;

            const event = createMockEvent(
                {
                    namespace: 'original',
                    path: 'old.path',
                    keepOnGeneration: 'namespace',
                },
                true,
                { namespace: 'modified', path: 'new.path' }
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'new.path',
                keepOnGeneration: 'namespace',
            });
        });

        it('should not respond to default "keep" property', async () => {
            const keeper = configKeeper({ propertyName: 'keepOnGeneration' });
            let saveCalled = false;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'namespace' },
                true,
                { namespace: 'modified', path: 'new.path' }
            );

            event.save = () => {
                saveCalled = true;
            };

            await keeper(event);

            expect(saveCalled).toBe(false);
        });
    });

    describe('integration with path-based algorithm', () => {
        it('should work after path-based algorithm modifies config', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            // Simulate that path-based algorithm already ran and saved a config
            const event = createMockEvent(
                { namespace: 'manual', path: 'my.button', keep: 'namespace' },
                true,
                { namespace: 'components', path: 'button' } // modified by path algorithm
            );

            event.save = (config) => {
                finalConfig = config;
            };

            // Keeper restores the namespace
            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'manual',
                path: 'button',
                keep: 'namespace',
            });
        });
    });

    describe('optimization - skip save when values are already correct', () => {
        it('should save when keep property did not exist before (adding new property)', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'namespace' },
                true,
                { namespace: 'original', path: 'new.path' } // namespace already matches, but 'keep' doesn't exist
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            // Should save because we're adding the 'keep' property
            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'new.path',
                keep: 'namespace',
            });
        });

        it('should NOT save when keep="namespace" and namespace is already correct', async () => {
            const keeper = configKeeper();
            let saveCalled = false;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'namespace' },
                true,
                { namespace: 'original', path: 'new.path', keep: 'namespace' } // namespace already matches and keep exists!
            );

            event.save = () => {
                saveCalled = true;
            };

            await keeper(event);

            expect(saveCalled).toBe(false);
        });

        it('should NOT save when keep="path" and path is already correct', async () => {
            const keeper = configKeeper();
            let saveCalled = false;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'path' },
                true,
                { namespace: 'modified', path: 'old.path', keep: 'path' } // path already matches and keep exists!
            );

            event.save = () => {
                saveCalled = true;
            };

            await keeper(event);

            expect(saveCalled).toBe(false);
        });

        it('should NOT save when keep="both" and both namespace and path are already correct', async () => {
            const keeper = configKeeper();
            let saveCalled = false;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'both' },
                true,
                { namespace: 'original', path: 'old.path', keep: 'both' } // both already match and keep exists!
            );

            event.save = () => {
                saveCalled = true;
            };

            await keeper(event);

            expect(saveCalled).toBe(false);
        });

        it('should save when keep="both" and only namespace matches (path different)', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'both' },
                true,
                { namespace: 'original', path: 'new.path' } // namespace matches, path doesn't
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'old.path',
                keep: 'both',
            });
        });

        it('should save when keep="both" and only path matches (namespace different)', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'both' },
                true,
                { namespace: 'modified', path: 'old.path' } // path matches, namespace doesn't
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'old.path',
                keep: 'both',
            });
        });

        it('should save when keep="namespace" and savedConfig has different namespace', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'namespace' },
                true,
                { namespace: 'modified', path: 'new.path' } // namespace different
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'new.path',
                keep: 'namespace',
            });
        });

        it('should save when keep="path" and savedConfig has different path', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'path' },
                true,
                { namespace: 'modified', path: 'new.path' } // path different
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'modified',
                path: 'old.path',
                keep: 'path',
            });
        });
    });

    describe('keepPropertyAtEnd option', () => {
        it('should place keep property at the end of config by default', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'namespace' },
                true,
                { namespace: 'modified', path: 'new.path' }
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            const keys = Object.keys(finalConfig);
            expect(keys).toEqual(['namespace', 'path', 'keep']);
            expect(keys[keys.length - 1]).toBe('keep');
        });

        it('should place keep property at the end even with other custom properties', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                {
                    namespace: 'original',
                    path: 'old.path',
                    debugMode: true,
                    manual: false,
                    keep: 'both',
                },
                true,
                {
                    namespace: 'modified',
                    path: 'new.path',
                    debugMode: true,
                    manual: false,
                }
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            const keys = Object.keys(finalConfig);
            expect(keys).toEqual([
                'namespace',
                'path',
                'debugMode',
                'manual',
                'keep',
            ]);
            expect(keys[keys.length - 1]).toBe('keep');
        });

        it('should not reorder properties when keepPropertyAtEnd is false', async () => {
            const keeper = configKeeper({ keepPropertyAtEnd: false });
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'namespace' },
                true,
                { namespace: 'modified', path: 'new.path' }
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            // The keep property is added but order is not guaranteed
            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'new.path',
                keep: 'namespace',
            });
        });

        it('should place custom property name at the end when keepPropertyAtEnd is true', async () => {
            const keeper = configKeeper({
                propertyName: 'keepOnGeneration',
                keepPropertyAtEnd: true,
            });
            let finalConfig: any = null;

            const event = createMockEvent(
                {
                    namespace: 'original',
                    path: 'old.path',
                    keepOnGeneration: 'namespace',
                },
                true,
                { namespace: 'modified', path: 'new.path' }
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            const keys = Object.keys(finalConfig);
            expect(keys).toEqual(['namespace', 'path', 'keepOnGeneration']);
            expect(keys[keys.length - 1]).toBe('keepOnGeneration');
        });

        it('should preserve property order and place keep at end with complex nested objects', async () => {
            const keeper = configKeeper({ keepPropertyAtEnd: true });
            let finalConfig: any = null;

            const event = createMockEvent(
                {
                    namespace: 'original',
                    path: 'old.path',
                    settings: { debug: true, verbose: false },
                    metadata: { version: '1.0' },
                    keep: 'both',
                },
                true,
                {
                    namespace: 'modified',
                    path: 'new.path',
                    settings: { debug: true, verbose: false },
                    metadata: { version: '1.0' },
                }
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            const keys = Object.keys(finalConfig);
            expect(keys).toEqual([
                'namespace',
                'path',
                'settings',
                'metadata',
                'keep',
            ]);
            expect(keys[keys.length - 1]).toBe('keep');
        });

        it('should move keep to end even when no other changes are needed', async () => {
            const keeper = configKeeper({ keepPropertyAtEnd: true });
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', keep: 'namespace', path: 'old.path' }, // keep is in the middle!
                true,
                { namespace: 'original', keep: 'namespace', path: 'new.path' } // keep still in middle
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            // Should save to move keep to the end
            const keys = Object.keys(finalConfig);
            expect(keys).toEqual(['namespace', 'path', 'keep']);
            expect(keys[keys.length - 1]).toBe('keep');
            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'new.path',
                keep: 'namespace',
            });
        });

        it('should NOT save when keep is already at end and no other changes needed', async () => {
            const keeper = configKeeper({ keepPropertyAtEnd: true });
            let saveCalled = false;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'namespace' }, // keep already at end
                true,
                { namespace: 'original', path: 'new.path', keep: 'namespace' } // keep already at end
            );

            event.save = () => {
                saveCalled = true;
            };

            await keeper(event);

            // Should NOT save because keep is already at the end and namespace is correct
            expect(saveCalled).toBe(false);
        });

        it('should place keep at end when savedConfig was null', async () => {
            const keeper = configKeeper({ keepPropertyAtEnd: true });
            let finalConfig: any = null;

            const event = createMockEvent(
                {
                    namespace: 'original',
                    path: 'old.path',
                    manual: true,
                    keep: 'both',
                },
                true,
                null
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            // When savedConfig is null, we copy event.config and preserve its property order
            // but 'keep' should still be at the end
            const keys = Object.keys(finalConfig);
            expect(keys[keys.length - 1]).toBe('keep');
            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'old.path',
                manual: true,
                keep: 'both',
            });
        });
    });

    describe('edge cases', () => {
        it('should handle invalid keep values gracefully', async () => {
            const keeper = configKeeper();
            let saveCalled = false;

            const event = createMockEvent(
                { namespace: 'original', keep: 'invalid-value' as any },
                true,
                { namespace: 'modified' }
            );

            event.save = () => {
                saveCalled = true;
            };

            await keeper(event);

            expect(saveCalled).toBe(false);
        });

        it('should handle empty savedConfig object', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            const event = createMockEvent(
                { namespace: 'original', path: 'old.path', keep: 'both' },
                true,
                {}
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'old.path',
                keep: 'both',
            });
        });

        it('should only restore values that existed in original config', async () => {
            const keeper = configKeeper();
            let finalConfig: any = null;

            // Original config has only namespace, no path
            const event = createMockEvent(
                { namespace: 'original', keep: 'both' },
                true,
                { namespace: 'modified', path: 'new.path' }
            );

            event.save = (config) => {
                finalConfig = config;
            };

            await keeper(event);

            // Should restore namespace but not add path since it didn't exist originally
            expect(finalConfig).toEqual({
                namespace: 'original',
                path: 'new.path',
                keep: 'both',
            });
        });
    });
});
