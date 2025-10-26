import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mustache from 'mustache';

export interface InitTagRenderOptions {
    tagName: string;
    isLibrary: boolean;
    isReact: boolean;
    isTypeScript: boolean;
    fileExtension: string;
    packageName: string;
    packageVersion: string;
}

interface TemplateData extends InitTagRenderOptions {
    tmpVariables: {
        key: string;
        username: string;
        processRegex: string;
    };
}

function renderTemplate(template: string, data: Record<string, any>): string {
    return mustache.render(template, data, {}, { escape: (text) => text });
}

function loadTemplate(templateName: string): string {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const templatePath = join(__dirname, 'templates', 'tag', `${templateName}.mustache`);
    
    try {
        return readFileSync(templatePath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to load template ${templateName}: ${error}`);
    }
}

function prepareTemplateData(options: InitTagRenderOptions): TemplateData {
    return {
        ...options,
        tmpVariables: {
            key: '{{key}}',
            username: '{{username}}',
            processRegex: '{{(.*?)}}',
        }
    };
}

export function renderInitTagTemplates(options: InitTagRenderOptions): string {
    const baseTemplateName = options.isLibrary ? 'base-library' : 'base-app';
    const baseTemplate = loadTemplate(baseTemplateName);
    const placeholderTemplate = loadTemplate('placeholder');
    const templateData = prepareTemplateData(options);
    
    const renderedBase = renderTemplate(baseTemplate, templateData);
    const renderedPlaceholders = renderTemplate(placeholderTemplate, templateData);
    
    return renderedBase + '\n\n' + renderedPlaceholders;
}