import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DictionaryCollector } from '@/algorithms/collector/dictionary-collector';
import { $LT_CMD_Collect } from '@/commands/cmd-collect';
import { $LT_TagCandidateFile } from '@/core/collect/collect-tags';
import { LangTagCLILogger } from '@/logger';
import {
    LangTagCLICollectConfigFixEvent,
    LangTagCLICollectFinishEvent,
    LangTagCLIConfig,
    LangTagCLIConflictResolutionEvent,
    LangTagCLIProcessedTag,
} from '@/type';

// ============================================================================
// MOCKS SETUP - configured once at the top
// ============================================================================

const mockLogger: LangTagCLILogger = {
    info: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
} as any;

let mockConfig: LangTagCLIConfig;
let mockFilesWithTags: $LT_TagCandidateFile[] = [];
let writtenCollections: Record<string, any> = {};
let detectedConflicts: any[] = [];

// Mock file operations
vi.mock('@/core/io/file.ts', () => ({
    $LT_EnsureDirectoryExists: vi.fn().mockResolvedValue(undefined),
    $LT_RemoveFile: vi.fn().mockResolvedValue(undefined),
    $LT_RemoveDirectory: vi.fn().mockResolvedValue(undefined),
    $LT_WriteJSON: vi
        .fn()
        .mockImplementation(async (filePath: string, data: any) => {
            writtenCollections[filePath] = data;
        }),
    $LT_ReadJSON: vi.fn().mockRejectedValue(new Error('File not found')),
}));

// Mock fs/promises for local implementations
vi.mock('fs/promises', () => ({
    mkdir: vi.fn().mockResolvedValue(undefined),
    rm: vi.fn().mockResolvedValue(undefined),
}));

// Mock command essentials
vi.mock('@/commands/setup.ts', () => ({
    $LT_GetCommandEssentials: vi.fn(() => ({
        config: mockConfig,
        logger: mockLogger,
    })),
}));

// Mock file collection
vi.mock('@/core/collect/collect-tags.ts', () => ({
    $LT_CollectCandidateFilesWithTags: vi.fn(() => mockFilesWithTags),
}));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const createTag = (
    overrides?: Partial<LangTagCLIProcessedTag>
): LangTagCLIProcessedTag =>
    ({
        parameterConfig: {
            path: 'test',
            namespace: 'common',
        },
        parameterTranslations: {
            key: 'value',
        },
        line: 1,
        column: 1,
        ...overrides,
    }) as any;

const createFileWithTags = (
    filePath: string,
    tags: LangTagCLIProcessedTag[]
): $LT_TagCandidateFile => ({
    relativeFilePath: filePath,
    tags,
});

const setupConfig = (
    collectorOptions: { appendNamespaceToPath: boolean } = {
        appendNamespaceToPath: false,
    },
    configOverrides?: any
) => {
    const collector = new DictionaryCollector(collectorOptions);

    mockConfig = {
        tagName: 'lang',
        baseLanguageCode: 'en',
        localesDirectory: '/test/locales',
        includes: ['src/**/*.{ts,tsx}'],
        excludes: ['node_modules'],
        isLibrary: false,
        debug: false,
        collect: {
            defaultNamespace: 'common',
            ignoreConflictsWithMatchingValues: true,
            collector,
            onCollectConfigFix: (event: LangTagCLICollectConfigFixEvent) =>
                event.config,
            onConflictResolution: async (
                event: LangTagCLIConflictResolutionEvent
            ) => {
                detectedConflicts.push(event.conflict);
            },
            onCollectFinish: (event: LangTagCLICollectFinishEvent) => {
                // Store conflicts for assertions
            },
        },
        ...configOverrides,
    } as any;

    collector.config = mockConfig;
    collector.logger = mockLogger;
};

// ============================================================================
// TESTS
// ============================================================================

