import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mustache from 'mustache';

// Interface for required options to render templates
export interface InitTagRenderOptions {
    tagName: string;
    isLibrary: boolean;
    isReact: boolean;
    isTypeScript: boolean;
    fileExtension: string;
    packageName: string;
    packageVersion: string;
}

// Template data interface
interface TemplateData extends InitTagRenderOptions {
    tmpVariables: {
        key: string;
        username: string;
        processRegex: string;
    };
}

// Use mustache for template rendering
function renderTemplate(template: string, data: Record<string, any>): string {
    return mustache.render(template, data, {}, { escape: (text) => text });
}

// Load template file
function loadTemplate(templateName: string): string {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const templatePath = join(__dirname, 'template', `${templateName}.mustache`);
    
    try {
        return readFileSync(templatePath, 'utf-8');
    } catch (error) {
        throw new Error(`Failed to load template ${templateName}: ${error}`);
    }
}

// Prepare template data from options
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

// Main render function
export function renderInitTagTemplates(options: InitTagRenderOptions): string {
    // Load both templates
    const baseTemplate = loadTemplate('base');
    const placeholderTemplate = loadTemplate('placeholder');
    
    // Prepare template data
    const templateData = prepareTemplateData(options);
    
    // Render both templates
    const renderedBase = renderTemplate(baseTemplate, templateData);
    const renderedPlaceholders = renderTemplate(placeholderTemplate, templateData);
    
    // Combine templates
    return renderedBase + '\n\n' + renderedPlaceholders;
}
