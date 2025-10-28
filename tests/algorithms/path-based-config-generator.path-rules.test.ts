import { describe, expect, it, vi } from 'vitest';

import { pathBasedConfigGenerator } from '@/algorithms';
import { LangTagCLIConfigGenerationEvent } from '@/type';

const TRIGGER_NAME = 'path-based-config-generator';

// Helper function to create a mock event
function createMockEvent(
    relativePath: string,
    includes: string[] = ['src/**/*.{js,ts,jsx,tsx}'],
    collectDefaultNamespace: string = 'common'
): LangTagCLIConfigGenerationEvent {
    let savedConfig: any = null;

    return {
        absolutePath: `/project/${relativePath}`,
        relativePath,
        isImportedLibrary: false,
        config: undefined,
        langTagConfig: {
            tagName: 'lang',
            includes,
            excludes: [],
            outputDir: 'locales/en',
            collect: {
                defaultNamespace: collectDefaultNamespace,
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
        save: vi.fn((config: any) => {
            savedConfig = config;
        }),
        get savedConfig() {
            return savedConfig;
        },
    } as any;
}

describe('pathBasedConfigGenerator - pathRules', () => {
    describe('Validation', () => {
        it('should throw error when both pathRules and ignoreStructured are used', () => {
            expect(() => {
                pathBasedConfigGenerator({
                    pathRules: {
                        app: {
                            dashboard: false,
                        },
                    },
                    ignoreStructured: {
                        src: {
                            features: true,
                        },
                    },
                });
            }).toThrow('Cannot use both "pathRules" and "ignoreStructured"');
        });

        it('should not throw when only pathRules is used', () => {
            expect(() => {
                pathBasedConfigGenerator({
                    pathRules: {
                        app: {
                            dashboard: false,
                        },
                    },
                });
            }).not.toThrow();
        });

        it('should not throw when only ignoreStructured is used', () => {
            expect(() => {
                pathBasedConfigGenerator({
                    ignoreStructured: {
                        src: {
                            features: true,
                        },
                    },
                });
            }).not.toThrow();
        });

        it('should not throw when both are empty', () => {
            expect(() => {
                pathBasedConfigGenerator({
                    pathRules: {},
                    ignoreStructured: {},
                });
            }).not.toThrow();
        });
    });

    describe('Basic _ (ignore) functionality', () => {
        it('should ignore segment when _ is false', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        dashboard: {
                            _: false, // ignore "dashboard"
                        },
                    },
                },
            });

            const event = createMockEvent('app/dashboard/users/List.tsx');
            await generator(event);

            // dashboard is ignored, so: app -> users
            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'users',
                },
                TRIGGER_NAME
            );
        });

        it('should ignore segment and continue with nested rules', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        dashboard: {
                            _: false, // ignore "dashboard"
                            modules: false, // ignore "modules" too
                        },
                    },
                },
            });

            const event = createMockEvent(
                'app/dashboard/modules/advanced/facility/page.tsx'
            );
            await generator(event);

            // dashboard and modules ignored: app -> advanced -> facility
            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'advanced.facility',
                },
                TRIGGER_NAME
            );
        });

        it('should work with ignoreIncludesRootDirectories', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
                pathRules: {
                    app: {
                        dashboard: {
                            _: false,
                            modules: false,
                        },
                    },
                },
            });

            const event = createMockEvent(
                'app/dashboard/modules/advanced/facility/page.tsx',
                ['app/**/*.tsx']
            );
            await generator(event);

            // app removed by ignoreIncludesRootDirectories, then dashboard and modules ignored
            // Result: advanced -> facility
            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'advanced',
                    path: 'facility',
                },
                TRIGGER_NAME
            );
        });
    });

    describe('Basic > (rename) functionality', () => {
        it('should rename segment using >', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        admin: {
                            '>': 'management',
                        },
                    },
                },
            });

            const event = createMockEvent('app/admin/users/List.tsx');
            await generator(event);

            // admin renamed to management: app -> management -> users
            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'management.users',
                },
                TRIGGER_NAME
            );
        });

        it('should rename and continue with nested rules', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        admin: {
                            '>': 'management',
                            users: 'people', // rename users to people
                        },
                    },
                },
            });

            const event = createMockEvent('app/admin/users/profile/edit.tsx');
            await generator(event);

            // admin -> management, users -> people
            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'management.people.profile',
                },
                TRIGGER_NAME
            );
        });
    });

    describe('Combined _ and > usage', () => {
        it('should ignore one segment and rename another', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        dashboard: {
                            _: false, // ignore dashboard
                            '>': 'panel', // this won't apply since _ ignores it
                            admin: 'mgmt', // rename admin
                        },
                    },
                },
            });

            const event = createMockEvent('app/dashboard/admin/users.tsx');
            await generator(event);

            // dashboard ignored, admin renamed to mgmt
            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'mgmt',
                },
                TRIGGER_NAME
            );
        });

        it('should rename parent and ignore child', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    src: {
                        features: {
                            '>': 'modules',
                            auth: false, // ignore auth
                        },
                    },
                },
            });

            const event = createMockEvent('src/features/auth/login/page.tsx');
            await generator(event);

            // features renamed to modules, auth ignored
            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'src',
                    path: 'modules.login',
                },
                TRIGGER_NAME
            );
        });
    });

    describe('String shorthand for renaming', () => {
        it('should rename using string value directly', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        dashboard: 'panel', // shorthand for rename
                    },
                },
            });

            const event = createMockEvent('app/dashboard/users/List.tsx');
            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'panel.users',
                },
                TRIGGER_NAME
            );
        });

        it('should work with nested string renames', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        dashboard: {
                            '>': 'panel',
                            modules: 'features',
                            views: 'pages',
                        },
                    },
                },
            });

            const event1 = createMockEvent('app/dashboard/modules/auth.tsx');
            await generator(event1);
            expect(event1.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'panel.features',
                },
                TRIGGER_NAME
            );

            const event2 = createMockEvent('app/dashboard/views/home.tsx');
            await generator(event2);
            expect(event2.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'panel.pages',
                },
                TRIGGER_NAME
            );
        });
    });

    describe('Boolean shorthand for ignoring', () => {
        it('should ignore using false value directly', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        dashboard: false, // shorthand for ignore
                    },
                },
            });

            const event = createMockEvent('app/dashboard/users/List.tsx');
            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'users',
                },
                TRIGGER_NAME
            );
        });

        it('should ignore using true value', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        temp: true, // ignore (like ignoreStructured)
                    },
                },
            });

            const event = createMockEvent('app/temp/users/List.tsx');
            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'users',
                },
                TRIGGER_NAME
            );
        });
    });

    describe('Case transformations with pathRules', () => {
        it('should apply case transformations after renaming', async () => {
            const generator = pathBasedConfigGenerator({
                namespaceCase: 'kebab',
                pathCase: 'camel',
                pathRules: {
                    app: {
                        admin_panel: {
                            '>': 'AdminDashboard',
                        },
                    },
                },
            });

            const event = createMockEvent(
                'app/admin_panel/user_management/edit.tsx'
            );
            await generator(event);

            // admin_panel renamed to AdminDashboard, then case transforms apply
            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'adminDashboard.userManagement',
                },
                TRIGGER_NAME
            );
        });

        it('should work with ignoreDirectories and pathRules', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['views'],
                namespaceCase: 'kebab',
                pathCase: 'camel',
                pathRules: {
                    app: {
                        dashboard: {
                            _: false,
                            modules: false,
                        },
                    },
                },
            });

            const event = createMockEvent(
                'app/dashboard/modules/views/UserProfile/edit.tsx'
            );
            await generator(event);

            // dashboard and modules ignored by pathRules, views ignored by ignoreDirectories
            // Result: app (kebab) -> UserProfile (camel)
            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'userProfile',
                },
                TRIGGER_NAME
            );
        });
    });

    describe('Real-world Next.js example', () => {
        it('should handle complex dashboard path from user example', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
                removeBracketedDirectories: true,
                namespaceCase: 'kebab',
                pathCase: 'camel',
                clearOnDefaultNamespace: true,
                ignoreDirectories: ['views'],
                pathRules: {
                    app: {
                        dashboard: {
                            _: false,
                            modules: false,
                        },
                    },
                },
            });

            const event = createMockEvent(
                'app/dashboard/modules/advanced/facility/[id]/edit/page.tsx',
                ['app/**/*.{js,ts,jsx,tsx}'],
                'common'
            );

            await generator(event);

            // Expected transformation:
            // 1. Remove brackets: [id] removed
            // 2. pathRules: dashboard and modules ignored
            // 3. ignoreIncludesRootDirectories: app removed
            // 4. Result: advanced -> facility -> edit
            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'advanced',
                    path: 'facility.edit',
                },
                TRIGGER_NAME
            );
        });

        it('should rename dashboard to panel', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
                pathRules: {
                    app: {
                        dashboard: {
                            '>': 'panel',
                            modules: false,
                        },
                    },
                },
            });

            const event = createMockEvent(
                'app/dashboard/modules/users/list.tsx',
                ['app/**/*.tsx']
            );

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'panel',
                    path: 'users',
                },
                TRIGGER_NAME
            );
        });
    });

    describe('Edge cases', () => {
        it('should handle empty pathRules object', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {},
            });

            const event = createMockEvent('app/dashboard/users/List.tsx');
            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'dashboard.users',
                },
                TRIGGER_NAME
            );
        });

        it('should handle pathRules with no matching segments', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    src: {
                        features: false,
                    },
                },
            });

            const event = createMockEvent('app/dashboard/users/List.tsx');
            await generator(event);

            // No rules match, so path remains unchanged
            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'dashboard.users',
                },
                TRIGGER_NAME
            );
        });

        it('should handle all segments being ignored', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: false,
                },
                fallbackNamespace: 'common',
                clearOnDefaultNamespace: false,
            });

            const event = createMockEvent(
                'app/Button.tsx',
                ['app/**/*.tsx'],
                'default'
            );
            await generator(event);

            // app ignored, fallback to common
            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'common',
                },
                TRIGGER_NAME
            );
        });

        it('should preserve custom config properties', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        dashboard: {
                            _: false,
                        },
                    },
                },
            });

            const event = createMockEvent('app/dashboard/users/List.tsx');
            (event as any).config = {
                manual: true,
                customFlag: 'test',
            };

            await generator(event);

            expect(event.save).toHaveBeenCalledWith(
                {
                    namespace: 'app',
                    path: 'users',
                    manual: true,
                    customFlag: 'test',
                },
                TRIGGER_NAME
            );
        });
    });

    describe('Array rules in pathRules', () => {
        it('should support ignore array rules like ignoreStructured', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    src: {
                        features: ['auth', 'admin'],
                    },
                },
            });

            const event1 = createMockEvent('src/features/auth/login.tsx');
            await generator(event1);

            // auth is in the array, so it gets ignored
            expect(event1.save).toHaveBeenCalledWith(
                {
                    namespace: 'src',
                    path: 'features',
                },
                TRIGGER_NAME
            );

            const event2 = createMockEvent('src/features/orders/list.tsx');
            await generator(event2);

            // orders is not in the array, so it remains
            expect(event2.save).toHaveBeenCalledWith(
                {
                    namespace: 'src',
                    path: 'features.orders',
                },
                TRIGGER_NAME
            );
        });
    });
});
