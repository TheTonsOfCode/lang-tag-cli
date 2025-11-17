import { existsSync } from 'fs';
import { globby } from 'globby';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { $LT_CMD_HideCompiledExports } from '@/commands/cmd-hide-compiled-exports';
import { $LT_GetCommandEssentials } from '@/commands/setup';
import { $LT_CollectCandidateFilesWithTags } from '@/core/collect/collect-tags';

// Mock dependencies
vi.mock('fs');
vi.mock('globby');
vi.mock('@/core/collect/collect-tags');
vi.mock('@/commands/setup');
// Don't mock path - use actual implementation for proper path handling
// vi.mock('path');
vi.mock('node:process', () => ({
    default: {
        cwd: vi.fn(() => '/test/project'),
    },
}));

// Mock ts-morph Project
const mockProject = {
    addSourceFileAtPath: vi.fn(),
    getSourceFile: vi.fn(),
};

vi.mock('ts-morph', () => ({
    Project: vi.fn(() => mockProject),
}));

describe('$LT_CMD_HideCompiledExports', () => {
    const mockLogger = {
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        success: vi.fn(),
        error: vi.fn(),
        conflict: vi.fn(),
    };

    const mockConfig = {
        tagName: 'lang',
        includes: ['src/**/*.{ts,tsx}'],
        excludes: ['node_modules'],
        cleanDistDir: 'dist',
        debug: false,
        translationArgPosition: 1 as const,
        isLibrary: false,
        localesDirectory: 'locales',
        baseLanguageCode: 'en',
        collect: {
            collector: {} as any,
            defaultNamespace: 'common',
            ignoreConflictsWithMatchingValues: true,
            onCollectConfigFix: vi.fn(({ config }) => config),
        },
        import: {
            dir: 'src/lang-libraries',
            tagImportPath: 'import { lang } from "@/lang-tag"',
            onImport: vi.fn(),
        },
        onConfigGeneration: vi.fn(),
    };

    let mockSourceFile: any;
    let mockVariableDeclarations: any[];

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock logger and config
        vi.mocked($LT_GetCommandEssentials).mockResolvedValue({
            config: mockConfig,
            logger: mockLogger,
        });

        // Setup mock file system
        vi.mocked(existsSync).mockReturnValue(true);

        // Setup mock globby - default to matching .d.ts files
        vi.mocked(globby).mockResolvedValue([
            '/test/project/dist/test.d.ts',
            '/test/project/dist/src/test.d.ts',
        ]);

        // Setup mock ts-morph Project
        mockVariableDeclarations = [];
        mockSourceFile = {
            getVariableDeclarations: vi.fn(() => mockVariableDeclarations),
            saveSync: vi.fn(),
        };

        mockProject.addSourceFileAtPath.mockReturnValue(mockSourceFile);
        mockProject.getSourceFile.mockReturnValue(mockSourceFile);
    });

    describe('Basic functionality', () => {
        it('should warn and return early if dist directory does not exist', async () => {
            vi.mocked(existsSync).mockReturnValue(false);

            await $LT_CMD_HideCompiledExports();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Dist directory does not exist: {distPath}',
                { distPath: '/test/project/dist' }
            );
            expect($LT_CollectCandidateFilesWithTags).not.toHaveBeenCalled();
        });

        it('should return early if no lang-tag variables found', async () => {
            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([]);

            await $LT_CMD_HideCompiledExports();

            expect(mockLogger.info).toHaveBeenCalledWith(
                'No lang-tag variables found in source files.'
            );
            expect(mockProject.addSourceFileAtPath).not.toHaveBeenCalled();
        });

        it('should return early if no .d.ts files found', async () => {
            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([
                {
                    relativeFilePath: 'src/test.ts',
                    tags: [
                        {
                            variableName: 'testVar',
                            fullMatch: 'const testVar = lang({});',
                            parameter1Text: '{}',
                            parameterTranslations: {},
                            parameterConfig: {},
                            validity: 'ok',
                            index: 0,
                            line: 1,
                            column: 1,
                        },
                    ],
                },
            ]);
            vi.mocked(globby).mockResolvedValue([]);

            await $LT_CMD_HideCompiledExports();

            expect(mockLogger.info).toHaveBeenCalledWith(
                'No .d.ts files found in {distPath}',
                { distPath: '/test/project/dist' }
            );
        });

        it('should remove exports of lang-tag variables from .d.ts files', async () => {
            const mockVarStatement = {
                getKindName: vi.fn(() => 'VariableStatement'),
                hasExportKeyword: vi.fn(() => true),
                toggleModifier: vi.fn(),
            };

            const mockVarDeclarationList = {
                getKindName: vi.fn(() => 'VariableDeclarationList'),
                getParent: vi.fn(() => mockVarStatement),
            };

            const mockVariableDeclaration = {
                getName: vi.fn(() => 'testVar'),
                getParent: vi.fn(() => mockVarDeclarationList),
            };

            mockVariableDeclarations.push(mockVariableDeclaration);

            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([
                {
                    relativeFilePath: 'src/test.ts',
                    tags: [
                        {
                            variableName: 'testVar',
                            fullMatch: 'const testVar = lang({});',
                            parameter1Text: '{}',
                            parameterTranslations: {},
                            parameterConfig: {},
                            validity: 'ok',
                            index: 0,
                            line: 1,
                            column: 1,
                        },
                    ],
                },
            ]);

            // Mock globby to return matching .d.ts file
            vi.mocked(globby).mockResolvedValue([
                '/test/project/dist/test.d.ts',
            ]);

            await $LT_CMD_HideCompiledExports();

            // Should match src/test.ts to dist/test.d.ts (by base name)
            expect(mockProject.addSourceFileAtPath).toHaveBeenCalledWith(
                '/test/project/dist/test.d.ts'
            );
            expect(mockSourceFile.saveSync).toHaveBeenCalled();
            expect(mockLogger.success).toHaveBeenCalledWith(
                'Hidden {hiddenCount} exports from {fileCount} files.',
                {
                    hiddenCount: 1,
                    fileCount: 1,
                }
            );
        });

        it('should hide exports of lang-tag variables from .d.ts files', async () => {
            const mockVarStatement = {
                getKindName: vi.fn(() => 'VariableStatement'),
                hasExportKeyword: vi.fn(() => true),
                toggleModifier: vi.fn(),
            };

            const mockVarDeclarationList = {
                getKindName: vi.fn(() => 'VariableDeclarationList'),
                getParent: vi.fn(() => mockVarStatement),
            };

            const mockVariableDeclaration = {
                getName: vi.fn(() => 'testVar'),
                getParent: vi.fn(() => mockVarDeclarationList),
            };

            mockVariableDeclarations.push(mockVariableDeclaration);

            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([
                {
                    relativeFilePath: 'src/test.ts',
                    tags: [
                        {
                            variableName: 'testVar',
                            fullMatch: 'const testVar = lang({});',
                            parameter1Text: '{}',
                            parameterTranslations: {},
                            parameterConfig: {},
                            validity: 'ok',
                            index: 0,
                            line: 1,
                            column: 1,
                        },
                    ],
                },
            ]);

            // Mock globby to return matching .d.ts file
            vi.mocked(globby).mockResolvedValue([
                '/test/project/dist/test.d.ts',
            ]);

            await $LT_CMD_HideCompiledExports();

            expect(mockLogger.success).toHaveBeenCalledWith(
                'Hidden {hiddenCount} exports from {fileCount} files.',
                {
                    hiddenCount: 1,
                    fileCount: 1,
                }
            );
        });

        it('should not remove non-exported variables', async () => {
            const mockVarStatement = {
                getKindName: vi.fn(() => 'VariableStatement'),
                hasExportKeyword: vi.fn(() => false), // Not exported
                toggleModifier: vi.fn(),
            };

            const mockVarDeclarationList = {
                getKindName: vi.fn(() => 'VariableDeclarationList'),
                getParent: vi.fn(() => mockVarStatement),
            };

            const mockVariableDeclaration = {
                getName: vi.fn(() => 'testVar'),
                getParent: vi.fn(() => mockVarDeclarationList),
            };

            mockVariableDeclarations.push(mockVariableDeclaration);

            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([
                {
                    relativeFilePath: 'src/test.ts',
                    tags: [
                        {
                            variableName: 'testVar',
                            fullMatch: 'const testVar = lang({});',
                            parameter1Text: '{}',
                            parameterTranslations: {},
                            parameterConfig: {},
                            validity: 'ok',
                            index: 0,
                            line: 1,
                            column: 1,
                        },
                    ],
                },
            ]);

            await $LT_CMD_HideCompiledExports();

            expect(mockSourceFile.saveSync).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([
                {
                    relativeFilePath: 'src/test.ts',
                    tags: [
                        {
                            variableName: 'testVar',
                            fullMatch: 'const testVar = lang({});',
                            parameter1Text: '{}',
                            parameterTranslations: {},
                            parameterConfig: {},
                            validity: 'ok',
                            index: 0,
                            line: 1,
                            column: 1,
                        },
                    ],
                },
            ]);

            // Mock globby to return matching .d.ts file
            vi.mocked(globby).mockResolvedValue([
                '/test/project/dist/test.d.ts',
            ]);

            const error = new Error('Test error');
            mockProject.addSourceFileAtPath.mockImplementation(() => {
                throw error;
            });

            await $LT_CMD_HideCompiledExports();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Error processing file {file}: {error}',
                {
                    file: expect.stringContaining('test.ts'),
                    error: 'Test error',
                }
            );
        });

        it('should use custom dist directory from options', async () => {
            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([]);
            vi.mocked(existsSync).mockReturnValue(false);

            await $LT_CMD_HideCompiledExports({ distDir: 'build' });

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Dist directory does not exist: {distPath}',
                { distPath: '/test/project/build' }
            );
        });

        it('should use config cleanDistDir when no option provided', async () => {
            const customConfig = {
                ...mockConfig,
                cleanDistDir: 'custom-dist',
            };
            vi.mocked($LT_GetCommandEssentials).mockResolvedValue({
                config: customConfig,
                logger: mockLogger,
            });
            vi.mocked(existsSync).mockReturnValue(false);

            await $LT_CMD_HideCompiledExports();

            expect(mockLogger.warn).toHaveBeenCalledWith(
                'Dist directory does not exist: {distPath}',
                { distPath: '/test/project/custom-dist' }
            );
        });

        it('should log debug information when debug mode is enabled', async () => {
            const debugConfig = {
                ...mockConfig,
                debug: true,
            };
            vi.mocked($LT_GetCommandEssentials).mockResolvedValue({
                config: debugConfig,
                logger: mockLogger,
            });

            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([
                {
                    relativeFilePath: 'src/test.ts',
                    tags: [
                        {
                            variableName: 'testVar',
                            fullMatch: 'const testVar = lang({});',
                            parameter1Text: '{}',
                            parameterTranslations: {},
                            parameterConfig: {},
                            validity: 'ok',
                            index: 0,
                            line: 1,
                            column: 1,
                        },
                    ],
                },
            ]);
            // Mock globby to return matching .d.ts file for debug test
            vi.mocked(globby).mockResolvedValue([
                '/test/project/dist/test.d.ts',
            ]);

            // Create mock variable declaration for debug test
            const mockVarStatement = {
                getKindName: vi.fn(() => 'VariableStatement'),
                hasExportKeyword: vi.fn(() => true),
                toggleModifier: vi.fn(),
            };

            const mockVarDeclarationList = {
                getKindName: vi.fn(() => 'VariableDeclarationList'),
                getParent: vi.fn(() => mockVarStatement),
            };

            const mockVariableDeclaration = {
                getName: vi.fn(() => 'testVar'),
                getParent: vi.fn(() => mockVarDeclarationList),
            };

            mockVariableDeclarations.push(mockVariableDeclaration);

            await $LT_CMD_HideCompiledExports();

            // Debug mode should log when exports are hidden
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Hidden exports from {file}: {variables} (from {sourceFile})',
                expect.objectContaining({
                    file: expect.any(String),
                    variables: 'testVar',
                    sourceFile: expect.any(String),
                })
            );
        });

        it('should handle multiple variable declarations in same file', async () => {
            const mockVarStatement1 = {
                getKindName: vi.fn(() => 'VariableStatement'),
                hasExportKeyword: vi.fn(() => true),
                toggleModifier: vi.fn(),
            };

            const mockVarDeclarationList1 = {
                getKindName: vi.fn(() => 'VariableDeclarationList'),
                getParent: vi.fn(() => mockVarStatement1),
            };

            const mockVar1 = {
                getName: vi.fn(() => 'testVar1'),
                getParent: vi.fn(() => mockVarDeclarationList1),
            };

            const mockVarStatement2 = {
                getKindName: vi.fn(() => 'VariableStatement'),
                hasExportKeyword: vi.fn(() => true),
                toggleModifier: vi.fn(),
            };

            const mockVarDeclarationList2 = {
                getKindName: vi.fn(() => 'VariableDeclarationList'),
                getParent: vi.fn(() => mockVarStatement2),
            };

            const mockVar2 = {
                getName: vi.fn(() => 'testVar2'),
                getParent: vi.fn(() => mockVarDeclarationList2),
            };

            mockVariableDeclarations.push(mockVar1, mockVar2);

            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([
                {
                    relativeFilePath: 'src/test.ts',
                    tags: [
                        {
                            variableName: 'testVar1',
                            fullMatch: 'const testVar1 = lang({});',
                            parameter1Text: '{}',
                            parameterTranslations: {},
                            parameterConfig: {},
                            validity: 'ok',
                            index: 0,
                            line: 1,
                            column: 1,
                        },
                        {
                            variableName: 'testVar2',
                            fullMatch: 'const testVar2 = lang({});',
                            parameter1Text: '{}',
                            parameterTranslations: {},
                            parameterConfig: {},
                            validity: 'ok',
                            index: 0,
                            line: 1,
                            column: 1,
                        },
                    ],
                },
            ]);

            // Mock globby to return matching .d.ts file
            vi.mocked(globby).mockResolvedValue([
                '/test/project/dist/test.d.ts',
            ]);

            await $LT_CMD_HideCompiledExports();

            expect(mockLogger.success).toHaveBeenCalledWith(
                'Hidden {hiddenCount} exports from {fileCount} files.',
                {
                    hiddenCount: 2,
                    fileCount: 1,
                }
            );
        });

        it('should handle multiple .d.ts files', async () => {
            vi.mocked(globby).mockResolvedValue([
                '/test/project/dist/file1.d.ts',
                '/test/project/dist/file2.d.ts',
            ]);

            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([
                {
                    relativeFilePath: 'src/file1.ts',
                    tags: [
                        {
                            variableName: 'testVar',
                            fullMatch: 'const testVar = lang({});',
                            parameter1Text: '{}',
                            parameterTranslations: {},
                            parameterConfig: {},
                            validity: 'ok',
                            index: 0,
                            line: 1,
                            column: 1,
                        },
                    ],
                },
            ]);

            let file1CallCount = 0;
            let file2CallCount = 0;

            // First file has the variable, second doesn't
            mockProject.addSourceFileAtPath.mockImplementation(
                (path: string) => {
                    if (path.includes('file1.d.ts')) {
                        file1CallCount++;
                        const mockVarStatement = {
                            getKindName: vi.fn(() => 'VariableStatement'),
                            hasExportKeyword: vi.fn(() => true),
                            toggleModifier: vi.fn(),
                        };

                        const mockVarDeclarationList = {
                            getKindName: vi.fn(() => 'VariableDeclarationList'),
                            getParent: vi.fn(() => mockVarStatement),
                        };

                        const mockVar = {
                            getName: vi.fn(() => 'testVar'),
                            getParent: vi.fn(() => mockVarDeclarationList),
                        };
                        return {
                            getVariableDeclarations: vi.fn(() => [mockVar]),
                            saveSync: vi.fn(),
                        };
                    }
                    file2CallCount++;
                    return {
                        getVariableDeclarations: vi.fn(() => []),
                        saveSync: vi.fn(),
                    };
                }
            );

            await $LT_CMD_HideCompiledExports();

            // Should only process file1.d.ts (matching src/file1.ts), not file2.d.ts
            expect(mockProject.addSourceFileAtPath).toHaveBeenCalledWith(
                '/test/project/dist/file1.d.ts'
            );
            expect(mockLogger.success).toHaveBeenCalledWith(
                'Hidden {hiddenCount} exports from {fileCount} files.',
                {
                    hiddenCount: 1,
                    fileCount: 1,
                }
            );
        });
    });
});
