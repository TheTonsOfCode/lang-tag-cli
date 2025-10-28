import { describe, expect, it } from 'vitest';

import { InitAnswers } from '@/core/init/inquirer-prompts';
import { renderConfigTemplate } from '@/core/init/renderer';

describe('Config Renderer', () => {
    it('should render basic config for ESM project with namespace collector', () => {
        const answers: InitAnswers = {
            projectType: 'project',
            collectorType: 'namespace',
            namespaceOptions: {
                modifyOptions: false,
                defaultNamespace: 'common',
            },
            configGeneration: {
                enabled: true,
                useAlgorithm: 'path-based',
                keepVariables: true,
            },
            importLibraries: false,
            interfereWithCollection: false,
            includeDirectories: ['src'],
            addCommentGuides: true,
            tagName: 'lang',
            baseLanguageCode: 'en',
            localesDirectory: 'public/locales',
        };

        const result = renderConfigTemplate({
            answers,
            moduleSystem: 'esm',
        });

        expect(result).toContain(
            'import { pathBasedConfigGenerator, configKeeper } from'
        );
        expect(result).toContain("tagName: 'lang'");
        expect(result).toContain('isLibrary: false');
        expect(result).toContain("defaultNamespace: 'common'");
        expect(result).toContain('export default config;');
        expect(result).toContain('onConfigGeneration: async event =>');
    });

    it('should render config for CJS library with dictionary collector', () => {
        const answers: InitAnswers = {
            projectType: 'library',
            collectorType: 'dictionary',
            configGeneration: {
                enabled: false,
            },
            importLibraries: false,
            interfereWithCollection: false,
            includeDirectories: ['src', 'lib'],
            addCommentGuides: false,
            tagName: 't',
            baseLanguageCode: 'en',
            localesDirectory: 'locales',
        };

        const result = renderConfigTemplate({
            answers,
            moduleSystem: 'cjs',
        });

        expect(result).toContain('const { DictionaryCollector } = require');
        expect(result).toContain("tagName: 't'");
        expect(result).toContain('isLibrary: true');
        expect(result).toContain('collector: new DictionaryCollector()');
        expect(result).toContain('module.exports = config;');
        expect(result).not.toContain('onConfigGeneration');
    });

    it('should render config with import libraries', () => {
        const answers: InitAnswers = {
            projectType: 'project',
            collectorType: 'namespace',
            namespaceOptions: {
                modifyOptions: false,
                defaultNamespace: 'common',
            },
            configGeneration: {
                enabled: false,
            },
            importLibraries: true,
            interfereWithCollection: false,
            includeDirectories: ['src'],
            addCommentGuides: false,
            tagName: 'lang',
            baseLanguageCode: 'en',
            localesDirectory: 'public/locales',
        };

        const result = renderConfigTemplate({
            answers,
            moduleSystem: 'esm',
        });

        expect(result).toContain('import { flexibleImportAlgorithm } from');
        expect(result).toContain('import: {');
        expect(result).toContain('onImport: flexibleImportAlgorithm');
    });

    it('should render config with custom algorithm', () => {
        const answers: InitAnswers = {
            projectType: 'project',
            collectorType: 'namespace',
            namespaceOptions: {
                modifyOptions: true,
                defaultNamespace: 'translations',
            },
            configGeneration: {
                enabled: true,
                useAlgorithm: 'custom',
                keepVariables: false,
            },
            importLibraries: false,
            interfereWithCollection: false,
            includeDirectories: ['src'],
            addCommentGuides: true,
            tagName: 'lang',
            baseLanguageCode: 'pl',
            localesDirectory: 'public/locales',
        };

        const result = renderConfigTemplate({
            answers,
            moduleSystem: 'esm',
        });

        expect(result).toContain('onConfigGeneration: async event =>');
        expect(result).toContain(
            'TODO: Implement your custom config generation logic here'
        );
        expect(result).not.toContain('pathBasedConfigGenerator');
        expect(result).toContain("defaultNamespace: 'translations'");
        expect(result).toContain("baseLanguageCode: 'pl'");
    });

    it('should include comment guides when enabled', () => {
        const answers: InitAnswers = {
            projectType: 'project',
            collectorType: 'namespace',
            namespaceOptions: {
                modifyOptions: false,
                defaultNamespace: 'common',
            },
            configGeneration: {
                enabled: true,
                useAlgorithm: 'path-based',
                keepVariables: true,
            },
            importLibraries: false,
            interfereWithCollection: false,
            includeDirectories: ['src'],
            addCommentGuides: true,
            tagName: 'lang',
            baseLanguageCode: 'en',
            localesDirectory: 'public/locales',
        };

        const result = renderConfigTemplate({
            answers,
            moduleSystem: 'esm',
        });

        expect(result).toContain('/**');
        expect(result).toContain('Lang Tag CLI Configuration');
        expect(result).toContain('// Advanced: Use pathRules');
    });

    it('should handle multiple include directories', () => {
        const answers: InitAnswers = {
            projectType: 'project',
            collectorType: 'namespace',
            namespaceOptions: {
                modifyOptions: false,
                defaultNamespace: 'common',
            },
            configGeneration: {
                enabled: false,
            },
            importLibraries: false,
            interfereWithCollection: false,
            includeDirectories: ['src', 'app', 'pages', 'components'],
            addCommentGuides: false,
            tagName: 'lang',
            baseLanguageCode: 'en',
            localesDirectory: 'public/locales',
        };

        const result = renderConfigTemplate({
            answers,
            moduleSystem: 'esm',
        });

        expect(result).toContain("'src/**/*.{js,ts,jsx,tsx}'");
        expect(result).toContain("'app/**/*.{js,ts,jsx,tsx}'");
        expect(result).toContain("'pages/**/*.{js,ts,jsx,tsx}'");
        expect(result).toContain("'components/**/*.{js,ts,jsx,tsx}'");
    });
});
