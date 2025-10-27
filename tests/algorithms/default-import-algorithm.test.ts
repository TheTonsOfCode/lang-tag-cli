import { describe, it, expect, vi } from 'vitest';
import { defaultImportAlgorithm } from '../../src/algorithms/import/default-import-algorithm';
import { LangTagCLIImportEvent } from '../../src/config';

// Helper function to create a mock event
function createMockEvent(
    exports: Array<{ packageJSON: any; exportData: any }>,
    debug: boolean = false
): LangTagCLIImportEvent {
    const importedFiles: any[] = [];
    
    return {
        exports,
        logger: {
            config: { debug },
            info: vi.fn(),
            warn: vi.fn(),
            success: vi.fn(),
            error: vi.fn(),
        },
        langTagConfig: {
            debug
        },
        importTag: vi.fn((pathRelativeToImportDir: string, tag: any) => {
            let importedFile = importedFiles.find(file => file.pathRelativeToImportDir === pathRelativeToImportDir);
            if (!importedFile) {
                importedFile = { pathRelativeToImportDir, tags: [] };
                importedFiles.push(importedFile);
            }
            importedFile.tags.push(tag);
        }),
    } as any;
}

// Helper function to create mock export data
function createMockExportData(packageName: string, files: Array<{ relativeFilePath: string; tags: any[] }>) {
    return {
        packageJSON: { name: packageName },
        exportData: {
            baseLanguageCode: 'en',
            files
        }
    };
}

// Helper function to create mock tag
function createMockTag(variableName: string, translations: any = { hello: 'Hello' }, config: any = { namespace: 'common' }) {
    return {
        variableName,
        translations,
        config
    };
}

