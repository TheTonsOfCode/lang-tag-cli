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
        onCollectFinish: conflicts => true
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

    it('should detect conflicts when trying to create object structure over existing primitive value in nested path', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Component1.tsx', [
                createMockTag({
                    fullMatch: 'lang({ some: { structured: { foo: "Foo", bar: "Bar" } }, "abc": "XD2" }, { namespace: "admin" })',
                    parameter1Text: '{ some: { structured: { foo: "Foo", bar: "Bar" } }, "abc": "XD2" }',
                    parameter2Text: '{ namespace: "admin" }',
                    parameterTranslations: {
                        some: {
                            structured: {
                                foo: 'Foo',
                                bar: 'Bar'
                            }
                        },
                        abc: 'XD2'
                    },
                    parameterConfig: {
                        namespace: 'admin',
                        path: undefined
                    }
                })
            ]),
            createMockFile('src/Component2.tsx', [
                createMockTag({
                    fullMatch: 'lang({ structured: "XAXAXA" }, { namespace: "admin", path: "some" })',
                    parameter1Text: '{ structured: "XAXAXA" }',
                    parameter2Text: '{ namespace: "admin", path: "some" }',
                    parameterTranslations: {
                        structured: 'XAXAXA'
                    },
                    parameterConfig: {
                        namespace: 'admin',
                        path: 'some'
                    }
                })
            ])
        ];

        await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: createConfigWithConflictResolution() });

        // Should call onConflictResolution with correct path
        expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
        expect(mockOnConflictResolution).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'some.structured',
                conflictType: 'type_mismatch'
            }),
            mockLogger
        );
    });

    it('should detect conflicts between different data types (string vs number vs boolean)', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Component1.tsx', [
                createMockTag({
                    fullMatch: 'lang({ count: "5" }, { namespace: "common" })',
                    parameter1Text: '{ count: "5" }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: { count: '5' },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ]),
            createMockFile('src/Component2.tsx', [
                createMockTag({
                    fullMatch: 'lang({ count: 5 }, { namespace: "common" })',
                    parameter1Text: '{ count: 5 }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: { count: 5 },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ]),
            createMockFile('src/Component3.tsx', [
                createMockTag({
                    fullMatch: 'lang({ count: true }, { namespace: "common" })',
                    parameter1Text: '{ count: true }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: { count: true },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ])
        ];

        await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: createConfigWithConflictResolution() });

        // Should detect conflicts for each different type
        expect(mockOnConflictResolution).toHaveBeenCalledTimes(2);
        expect(mockOnConflictResolution).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'count',
                conflictType: 'type_mismatch'
            }),
            mockLogger
        );
    });

    it('should detect conflicts with multiple files (3+ files)', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Component1.tsx', [
                createMockTag({
                    fullMatch: 'lang({ title: "Title 1" }, { namespace: "common" })',
                    parameter1Text: '{ title: "Title 1" }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: { title: 'Title 1' },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ]),
            createMockFile('src/Component2.tsx', [
                createMockTag({
                    fullMatch: 'lang({ title: "Title 2" }, { namespace: "common" })',
                    parameter1Text: '{ title: "Title 2" }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: { title: 'Title 2' },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ]),
            createMockFile('src/Component3.tsx', [
                createMockTag({
                    fullMatch: 'lang({ title: "Title 3" }, { namespace: "common" })',
                    parameter1Text: '{ title: "Title 3" }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: { title: 'Title 3' },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ]),
            createMockFile('src/Component4.tsx', [
                createMockTag({
                    fullMatch: 'lang({ title: "Title 4" }, { namespace: "common" })',
                    parameter1Text: '{ title: "Title 4" }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: { title: 'Title 4' },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ])
        ];

        await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: createConfigWithConflictResolution() });

        // Should detect multiple conflicts
        expect(mockOnConflictResolution).toHaveBeenCalledTimes(3);
    });

    it('should detect conflicts with deeply nested objects (3+ levels)', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Component1.tsx', [
                createMockTag({
                    fullMatch: 'lang({ level1: { level2: { level3: { level4: { value: "Deep Value" } } } } }, { namespace: "common" })',
                    parameter1Text: '{ level1: { level2: { level3: { level4: { value: "Deep Value" } } } } }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: {
                        level1: {
                            level2: {
                                level3: {
                                    level4: {
                                        value: 'Deep Value'
                                    }
                                }
                            }
                        }
                    },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ]),
            createMockFile('src/Component2.tsx', [
                createMockTag({
                    fullMatch: 'lang({ value: "Shallow Value" }, { namespace: "common", path: "level1.level2.level3.level4" })',
                    parameter1Text: '{ value: "Shallow Value" }',
                    parameter2Text: '{ namespace: "common", path: "level1.level2.level3.level4" }',
                    parameterTranslations: { value: 'Shallow Value' },
                    parameterConfig: { namespace: 'common', path: 'level1.level2.level3.level4' }
                })
            ])
        ];

        await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: createConfigWithConflictResolution() });

        expect(mockOnConflictResolution).toHaveBeenCalledTimes(1);
        expect(mockOnConflictResolution).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'level1.level2.level3.level4.value',
                conflictType: 'path_overwrite'
            }),
            mockLogger
        );
    });

    it('should detect conflicts with empty values', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Component1.tsx', [
                createMockTag({
                    fullMatch: 'lang({ empty: "" }, { namespace: "common" })',
                    parameter1Text: '{ empty: "" }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: { empty: '' },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ]),
            createMockFile('src/Component2.tsx', [
                createMockTag({
                    fullMatch: 'lang({ empty: null }, { namespace: "common" })',
                    parameter1Text: '{ empty: null }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: { empty: null },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ]),
            createMockFile('src/Component3.tsx', [
                createMockTag({
                    fullMatch: 'lang({ empty: undefined }, { namespace: "common" })',
                    parameter1Text: '{ empty: undefined }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: { empty: undefined },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ])
        ];

        await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: createConfigWithConflictResolution() });

        expect(mockOnConflictResolution).toHaveBeenCalledTimes(2);
    });

    it('should detect different types of conflicts (path_overwrite vs type_mismatch)', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Component1.tsx', [
                createMockTag({
                    fullMatch: 'lang({ user: { name: "John", age: 25 } }, { namespace: "common" })',
                    parameter1Text: '{ user: { name: "John", age: 25 } }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: { user: { name: 'John', age: 25 } },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ]),
            createMockFile('src/Component2.tsx', [
                createMockTag({
                    fullMatch: 'lang({ name: "Jane" }, { namespace: "common", path: "user" })',
                    parameter1Text: '{ name: "Jane" }',
                    parameter2Text: '{ namespace: "common", path: "user" }',
                    parameterTranslations: { name: 'Jane' },
                    parameterConfig: { namespace: 'common', path: 'user' }
                })
            ]),
            createMockFile('src/Component3.tsx', [
                createMockTag({
                    fullMatch: 'lang({ user: "Simple User" }, { namespace: "common" })',
                    parameter1Text: '{ user: "Simple User" }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: { user: 'Simple User' },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ])
        ];

        await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: createConfigWithConflictResolution() });

        expect(mockOnConflictResolution).toHaveBeenCalledTimes(2);
        
        // Check for path_overwrite conflict
        expect(mockOnConflictResolution).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'user.name',
                conflictType: 'path_overwrite'
            }),
            mockLogger
        );
        
        // Check for type_mismatch conflict
        expect(mockOnConflictResolution).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'user',
                conflictType: 'type_mismatch'
            }),
            mockLogger
        );
    });

    it('should handle complex nested conflicts with multiple overlapping paths', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Component1.tsx', [
                createMockTag({
                    fullMatch: 'lang({ app: { header: { title: "App Title", subtitle: "Subtitle" }, footer: { copyright: "2024" } } }, { namespace: "common" })',
                    parameter1Text: '{ app: { header: { title: "App Title", subtitle: "Subtitle" }, footer: { copyright: "2024" } } }',
                    parameter2Text: '{ namespace: "common" }',
                    parameterTranslations: {
                        app: {
                            header: { title: 'App Title', subtitle: 'Subtitle' },
                            footer: { copyright: '2024' }
                        }
                    },
                    parameterConfig: { namespace: 'common', path: undefined }
                })
            ]),
            createMockFile('src/Component2.tsx', [
                createMockTag({
                    fullMatch: 'lang({ title: "New Title" }, { namespace: "common", path: "app.header" })',
                    parameter1Text: '{ title: "New Title" }',
                    parameter2Text: '{ namespace: "common", path: "app.header" }',
                    parameterTranslations: { title: 'New Title' },
                    parameterConfig: { namespace: 'common', path: 'app.header' }
                })
            ]),
            createMockFile('src/Component3.tsx', [
                createMockTag({
                    fullMatch: 'lang({ header: "Simple Header" }, { namespace: "common", path: "app" })',
                    parameter1Text: '{ header: "Simple Header" }',
                    parameter2Text: '{ namespace: "common", path: "app" }',
                    parameterTranslations: { header: 'Simple Header' },
                    parameterConfig: { namespace: 'common', path: 'app' }
                })
            ])
        ];

        await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: createConfigWithConflictResolution() });

        expect(mockOnConflictResolution).toHaveBeenCalledTimes(2);
        
        // Should detect path_overwrite for app.header.title
        expect(mockOnConflictResolution).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'app.header.title',
                conflictType: 'path_overwrite'
            }),
            mockLogger
        );
        
        // Should detect type_mismatch for app.header
        expect(mockOnConflictResolution).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'app.header',
                conflictType: 'type_mismatch'
            }),
            mockLogger
        );
    });
});
