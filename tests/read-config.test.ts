import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { $LT_ReadConfig } from '@/core/io/read-config.ts';
import { CONFIG_FILE_NAME } from '@/core/constants.ts';
import { resolve } from 'pathe';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import {LANG_TAG_DEFAULT_CONFIG} from "@/config.ts";

const defaultConfig = LANG_TAG_DEFAULT_CONFIG;

// Mock dependencies
vi.mock('fs');
vi.mock('pathe');
vi.mock('url');

describe('readConfig', () => {
    const projectPath = '/fake/project';
    const expectedConfigPath = '/fake/project/.lang-tag.config.js';
    const configUrl = 'file:///fake/project/.lang-tag.config.js';

    beforeEach(() => {
        vi.resetAllMocks();

        // Setup mocks for path resolution and URL conversion
        vi.mocked(resolve).mockImplementation((...args) => args.join('/').replace(/\/\/+/g, '/'));
        vi.mocked(pathToFileURL).mockImplementation((path) => ({ href: configUrl }) as any);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should throw error if config file does not exist', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        await expect($LT_ReadConfig(projectPath)).rejects.toThrow(
            `No "${CONFIG_FILE_NAME}" detected`
        );
        expect(fs.existsSync).toHaveBeenCalledWith(expectedConfigPath);
    });

    it('should read and merge user config with default config if file exists', async () => {
        const userConfig = {
            tagName: 'myLang',
            outputDir: 'custom/locales',
            import: { dir: 'custom/imports' }
        };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        
        await vi.doMock(configUrl, () => ({
            default: userConfig
        }));

        const config = await $LT_ReadConfig(projectPath);

        expect(fs.existsSync).toHaveBeenCalledWith(expectedConfigPath);
        expect(config).toEqual({
            ...defaultConfig,
            ...userConfig,
            import: {
                ...defaultConfig.import,
                ...userConfig.import,
            }
        });
    });

    it('should throw error if config file exists but has no default export', async () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        
        // Mock the module to have a default export that is undefined
        await vi.doMock(configUrl, () => ({
            default: undefined
        }));

        await expect($LT_ReadConfig(projectPath)).rejects.toThrow(
            'Config found, but default export is undefined'
        );
        expect(fs.existsSync).toHaveBeenCalledWith(expectedConfigPath);
    });

    it('should correctly merge partial user config', async () => {
        const partialUserConfig = {
            language: 'fr',
            // Missing other fields like tagName, includes, excludes, outputDir, etc.
        };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        
        await vi.doMock(configUrl, () => ({
            default: partialUserConfig
        }));

        const config = await $LT_ReadConfig(projectPath);

        expect(config.language).toBe('fr');
        expect(config.tagName).toBe(defaultConfig.tagName);
        expect(config.outputDir).toBe(defaultConfig.outputDir);
        expect(config.import.dir).toBe(defaultConfig.import.dir);
    });

    it('should handle user config with partial nested import config', async () => {
        const partialImportConfig = {
            import: {
                tagImportPath: 'import { customTag } from "custom/path"',
                // Missing 'dir' and 'onImport'
            }
        };
        vi.mocked(fs.existsSync).mockReturnValue(true);
        
        await vi.doMock(configUrl, () => ({
            default: partialImportConfig
        }));

        const config = await $LT_ReadConfig(projectPath);

        expect(config.import.tagImportPath).toBe('import { customTag } from "custom/path"');
        expect(config.import.dir).toBe(defaultConfig.import.dir);
        expect(config.import.onImport).toBe(defaultConfig.import.onImport);
    });
}); 