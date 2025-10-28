import { describe, it, expect, vi } from 'vitest';
import { flexibleImportAlgorithm } from '@/algorithms/import/flexible-import-algorithm.ts';
import { LangTagCLIImportEvent } from '../../src/config';
import { ImportManager } from '../../src/core/import/import-manager.ts';

// Helper function to create a mock event
function createMockEvent(
    exports: Array<{ packageJSON: any; exportData: any }>,
    debug: boolean = false
): LangTagCLIImportEvent {
    const importManager = new ImportManager();
    
    vi.spyOn(importManager, 'importTag');
    
    return {
        exports,
        logger: {
            config: { debug },
            info: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
            success: vi.fn(),
            error: vi.fn(),
        },
        langTagConfig: {
            debug
        },
        importManager,
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

describe('flexibleImportAlgorithm', () => {
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
            const algorithm = flexibleImportAlgorithm();
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledTimes(3);
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'farewell',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('ui.ts', {
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
            const algorithm = flexibleImportAlgorithm();
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('unknown.ts', {
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
                            { ...createMockTag('auto_name'), variableName: undefined },
                            { ...createMockTag('auto_name2'), variableName: undefined },
                            createMockTag('another_valid')
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = flexibleImportAlgorithm(); // No options - use defaults
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledTimes(4);
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'valid',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'translations2',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'translations3',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'another_valid',
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
                            createMockTag('another_valid')
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    handleMissingVariableName: 'skip'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', expect.objectContaining({
                variableName: 'valid'
            }));
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', expect.objectContaining({
                variableName: 'another_valid'
            }));
            expect(event.logger.debug).toHaveBeenCalledWith('Skipping tag without variableName in package1/common.ts');
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
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'my_package_greeting',
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
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    scopedPackageHandling: 'replace'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    scopedPackageHandling: 'remove-scope'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
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
                        tags: [createMockTag('my_variable')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    case: 'camel'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
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
                        tags: [createMockTag('my_variable')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    case: 'no'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'my_package_my_variable',
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
                            { ...createMockTag('auto_name'), variableName: undefined },
                            { ...createMockTag('auto_name2'), variableName: undefined },
                            createMockTag('another_valid')
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    handleMissingVariableName: 'auto-generate'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledTimes(4);
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'valid',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'translations2',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'translations3',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'another_valid',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should use custom function for handling missing variable names', () => {
            const exports = [
                createMockExportData('my_package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('valid'),
                            { ...createMockTag('invalid'), variableName: undefined },
                            { ...createMockTag('another_invalid'), variableName: undefined }
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    handleMissingVariableName: (tag, packageName, fileName, index) => {
                        const baseName = fileName.replace('.ts', '');
                        return `${packageName}_${baseName}_${index + 1}`;
                    }
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledTimes(3);
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'valid',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'my_package_common_2',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'my_package_common_3',
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
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    prefixWithPackageName: true,
                    handleMissingVariableName: 'auto-generate',
                    case: 'camel'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'myPackageTranslations1',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should sanitize variable names by default', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('my-variable')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = flexibleImportAlgorithm();
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'my$variable',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should sanitize variable names with dots and spaces', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('my.variable name')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = flexibleImportAlgorithm();
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'my$variable$name',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should sanitize variable names starting with numbers', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('123variable')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = flexibleImportAlgorithm();
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: '$123variable',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });

        it('should not sanitize when sanitizeVariableName is false', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('my.variable')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    sanitizeVariableName: false
                }
            });
            
            expect(() => algorithm(event)).toThrow('Invalid JavaScript identifier: "my.variable"');
        });

        it('should sanitize after case transformation', () => {
            const exports = [
                createMockExportData('my-package', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [createMockTag('my.variable-name')]
                    }
                ])
            ];

            const event = createMockEvent(exports);
            const algorithm = flexibleImportAlgorithm({
                variableName: {
                    case: 'upper'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'MY$VARIABLE$NAME',
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    groupByPackage: true
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(event.importManager.importTag).toHaveBeenCalledWith('my-package.ts', expect.objectContaining({
                variableName: 'greeting'
            }));
            expect(event.importManager.importTag).toHaveBeenCalledWith('my-package.ts', expect.objectContaining({
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    includePackageInPath: true
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('my-package/common.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    groupByPackage: true,
                    scopedPackageHandling: 'replace'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('scope-package.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    case: 'camel'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('myPackage/myFile.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                exclude: {
                    packages: ['excluded-package']
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledTimes(1);
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', expect.objectContaining({
                variableName: 'greeting'
            }));
            expect(event.logger.debug).toHaveBeenCalledWith('Skipping excluded package: excluded-package');
        });

        it('should exclude tags by namespace patterns', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('greeting', { hello: 'Hello' }, { namespace: 'common' }),
                            createMockTag('admin_action', { action: 'Action' }, { namespace: 'admin.user' }),
                            createMockTag('internal_util', { util: 'Util' }, { namespace: 'internal' })
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm({
                exclude: {
                    namespaces: ['admin.*', 'internal*']
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledTimes(1);
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', expect.objectContaining({
                variableName: 'greeting'
            }));
            expect(event.logger.debug).toHaveBeenCalledWith('Skipping excluded namespace: admin.user');
            expect(event.logger.debug).toHaveBeenCalledWith('Skipping excluded namespace: internal');
        });

        it('should handle wildcard namespace patterns', () => {
            const exports = [
                createMockExportData('package1', [
                    {
                        relativeFilePath: 'common.ts',
                        tags: [
                            createMockTag('greeting', { hello: 'Hello' }, { namespace: 'common' }),
                            createMockTag('admin_user', { user: 'User' }, { namespace: 'admin.user' }),
                            createMockTag('admin_settings', { settings: 'Settings' }, { namespace: 'admin.settings' }),
                            createMockTag('internal_util', { util: 'Util' }, { namespace: 'internal.util' })
                        ]
                    }
                ])
            ];

            const event = createMockEvent(exports, true); // Enable debug
            const algorithm = flexibleImportAlgorithm({
                exclude: {
                    namespaces: ['admin.*', 'internal*']
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledTimes(1);
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', expect.objectContaining({
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
            const algorithm = flexibleImportAlgorithm({
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

            expect(event.importManager.importTag).toHaveBeenCalledTimes(3);
            
            // UI Button package
            expect(event.importManager.importTag).toHaveBeenCalledWith('button.ts', {
                variableName: 'uiButtonPrimary',
                translations: { text: 'Primary' },
                config: { namespace: 'ui' }
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('button.ts', {
                variableName: 'uiButtonSecondary',
                translations: { text: 'Secondary' },
                config: { namespace: 'ui' }
            });
            
            // Utils package
            expect(event.importManager.importTag).toHaveBeenCalledWith('helpers.ts', {
                variableName: 'utilsHelpersFormat',
                translations: { text: 'Format' },
                config: { namespace: 'utils' }
            });
        });

        it('should handle empty exports array', () => {
            const exports: any[] = [];
            const event = createMockEvent(exports);
            const algorithm = flexibleImportAlgorithm();
            
            algorithm(event);

            expect(event.importManager.importTag).not.toHaveBeenCalled();
        });

        it('should handle packages with empty files array', () => {
            const exports = [
                createMockExportData('empty-package', [])
            ];

            const event = createMockEvent(exports);
            const algorithm = flexibleImportAlgorithm();
            
            algorithm(event);

            expect(event.importManager.importTag).not.toHaveBeenCalled();
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
            const algorithm = flexibleImportAlgorithm();
            
            algorithm(event);

            expect(event.importManager.importTag).not.toHaveBeenCalled();
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
            const algorithm = flexibleImportAlgorithm();
            
            algorithm(event);

            expect(event.logger.debug).toHaveBeenCalledWith('Processing library: test-package');
            expect(event.logger.debug).toHaveBeenCalledWith('Imported: greeting -> common.ts');
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: 'no'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('layout-components/translation-manager.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: 'camel'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('layoutComponents/translationManager.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: 'kebab'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('layout-components/translation-manager.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: 'snake'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('layout_components/translation_manager.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    case: 'kebab'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('my-package/layout-components/translation-manager.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    scopedPackageHandling: 'replace',
                    case: 'kebab'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('scope-my-package/layout-components/translation-manager.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    groupByPackage: true,
                    case: 'kebab'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(event.importManager.importTag).toHaveBeenCalledWith('my-package.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('my-package.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    scopedPackageHandling: 'remove-scope',
                    case: 'snake'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(event.importManager.importTag).toHaveBeenCalledWith('my_package/src/components/ui/button_component.ts', {
                variableName: 'buttonText',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('my_package/src/utils/helper_functions.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: 'pascal'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('Components/Ui/ButtonComponent.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: 'constant'
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('COMPONENTS/UI/BUTTON_COMPONENT.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    case: {
                        directories: 'camel',
                        files: 'pascal'
                    }
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('layoutComponents/TranslationManager.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                filePath: {
                    includePackageInPath: true,
                    case: {
                        directories: 'pascal',
                        files: 'snake'
                    }
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledWith('MyPackage/LayoutComponents/translation_manager.ts', {
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
            const algorithm = flexibleImportAlgorithm({
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

            expect(event.importManager.importTag).toHaveBeenCalledWith('my_package/src/components/ui/buttonComponent.ts', {
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
            const algorithm = flexibleImportAlgorithm();
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledTimes(2);
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
                variableName: 'greeting',
                translations: { hello: 'Hello' },
                config: null
            });
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
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
            const algorithm = flexibleImportAlgorithm({
                exclude: {
                    namespaces: ['admin.*']
                }
            });
            
            algorithm(event);

            expect(event.importManager.importTag).toHaveBeenCalledTimes(1);
            expect(event.importManager.importTag).toHaveBeenCalledWith('common.ts', {
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
            const algorithm = flexibleImportAlgorithm({
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

            expect(event.importManager.importTag).toHaveBeenCalledWith('ui-components.ts', {
                variableName: 'myOrgUiComponentsPrimary',
                translations: { hello: 'Hello' },
                config: { namespace: 'common' }
            });
        });
    });
});
