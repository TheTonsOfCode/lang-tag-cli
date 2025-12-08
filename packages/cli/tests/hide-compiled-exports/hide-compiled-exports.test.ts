import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $LT_CMD_HideCompiledExports } from '@/commands/cmd-hide-compiled-exports';
import { $LT_GetCommandEssentials } from '@/commands/setup';
import { $LT_CollectCandidateFilesWithTags } from '@/core/collect/collect-tags';
import { LangTagCLIProcessedTag } from '@/type';

// Mock dependencies
vi.mock('@/core/collect/collect-tags');
vi.mock('@/commands/setup');

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DISTS_DIR = join(__dirname, 'dists');
const TEST_DIST_DIR = join(__dirname, 'test-dist');

/**
 * Helper function to create a tag object with default values for common properties
 * and custom values for properties that differ
 */
function createTag(overrides: {
    variableName: string;
    index?: number;
    line?: number;
    column?: number;
    fullMatch?: string;
    parameter1Text?: string;
    parameterTranslations?: any;
    parameterConfig?: any;
    validity?: LangTagCLIProcessedTag['validity'];
}): LangTagCLIProcessedTag {
    const {
        variableName,
        index = 0,
        line = 1,
        column = 1,
        fullMatch = `const ${variableName} = lang({});`,
        parameter1Text = '{}',
        parameterTranslations = {},
        parameterConfig = {},
        validity = 'ok',
    } = overrides;

    return {
        variableName,
        fullMatch,
        parameter1Text,
        parameterTranslations,
        parameterConfig,
        validity,
        index,
        line,
        column,
    } as LangTagCLIProcessedTag;
}

/**
 * Helper function to create a file with tags
 */
function createFileWithTags(
    relativeFilePath: string,
    tags: Array<{
        variableName: string;
        index?: number;
        line?: number;
        column?: number;
        fullMatch?: string;
        parameter1Text?: string;
        parameterTranslations?: any;
        parameterConfig?: any;
        validity?: LangTagCLIProcessedTag['validity'];
    }>
) {
    return {
        relativeFilePath,
        tags: tags.map((tag) => createTag(tag)),
    };
}

