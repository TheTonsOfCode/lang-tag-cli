import { describe, it, expect, vi, beforeEach } from 'vitest';
import { $LT_GroupTagsToNamespaces } from '@/cli/core/collect/group-tags-to-namespaces.ts';
import { $LT_TagCandidateFile } from '@/cli/core/collect/collect-tags.ts';
import {LangTagCLIProcessedTag, LangTagCLIConfig, LANG_TAG_DEFAULT_CONFIG} from '@/cli/config.ts';
import { LangTagCLILogger } from '@/cli/logger.ts';

// Mock logger
const mockLogger: LangTagCLILogger = {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    conflict: vi.fn().mockResolvedValue(undefined),
};

// Mock config
const mockConfig: LangTagCLIConfig = {
    tagName: 'lang',
    translationArgPosition: 1,
    includes: ['**/*.ts', '**/*.tsx'],
    excludes: ['node_modules/**'],
    outputDir: 'dist',
    language: 'en',
    isLibrary: false,
    onConfigGeneration: () => undefined,
    collect: {
        ...LANG_TAG_DEFAULT_CONFIG.collect,
        onCollectConfigFix: (config) => config,
    },
    import: {
        dir: 'src/lang-libraries',
        tagImportPath: 'import { lang } from "@/my-lang-tag-path"',
        onImport: () => {},
    }
};

describe('$LT_GroupTagsToNamespaces - Conflict Detection', () => {
    let mockOnConflictResolution: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnConflictResolution = vi.fn().mockResolvedValue(true);
    });

    const createMockTag = (overrides: Partial<LangTagCLIProcessedTag> = {}): LangTagCLIProcessedTag => ({
        fullMatch: 'lang({ text: "Hello" }, { path: "test.path", namespace: "common" })',
        parameter1Text: '{ text: "Hello" }',
        parameter2Text: '{ path: "test.path", namespace: "common" }',
        parameterTranslations: { text: 'Hello' },
        parameterConfig: {
            namespace: 'common',
            path: 'test.path'
        },
        variableName: undefined,
        index: 0,
        line: 1,
        column: 1,
        validity: 'ok',
        ...overrides
    });

    const createMockFile = (relativeFilePath: string, tags: LangTagCLIProcessedTag[]): $LT_TagCandidateFile => ({
        relativeFilePath,
        tags
    });

    const createConfigWithConflictResolution = (): LangTagCLIConfig => ({
        ...mockConfig,
        collect: {
            ...mockConfig.collect,
            onConflictResolution: mockOnConflictResolution
        }
    });

    it('should detect conflicts between structured objects and simple values', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Component1.tsx', [
                createMockTag({
                    fullMatch: 'lang({ some: { structured: { foo: "Foo", bar: "Bar" } } }, { namespace: "common" })',
                    parameter1Text: '{ some: { structured: { foo: "Foo", bar: "Bar" } } }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: {
                        some: {
                            structured: {
                                foo: 'Foo',
                                bar: 'Bar'
                            }
                        }
                    },
                    parameterConfig: {
                        namespace: 'common',
                        path: undefined
                    }
                })
            ]),
            createMockFile('src/Component2.tsx', [
                createMockTag({
                    fullMatch: 'lang({ foo: "Another conflict" }, { namespace: "common", path: "some.structured" })',
                    parameter1Text: '{ foo: "Another conflict" }',
                    parameter2Text: '{ namespace: "common", path: "some.structured" }',
                    parameterTranslations: {
                        foo: 'Another conflict'
                    },
                    parameterConfig: {
                        namespace: 'common',
                        path: 'some.structured'
                    }
                })
            ])
        ];

        await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: createConfigWithConflictResolution() });

        // Should call onConflictResolution with correct path
        expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
        expect(mockOnConflictResolution).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'some.structured.foo',
                conflictType: 'path_overwrite'
            }),
            mockLogger
        );
    });

    it('should detect conflicts when trying to create object structure over existing primitive value', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Component1.tsx', [
                createMockTag({
                    fullMatch: 'lang({ title: "Simple Title" }, { namespace: "common", path: "page.header" })',
                    parameter1Text: '{ title: "Simple Title" }',
                    parameter2Text: '{ namespace: "common", path: "page.header" }',
                    parameterTranslations: {
                        title: 'Simple Title'
                    },
                    parameterConfig: {
                        namespace: 'common',
                        path: 'page.header'
                    }
                })
            ]),
            createMockFile('src/Component2.tsx', [
                createMockTag({
                    fullMatch: 'lang({ title: "New Title" }, { namespace: "common", path: "page.header" })',
                    parameter1Text: '{ title: "New Title" }',
                    parameter2Text: '{ namespace: "common", path: "page.header" }',
                    parameterTranslations: {
                        title: 'New Title'
                    },
                    parameterConfig: {
                        namespace: 'common',
                        path: 'page.header'
                    }
                })
            ])
        ];

        await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: createConfigWithConflictResolution() });

        // Should call onConflictResolution with correct path
        expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
        expect(mockOnConflictResolution).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'page.header.title',
                conflictType: 'path_overwrite'
            }),
            mockLogger
        );
    });

    it('should detect conflicts between simple values at root level', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Component1.tsx', [
                createMockTag({
                    fullMatch: 'lang({ abc: "XD1" })',
                    parameter1Text: '{ abc: "XD1" }',
                    parameter2Text: '{}',
                    parameterTranslations: {
                        abc: 'XD1'
                    },
                    parameterConfig: {
                        namespace: 'common',
                        path: undefined
                    }
                })
            ]),
            createMockFile('src/Component2.tsx', [
                createMockTag({
                    fullMatch: 'lang({ abc: "XD2" })',
                    parameter1Text: '{ abc: "XD2" }',
                    parameter2Text: '{}',
                    parameterTranslations: {
                        abc: 'XD2'
                    },
                    parameterConfig: {
                        namespace: 'common',
                        path: undefined
                    }
                })
            ])
        ];

        await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: createConfigWithConflictResolution() });

        // Should call onConflictResolution with correct path
        expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
        expect(mockOnConflictResolution).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'abc',
                conflictType: 'path_overwrite'
            }),
            mockLogger
        );
    });

    it('should NOT detect conflicts between different namespaces', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Component1.tsx', [
                createMockTag({
                    fullMatch: 'lang({ abc: "XD1" })',
                    parameter1Text: '{ abc: "XD1" }',
                    parameter2Text: '{}',
                    parameterTranslations: {
                        abc: 'XD1'
                    },
                    parameterConfig: {
                        namespace: 'common',
                        path: undefined
                    }
                })
            ]),
            createMockFile('src/Component2.tsx', [
                createMockTag({
                    fullMatch: 'lang({ abc: "XD2" }, { namespace: "admin" })',
                    parameter1Text: '{ abc: "XD2" }',
                    parameter2Text: '{ namespace: "admin" }',
                    parameterTranslations: {
                        abc: 'XD2'
                    },
                    parameterConfig: {
                        namespace: 'admin',
                        path: undefined
                    }
                })
            ])
        ];

        await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: createConfigWithConflictResolution() });

        // Should NOT call onConflictResolution - different namespaces
        expect(mockOnConflictResolution).not.toHaveBeenCalled();
    });
});
