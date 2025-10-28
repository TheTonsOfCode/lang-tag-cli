import { describe, it, expect, vi, beforeEach } from 'vitest';
import { $LT_GroupTagsToCollections } from '@/core/collect/group-tags-to-collections.ts';
import { $LT_TagCandidateFile } from '@/core/collect/collect-tags.ts';
import {LangTagCLIProcessedTag, LangTagCLIConfig} from '@/config.ts';
import { LangTagCLILogger } from '@/logger.ts';
import {LANG_TAG_DEFAULT_CONFIG} from "@/core/default-config.ts";

// Mock logger
const mockLogger: LangTagCLILogger = {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    conflict: vi.fn().mockResolvedValue(undefined),
};

// Base mock config
const createBaseConfig = (): LangTagCLIConfig => ({
    tagName: 'lang',
    translationArgPosition: 1,
    includes: ['**/*.ts', '**/*.tsx'],
    excludes: ['node_modules/**'],
    localesDirectory: 'dist',
    baseLanguageCode: 'en',
    isLibrary: false,
    onConfigGeneration: async () => {},
    collect: {
        ...LANG_TAG_DEFAULT_CONFIG.collect,
        onCollectFinish: () => {} // Don't exit on conflicts in tests
    },
    import: {
        dir: 'src/lang-libraries',
        tagImportPath: 'import { lang } from "@/my-lang-tag-path"',
        onImport: () => {},
    }
});

describe('$LT_GroupTagsToNamespaces - ignoreConflictsWithMatchingValues', () => {
    let mockOnConflictResolution: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockOnConflictResolution = vi.fn().mockResolvedValue(undefined);
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

    const createConfigWithConflictResolution = (ignoreConflictsWithMatchingValues?: boolean): LangTagCLIConfig => ({
        ...createBaseConfig(),
        collect: {
            ...createBaseConfig().collect,
            ignoreConflictsWithMatchingValues,
            onConflictResolution: mockOnConflictResolution
        }
    });

    describe('when ignoreConflictsWithMatchingValues is true (default)', () => {
        it('should NOT detect conflicts when two tags have the same path and identical string values', async () => {
            const files: $LT_TagCandidateFile[] = [
                createMockFile('src/Component1.tsx', [
                    createMockTag({
                        parameterTranslations: { title: 'Same Title' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ]),
                createMockFile('src/Component2.tsx', [
                    createMockTag({
                        parameterTranslations: { title: 'Same Title' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ])
            ];

            await $LT_GroupTagsToCollections({
                logger: mockLogger, 
                files, 
                config: createConfigWithConflictResolution(true) 
            });

            expect(mockOnConflictResolution).not.toHaveBeenCalled();
        });

        it('should NOT detect conflicts when multiple files (3+) have identical string values', async () => {
            const files: $LT_TagCandidateFile[] = [
                createMockFile('src/Component1.tsx', [
                    createMockTag({
                        parameterTranslations: { greeting: 'Hello World' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ]),
                createMockFile('src/Component2.tsx', [
                    createMockTag({
                        parameterTranslations: { greeting: 'Hello World' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ]),
                createMockFile('src/Component3.tsx', [
                    createMockTag({
                        parameterTranslations: { greeting: 'Hello World' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ])
            ];

            await $LT_GroupTagsToCollections({
                logger: mockLogger, 
                files, 
                config: createConfigWithConflictResolution(true) 
            });

            expect(mockOnConflictResolution).not.toHaveBeenCalled();
        });

        it('should STILL detect conflicts when string values are different', async () => {
            const files: $LT_TagCandidateFile[] = [
                createMockFile('src/Component1.tsx', [
                    createMockTag({
                        parameterTranslations: { title: 'Title 1' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ]),
                createMockFile('src/Component2.tsx', [
                    createMockTag({
                        parameterTranslations: { title: 'Title 2' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ])
            ];

            await $LT_GroupTagsToCollections({
                logger: mockLogger, 
                files, 
                config: createConfigWithConflictResolution(true) 
            });

            expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
            expect(mockOnConflictResolution).toHaveBeenCalledWith(
                expect.objectContaining({
                    conflict: expect.objectContaining({
                        path: 'title',
                        conflictType: 'path_overwrite'
                    })
                })
            );
        });
    });

    describe('when ignoreConflictsWithMatchingValues is false', () => {
        it('should detect conflicts even when two tags have identical string values', async () => {
            const files: $LT_TagCandidateFile[] = [
                createMockFile('src/Component1.tsx', [
                    createMockTag({
                        parameterTranslations: { title: 'Same Title' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ]),
                createMockFile('src/Component2.tsx', [
                    createMockTag({
                        parameterTranslations: { title: 'Same Title' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ])
            ];

            await $LT_GroupTagsToCollections({
                logger: mockLogger, 
                files, 
                config: createConfigWithConflictResolution(false) 
            });

            expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
            expect(mockOnConflictResolution).toHaveBeenCalledWith(
                expect.objectContaining({
                    conflict: expect.objectContaining({
                        path: 'title',
                        conflictType: 'path_overwrite'
                    })
                })
            );
        });

        it('should detect multiple conflicts when multiple files have identical string values', async () => {
            const files: $LT_TagCandidateFile[] = [
                createMockFile('src/Component1.tsx', [
                    createMockTag({
                        parameterTranslations: { title: 'Same' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ]),
                createMockFile('src/Component2.tsx', [
                    createMockTag({
                        parameterTranslations: { title: 'Same' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ]),
                createMockFile('src/Component3.tsx', [
                    createMockTag({
                        parameterTranslations: { title: 'Same' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ])
            ];

            await $LT_GroupTagsToCollections({
                logger: mockLogger, 
                files, 
                config: createConfigWithConflictResolution(false) 
            });

            // Should detect 2 conflicts (file1 vs file2, file1 vs file3)
            expect(mockOnConflictResolution).toHaveBeenCalledTimes(2);
        });

        it('should still detect conflicts when string values are different', async () => {
            const files: $LT_TagCandidateFile[] = [
                createMockFile('src/Component1.tsx', [
                    createMockTag({
                        parameterTranslations: { title: 'Title 1' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ]),
                createMockFile('src/Component2.tsx', [
                    createMockTag({
                        parameterTranslations: { title: 'Title 2' },
                        parameterConfig: { namespace: 'common', path: undefined }
                    })
                ])
            ];

            await $LT_GroupTagsToCollections({
                logger: mockLogger, 
                files, 
                config: createConfigWithConflictResolution(false) 
            });

            expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
            expect(mockOnConflictResolution).toHaveBeenCalledWith(
                expect.objectContaining({
                    conflict: expect.objectContaining({
                        path: 'title',
                        conflictType: 'path_overwrite'
                    })
                })
            );
        });
    });
});