describe('defaultImportAlgorithm', () => {
    describe('Basic functionality', () => {
        it('should import all tags from all packages with default options', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('greeting'),
                            createMockTag('farewell')
                        ]
                    }
                ]),
                createMockExportData('package2', [
                    {
                        relativeFilePath: 'ui.ts',
                        tags: [
                            createMockTag('button')
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm();
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(3);
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'farewell',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importTag).toHaveBeenCalledWith('ui.ts', {
                variableName: 'button',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should handle packages without names', () => {
            const exports = [
                {
                    packageJSON: {},
                    exportData: {
                        baseLanguageCode: 'en',
                        files: [{
                            relativeFilePath: 'unknown.ts',
                            tags: [createMockTag('test')]
                        }]
                    }
                }
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm();
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('unknown.ts', {
                variableName: 'test',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should auto-generate variable names for tags without variableName by default', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('valid'),
                            { ...createMockTag('auto-name'), variableName: undefined },
                            { ...createMockTag('auto-name2'), variableName: undefined },
                            createMockTag('another-valid')
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm(); // No options - use defaults
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(4);
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'valid',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'translations2',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'translations3',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'another-valid',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should skip tags without variableName when explicitly set to skip', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('valid'),
                            { ...createMockTag('invalid'), variableName: undefined },
                            createMockTag('another-valid')
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports, true); // Enable debug
            const algorithm = defaultImportAlgorithm({
                variableName: {
                    handleMissingVariableName: 'skip'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(2);
            expect(event.importTag).toHaveBeenCalledWith('common.ts', expect.objectContaining({
                variableName: 'valid'
            }));
            expect(event.importTag).toHaveBeenCalledWith('common.ts', expect.objectContaining({
                variableName: 'another-valid'
            }));
            expect(event.logger.info).toHaveBeenCalledWith('Skipping tag without variableName in package1/common.ts');
        });
    });

    describe('Variable name options', () => {
        it('should prefix variable names with package name when enabled', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'my-package_greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should handle scoped packages with replace option', () => {
            const exports = [
                createMockExportData('@scope/package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    scopedPackageHandling: 'replace'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'scope_package_greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should handle scoped packages with remove-scope option', () => {
            const exports = [
                createMockExportData('@scope/package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    scopedPackageHandling: 'remove-scope'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'package_greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should apply case transformation to variable names', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('my-variable')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    case: 'camel'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'myPackageMyVariable',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should not apply case transformation when case is "no"', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('my-variable')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    case: 'no'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'my-package_my-variable',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should auto-generate variable names for tags without variableName', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('valid'),
                            { ...createMockTag('auto-name'), variableName: undefined },
                            { ...createMockTag('auto-name2'), variableName: undefined },
                            createMockTag('another-valid')
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                variableName: {
                    handleMissingVariableName: 'auto-generate'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(4);
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'valid',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'translations2',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'translations3',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'another-valid',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should use custom function for handling missing variable names', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('valid'),
                            { ...createMockTag('invalid'), variableName: undefined },
                            { ...createMockTag('another-invalid'), variableName: undefined }
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                variableName: {
                    handleMissingVariableName: (tag, packageName, fileName, index) => {
                        const baseName = fileName.replace('.ts', '');
                        return `${packageName}_${baseName}_${index + 1}`;
                    }
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(3);
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'valid',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'my-package_common_2',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'my-package_common_3',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should apply case transformation to auto-generated variable names', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            { ...createMockTag('invalid'), variableName: undefined }
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    handleMissingVariableName: 'auto-generate',
                    case: 'camel'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'myPackageTranslations1',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });
    });

    describe('File path options', () => {
        it('should group all translations by package when groupByPackage is enabled', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')]
                    },
                    {
                        relativeFilePath: 'ui.ts',
                        tags: [createMockTag('button')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    groupByPackage: true
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(2);
            expect(event.importTag).toHaveBeenCalledWith('my-package.ts', expect.objectContaining({
                variableName: 'greeting'
            }));
            expect(event.importTag).toHaveBeenCalledWith('my-package.ts', expect.objectContaining({
                variableName: 'button'
            }));
        });

        it('should include package name in path when includePackageInPath is enabled', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    includePackageInPath: true
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('my-package/common.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should handle scoped packages in file paths with replace option', () => {
            const exports = [
                createMockExportData('@scope/package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    groupByPackage: true,
                    scopedPackageHandling: 'replace'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('scope_package.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should apply case transformation to file paths', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'my-file.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    case: 'camel'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('myPackage/myFile.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });
    });

    describe('Exclusion options', () => {
        it('should exclude packages by name', () => {
            const exports = [
                createMockExportData('allowed-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')]
                    }
                ]),
                createMockExportData('excluded-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('farewell')]
                    }
                ])
            ];

            const event = createMockEvent(exports, true); // Enable debug
            const algorithm = defaultImportAlgorithm({
                exclude: {
                    packages: ['excluded-package']
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(1);
            expect(event.importTag).toHaveBeenCalledWith('common.ts', expect.objectContaining({
                variableName: 'greeting'
            }));
            expect(event.logger.info).toHaveBeenCalledWith('Skipping excluded package: excluded-package');
        });

        it('should exclude tags by namespace patterns', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('greeting', { hello: 'Hello' }, { namespace: 'common' }),
                            createMockTag('admin-action', { action: 'Action' }, { namespace: 'admin.user' }),
                            createMockTag('internal-util', { util: 'Util' }, { namespace: 'internal' })
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports, true); // Enable debug
            const algorithm = defaultImportAlgorithm({
                exclude: {
                    namespaces: ['admin.*', 'internal*']
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(1);
            expect(event.importTag).toHaveBeenCalledWith('common.ts', expect.objectContaining({
                variableName: 'greeting'
            }));
            expect(event.logger.info).toHaveBeenCalledWith('Skipping excluded namespace: admin.user');
            expect(event.logger.info).toHaveBeenCalledWith('Skipping excluded namespace: internal');
        });

        it('should handle wildcard namespace patterns', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('greeting', { hello: 'Hello' }, { namespace: 'common' }),
                            createMockTag('admin-user', { user: 'User' }, { namespace: 'admin.user' }),
                            createMockTag('admin-settings', { settings: 'Settings' }, { namespace: 'admin.settings' }),
                            createMockTag('internal-util', { util: 'Util' }, { namespace: 'internal.util' })
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports, true); // Enable debug
            const algorithm = defaultImportAlgorithm({
                exclude: {
                    namespaces: ['admin.*', 'internal*']
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(1);
            expect(event.importTag).toHaveBeenCalledWith('common.ts', expect.objectContaining({
                variableName: 'greeting'
            }));
        });
    });

    describe('Complex scenarios', () => {
        it('should handle multiple packages with different configurations', () => {
            const exports = [
                createMockExportData('@ui/button', [
                    {
                        relativeFilePath: 'button.ts',
                        tags: [
                            createMockTag('primary', { text: 'Primary' }, { namespace: 'ui' }),
                            createMockTag('secondary', { text: 'Secondary' }, { namespace: 'ui' })
                        ]
                    }
                ]),
                createMockExportData('@utils/helpers', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('format', { text: 'Format' }, { namespace: 'utils' })
                        ]
                    }
                ]),
                createMockExportData('internal-lib', [
                    {
                        relativeFilePath: 'internal.ts',
                        tags: [
                            createMockTag('secret', { text: 'Secret' }, { namespace: 'internal' })
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports, true); // Enable debug
            const algorithm = defaultImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    scopedPackageHandling: 'replace',
                    case: 'camel'
                },
                filePath: {
                    groupByPackage: true,
                    scopedPackageHandling: 'remove-scope',
                    case: 'kebab'
                },
                exclude: {
                    packages: ['internal-lib'],
                    namespaces: ['internal.*']
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(3);
            
            // UI Button package
            expect(event.importTag).toHaveBeenCalledWith('button.ts', {
                variableName: 'uiButtonPrimary',
                translations: { text: 'Primary' },
                config: { namespace: 'ui' }
            });
            expect(event.importTag).toHaveBeenCalledWith('button.ts', {
                variableName: 'uiButtonSecondary',
                translations: { text: 'Secondary' },
                config: { namespace: 'ui' }
            });
            
            // Utils package
            expect(event.importTag).toHaveBeenCalledWith('helpers.ts', {
                variableName: 'utilsHelpersFormat',
                translations: { text: 'Format' },
                config: { namespace: 'utils' }
            });
        });

        it('should handle empty exports array', () => {
            const exports: any[] = [];
            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm();
            
            algorithm(event);

            expect(event.importTag).not.toHaveBeenCalled();
        });

        it('should handle packages with empty files array', () => {
            const exports = [
                createMockExportData('empty-package', [])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm();
            
            algorithm(event);

            expect(event.importTag).not.toHaveBeenCalled();
        });

        it('should handle files with empty tags array', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'empty.ts',
                        tags: []
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm();
            
            algorithm(event);

            expect(event.importTag).not.toHaveBeenCalled();
        });
    });

    describe('Debug logging', () => {
        it('should log debug information when debug is enabled', () => {
            const exports = [
                createMockExportData('test-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports, true); // Enable debug
            const algorithm = defaultImportAlgorithm();
            
            algorithm(event);

            expect(event.logger.info).toHaveBeenCalledWith('Processing library: test-package');
            expect(event.logger.info).toHaveBeenCalledWith('Imported: greeting -> common.ts');
        });

        it('should not log debug information when debug is disabled', () => {
            const exports = [
                createMockExportData('test-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports, false); // Disable debug
            const algorithm = defaultImportAlgorithm();
            
            algorithm(event);

            expect(event.logger.info).not.toHaveBeenCalled();
        });
    });

    describe('Nested file paths', () => {
        it('should handle nested file paths without case transformation', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    case: 'no'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('layout-components/translation-manager.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should apply case transformation to nested file paths', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    case: 'camel'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('layoutComponents/translationManager.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should apply case transformation to nested file paths with kebab case', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    case: 'kebab'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('layout-components/translation-manager.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should apply case transformation to nested file paths with snake case', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    case: 'snake'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('layout_components/translation_manager.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should handle nested paths with includePackageInPath', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    case: 'kebab'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('my-package/layout-components/translation-manager.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should handle nested paths with scoped package and case transformation', () => {
            const exports = [
                createMockExportData('@scope/my-package', [
                    {
                        relativeFilePath: 'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    scopedPackageHandling: 'replace',
                    case: 'kebab'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('scope-my-package/layout-components/translation-manager.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should handle nested paths with groupByPackage', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')]
                    },
                    {
                        relativeFilePath: 'another/folder/file.ts',
                        tags: [createMockTag('farewell')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    groupByPackage: true,
                    case: 'kebab'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(2);
            expect(event.importTag).toHaveBeenCalledWith('my-package.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importTag).toHaveBeenCalledWith('my-package.ts', {
                variableName: 'farewell',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should handle deeply nested paths with multiple case transformations', () => {
            const exports = [
                createMockExportData('@scope/my-package', [
                    {
                        relativeFilePath: 'src/components/ui/buttonComponent.ts',
                        tags: [createMockTag('buttonText')]
                    },
                    {
                        relativeFilePath: 'src/utils/helperFunctions.ts',
                        tags: [createMockTag('helperMessage')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    scopedPackageHandling: 'remove-scope',
                    case: 'snake'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(2);
            expect(event.importTag).toHaveBeenCalledWith('my_package/src/components/ui/button_component.ts', {
                variableName: 'buttonText',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importTag).toHaveBeenCalledWith('my_package/src/utils/helper_functions.ts', {
                variableName: 'helperMessage',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should handle nested paths with Pascal case transformation', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'components/ui/button-component.ts',
                        tags: [createMockTag('buttonText')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    case: 'pascal'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('Components/Ui/ButtonComponent.ts', {
                variableName: 'buttonText',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should handle nested paths with constant case transformation', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'components/ui/button-component.ts',
                        tags: [createMockTag('buttonText')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    case: 'constant'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('COMPONENTS/UI/BUTTON_COMPONENT.ts', {
                variableName: 'buttonText',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should handle separate case transformations for directories and files', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    case: {
                        directories: 'camel',
                        files: 'pascal'
                    }
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('layoutComponents/TranslationManager.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should handle separate case transformations with includePackageInPath', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'layout-components/translation-manager.ts',
                        tags: [createMockTag('greeting')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    case: {
                        directories: 'pascal',
                        files: 'snake'
                    }
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('MyPackage/LayoutComponents/translation_manager.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should handle mixed case transformations with deeply nested paths', () => {
            const exports = [
                createMockExportData('@scope/my-package', [
                    {
                        relativeFilePath: 'src/components/ui/button-component.ts',
                        tags: [createMockTag('buttonText')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    scopedPackageHandling: 'remove-scope',
                    case: {
                        directories: 'snake',
                        files: 'camel'
                    }
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('my_package/src/components/ui/buttonComponent.ts', {
                variableName: 'buttonText',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });
    });

    describe('Edge cases', () => {
        it('should handle tags with null/undefined config', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('greeting', { hello: 'Hello' }, null),
                            createMockTag('farewell', { bye: 'Bye' }, null)
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm();
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(2);
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: null
            });
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'farewell',
                translations: { bye: 'Bye' },
                config: null
            });
        });

        it('should handle tags with empty namespace', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('greeting', { hello: 'Hello' }, { namespace: '' })
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                exclude: {
                    namespaces: ['admin.*']
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledTimes(1);
            expect(event.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: '' }
            });
        });

        it('should handle complex package names with special characters', () => {
            const exports = [
                createMockExportData('@my-org/ui-components', [
                    {
                        relativeFilePath: 'button.ts',
                        tags: [createMockTag('primary')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = defaultImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    scopedPackageHandling: 'replace',
                    case: 'camel'
                },
                filePath: {
                    groupByPackage: true,
                    scopedPackageHandling: 'remove-scope',
                    case: 'kebab'
                }
            });
            
            algorithm(event);

            expect(event.importTag).toHaveBeenCalledWith('ui-components.ts', {
                variableName: 'myOrgUiComponentsPrimary',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });
    });
});
