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
    needsTagName: boolean;
    tagName: string;
    isLibrary: boolean;
    includes: string;
    excludes: string;
    localesDirectory: string;
    baseLanguageCode: string;
    hasConfigGeneration: boolean;
    usePathBased: boolean;
    useCustom: boolean;
    defaultNamespace: string;
    interfereWithCollection: boolean;
}

function renderTemplate(
    template: string,
    data: Record<string, any>,
    partials?: Record<string, string>
): string {
    return mustache.render(template, data, partials, {
        escape: (text) => text,
    });
}

function loadTemplateFile(
    filename: string,
    required: boolean = true
): string | null {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    // After build path
    let templatePath = join(__dirname, 'templates', 'config', filename);

    try {
        return readFileSync(templatePath, 'utf-8');
    } catch {
        // Try sources (tests purposes)
        templatePath = join(
            __dirname,
            '..',
            '..',
            'templates',
            'config',
            filename
        );
        try {
            return readFileSync(templatePath, 'utf-8');
        } catch (error) {
            if (required) {
                throw new Error(
                    `Failed to load template "${filename}": ${error}`
                );
            }
            return null;
        }
    }
}

function loadTemplate(): string {
    return loadTemplateFile('config.mustache', true)!;
}

function loadPartials(): Record<string, string> {
    const partials: Record<string, string> = {};

    const generationAlgorithm = loadTemplateFile(
        'generation-algorithm.mustache',
        false
    );
    if (generationAlgorithm) {
        partials['generation-algorithm'] = generationAlgorithm;
    }

    return partials;
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

    const needsTagName =
        answers.tagName !== 'lang' && answers.projectType === 'library';

    return {
        isCJS: moduleSystem === 'cjs',
        addComments: answers.addCommentGuides,
        needsPathBasedImport,
        useKeeper: answers.configGeneration.keepVariables || false,
        isDictionary: answers.collectorType === 'dictionary',
        importLibraries: answers.importLibraries,
        needsTagName,
        tagName: answers.tagName,
        isLibrary: answers.projectType === 'library',
        includes: buildIncludesPattern(answers.includeDirectories),
        excludes: buildExcludesPattern(),
        localesDirectory: answers.localesDirectory,
        baseLanguageCode: answers.baseLanguageCode,
        hasConfigGeneration,
        usePathBased,
        useCustom,
        defaultNamespace:
            answers.namespaceOptions?.defaultNamespace || 'common',
        interfereWithCollection: answers.interfereWithCollection,
    };
}

export function renderConfigTemplate(options: ConfigRenderOptions): string {
    const template = loadTemplate();
    const templateData = prepareTemplateData(options);
    const partials = loadPartials();

    return renderTemplate(template, templateData, partials);
}
