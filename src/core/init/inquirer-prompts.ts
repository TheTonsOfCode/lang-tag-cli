import checkbox from '@inquirer/checkbox';
import confirm from '@inquirer/confirm';
import input from '@inquirer/input';
import select from '@inquirer/select';

import { detectProjectDirectories } from './detect-directories';

export interface InitAnswers {
    projectType: 'project' | 'library';
    tagName: string;
    collectorType: 'dictionary' | 'namespace';
    namespaceOptions?: {
        modifyNamespaceOptions: boolean;
        defaultNamespace?: string;
    };
    localesDirectory: string;
    configGeneration: {
        enabled: boolean;
        useAlgorithm?: 'custom' | 'path-based';
        keepVariables?: boolean;
    };
    importLibraries: boolean;
    interfereWithCollection: boolean;
    includeDirectories: string[];
    baseLanguageCode: string;
    addCommentGuides: boolean;
}

export async function askProjectSetupQuestions(): Promise<InitAnswers> {
    const projectType = await select<'project' | 'library'>({
        message: 'Is this a project or a library?',
        choices: [
            {
                name: 'Project (application that consumes translations)',
                value: 'project',
                description: 'For applications that use translations',
            },
            {
                name: 'Library (exports translations for other projects)',
                value: 'library',
                description: 'For packages that provide translations',
            },
        ],
    });

    const tagName = await input({
        message: 'What name would you like for your translation tag function?',
        default: 'lang',
    });

    let collectorType: 'dictionary' | 'namespace' = 'namespace';
    let namespaceOptions: InitAnswers['namespaceOptions'];
    let localesDirectory = 'locales';

    const modifyNamespaceOptions = false;

    if (projectType === 'project') {
        collectorType = await select<'dictionary' | 'namespace'>({
            message: 'How would you like to collect translations?',
            choices: [
                {
                    name: 'Namespace (organized by modules/features)',
                    value: 'namespace',
                    description: 'Organized structure with namespaces',
                },
                {
                    name: 'Dictionary (flat structure, all translations in one file)',
                    value: 'dictionary',
                    description: 'Simple flat dictionary structure',
                },
            ],
        });

        if (collectorType === 'namespace') {
            // Note: for now, we don't have options for namespace
            // const modifyNamespaceOptions = await confirm({
            //     message: 'Would you like to customize namespace options?',
            //     default: false,
            // });
        }

        localesDirectory = await input({
            message: 'Where should the translation files be stored?',
            default: 'public/locales',
        });
    }

    const defaultNamespace = await input({
        message: 'Default namespace for tags without explicit namespace:',
        default: 'common',
    });

    namespaceOptions = {
        modifyNamespaceOptions,
        defaultNamespace,
    };

    const enableConfigGeneration = await confirm({
        message: 'Do you want to script config generation for tags?',
        default: projectType === 'project',
    });

    let configGeneration: InitAnswers['configGeneration'] = {
        enabled: enableConfigGeneration,
    };

    if (enableConfigGeneration) {
        const algorithmChoice = await select<'path-based' | 'custom'>({
            message: 'Which config generation approach would you like?',
            choices: [
                {
                    name: 'Path-based (automatic based on file structure)',
                    value: 'path-based',
                    description:
                        'Generates namespace and path from file location',
                },
                {
                    name: 'Custom (write your own algorithm)',
                    value: 'custom',
                    description: 'Implement custom config generation logic',
                },
            ],
        });

        const keepVariables = await confirm({
            message:
                'Add a keeper mechanism that locks parts of the configuration from being overwritten?',
            default: true,
        });

        configGeneration = {
            enabled: true,
            useAlgorithm: algorithmChoice,
            keepVariables,
        };
    }

    const importLibraries = await confirm({
        message:
            'Do you plan to import translation tags from external libraries?',
        default: projectType === 'project',
    });

    const interfereWithCollection = await confirm({
        message:
            'Do you want to interfere with collection mechanisms (conflict resolution, collection finish)?',
        default: false,
    });

    const detectedDirectories = detectProjectDirectories();
    const includeDirectories = await checkbox<string>({
        message:
            'Select directories where lang tags will be used (you can add more later):',
        choices: detectedDirectories.map((directory: string) => ({
            name: directory,
            value: directory,
            checked: directory === 'src' || detectedDirectories.length === 1,
        })),
        required: true,
    });

    const baseLanguageCode = await input({
        message: 'Base language code:',
        default: 'en',
        validate: (value: string) => {
            if (!value || value.length < 2) {
                return 'Please enter a valid language code (e.g., en, pl, fr, de, es)';
            }
            return true;
        },
    });

    const addCommentGuides = await confirm({
        message: 'Would you like guides in comments?',
        default: true,
    });

    return {
        projectType,
        tagName,
        collectorType,
        namespaceOptions,
        localesDirectory,
        configGeneration,
        importLibraries,
        interfereWithCollection,
        includeDirectories,
        baseLanguageCode,
        addCommentGuides,
    };
}
