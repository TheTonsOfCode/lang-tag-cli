import { describe, it, expect, vi } from 'vitest';
import { pathBasedConfigGenerator } from '../../src/algorithms/config-generation/path-based-config-generator';
import { LangTagCLIConfigGenerationEvent } from '../../src/config';

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
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent('src/features/auth/Login.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'auth',
            });
        });

        it('should generate only namespace when path has one segment after filtering', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreFolders: ['src'],
                includeFileName: true,
            });
            
            const event = createMockEvent('src/components/Button.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'components',
                path: 'Button',
            });
        });

        it('should use fallback namespace when all segments are filtered', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreFolders: ['src'],
                fallbackNamespace: 'common',
            });
            
            const event = createMockEvent('src/Component.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith(undefined);
        });

        it('should handle deep nested paths', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent('src/features/admin/users/list/components/UserRow.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'admin.users.list.components',
            });
        });
    });

    describe('ignoreIncludesRootFolders option', () => {
        it('should auto-ignore single root folder from includes pattern', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootFolders: true,
            });
            
            const event = createMockEvent('src/features/auth/Login.tsx', ['src/**/*.{js,ts,jsx,tsx}']);
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'auth',
            });
        });

        it('should auto-ignore multiple root folders from group pattern with parentheses', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootFolders: true,
            });
            
            const event1 = createMockEvent('src/features/auth/Login.tsx', ['(src|app)/**/*.{js,ts,jsx,tsx}']);
            await generator(event1);
            
            expect(event1.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'auth',
            });

            const event2 = createMockEvent('app/admin/users/List.tsx', ['(src|app)/**/*.{js,ts,jsx,tsx}']);
            await generator(event2);
            
            expect(event2.save).toHaveBeenCalledWith({
                namespace: 'admin',
                path: 'users',
            });
        });

        it('should auto-ignore multiple root folders from group pattern with brackets', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootFolders: true,
            });
            
            const event1 = createMockEvent('frontend/pages/Home.tsx', ['[frontend|backend]/**/*.tsx']);
            await generator(event1);
            
            expect(event1.save).toHaveBeenCalledWith({
                namespace: 'pages',
            });

            const event2 = createMockEvent('backend/api/users.ts', ['[frontend|backend]/**/*.ts']);
            await generator(event2);
            
            expect(event2.save).toHaveBeenCalledWith({
                namespace: 'api',
            });
        });

        it('should auto-ignore folders from multiple include patterns', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootFolders: true,
            });
            
            const event1 = createMockEvent(
                'src/features/auth/Login.tsx',
                ['(src|app)/**/*.{js,ts,jsx,tsx}', 'components/**/*.{jsx,tsx}']
            );
            await generator(event1);
            
            expect(event1.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'auth',
            });

            const event2 = createMockEvent(
                'components/ui/Button.tsx',
                ['(src|app)/**/*.{js,ts,jsx,tsx}', 'components/**/*.{jsx,tsx}']
            );
            await generator(event2);
            
            expect(event2.save).toHaveBeenCalledWith({
                namespace: 'ui',
            });
        });

        it('should combine ignoreIncludesRootFolders with manual ignoreFolders', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootFolders: true,
                ignoreFolders: ['features'],
            });
            
            const event = createMockEvent(
                'src/features/auth/Login.tsx',
                ['src/**/*.{js,ts,jsx,tsx}']
            );
            await generator(event);
            
            // Both 'src' and 'features' should be ignored
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'auth',
            });
        });

        it('should not duplicate folders when they appear in both ignoreFolders and includes', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootFolders: true,
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent(
                'src/features/auth/Login.tsx',
                ['src/**/*.{js,ts,jsx,tsx}']
            );
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'auth',
            });
        });

        it('should work with leading ./ in patterns', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootFolders: true,
            });
            
            const event = createMockEvent(
                'src/components/Button.tsx',
                ['./src/**/*.tsx']
            );
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'components',
            });
        });

        it('should be disabled by default', async () => {
            const generator = pathBasedConfigGenerator({
                // ignoreIncludesRootFolders not set (defaults to false)
            });
            
            const event = createMockEvent('src/features/auth/Login.tsx', ['src/**/*.{js,ts,jsx,tsx}']);
            await generator(event);
            
            // 'src' should NOT be ignored
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'src',
                path: 'features.auth',
            });
        });
    });

    describe('includeFileName option', () => {
        it('should include filename as segment when enabled', async () => {
            const generator = pathBasedConfigGenerator({
                includeFileName: true,
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent('src/components/Button.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'components',
                path: 'Button',
            });
        });

        it('should exclude filename by default', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent('src/components/Button.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'components',
            });
        });

        it('should strip file extension when including filename', async () => {
            const generator = pathBasedConfigGenerator({
                includeFileName: true,
                ignoreFolders: ['src', 'pages'],
            });
            
            const event = createMockEvent('src/pages/UserProfile.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'UserProfile',
            });
        });
    });

    describe('removeBracketedFolders option', () => {
        it('should remove folders in parentheses by default', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreFolders: ['app'],
            });
            
            const event = createMockEvent('app/(admin)/users/List.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'users',
            });
        });

        it('should remove folders in square brackets by default', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreFolders: ['app'],
            });
            
            const event = createMockEvent('app/[locale]/about/page.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'about',
            });
        });

        it('should keep folder name without brackets when disabled', async () => {
            const generator = pathBasedConfigGenerator({
                removeBracketedFolders: false,
                ignoreFolders: ['app'],
            });
            
            const event = createMockEvent('app/(admin)/users/List.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'admin',
                path: 'users',
            });
        });
    });

    describe('ignoreStructured option', () => {
        it('should ignore specific folders hierarchically', async () => {
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
            });
        });

        it('should ignore array of folders at specific level', async () => {
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
            });

            const event2 = createMockEvent('src/features/orders/List.tsx');
            await generator(event2);
            
            expect(event2.save).toHaveBeenCalledWith({
                namespace: 'src',
                path: 'features.orders',
            });
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
            });
        });
    });

    describe('Case transformations', () => {
        it('should apply lowercaseNamespace', async () => {
            const generator = pathBasedConfigGenerator({
                lowercaseNamespace: true,
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent('src/UserProfile/EditForm.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'userprofile',
            });
        });

        it('should apply namespaceCase transformation', async () => {
            const generator = pathBasedConfigGenerator({
                namespaceCase: 'kebab',
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent('src/UserProfile/EditForm.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'user-profile',
            });
        });

        it('should apply pathCase transformation', async () => {
            const generator = pathBasedConfigGenerator({
                pathCase: 'camel',
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent('src/features/EditUserForm/components.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'features',
                path: 'editUserForm',
            });
        });

        it('should apply both namespace and path case transformations', async () => {
            const generator = pathBasedConfigGenerator({
                namespaceCase: 'snake',
                pathCase: 'kebab',
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent('src/UserProfile/EditForm/Components.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'user_profile',
                path: 'edit-form',
            });
        });
    });

    describe('fallbackNamespace option', () => {
        it('should use custom fallback when all segments filtered', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreFolders: ['src', 'components'],
                fallbackNamespace: 'ui',
                clearOnDefaultNamespace: false,
            });
            
            const event = createMockEvent('src/components/Button.tsx', ['src/**/*.tsx'], 'common');
            await generator(event);
            
            // Should use 'ui' as namespace (fallback is different from default 'common')
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'ui',
            });
        });

        it('should use config default namespace when fallback not provided', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent('src/Button.tsx', ['src/**/*.tsx'], 'common');
            await generator(event);
            
            // clearOnDefaultNamespace is true by default, so should clear
            expect(event.save).toHaveBeenCalledWith(undefined);
        });
    });

    describe('clearOnDefaultNamespace option', () => {
        it('should clear config when namespace equals default and enabled', async () => {
            const generator = pathBasedConfigGenerator({
                clearOnDefaultNamespace: true,
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent('src/common/Button.tsx', ['src/**/*.tsx'], 'common');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith(undefined);
        });

        it('should keep namespace even if equals default when disabled', async () => {
            const generator = pathBasedConfigGenerator({
                clearOnDefaultNamespace: false,
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent('src/common/Button.tsx', ['src/**/*.tsx'], 'common');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'common',
            });
        });

        it('should keep path when namespace equals default but path exists', async () => {
            const generator = pathBasedConfigGenerator({
                clearOnDefaultNamespace: true,
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent('src/common/auth/Login.tsx', ['src/**/*.tsx'], 'common');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                path: 'auth',
            });
        });
    });

    describe('Complex scenarios', () => {
        it('should handle combination of all options', async () => {
            const generator = pathBasedConfigGenerator({
                includeFileName: true,
                removeBracketedFolders: true,
                ignoreIncludesRootFolders: true,
                ignoreFolders: ['features'],
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
            });
        });

        it('should handle empty path after all filtering', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreFolders: ['src', 'components', 'ui'],
            });
            
            const event = createMockEvent('src/components/ui/Button.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith(undefined);
        });

        it('should handle single segment paths', async () => {
            const generator = pathBasedConfigGenerator({});
            
            const event = createMockEvent('Component.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith(undefined);
        });

        it('should work with monorepo-style paths', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootFolders: true,
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent(
                'packages/ui/src/components/Button.tsx',
                ['packages/**/*.tsx']
            );
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'ui',
                path: 'components',
            });
        });

        it('should handle Next.js app directory structure', async () => {
            const generator = pathBasedConfigGenerator({
                removeBracketedFolders: true,
                ignoreIncludesRootFolders: true,
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
            });
        });
    });

    describe('Edge cases', () => {
        it('should handle paths with special characters', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreFolders: ['src'],
            });
            
            const event = createMockEvent('src/my-feature/sub_folder/Component.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'my-feature',
                path: 'sub_folder',
            });
        });

        it('should handle empty includes array gracefully', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootFolders: true,
            });
            
            const event = createMockEvent('src/components/Button.tsx', []);
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'src',
                path: 'components',
            });
        });

        it('should handle patterns without /** wildcard', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootFolders: true,
            });
            
            const event = createMockEvent('src/components/Button.tsx', ['src/*.tsx']);
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'components',
            });
        });

        it('should handle deeply nested group patterns', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreIncludesRootFolders: true,
            });
            
            const event = createMockEvent(
                'frontend/pages/Home.tsx',
                ['(frontend|backend)/(pages|api)/**/*.tsx']
            );
            await generator(event);
            
            // Should only extract first segment root folders
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'pages',
            });
        });
    });
});

