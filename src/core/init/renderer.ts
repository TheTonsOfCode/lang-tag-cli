import { readFileSync } from 'fs';
import mustache from 'mustache';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { InitAnswers } from './inquirer-prompts';

export interface ConfigRenderOptions {
    answers: InitAnswers;
    moduleSystem: 'esm' | 'cjs';
}

interface TemplateData {
    isCJS: boolean;
    addComments: boolean;
    needsPathBasedImport: boolean;
    useKeeper: boolean;
    isDictionary: boolean;
    importLibraries: boolean;
    tagName: string;
    isLibrary: boolean;
    includes: string;
    excludes: string;
    localesDirectory: string;
    baseLanguageCode: string;
    hasConfigGeneration: boolean;
    usePathBased: boolean;
    useCustom: boolean;
    showConfigGenerationComment: boolean;
    defaultNamespace: string;
    showImportComment: boolean;
}

function renderTemplate(template: string, data: Record<string, any>): string {
    return mustache.render(template, data, {}, { escape: (text) => text });
}

function loadTemplate(): string {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    // Go up from src/core/init to src, then to templates/config
    const templatePath = join(
        __dirname,
        'templates',
        'config',
        'config.mustache'
    );

    try {
        return readFileSync(templatePath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to load template: ${error}`);
    }
}

function buildIncludesPattern(directories: string[]): string {
    return directories
        .map((directory) => `'${directory}/**/*.{js,ts,jsx,tsx}'`)
        .join(', ');
}

function buildExcludesPattern(): string {
    const excludes = [
        'node_modules',
        'dist',
        'build',
        '**/*.test.ts',
        '**/*.spec.ts',
    ];
    return excludes.map((e) => `'${e}'`).join(', ');
}

function prepareTemplateData(options: ConfigRenderOptions): TemplateData {
    const { answers, moduleSystem } = options;

    const needsPathBasedImport =
        answers.configGeneration.enabled &&
        answers.configGeneration.useAlgorithm === 'path-based';

    const hasConfigGeneration = answers.configGeneration.enabled;
    const usePathBased =
        hasConfigGeneration &&
        answers.configGeneration.useAlgorithm === 'path-based';
    const useCustom =
        hasConfigGeneration &&
        answers.configGeneration.useAlgorithm === 'custom';
    const showConfigGenerationComment =
        !hasConfigGeneration && answers.addCommentGuides;
    const showImportComment =
        !answers.importLibraries && answers.addCommentGuides;

    return {
        isCJS: moduleSystem === 'cjs',
        addComments: answers.addCommentGuides,
        needsPathBasedImport,
        useKeeper: answers.configGeneration.keepVariables || false,
        isDictionary: answers.collectorType === 'dictionary',
        importLibraries: answers.importLibraries,
        tagName: answers.tagName,
        isLibrary: answers.projectType === 'library',
        includes: buildIncludesPattern(answers.includeDirectories),
        excludes: buildExcludesPattern(),
        localesDirectory: answers.localesDirectory,
        baseLanguageCode: answers.baseLanguageCode,
        hasConfigGeneration,
        usePathBased,
        useCustom,
        showConfigGenerationComment,
        defaultNamespace:
            answers.namespaceOptions?.defaultNamespace || 'common',
        showImportComment,
    };
}

export function renderConfigTemplate(options: ConfigRenderOptions): string {
    const template = loadTemplate();
    const templateData = prepareTemplateData(options);

    return renderTemplate(template, templateData);
}