describe('hide-compiled-exports e2e tests', () => {
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
        hideDistDir: 'dist',
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

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock logger and config
        vi.mocked($LT_GetCommandEssentials).mockResolvedValue({
            config: mockConfig,
            logger: mockLogger,
        });

        // Clean up test dist directory
        if (existsSync(TEST_DIST_DIR)) {
            rmSync(TEST_DIST_DIR, { recursive: true, force: true });
        }
        mkdirSync(TEST_DIST_DIR, { recursive: true });
    });

    afterEach(() => {
        // Clean up test dist directory
        if (existsSync(TEST_DIST_DIR)) {
            rmSync(TEST_DIST_DIR, { recursive: true, force: true });
        }
    });

    describe('dist1 - single file with lang-tag variables', () => {
        it('should hide exports of lang-tag variables', async () => {
            // Copy dist1 to test dist
            cpSync(join(DISTS_DIR, 'dist1'), TEST_DIST_DIR, {
                recursive: true,
            });

            // Mock collect to return testVar as lang-tag variable
            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([
                createFileWithTags('src/test.ts', [
                    { variableName: 'testVar' },
                ]),
            ]);

            // Change working directory to test directory
            const originalCwd = process.cwd();
            process.chdir(__dirname);

            try {
                await $LT_CMD_HideCompiledExports({ distDir: 'test-dist' });

                // Read the modified file
                const modifiedContent = readFileSync(
                    join(TEST_DIST_DIR, 'test.d.ts'),
                    'utf-8'
                );

                // Check that testVar export was removed
                expect(modifiedContent).not.toContain(
                    'export declare const testVar'
                );
                expect(modifiedContent).toContain('declare const testVar');

                // Check that otherVar export was NOT removed (not a lang-tag)
                expect(modifiedContent).toContain(
                    'export declare const otherVar'
                );
            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('dist2 - multiple lang-tag variables', () => {
        it('should hide multiple exports of lang-tag variables', async () => {
            // Copy dist2 to test dist
            cpSync(join(DISTS_DIR, 'dist2'), TEST_DIST_DIR, {
                recursive: true,
            });

            // Mock collect to return multiple lang-tag variables
            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([
                createFileWithTags('src/multiple.ts', [
                    { variableName: 'translations1', index: 0, line: 1 },
                    { variableName: 'translations2', index: 1, line: 2 },
                ]),
            ]);

            const originalCwd = process.cwd();
            process.chdir(__dirname);

            try {
                await $LT_CMD_HideCompiledExports({ distDir: 'test-dist' });

                const modifiedContent = readFileSync(
                    join(TEST_DIST_DIR, 'multiple.d.ts'),
                    'utf-8'
                );

                // Check that both lang-tag exports were removed
                expect(modifiedContent).not.toContain(
                    'export declare const translations1'
                );
                expect(modifiedContent).toContain(
                    'declare const translations1'
                );
                expect(modifiedContent).not.toContain(
                    'export declare const translations2'
                );
                expect(modifiedContent).toContain(
                    'declare const translations2'
                );

                // Check that notLangTag export was NOT removed
                expect(modifiedContent).toContain(
                    'export declare const notLangTag'
                );
            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('dist3 - nested directory structure', () => {
        it('should handle nested directory structure', async () => {
            // Copy dist3 to test dist
            cpSync(join(DISTS_DIR, 'dist3'), TEST_DIST_DIR, {
                recursive: true,
            });

            // Mock collect to return nestedVar as lang-tag variable
            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([
                createFileWithTags('src/nested/file.ts', [
                    { variableName: 'nestedVar' },
                ]),
            ]);

            const originalCwd = process.cwd();
            process.chdir(__dirname);

            try {
                await $LT_CMD_HideCompiledExports({ distDir: 'test-dist' });

                const modifiedContent = readFileSync(
                    join(TEST_DIST_DIR, 'nested', 'file.d.ts'),
                    'utf-8'
                );

                // Check that nestedVar export was removed
                expect(modifiedContent).not.toContain(
                    'export declare const nestedVar'
                );
                expect(modifiedContent).toContain('declare const nestedVar');

                // Check that regularExport was NOT removed
                expect(modifiedContent).toContain(
                    'export declare const regularExport'
                );
            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('dist4 - no matching lang-tag variables', () => {
        it('should not modify file when no lang-tag variables match', async () => {
            // Copy dist4 to test dist
            cpSync(join(DISTS_DIR, 'dist4'), TEST_DIST_DIR, {
                recursive: true,
            });

            // Mock collect to return different variable names
            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([
                createFileWithTags('src/other.ts', [
                    { variableName: 'differentVar' },
                ]),
            ]);

            const originalCwd = process.cwd();
            process.chdir(__dirname);

            try {
                const originalContent = readFileSync(
                    join(TEST_DIST_DIR, 'no-matches.d.ts'),
                    'utf-8'
                );

                await $LT_CMD_HideCompiledExports({ distDir: 'test-dist' });

                const modifiedContent = readFileSync(
                    join(TEST_DIST_DIR, 'no-matches.d.ts'),
                    'utf-8'
                );

                // File should remain unchanged
                expect(modifiedContent).toBe(originalContent);
                expect(modifiedContent).toContain(
                    'export declare const someOtherVar'
                );
                expect(modifiedContent).toContain(
                    'export declare const anotherVar'
                );
            } finally {
                process.chdir(originalCwd);
            }
        });
    });

    describe('dist5 - mixed export declarations', () => {
        it('should handle both "export declare const" and "export const"', async () => {
            // Copy dist5 to test dist
            cpSync(join(DISTS_DIR, 'dist5'), TEST_DIST_DIR, {
                recursive: true,
            });

            // Mock collect to return lang-tag variables
            // Note: relativeFilePath should match the .d.ts file name for matching to work
            vi.mocked($LT_CollectCandidateFilesWithTags).mockResolvedValue([
                createFileWithTags('src/mixed-exports.ts', [
                    { variableName: 'langTagVar', index: 0, line: 1 },
                    { variableName: 'anotherLangTag', index: 1, line: 2 },
                ]),
            ]);

            const originalCwd = process.cwd();
            process.chdir(__dirname);

            try {
                await $LT_CMD_HideCompiledExports({ distDir: 'test-dist' });

                const modifiedContent = readFileSync(
                    join(TEST_DIST_DIR, 'mixed-exports.d.ts'),
                    'utf-8'
                );

                // Check that lang-tag exports were removed
                expect(modifiedContent).not.toContain(
                    'export declare const langTagVar'
                );
                expect(modifiedContent).toContain('declare const langTagVar');
                expect(modifiedContent).not.toContain(
                    'export declare const anotherLangTag'
                );
                expect(modifiedContent).toContain(
                    'declare const anotherLangTag'
                );

                // Check that regularExport was NOT removed (different syntax, not lang-tag)
                expect(modifiedContent).toContain('export const regularExport');
            } finally {
                process.chdir(originalCwd);
            }
        });
    });
});
