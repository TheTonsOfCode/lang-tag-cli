import { describe, expect, it, vi } from 'vitest';

import { prependNamespaceToPath } from '@/algorithms';
import { LangTagCLIConfigGenerationEvent } from '@/type';

const TRIGGER_NAME = 'prepend-namespace-to-path';

// Helper function to create a mock event
function createMockEvent(
    config: any = undefined,
    savedConfig: any = undefined,
    defaultNamespace: string = 'common'
): LangTagCLIConfigGenerationEvent {
    let savedConfigValue: any = savedConfig;

    return {
        absolutePath: '/project/src/Component.tsx',
        relativePath: 'src/Component.tsx',
        isImportedLibrary: false,
        config,
        langTagConfig: {
            tagName: 'lang',
            includes: ['src/**/*.{js,ts,jsx,tsx}'],
            excludes: [],
            outputDir: 'locales/en',
            collect: {
                defaultNamespace,
                ignoreConflictsWithMatchingValues: true,
            },
            import: {
                dir: 'src/lang-libraries',
                tagImportPath: 'import { lang } from "@/lang"',
                onImport: () => {},
            },
            translationArgPosition: 1,
            language: 'en',
            isLibrary: false,
            onConfigGeneration: async () => {},
        },
        save: vi.fn((newConfig: any) => {
            savedConfigValue = newConfig;
        }),
        get savedConfig() {
            return savedConfigValue;
        },
        get isSaved() {
            return savedConfigValue !== undefined;
        },
        getCurrentConfig: () => {
            if (savedConfigValue !== undefined && savedConfigValue !== null) {
                return { ...savedConfigValue };
            }
            if (config) {
                return { ...config };
            }
            return {};
        },
    } as any;
}

describe('prependNamespaceToPath', () => {
    describe('Basic functionality', () => {
        it('should prepend namespace to path when both exist', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(undefined, {
                namespace: 'common',
                path: 'hello.world',
            });

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    path: 'common.hello.world',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });

        it('should use namespace as path when no path exists', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(undefined, {
                namespace: 'common',
            });

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    path: 'common',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });

        it('should use defaultNamespace when no namespace in savedConfig', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(
                undefined,
                {
                    path: 'hello.world',
                },
                'default'
            );

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    path: 'default.hello.world',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });

        it('should use defaultNamespace when no savedConfig at all', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(undefined, undefined, 'default');

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    path: 'default',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });
    });

    describe('Working with savedConfig', () => {
        it('should use savedConfig when available', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(undefined, {
                namespace: 'new',
                path: 'new.path',
            });

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    path: 'new.new.path',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });

        it('should not save when savedConfig is null and no defaultNamespace', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(undefined, null, undefined);

            // Override langTagConfig to have no defaultNamespace
            (event as any).langTagConfig.collect = {};

            await generator(event);

            expect(event.save).not.toHaveBeenCalled();
        });

        it('should use defaultNamespace when savedConfig has no namespace', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(
                undefined,
                { path: 'saved.path' },
                'default'
            );

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    path: 'default.saved.path',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });
    });

    describe('Edge cases', () => {
        it('should not save when no namespace available and no defaultNamespace', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(
                undefined,
                {
                    path: 'hello.world',
                },
                undefined
            );

            // Override langTagConfig to have no defaultNamespace
            (event as any).langTagConfig.collect = {};

            await generator(event);

            expect(event.save).not.toHaveBeenCalled();
        });

        it('should handle empty path with namespace', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(undefined, {
                namespace: 'common',
                path: '',
            });

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    path: 'common',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });

        it('should handle undefined path with namespace', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(undefined, {
                namespace: 'common',
            });

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    path: 'common',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });
    });

    describe('Preserving other config properties', () => {
        it('should preserve custom properties from savedConfig', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(undefined, {
                namespace: 'common',
                path: 'hello.world',
                debugMode: true,
                customFlag: 'test',
            });

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    debugMode: true,
                    customFlag: 'test',
                    path: 'common.hello.world',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });

        it('should preserve complex nested properties', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(undefined, {
                namespace: 'common',
                path: 'hello.world',
                settings: {
                    feature: 'enabled',
                    metadata: ['tag1', 'tag2'],
                },
                flags: {
                    debug: true,
                    verbose: false,
                },
            });

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    settings: {
                        feature: 'enabled',
                        metadata: ['tag1', 'tag2'],
                    },
                    flags: {
                        debug: true,
                        verbose: false,
                    },
                    path: 'common.hello.world',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });
    });

    describe('Real-world scenarios', () => {
        it('should handle typical namespace flattening scenario', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(undefined, {
                namespace: 'features',
                path: 'auth.login',
            });

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    path: 'features.auth.login',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });

        it('should handle default namespace scenario', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(
                undefined,
                {
                    path: 'welcome.message',
                },
                'app'
            );

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    path: 'app.welcome.message',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });

        it('should handle namespace-only scenario', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(undefined, {
                namespace: 'common',
            });

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    path: 'common',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });

        it('should handle complex savedConfig scenario', async () => {
            const generator = prependNamespaceToPath();
            const event = createMockEvent(undefined, {
                namespace: 'dashboard',
                path: 'users.list',
                theme: 'dark',
                permissions: ['read', 'write'],
            });

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    theme: 'dark',
                    permissions: ['read', 'write'],
                    path: 'dashboard.users.list',
                    namespace: undefined,
                },
                TRIGGER_NAME
            );
        });
    });
});
