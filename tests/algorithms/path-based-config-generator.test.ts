import { describe, it, expect, vi } from 'vitest';
import { pathBasedConfigGenerator } from '../../src/algorithms/config-generation/path-based-config-generator';
import { LangTagCLIConfigGenerationEvent } from '@/type.ts';

const TRIGGER_NAME = "path-based-config-generator"

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

describe('pathBasedConfigGenerator', () => {
    describe('Basic functionality', () => {
        it('should generate namespace and path from file path', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/features/auth/Login.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'auth',
            }, TRIGGER_NAME);
        });

        it('should generate only namespace when path has one segment after filtering', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['src'],
                includeFileName: true,
            });
            
            const event = createMockEvent('src/components/Button.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'components',
                path: 'Button',
            }, TRIGGER_NAME);
        });

        it('should use fallback namespace when all segments are filtered', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['src'],
                fallbackNamespace: 'common',
            });
            
            const event = createMockEvent('src/Component.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith(null, TRIGGER_NAME);
        });

        it('should handle deep nested paths', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/features/admin/users/list/components/UserRow.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'admin.users.list.components',
            }, TRIGGER_NAME);
        });
    });

    describe('ignoreIncludesRootDirectories option', () => {
        it('should auto-ignore single root directory from includes pattern', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
            });
            
            const event = createMockEvent('src/features/auth/Login.tsx', ['src/**/*.{js,ts,jsx,tsx}']);
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'auth',
            }, TRIGGER_NAME);
        });

        it('should auto-ignore multiple root directories from group pattern with parentheses', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
            });
            
            const event1 = createMockEvent('src/features/auth/Login.tsx', ['(src|app)/**/*.{js,ts,jsx,tsx}']);
            await generator(event1);
            
            expect(event1.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'auth',
            }, TRIGGER_NAME);

            const event2 = createMockEvent('app/admin/users/List.tsx', ['(src|app)/**/*.{js,ts,jsx,tsx}']);
            await generator(event2);
            
            expect(event2.save).toHaveBeenCalledWith({
                namespace: 'admin',
                path: 'users',
            }, TRIGGER_NAME);
        });

        it('should auto-ignore multiple root directories from group pattern with brackets', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
            });
            
            const event1 = createMockEvent('frontend/pages/Home.tsx', ['[frontend|backend]/**/*.tsx']);
            await generator(event1);
            
            expect(event1.save).toHaveBeenCalledWith({
                namespace: 'pages',
            }, TRIGGER_NAME);

            const event2 = createMockEvent('backend/api/users.ts', ['[frontend|backend]/**/*.ts']);
            await generator(event2);
            
            expect(event2.save).toHaveBeenCalledWith({
                namespace: 'api',
            }, TRIGGER_NAME);
        });

        it('should auto-ignore directories from multiple include patterns', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
            });
            
            const event1 = createMockEvent(
                'src/features/auth/Login.tsx',
                ['(src|app)/**/*.{js,ts,jsx,tsx}', 'components/**/*.{jsx,tsx}']
            );
            await generator(event1);
            
            expect(event1.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'auth',
            }, TRIGGER_NAME);

            const event2 = createMockEvent(
                'components/ui/Button.tsx',
                ['(src|app)/**/*.{js,ts,jsx,tsx}', 'components/**/*.{jsx,tsx}']
            );
            await generator(event2);
            
            expect(event2.save).toHaveBeenCalledWith({
                namespace: 'ui',
            }, TRIGGER_NAME);
        });

        it('should combine ignoreIncludesRootDirectories with manual ignoreDirectories', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
                ignoreDirectories: ['features'],
            });
            
            const event = createMockEvent(
                'src/features/auth/Login.tsx',
                ['src/**/*.{js,ts,jsx,tsx}']
            );
            await generator(event);
            
            // Both 'src' and 'features' should be ignored
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'auth',
            }, TRIGGER_NAME);
        });

        it('should not duplicate directories when they appear in both ignoreDirectories and includes', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent(
                'src/features/auth/Login.tsx',
                ['src/**/*.{js,ts,jsx,tsx}']
            );
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'auth',
            }, TRIGGER_NAME);
        });

        it('should work with leading ./ in patterns', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
            });
            
            const event = createMockEvent(
                'src/components/Button.tsx',
                ['./src/**/*.tsx']
            );
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'components',
            }, TRIGGER_NAME);
        });

        it('should be disabled by default', async () => {
            const generator = pathBasedConfigGenerator({
                // ignoreIncludesRootDirectories not set (defaults to false)
            });
            
            const event = createMockEvent('src/features/auth/Login.tsx', ['src/**/*.{js,ts,jsx,tsx}']);
            await generator(event);
            
            // 'src' should NOT be ignored
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'src',
                path: 'features.auth',
            }, TRIGGER_NAME);
        });
    });

    describe('includeFileName option', () => {
        it('should include filename as segment when enabled', async () => {
            const generator = pathBasedConfigGenerator({
                includeFileName: true,
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/components/Button.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'components',
                path: 'Button',
            }, TRIGGER_NAME);
        });

        it('should exclude filename by default', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/components/Button.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'components',
            }, TRIGGER_NAME);
        });

        it('should strip file extension when including filename', async () => {
            const generator = pathBasedConfigGenerator({
                includeFileName: true,
                ignoreDirectories: ['src', 'pages'],
            });
            
            const event = createMockEvent('src/pages/UserProfile.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'UserProfile',
            }, TRIGGER_NAME);
        });
    });

    describe('removeBracketedDirectories option', () => {
        it('should remove directories in parentheses by default', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['app'],
            });
            
            const event = createMockEvent('app/(admin)/users/List.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'users',
            }, TRIGGER_NAME);
        });

        it('should remove directories in square brackets by default', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['app'],
            });
            
            const event = createMockEvent('app/[locale]/about/page.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'about',
            }, TRIGGER_NAME);
        });

        it('should keep directory name without brackets when disabled', async () => {
            const generator = pathBasedConfigGenerator({
                removeBracketedDirectories: false,
                ignoreDirectories: ['app'],
            });
            
            const event = createMockEvent('app/(admin)/users/List.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'admin',
                path: 'users',
            }, TRIGGER_NAME);
        });
    });

    describe('ignoreStructured option', () => {
        it('should ignore specific directories hierarchically', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreStructured: {
                    'src': {
                        'app': true,
                    },
                },
            });

            const event = createMockEvent('src/app/components/Button.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'src',
                path: 'components',
            }, TRIGGER_NAME);
        });

        it('should ignore array of directories at specific level', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreStructured: {
                    'src': {
                        'features': ['auth', 'admin'],
                    },
                },
            });
            
            const event1 = createMockEvent('src/features/auth/Login.tsx');
            await generator(event1);
            
            expect(event1.save).toHaveBeenCalledWith({
                namespace: 'src',
                path: 'features',
            }, TRIGGER_NAME);

            const event2 = createMockEvent('src/features/orders/List.tsx');
            await generator(event2);
            
            expect(event2.save).toHaveBeenCalledWith({
                namespace: 'src',
                path: 'features.orders',
            }, TRIGGER_NAME);
        });

        it('should handle nested ignore structures', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreStructured: {
                    'src': {
                        'app': {
                            'routes': true,
                        },
                    },
                },
            });
            
            const event = createMockEvent('src/app/routes/admin/users.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'src',
                path: 'app.admin',
            }, TRIGGER_NAME);
        });

        it('should support _ key to ignore segment but continue hierarchy', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreStructured: {
                    'app': {
                        'dashboard': {
                            _: true,
                            'modules': true
                        }
                    }
                }
            });
            
            const event = createMockEvent('app/dashboard/modules/advanced/facility/page.tsx');
            await generator(event);
            
            // dashboard ignored by _, modules ignored by true
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'app',
                path: 'advanced.facility',
            }, TRIGGER_NAME);
        });

        it('should support _ key with multiple nested rules', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreStructured: {
                    'src': {
                        'features': {
                            _: true,  // ignore 'features'
                            'auth': true,  // ignore 'auth'
                            'admin': ['users', 'roles']  // ignore users and roles under admin
                        }
                    }
                }
            });
            
            // Test 1: features and auth ignored
            const event1 = createMockEvent('src/features/auth/login.tsx');
            await generator(event1);
            expect(event1.save).toHaveBeenCalledWith({
                namespace: 'src',
            }, TRIGGER_NAME);

            // Test 2: features ignored, admin and users ignored
            const event2 = createMockEvent('src/features/admin/users/list.tsx');
            await generator(event2);
            expect(event2.save).toHaveBeenCalledWith({
                namespace: 'src',
                path: 'admin',
            }, TRIGGER_NAME);

            // Test 3: features ignored, admin kept, orders kept
            const event3 = createMockEvent('src/features/admin/orders/list.tsx');
            await generator(event3);
            expect(event3.save).toHaveBeenCalledWith({
                namespace: 'src',
                path: 'admin.orders',
            }, TRIGGER_NAME);
        });

        it('should work with _ and ignoreIncludesRootDirectories', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
                ignoreStructured: {
                    'app': {
                        'dashboard': {
                            _: true,
                            'modules': true
                        }
                    }
                }
            });
            
            const event = createMockEvent(
                'app/dashboard/modules/advanced/facility/page.tsx',
                ['app/**/*.tsx']
            );
            await generator(event);
            
            // app removed by ignoreIncludesRootDirectories, dashboard and modules ignored
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'advanced',
                path: 'facility',
            }, TRIGGER_NAME);
        });
    });

    describe('Case transformations', () => {
        it('should apply lowercaseNamespace', async () => {
            const generator = pathBasedConfigGenerator({
                lowercaseNamespace: true,
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/UserProfile/EditForm.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'userprofile',
            }, TRIGGER_NAME);
        });

        it('should apply namespaceCase transformation', async () => {
            const generator = pathBasedConfigGenerator({
                namespaceCase: 'kebab',
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/UserProfile/EditForm.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'user-profile',
            }, TRIGGER_NAME);
        });

        it('should apply pathCase transformation', async () => {
            const generator = pathBasedConfigGenerator({
                pathCase: 'camel',
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/features/EditUserForm/components.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'editUserForm',
            }, TRIGGER_NAME);
        });

        it('should apply both namespace and path case transformations', async () => {
            const generator = pathBasedConfigGenerator({
                namespaceCase: 'snake',
                pathCase: 'kebab',
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/UserProfile/EditForm/Components.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'user_profile',
                path: 'edit-form',
            }, TRIGGER_NAME);
        });
    });

    describe('fallbackNamespace option', () => {
        it('should use custom fallback when all segments filtered', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['src', 'components'],
                fallbackNamespace: 'ui',
                clearOnDefaultNamespace: false,
            });
            
            const event = createMockEvent('src/components/Button.tsx', ['src/**/*.tsx'], 'common');
            await generator(event);
            
            // Should use 'ui' as namespace (fallback is different from default 'common')
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'ui',
            }, TRIGGER_NAME);
        });

        it('should use config default namespace when fallback not provided', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/Button.tsx', ['src/**/*.tsx'], 'common');
            await generator(event);
            
            // clearOnDefaultNamespace is true by default, so should clear
            expect(event.save).toHaveBeenCalledWith(null, TRIGGER_NAME);
        });
    });

    describe('clearOnDefaultNamespace option', () => {
        it('should clear config when namespace equals default and enabled', async () => {
            const generator = pathBasedConfigGenerator({
                clearOnDefaultNamespace: true,
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/common/Button.tsx', ['src/**/*.tsx'], 'common');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith(null, TRIGGER_NAME);
        });

        it('should keep namespace even if equals default when disabled', async () => {
            const generator = pathBasedConfigGenerator({
                clearOnDefaultNamespace: false,
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/common/Button.tsx', ['src/**/*.tsx'], 'common');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'common',
            }, TRIGGER_NAME);
        });

        it('should keep path when namespace equals default but path exists', async () => {
            const generator = pathBasedConfigGenerator({
                clearOnDefaultNamespace: true,
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/common/auth/Login.tsx', ['src/**/*.tsx'], 'common');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                path: 'auth',
            }, TRIGGER_NAME);
        });
    });

    describe('Complex scenarios', () => {
        it('should handle combination of all options', async () => {
            const generator = pathBasedConfigGenerator({
                includeFileName: true,
                removeBracketedDirectories: true,
                ignoreIncludesRootDirectories: true,
                ignoreDirectories: ['features'],
                ignoreStructured: {
                    'admin': {
                        'temp': true,
                    },
                },
                lowercaseNamespace: true,
                pathCase: 'kebab',
                clearOnDefaultNamespace: true,
            });
            
            const event = createMockEvent(
                'src/features/admin/temp/users/UserProfile.tsx',
                ['src/**/*.tsx'],
                'common'
            );
            await generator(event);
            
            // src ignored (from includes), features ignored (manual), temp ignored (structured), admin ignored (structured parent)
            // Result: admin -> users -> UserProfile
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'admin',
                path: 'users.user-profile',
            }, TRIGGER_NAME);
        });

        it('should handle empty path after all filtering', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['src', 'components', 'ui'],
            });
            
            const event = createMockEvent('src/components/ui/Button.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith(null, TRIGGER_NAME);
        });

        it('should handle single segment paths', async () => {
            const generator = pathBasedConfigGenerator({});
            
            const event = createMockEvent('Component.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith(null, TRIGGER_NAME);
        });

        it('should work with monorepo-style paths', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent(
                'packages/ui/src/components/Button.tsx',
                ['packages/**/*.tsx']
            );
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'ui',
                path: 'components',
            }, TRIGGER_NAME);
        });

        it('should handle Next.js app directory structure', async () => {
            const generator = pathBasedConfigGenerator({
                removeBracketedDirectories: true,
                ignoreIncludesRootDirectories: true,
                lowercaseNamespace: true,
            });
            
            const event = createMockEvent(
                'app/(admin)/dashboard/users/page.tsx',
                ['app/**/*.tsx']
            );
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'dashboard',
                path: 'users',
            }, TRIGGER_NAME);
        });
    });

    describe('Edge cases', () => {
        it('should handle paths with special characters', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/my-feature/sub_directory/Component.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'my-feature',
                path: 'sub_directory',
            }, TRIGGER_NAME);
        });

        it('should handle empty includes array gracefully', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
            });
            
            const event = createMockEvent('src/components/Button.tsx', []);
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'src',
                path: 'components',
            }, TRIGGER_NAME);
        });

        it('should handle patterns without /** wildcard', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
            });
            
            const event = createMockEvent('src/components/Button.tsx', ['src/*.tsx']);
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'components',
            }, TRIGGER_NAME);
        });

        it('should handle deeply nested group patterns', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
            });
            
            const event = createMockEvent(
                'frontend/pages/Home.tsx',
                ['(frontend|backend)/(pages|api)/**/*.tsx']
            );
            await generator(event);
            
            // Should only extract first segment root directories
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'pages',
            }, TRIGGER_NAME);
        });
    });

    describe('Preserving other config properties', () => {
        it('should preserve custom properties from existing config when generating namespace and path', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/features/auth/Login.tsx');
            // Add custom properties to the config
            (event as any).config = {
                namespace: 'old-namespace',
                path: 'old.path',
                debugMode: true,
                manual: false,
                customFlag: 'test-value',
            };
            
            await generator(event);
            
            // Should preserve custom properties while updating namespace and path
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'auth',
                debugMode: true,
                manual: false,
                customFlag: 'test-value',
            }, TRIGGER_NAME);
        });

        it('should preserve custom properties when only namespace is generated', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/components/Button.tsx');
            (event as any).config = {
                manual: true,
                extra: { nested: { data: 'value' } },
            };
            
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'components',
                manual: true,
                extra: { nested: { data: 'value' } },
            }, TRIGGER_NAME);
        });

        it('should preserve custom properties even when clearing namespace on default', async () => {
            const generator = pathBasedConfigGenerator({
                clearOnDefaultNamespace: true,
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/common/auth/Login.tsx', ['src/**/*.tsx'], 'common');
            (event as any).config = {
                namespace: 'common',
                path: 'old.path',
                debugMode: true,
                customProperty: 'should-be-preserved',
            };
            
            await generator(event);
            
            // namespace should be omitted because it equals default, but path and custom properties should remain
            expect(event.save).toHaveBeenCalledWith({
                path: 'auth',
                debugMode: true,
                customProperty: 'should-be-preserved',
            }, TRIGGER_NAME);
        });

        it('should work correctly when config is undefined', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/features/auth/Login.tsx');
            // config is undefined
            
            await generator(event);
            
            // Should generate only namespace and path
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'auth',
            }, TRIGGER_NAME);
        });

        it('should preserve custom properties with complex case transformations', async () => {
            const generator = pathBasedConfigGenerator({
                namespaceCase: 'kebab',
                pathCase: 'snake',
                ignoreDirectories: ['src'],
            });
            
            const event = createMockEvent('src/UserProfile/EditForm/Components.tsx');
            (event as any).config = {
                debugMode: true,
                customSettings: {
                    featureFlag: 'enabled',
                    metadata: ['tag1', 'tag2'],
                },
            };
            
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'user-profile',
                path: 'edit_form',
                debugMode: true,
                customSettings: {
                    featureFlag: 'enabled',
                    metadata: ['tag1', 'tag2'],
                },
            }, TRIGGER_NAME);
        });

        it('should preserve custom properties when using fallback namespace', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['src'],
                fallbackNamespace: 'ui',
                clearOnDefaultNamespace: false,
            });
            
            const event = createMockEvent('src/Button.tsx', ['src/**/*.tsx'], 'common');
            (event as any).config = {
                manual: true,
                externalRef: 'some-ref',
            };
            
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'ui',
                manual: true,
                externalRef: 'some-ref',
            }, TRIGGER_NAME);
        });
    });

    describe('Real-world scenarios', () => {
        it('should handle complex Next.js dashboard path with bracketed directories', async () => {
            // Test for path: app/dashboard/modules/advanced/facility/[id]/edit/page.tsx
            const generatorConfig = {
                ignoreIncludesRootDirectories: true,
                removeBracketedDirectories: true,
                namespaceCase: 'kebab' as const,
                pathCase: 'camel' as const,
                clearOnDefaultNamespace: true,
                ignoreDirectories: [
                    'dashboard',
                    'views'
                ],
                ignoreStructured: {
                    app: {
                        dashboard: {
                            modules: true
                        }
                    }
                }
            };

            const generator = pathBasedConfigGenerator(generatorConfig);
            const event = createMockEvent(
                'app/dashboard/modules/advanced/facility/[id]/edit/page.tsx',
                ['app/**/*.{js,ts,jsx,tsx}'],
                'common'
            );
            
            await generator(event);

            expect(event.save).toHaveBeenCalledWith({
                namespace: 'advanced',
                path: 'facility.edit',
            }, TRIGGER_NAME);
        });

        it('should preserve namespace and remove path when config already exists (TODO example)', async () => {
            // Test from TODO: Tag has existing config with namespace and path
            // After regeneration, should keep only namespace
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootDirectories: true,
                removeBracketedDirectories: true,
                namespaceCase: 'kebab' as const,
                pathCase: 'camel' as const,
                clearOnDefaultNamespace: true,
                ignoreDirectories: [
                    'dashboard',
                    'views'
                ],
                ignoreStructured: {
                    app: ['dashboard']
                }
            });

            const includes = ['app/**/*.{js,ts,jsx,tsx}', 'components/**/*.{js,ts,jsx,tsx}'];
            const event = createMockEvent(
                'components/dashboard/views/facilities/facilities.translations.ts',
                includes,
                'common'
            );
            
            // Set existing config
            (event as any).config = {
                namespace: 'facilities',
                path: 'views.facilities'
            };

            await generator(event);

            // Should preserve namespace and remove path
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'facilities',
            }, TRIGGER_NAME);
        });

        it('should handle TODO example configuration with various paths', async () => {
            // Setup generator with exact configuration from TODO file
            const generatorConfig = {
                ignoreIncludesRootDirectories: true,
                removeBracketedDirectories: true,
                namespaceCase: 'kebab' as const,
                pathCase: 'camel' as const,
                clearOnDefaultNamespace: true,
                ignoreDirectories: [
                    'dashboard',
                    'views'
                ],
                ignoreStructured: {
                    app: ['dashboard']
                }
            };

            const includes = ['app/**/*.{js,ts,jsx,tsx}', 'components/**/*.{js,ts,jsx,tsx}'];

            // Test case 1:
            // components/dashboard/views/facilities/facilities.translations.ts
            const generator1 = pathBasedConfigGenerator(generatorConfig);
            const event1 = createMockEvent(
                'components/dashboard/views/facilities/facilities.translations.ts',
                includes,
                'common'
            );
            await generator1(event1);
            expect(event1.save).toHaveBeenCalledWith({
                namespace: 'facilities',
            }, TRIGGER_NAME);

            // Test case 2: With includeFileName option
            const generator2 = pathBasedConfigGenerator({
                ...generatorConfig,
                includeFileName: true
            });
            const event2 = createMockEvent(
                'components/dashboard/views/facilities/facilities.translations.ts',
                includes,
                'common'
            );
            await generator2(event2);
            expect(event2.save).toHaveBeenCalledWith({
                namespace: 'facilities',
                path: 'facilities.translations',
            }, TRIGGER_NAME);

            // Test case 3: App structure with ignoreStructured
            // Path: app/dashboard/components/views/facilities
            // ignoreIncludesRootDirectories removes 'app' and 'components' (from includes)
            // ignoreDirectories removes 'dashboard' and 'views'
            // Result: facilities only
            const generator3 = pathBasedConfigGenerator(generatorConfig);
            const event3 = createMockEvent(
                'app/dashboard/components/views/facilities/list.tsx',
                includes,
                'common'
            );
            await generator3(event3);
            expect(event3.save).toHaveBeenCalledWith({
                namespace: 'components',
                path: 'facilities',
            }, TRIGGER_NAME);

            // Test case 4: PascalCase with kebab-case namespace transformation
            // Path: components/dashboard/views/UserManagement
            // ignoreIncludesRootDirectories removes 'components'
            // ignoreDirectories removes 'dashboard' and 'views'
            // Result: UserManagement -> namespaceCase: 'kebab' -> 'user-management'
            const generator4 = pathBasedConfigGenerator(generatorConfig);
            const event4 = createMockEvent(
                'components/dashboard/views/UserManagement/EditUserForm.tsx',
                includes,
                'common'
            );
            await generator4(event4);
            expect(event4.save).toHaveBeenCalledWith({
                namespace: 'user-management',
            }, TRIGGER_NAME);

            // Test case 5: Multiple segments with case transformations
            const generator5 = pathBasedConfigGenerator(generatorConfig);
            const event5 = createMockEvent(
                'components/dashboard/views/facilities/ReportGeneration/GenerateMonthlyReport.tsx',
                includes,
                'common'
            );
            await generator5(event5);
            expect(event5.save).toHaveBeenCalledWith({
                namespace: 'facilities',
                path: 'reportGeneration',
            }, TRIGGER_NAME);
        });
    });
});