describe('DictionaryCollector with CMD_Collect', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockFilesWithTags = [];
        writtenCollections = {};
        detectedConflicts = [];
        setupConfig();
    });

    describe('Basic Collection Scenarios', () => {
        it('should collect tags from single file into one dictionary', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/App.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'greeting',
                        },
                        parameterTranslations: { hello: 'Hello' },
                    }),
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'farewell',
                        },
                        parameterTranslations: { goodbye: 'Goodbye' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(Object.keys(writtenCollections)).toHaveLength(1);
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            // DictionaryCollector writes: path.key structure (no namespace prefix)
            expect(dictFile.greeting.hello).toBe('Hello');
            expect(dictFile.farewell.goodbye).toBe('Goodbye');
        });

        it('should collect tags from multiple files into one dictionary', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/Header.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'nav.home',
                        },
                        parameterTranslations: { label: 'Home' },
                    }),
                ]),
                createFileWithTags('src/Footer.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'nav.about',
                        },
                        parameterTranslations: { label: 'About' },
                    }),
                ]),
                createFileWithTags('src/Main.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'admin',
                            path: 'panel.title',
                        },
                        parameterTranslations: { text: 'Admin Panel' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            // DictionaryCollector aggregates all to single file
            expect(Object.keys(writtenCollections)).toHaveLength(1);
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            expect(dictFile.nav.home.label).toBe('Home');
            expect(dictFile.nav.about.label).toBe('About');
            expect(dictFile.panel.title.text).toBe('Admin Panel');
        });

        it('should merge multiple namespaces into single dictionary file', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/App.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'app.title',
                        },
                        parameterTranslations: { heading: 'My Application' },
                    }),
                    createTag({
                        parameterConfig: { namespace: 'admin', path: 'panel' },
                        parameterTranslations: { name: 'Admin Section' },
                    }),
                    createTag({
                        parameterConfig: {
                            namespace: 'errors',
                            path: 'network',
                        },
                        parameterTranslations: { message: 'Network Error' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(Object.keys(writtenCollections)).toHaveLength(1);
            expect(Object.keys(writtenCollections)[0]).toContain('en.json');
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            expect(dictFile.app.title.heading).toBe('My Application');
            expect(dictFile.panel.name).toBe('Admin Section');
            expect(dictFile.network.message).toBe('Network Error');
        });
    });

    describe('Namespace to Path Transformation', () => {
        it('should collect to single dictionary when appendNamespaceToPath is false', async () => {
            setupConfig({ appendNamespaceToPath: false });

            mockFilesWithTags = [
                createFileWithTags('src/App.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'greeting',
                        },
                        parameterTranslations: { hello: 'Hi' },
                    }),
                    createTag({
                        parameterConfig: { namespace: 'admin', path: 'panel' },
                        parameterTranslations: { name: 'Admin' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(Object.keys(writtenCollections)).toHaveLength(1);
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            expect(dictFile.greeting.hello).toBe('Hi');
            expect(dictFile.panel.name).toBe('Admin');
        });

        it('should collect to single dictionary when appendNamespaceToPath is true', async () => {
            setupConfig({ appendNamespaceToPath: true });

            mockFilesWithTags = [
                createFileWithTags('src/App.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'greeting',
                        },
                        parameterTranslations: { hello: 'Hi' },
                    }),
                    createTag({
                        parameterConfig: { namespace: 'admin', path: 'panel' },
                        parameterTranslations: { name: 'Admin' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(Object.keys(writtenCollections)).toHaveLength(1);
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            // With appendNamespaceToPath, namespace is prepended to path
            expect(dictFile.common.greeting.hello).toBe('Hi');
            expect(dictFile.admin.panel.name).toBe('Admin');
        });

        it('should handle tags without paths when appendNamespaceToPath is true', async () => {
            setupConfig({ appendNamespaceToPath: true });

            mockFilesWithTags = [
                createFileWithTags('src/App.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: undefined,
                        },
                        parameterTranslations: { root: 'Root translation' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(Object.keys(writtenCollections)).toHaveLength(1);
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            expect(dictFile.common.root).toBe('Root translation');
        });

        it('should create conflicts when appendNamespaceToPath causes path collisions', async () => {
            setupConfig({ appendNamespaceToPath: true });

            mockFilesWithTags = [
                createFileWithTags('src/FileA.tsx', [
                    createTag({
                        parameterConfig: { namespace: 'common', path: 'item' },
                        parameterTranslations: { value: 'From FileA' },
                    }),
                ]),
                createFileWithTags('src/FileB.tsx', [
                    createTag({
                        parameterConfig: { namespace: 'common', path: 'item' },
                        parameterTranslations: { value: 'From FileB' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(detectedConflicts).toHaveLength(1);
            expect(detectedConflicts[0].path).toBe('common.item.value');
        });
    });

    describe('Conflict Handling', () => {
        it('should NOT report conflicts when same path has same values (ignoreConflictsWithMatchingValues=true)', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/Header.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'app.title',
                        },
                        parameterTranslations: { title: 'My App' },
                    }),
                ]),
                createFileWithTags('src/Footer.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'app.title',
                        },
                        parameterTranslations: { title: 'My App' }, // same value
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            // Should not report conflicts with matching values
            expect(detectedConflicts).toHaveLength(0);
        });

        it('should detect path_overwrite conflict with different values', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/Header.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'app.title',
                        },
                        parameterTranslations: { title: 'App One' },
                    }),
                ]),
                createFileWithTags('src/Footer.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'app.title',
                        },
                        parameterTranslations: { title: 'App Two' }, // different value
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(detectedConflicts).toHaveLength(1);
            expect(detectedConflicts[0].conflictType).toBe('path_overwrite');
            expect(detectedConflicts[0].path).toBe('app.title.title');
            expect(detectedConflicts[0].tagA.value).toBe('App One');
            expect(detectedConflicts[0].tagB.value).toBe('App Two');
        });

        it('should detect type_mismatch conflict when value types differ', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/FileA.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'data.item',
                        },
                        parameterTranslations: { item: 'string value' },
                    }),
                ]),
                createFileWithTags('src/FileB.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'data.item',
                        },
                        parameterTranslations: { item: { nested: 'object' } }, // different type
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(detectedConflicts).toHaveLength(1);
            expect(detectedConflicts[0].conflictType).toBe('type_mismatch');
            expect(detectedConflicts[0].path).toBe('data.item.item');
        });

        it('should detect multiple conflicts in single collection', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/FileA.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'errors.network',
                        },
                        parameterTranslations: { message: 'Network Error' },
                    }),
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'errors.timeout',
                        },
                        parameterTranslations: { message: 'Timeout Error' },
                    }),
                ]),
                createFileWithTags('src/FileB.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'errors.network',
                        },
                        parameterTranslations: { message: 'Connection Failed' }, // conflict 1
                    }),
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'errors.timeout',
                        },
                        parameterTranslations: { message: 'Request Timeout' }, // conflict 2
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(detectedConflicts).toHaveLength(2);
            expect(detectedConflicts[0].path).toBe('errors.network.message');
            expect(detectedConflicts[1].path).toBe('errors.timeout.message');
        });

        it('should report conflict with file paths in tagA and tagB', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/components/Header.tsx', [
                    createTag({
                        parameterConfig: { namespace: 'common', path: 'title' },
                        parameterTranslations: { text: 'Header Title' },
                    }),
                ]),
                createFileWithTags('src/components/Footer.tsx', [
                    createTag({
                        parameterConfig: { namespace: 'common', path: 'title' },
                        parameterTranslations: { text: 'Footer Title' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(detectedConflicts).toHaveLength(1);
            expect(detectedConflicts[0].tagA.relativeFilePath).toBe(
                'src/components/Header.tsx'
            );
            expect(detectedConflicts[0].tagB.relativeFilePath).toBe(
                'src/components/Footer.tsx'
            );
        });
    });

    describe('Mixed Path Scenarios', () => {
        it('should handle tags with and without paths', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/App.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'greeting',
                        },
                        parameterTranslations: { hello: 'Hi' },
                    }),
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: undefined,
                        },
                        parameterTranslations: { root: 'Root level' },
                    }),
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'farewell',
                        },
                        parameterTranslations: { bye: 'Goodbye' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(Object.keys(writtenCollections)).toHaveLength(1);
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            expect(dictFile.greeting.hello).toBe('Hi');
            expect(dictFile.root).toBe('Root level');
            expect(dictFile.farewell.bye).toBe('Goodbye');
        });

        it('should handle empty string paths', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/App.tsx', [
                    createTag({
                        parameterConfig: { namespace: 'common', path: '' },
                        parameterTranslations: { empty: 'Empty path' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(Object.keys(writtenCollections)).toHaveLength(1);
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            expect(dictFile.empty).toBe('Empty path');
        });

        it('should detect conflicts in complex nested structures', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/ComponentA.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'ui.layout.header.title',
                        },
                        parameterTranslations: { text: 'Header A' },
                    }),
                ]),
                createFileWithTags('src/ComponentB.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'ui.layout.header.title',
                        },
                        parameterTranslations: { text: 'Header B' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(detectedConflicts).toHaveLength(1);
            expect(detectedConflicts[0].path).toBe(
                'ui.layout.header.title.text'
            );
        });
    });

    describe('Large Scale Collection', () => {
        it('should collect from typical React application structure', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/components/Header.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'nav.home',
                        },
                        parameterTranslations: { label: 'Home' },
                    }),
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'nav.about',
                        },
                        parameterTranslations: { label: 'About' },
                    }),
                ]),
                createFileWithTags('src/components/LoginForm.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'auth.login.email',
                        },
                        parameterTranslations: { label: 'Email' },
                    }),
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'auth.login.password',
                        },
                        parameterTranslations: { label: 'Password' },
                    }),
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'auth.login.submit',
                        },
                        parameterTranslations: { button: 'Sign In' },
                    }),
                ]),
                createFileWithTags('src/components/ErrorBoundary.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'errors.boundary.title',
                        },
                        parameterTranslations: {
                            heading: 'Something went wrong',
                        },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(Object.keys(writtenCollections)).toHaveLength(1);
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            expect(dictFile.nav.home.label).toBe('Home');
            expect(dictFile.nav.about.label).toBe('About');
            expect(dictFile.auth.login.email.label).toBe('Email');
            expect(dictFile.auth.login.password.label).toBe('Password');
            expect(dictFile.auth.login.submit.button).toBe('Sign In');
            expect(dictFile.errors.boundary.title.heading).toBe(
                'Something went wrong'
            );
        });

        it('should handle 20 files with 40 tags without conflicts', async () => {
            const files: $LT_TagCandidateFile[] = [];
            for (let i = 0; i < 20; i++) {
                files.push(
                    createFileWithTags(`src/components/Component${i}.tsx`, [
                        createTag({
                            parameterConfig: {
                                namespace: 'common',
                                path: `component.${i}.title`,
                            },
                            parameterTranslations: { text: `Title ${i}` },
                        }),
                        createTag({
                            parameterConfig: {
                                namespace: 'common',
                                path: `component.${i}.description`,
                            },
                            parameterTranslations: { text: `Desc ${i}` },
                        }),
                    ])
                );
            }
            mockFilesWithTags = files;

            await $LT_CMD_Collect();

            expect(Object.keys(writtenCollections)).toHaveLength(1);
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            // Verify some samples
            expect(dictFile.component[0].title.text).toBe('Title 0');
            expect(dictFile.component[0].description.text).toBe('Desc 0');
            expect(dictFile.component[10].title.text).toBe('Title 10');
            expect(dictFile.component[10].description.text).toBe('Desc 10');
            expect(dictFile.component[19].title.text).toBe('Title 19');
            expect(dictFile.component[19].description.text).toBe('Desc 19');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty tag list', async () => {
            mockFilesWithTags = [];

            await $LT_CMD_Collect();

            expect(Object.keys(writtenCollections)).toHaveLength(0);
        });

        it('should handle multiple namespaces with appendNamespaceToPath', async () => {
            setupConfig({ appendNamespaceToPath: true });

            mockFilesWithTags = [
                createFileWithTags('src/App.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'greeting',
                        },
                        parameterTranslations: { hello: 'Hi' },
                    }),
                    createTag({
                        parameterConfig: { namespace: 'admin', path: 'panel' },
                        parameterTranslations: { title: 'Admin' },
                    }),
                    createTag({
                        parameterConfig: {
                            namespace: 'errors',
                            path: 'network',
                        },
                        parameterTranslations: { message: 'Error' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            // All should be in single dictionary
            expect(Object.keys(writtenCollections)).toHaveLength(1);
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            expect(dictFile.common.greeting.hello).toBe('Hi');
            expect(dictFile.admin.panel.title).toBe('Admin');
            expect(dictFile.errors.network.message).toBe('Error');
        });

        it('should handle tags with complex nested translation objects', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/App.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'messages.welcome',
                        },
                        parameterTranslations: {
                            title: 'Welcome',
                            subtitle: 'Get started',
                            actions: {
                                login: 'Login',
                                signup: 'Sign Up',
                            },
                        },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            expect(Object.keys(writtenCollections)).toHaveLength(1);
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            expect(dictFile.messages.welcome.title).toBe('Welcome');
            expect(dictFile.messages.welcome.subtitle).toBe('Get started');
            expect(dictFile.messages.welcome.actions.login).toBe('Login');
            expect(dictFile.messages.welcome.actions.signup).toBe('Sign Up');
        });
    });

    describe('Dictionary Collector Specific Behavior', () => {
        it('should aggregate different namespaces to same base language file', async () => {
            mockFilesWithTags = [
                createFileWithTags('src/Common.tsx', [
                    createTag({
                        parameterConfig: { namespace: 'common', path: 'a' },
                        parameterTranslations: { text: 'Common A' },
                    }),
                ]),
                createFileWithTags('src/Admin.tsx', [
                    createTag({
                        parameterConfig: { namespace: 'admin', path: 'b' },
                        parameterTranslations: { text: 'Admin B' },
                    }),
                ]),
                createFileWithTags('src/Forms.tsx', [
                    createTag({
                        parameterConfig: { namespace: 'forms', path: 'c' },
                        parameterTranslations: { text: 'Forms C' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            // All namespaces go to single dictionary file
            expect(Object.keys(writtenCollections)).toHaveLength(1);
            const filePath = Object.keys(writtenCollections)[0];
            expect(filePath).toContain('en.json');
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            expect(dictFile.a.text).toBe('Common A');
            expect(dictFile.b.text).toBe('Admin B');
            expect(dictFile.c.text).toBe('Forms C');
        });
    });

    describe('Different Base Language Codes', () => {
        it('should use Spanish when configured as base language', async () => {
            mockConfig.baseLanguageCode = 'es';

            mockFilesWithTags = [
                createFileWithTags('src/App.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'greeting',
                        },
                        parameterTranslations: { hello: 'Hola' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            const filePath = Object.keys(writtenCollections)[0];
            expect(filePath).toContain('es.json');
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            expect(dictFile.greeting.hello).toBe('Hola');
        });

        it('should use Polish when configured as base language', async () => {
            mockConfig.baseLanguageCode = 'pl';

            mockFilesWithTags = [
                createFileWithTags('src/App.tsx', [
                    createTag({
                        parameterConfig: {
                            namespace: 'common',
                            path: 'greeting',
                        },
                        parameterTranslations: { hello: 'Cześć' },
                    }),
                ]),
            ];

            await $LT_CMD_Collect();

            const filePath = Object.keys(writtenCollections)[0];
            expect(filePath).toContain('pl.json');
            expect(detectedConflicts).toHaveLength(0);

            const dictFile = Object.values(writtenCollections)[0];
            expect(dictFile.greeting.hello).toBe('Cześć');
        });
    });
});
