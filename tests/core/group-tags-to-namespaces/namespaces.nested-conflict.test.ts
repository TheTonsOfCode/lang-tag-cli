import { describe, it, expect, vi, beforeEach } from 'vitest';
import { $LT_GroupTagsToNamespaces } from '@/core/collect/group-tags-to-namespaces.ts';
import { $LT_TagCandidateFile } from '@/core/collect/collect-tags.ts';
import {LangTagCLIProcessedTag, LangTagCLIConfig, LANG_TAG_DEFAULT_CONFIG} from '@/config.ts';
import { LangTagCLILogger } from '@/logger.ts';

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
    baseLanguageCode: 'en',
    isLibrary: false,
    onConfigGeneration: async () => {},
    collect: {
        ...LANG_TAG_DEFAULT_CONFIG.collect,
        onCollectFinish: () => {}, // Don't exit on conflicts in tests
    },
    import: {
        dir: 'src/lang-libraries',
        tagImportPath: 'import { lang } from "@/my-lang-tag-path"',
        onImport: () => {},
    }
};

describe('$LT_GroupTagsToNamespaces - Nested Conflict Detection', () => {
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

    it('should detect conflict between nested object and simple value at same path', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Component1.tsx', [
                createMockTag({
                    fullMatch: 'lang({ abc: \'AA2\', some: { structured: { foo: \'foo\', bar: \'bar\' } } }, { namespace: "admin" })',
                    parameter1Text: '{ abc: \'AA2\', some: { structured: { foo: \'foo\', bar: \'bar\' } } }',
                    parameter2Text: '{ namespace: "admin" }',
                    parameterTranslations: {
                        abc: 'AA2',
                        some: {
                            structured: {
                                foo: 'foo',
                                bar: 'bar'
                            }
                        }
                    },
                    parameterConfig: {
                        namespace: 'admin',
                        path: undefined
                    }
                })
            ]),
            createMockFile('src/Component2.tsx', [
                createMockTag({
                    fullMatch: 'lang({ bar: \'AA1\' }, {namespace: "admin", path: \'some.structured\'})',
                    parameter1Text: '{ bar: \'AA1\' }',
                    parameter2Text: '{namespace: "admin", path: \'some.structured\'}',
                    parameterTranslations: { bar: 'AA1' },
                    parameterConfig: {
                        namespace: 'admin',
                        path: 'some.structured'
                    }
                })
            ])
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: createConfigWithConflictResolution() });

        // Should call onConflictResolution with correct path
        expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
        expect(mockOnConflictResolution).toHaveBeenCalledWith(
            expect.objectContaining({
                conflict: expect.objectContaining({
                    path: 'some.structured.bar',
                    conflictType: 'path_overwrite'
                }),
                logger: mockLogger
            })
        );

        // Should keep the first value (bar) from the nested structure and merge the rest
        expect(result).toEqual({
            admin: {
                abc: 'AA2',
                some: {
                    structured: {
                        bar: 'bar', // First value kept (from nested structure)
                        foo: 'foo'  // From first tag
                    }
                }
            }
        });

    });

    it('should detect conflict between nested object and simple value at same path (reverse order)', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Component1.tsx', [
                createMockTag({
                    fullMatch: 'lang({ bar: \'AA1\' }, {namespace: "admin", path: \'some.structured\'})',
                    parameter1Text: '{ bar: \'AA1\' }',
                    parameter2Text: '{namespace: "admin", path: \'some.structured\'}',
                    parameterTranslations: { bar: 'AA1' },
                    parameterConfig: {
                        namespace: 'admin',
                        path: 'some.structured'
                    }
                })
            ]),
            createMockFile('src/Component2.tsx', [
                createMockTag({
                    fullMatch: 'lang({ abc: \'AA2\', some: { structured: { foo: \'foo\', bar: \'bar\' } } }, { namespace: "admin" })',
                    parameter1Text: '{ abc: \'AA2\', some: { structured: { foo: \'foo\', bar: \'bar\' } } }',
                    parameter2Text: '{ namespace: "admin" }',
                    parameterTranslations: {
                        abc: 'AA2',
                        some: {
                            structured: {
                                foo: 'foo',
                                bar: 'bar'
                            }
                        }
                    },
                    parameterConfig: {
                        namespace: 'admin',
                        path: undefined
                    }
                })
            ]),
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: createConfigWithConflictResolution() });

        // Should call onConflictResolution with correct path
        expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
        expect(mockOnConflictResolution).toHaveBeenCalledWith(
            expect.objectContaining({
                conflict: expect.objectContaining({
                    path: 'some.structured.bar',
                    conflictType: 'path_overwrite'
                }),
                logger: mockLogger
            })
        );

        // Should keep the first value (bar) from the nested structure and merge the rest
        expect(result).toEqual({
            admin: {
                abc: 'AA2',
                some: {
                    structured: {
                        bar: 'AA1', // First value kept (from nested structure)
                        foo: 'foo'  // From first tag
                    }
                }
            }
        });

    })
});
