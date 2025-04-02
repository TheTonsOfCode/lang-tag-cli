import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {collectTranslations} from '@/cli/commands/collect';
import {EXPORTS_FILE_NAME} from '@/cli/constants';
import {LangTagConfig} from '@/cli/config';
import {readConfig} from '@/cli/commands/utils/read-config';
import {findLangTags} from '@/cli/processor';
import {ensureDirectoryExists, readJSON, writeJSON} from '@/cli/commands/utils/file';
import {readFileSync} from 'fs';
import {resolve} from 'pathe';
import {globby} from 'globby';
import JSON5 from 'json5';
import * as process from 'node:process';
import {messageErrorInFile} from "@/cli/message.ts";

vi.mock('json5', () => {
    return {
        default: {
            parse: vi.fn()
        },
        parse: vi.fn()
    }
});

vi.mock('@/cli/config', () => ({
    readConfig: vi.fn()
}));

vi.mock('@/cli/processor', () => ({
    findLangTags: vi.fn()
}));

vi.mock('@/cli/commands/utils/file', () => ({
    writeJSON: vi.fn(),
    readJSON: vi.fn(),
    logTagError: vi.fn(),
    ensureDirectoryExists: vi.fn()
}));

vi.mock('fs/promises', () => ({
    mkdir: vi.fn(),
    writeFile: vi.fn()
}));

vi.mock('fs', () => ({
    readFileSync: vi.fn()
}));

vi.mock('pathe', () => ({
    resolve: vi.fn()
}));

vi.mock('globby', () => ({
    globby: vi.fn()
}));

vi.mock('node:process', () => ({
    cwd: vi.fn()
}));

describe('collectTranslations', () => {
    const mockConfig = {
        tagName: 'lang',
        includes: ['src/**/*.ts'],
        excludes: ['node_modules'],
        outputDir: 'locales/en',
        language: 'en',
        isLibrary: false,
        translationArgPosition: 1 as 1 | 2,
        importDir: 'src/lang-libraries',
        onConfigGeneration: (params: any) => params.config
    } as unknown as LangTagConfig;

    const mockTags = [
        {
            fullMatch: 'lang({ "key": "value" }, { "namespace": "test" })',
            content1: '{ "key": "value" }',
            content2: '{ "namespace": "test" }',
            index: 0,
            file: '/project/src/file1.ts'
        }
    ];

    beforeEach(() => {
        vi.resetAllMocks();

        vi.mocked(readConfig).mockResolvedValue(mockConfig);
        vi.mocked(findLangTags).mockReturnValue(mockTags);
        vi.mocked(writeJSON).mockResolvedValue(undefined);
        vi.mocked(readJSON).mockResolvedValue({});
        vi.mocked(ensureDirectoryExists).mockResolvedValue(undefined);
        vi.mocked(resolve).mockImplementation((...args) => args.join('/').replace(/\/+/g, '/'));
        vi.mocked(globby).mockResolvedValue(['/project/src/file1.ts']);
        vi.mocked(process.cwd).mockReturnValue('/project');
        vi.mocked(readFileSync).mockReturnValue('mock content');

        const jsonParser = (str: string) => {
            if (str === '{ invalid json }') {
                throw new Error('Invalid JSON');
            }
            if (str === '') {
                return null;
            }
            if (str === '{ "key": "value" }') {
                return { key: 'value' };
            }
            if (str === '{ "namespace": "test" }') {
                return { namespace: 'test' };
            }
            return {};
        };
        
        if (JSON5.parse) {
            // @ts-ignore
            vi.mocked(JSON5.parse).mockImplementation(jsonParser);
        }

        // @ts-ignore
        if (JSON5.default?.parse) {
            // @ts-ignore
            vi.mocked(JSON5.default.parse).mockImplementation(jsonParser);
        }

        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should collect translations from source files', async () => {
        await collectTranslations(false);

        expect(readConfig).toHaveBeenCalledWith('/project');
        expect(findLangTags).toHaveBeenCalledWith(mockConfig, 'mock content');
        expect(writeJSON).toHaveBeenCalledWith(
            '/project/locales/en/test.json',
            expect.objectContaining({
                key: 'value'
            })
        );
    });

    it('should handle library mode correctly', async () => {
        const libraryConfig = {...mockConfig, isLibrary: true};
        vi.mocked(readConfig).mockResolvedValue(libraryConfig);

        await collectTranslations(false);

        expect(writeJSON).toHaveBeenCalledWith(
            EXPORTS_FILE_NAME,
            expect.objectContaining({
                language: 'en',
                namespaces: expect.objectContaining({
                    test: expect.objectContaining({
                        key: 'value'
                    })
                })
            })
        );
    });

    it('should merge translations with existing ones', async () => {
        const existingTranslations = {
            existing: 'translation'
        };
        vi.mocked(readJSON).mockResolvedValue(existingTranslations);

        await collectTranslations(false);

        expect(writeJSON).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                existing: 'translation',
                key: 'value'
            })
        );
    });

    it('should handle translation argument position correctly', async () => {
        const configPos2 = {...mockConfig, translationArgPosition: 2 as 1 | 2};
        vi.mocked(readConfig).mockResolvedValue(configPos2);

        const swappedTags = [{
            ...mockTags[0],
            content1: '{ "namespace": "test" }',
            content2: '{ "key": "value" }'
        }];
        vi.mocked(findLangTags).mockReturnValue(swappedTags);
        
        await collectTranslations(false);

        expect(writeJSON).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                key: 'value'
            })
        );
    });

    it('should handle invalid JSON in translations', async () => {
        const invalidTags = [{
            ...mockTags[0],
            content1: '{ invalid json }',
            file: '/project/src/file1.ts'
        }];
        vi.mocked(findLangTags).mockReturnValue(invalidTags);

        await expect(collectTranslations(false)).rejects.toThrow('Invalid JSON');
    });

    it('should handle missing translations argument', async () => {
        const invalidTags = [{
            ...mockTags[0],
            content1: '',
            file: '/project/src/file1.ts'
        }];
        vi.mocked(findLangTags).mockReturnValue(invalidTags);

        await expect(collectTranslations(false)).rejects.toThrow('Translations not found');
        expect(messageErrorInFile).toHaveBeenCalled();
    });

    it('should handle empty files list', async () => {
        vi.mocked(globby).mockResolvedValue([]);

        await collectTranslations(false);

        expect(writeJSON).not.toHaveBeenCalled();
    });
});
