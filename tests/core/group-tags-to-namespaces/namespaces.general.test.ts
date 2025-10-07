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
        onCollectFinish: () => {}, // Don't exit on conflicts in tests
    },
    import: {
        dir: 'src/lang-libraries',
        tagImportPath: 'import { lang } from "@/my-lang-tag-path"',
        onImport: () => {},
    }
};

describe('$LT_GroupTagsToNamespaces', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

    it('should group tags by namespace without conflicts', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Click me' }
                }),
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.secondary' },
                    parameterTranslations: { text: 'Cancel' }
                })
            ]),
            createMockFile('src/Header.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'admin', path: 'navigation.title' },
                    parameterTranslations: { text: 'Admin Panel' }
                })
            ])
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: mockConfig });

        expect(result).toEqual({
            common: {
                buttons: {
                    primary: { text: 'Click me' },
                    secondary: { text: 'Cancel' }
                }
            },
            admin: {
                navigation: {
                    title: { text: 'Admin Panel' }
                }
            }
        });

        expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should detect path overwrite conflicts within same namespace', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Click me' }
                })
            ]),
            createMockFile('src/Header.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Kliknij mnie' }
                })
            ])
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: mockConfig });

        // Should keep first value due to conflict (second is skipped)
        expect(result.common.buttons.primary.text).toBe('Click me');

        // Should report conflict
        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Found 1 conflicts.')
        );
        expect(mockLogger.conflict).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'buttons.primary.text',
                conflictType: 'path_overwrite'
            }),
            true
        );
    });

    it('should handle nested object creation without conflicts', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Click me' }
                })
            ]),
            createMockFile('src/Header.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary.submit' },
                    parameterTranslations: { text: 'Submit' }
                })
            ])
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: mockConfig });

        // Should create nested structure successfully
        expect(result.common.buttons.primary).toEqual({ 
            text: 'Click me',
            submit: { text: 'Submit' }
        });

        // Should not report any conflicts
        expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should not detect conflicts between different namespaces', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Click me' }
                })
            ]),
            createMockFile('src/Admin.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'admin', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Admin Click' }
                })
            ])
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: mockConfig });

        expect(result).toEqual({
            common: {
                buttons: {
                    primary: { text: 'Click me' }
                }
            },
            admin: {
                buttons: {
                    primary: { text: 'Admin Click' }
                }
            }
        });

        // Should not report any conflicts
        expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should handle nested object structures', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { 
                        text: 'Click me',
                        style: 'primary'
                    }
                }),
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.secondary' },
                    parameterTranslations: { 
                        text: 'Cancel',
                        style: 'secondary'
                    }
                })
            ])
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: mockConfig });

        expect(result).toEqual({
            common: {
                buttons: {
                    primary: { 
                        text: 'Click me',
                        style: 'primary'
                    },
                    secondary: { 
                        text: 'Cancel',
                        style: 'secondary'
                    }
                }
            }
        });
    });

    it('should handle different value types', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'settings.count' },
                    parameterTranslations: { value: 42 }
                }),
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'settings.enabled' },
                    parameterTranslations: { value: true }
                }),
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'settings.title' },
                    parameterTranslations: { value: 'My App' }
                })
            ])
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: mockConfig });

        expect(result).toEqual({
            common: {
                settings: {
                    count: { value: 42 },
                    enabled: { value: true },
                    title: { value: 'My App' }
                }
            }
        });
    });

    it('should detect type conflicts between different value types', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'settings.count' },
                    parameterTranslations: { value: 42 }
                })
            ]),
            createMockFile('src/Header.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'settings.count' },
                    parameterTranslations: { value: 'forty-two' }
                })
            ])
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: mockConfig });

        // Should keep first value due to conflict
        expect(result.common.settings.count).toEqual({ value: 42 });

        // Should report conflict
        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Found 1 conflicts.')
        );
        expect(mockLogger.conflict).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'settings.count.value',
                conflictType: 'type_mismatch'
            }),
            true
        );
    });

    it('should handle empty files array', async () => {
        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files: [], config: mockConfig });

        expect(result).toEqual({});
        expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should handle tags with undefined path', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: undefined },
                    parameterTranslations: { text: 'Root level' }
                })
            ])
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: mockConfig });

        expect(result).toEqual({
            common: {
                text: 'Root level'
            }
        });
    });

    it('should handle tags with empty string path', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: '' },
                    parameterTranslations: { text: 'Root level' }
                })
            ])
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: mockConfig });

        expect(result).toEqual({
            common: {
                text: 'Root level'
            }
        });
    });

    it('should handle tags with whitespace-only path', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: '   ' },
                    parameterTranslations: { text: 'Root level' }
                })
            ])
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: mockConfig });

        expect(result).toEqual({
            common: {
                text: 'Root level'
            }
        });
    });

    it('should detect conflicts with empty path', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: '' },
                    parameterTranslations: { text: 'First root' }
                })
            ]),
            createMockFile('src/Header.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: '' },
                    parameterTranslations: { text: 'Second root' }
                })
            ])
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: mockConfig });

        // Should keep first value due to conflict
        expect(result.common.text).toBe('First root');

        // Should report conflict
        expect(mockLogger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Found 1 conflicts.')
        );
        expect(mockLogger.conflict).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'text',
                conflictType: 'path_overwrite'
            }),
            true
        );
    });

    it('should handle mixed empty and defined paths in same namespace', async () => {
        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: '' },
                    parameterTranslations: { 
                        rootText: 'Root level',
                        rootCount: 42
                    }
                }),
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Click me' }
                })
            ])
        ];

        const result = await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: mockConfig });

        expect(result).toEqual({
            common: {
                rootText: 'Root level',
                rootCount: 42,
                buttons: {
                    primary: { text: 'Click me' }
                }
            }
        });

        // Should not report any conflicts
        expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should call onConflictResolution for each conflict', async () => {
        const onConflictResolution = vi.fn();
        const configWithHandler = {
            ...mockConfig,
            collect: {
                ...mockConfig.collect,
                onConflictResolution
            }
        };

        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Click me' }
                })
            ]),
            createMockFile('src/Header.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Kliknij mnie' }
                })
            ])
        ];

        await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: configWithHandler });

        expect(onConflictResolution).toHaveBeenCalledTimes(1);
        expect(onConflictResolution).toHaveBeenCalledWith(
            expect.objectContaining({
                conflict: expect.objectContaining({
                    path: 'buttons.primary.text',
                    conflictType: 'path_overwrite'
                }),
                logger: mockLogger
            })
        );
    });

    it('should call onCollectFinish with all conflicts', async () => {
        const onCollectFinish = vi.fn();
        const configWithHandler = {
            ...mockConfig,
            collect: {
                ...mockConfig.collect,
                onCollectFinish
            }
        };

        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Click me' }
                })
            ]),
            createMockFile('src/Header.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Kliknij mnie' }
                })
            ])
        ];

        await $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: configWithHandler });

        expect(onCollectFinish).toHaveBeenCalledTimes(1);
        expect(onCollectFinish).toHaveBeenCalledWith(
            expect.objectContaining({
                conflicts: expect.arrayContaining([
                    expect.objectContaining({
                        path: 'buttons.primary.text',
                        conflictType: 'path_overwrite'
                    })
                ]),
                logger: mockLogger
            })
        );
    });

    it('should stop processing when onConflictResolution calls exit()', async () => {
        const onConflictResolution = vi.fn().mockImplementation(async (event) => {
            event.exit();
        });
        const configWithHandler = {
            ...mockConfig,
            collect: {
                ...mockConfig.collect,
                onConflictResolution
            }
        };

        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Click me' }
                })
            ]),
            createMockFile('src/Header.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Kliknij mnie' }
                })
            ])
        ];

        await expect(
            $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: configWithHandler })
        ).rejects.toThrow('Processing stopped due to conflict resolution: common|buttons.primary.text');
    });

    it('should stop processing when onCollectFinish calls exit()', async () => {
        const onCollectFinish = vi.fn().mockImplementation((event) => {
            event.exit();
        });
        const configWithHandler = {
            ...mockConfig,
            collect: {
                ...mockConfig.collect,
                onCollectFinish
            }
        };

        const files: $LT_TagCandidateFile[] = [
            createMockFile('src/Button.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Click me' }
                })
            ]),
            createMockFile('src/Header.tsx', [
                createMockTag({
                    parameterConfig: { namespace: 'common', path: 'buttons.primary' },
                    parameterTranslations: { text: 'Kliknij mnie' }
                })
            ])
        ];

        await expect(
            $LT_GroupTagsToNamespaces({ logger: mockLogger, files, config: configWithHandler })
        ).rejects.toThrow('Processing stopped due to collect finish handler');
    });
});
