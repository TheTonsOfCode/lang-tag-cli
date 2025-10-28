import { describe, it, expect, vi, beforeEach } from 'vitest';
import { simpleMappingImportAlgorithm, type SimpleMappingImportAlgorithmOptions } from '@/algorithms/import/simple-mapping-import-algorithm';
import type { LangTagCLIImportEvent, LangTagCLIImportManager } from '@/config';
import type {LangTagCLILogger} from "@/logger.ts";

describe('simpleMappingImportAlgorithm', () => {
    let mockImportManager: LangTagCLIImportManager;
    let mockLogger: LangTagCLILogger;
    let mockEvent: LangTagCLIImportEvent;

    beforeEach(() => {
        mockImportManager = {
            importTag: vi.fn(),
            getImportedFiles: vi.fn(() => []),
            getImportedFilesCount: vi.fn(() => 0),
            hasImportedFiles: vi.fn(() => false)
        };

        mockLogger = {
            debug: vi.fn(),
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            success: vi.fn(),
            conflict: vi.fn()
        };

        mockEvent = {
            exports: [],
            langTagConfig: {} as any,
            logger: mockLogger,
            importManager: mockImportManager
        };
    });

    describe('basic functionality', () => {
        it('should import mapped variables from mapped files in mapped packages', () => {
            const options: SimpleMappingImportAlgorithmOptions = {
                mappings: [
                    {
                        packageName: '@company/ui-components',
                        files: [
                            {
                                sourceFile: 'components/button.ts',
                                targetFile: 'ui/buttons.ts',
                                variables: {
                                    'primaryButton': 'button',
                                    'secondaryButton': 'secondary'
                                }
                            }
                        ]
                    }
                ]
            };

            const algorithm = simpleMappingImportAlgorithm(options);
            
            mockEvent.exports = [{
                packageJSON: { name: '@company/ui-components' },
                exportData: {
                    baseLanguageCode: 'en',
                    files: [{
                        relativeFilePath: 'components/button.ts',
                        tags: [
                            {
                                variableName: 'primaryButton',
                                translations: { en: 'Primary Button' },
                                config: { namespace: 'ui' }
                            },
                            {
                                variableName: 'secondaryButton',
                                translations: { en: 'Secondary Button' },
                                config: { namespace: 'ui' }
                            },
                            {
                                variableName: 'tertiaryButton',
                                translations: { en: 'Tertiary Button' },
                                config: { namespace: 'ui' }
                            }
                        ]
                    }]
                }
            }];

            algorithm(mockEvent);

            expect(mockImportManager.importTag).toHaveBeenCalledTimes(2);
            expect(mockImportManager.importTag).toHaveBeenNthCalledWith(1,
                'ui/buttons.ts',
                {
                    variableName: 'button',
                    translations: { en: 'Primary Button' },
                    config: { namespace: 'ui' }
                }
            );
            expect(mockImportManager.importTag).toHaveBeenNthCalledWith(2,
                'ui/buttons.ts',
                {
                    variableName: 'secondary',
                    translations: { en: 'Secondary Button' },
                    config: { namespace: 'ui' }
                }
            );
        });

        it('should skip unmapped packages', () => {
            const options: SimpleMappingImportAlgorithmOptions = {
                mappings: [
                    {
                        packageName: '@company/ui-components',
                        files: []
                    }
                ]
            };

            const algorithm = simpleMappingImportAlgorithm(options);
            
            mockEvent.exports = [
                {
                    packageJSON: { name: '@company/ui-components' },
                    exportData: { baseLanguageCode: 'en', files: [] }
                },
                {
                    packageJSON: { name: '@company/unmapped-package' },
                    exportData: {
                        baseLanguageCode: 'en',
                        files: [{
                            relativeFilePath: 'button.ts',
                            tags: [{
                                variableName: 'button',
                                translations: { en: 'Button' },
                                config: {}
                            }]
                        }]
                    }
                }
            ];

            algorithm(mockEvent);

            expect(mockImportManager.importTag).not.toHaveBeenCalled();
            expect(mockLogger.debug).toHaveBeenCalledWith('Skipping unmapped package: @company/unmapped-package');
        });

        it('should skip unmapped files', () => {
            const options: SimpleMappingImportAlgorithmOptions = {
                mappings: [
                    {
                        packageName: '@company/ui-components',
                        files: [
                            {
                                sourceFile: 'components/button.ts',
                                targetFile: 'ui/buttons.ts',
                                variables: { 'button': 'button' }
                            }
                        ]
                    }
                ]
            };

            const algorithm = simpleMappingImportAlgorithm(options);
            
            mockEvent.exports = [{
                packageJSON: { name: '@company/ui-components' },
                exportData: {
                    baseLanguageCode: 'en',
                    files: [
                        {
                            relativeFilePath: 'components/button.ts',
                            tags: [{
                                variableName: 'button',
                                translations: { en: 'Button' },
                                config: {}
                            }]
                        },
                        {
                            relativeFilePath: 'components/input.ts',
                            tags: [{
                                variableName: 'input',
                                translations: { en: 'Input' },
                                config: {}
                            }]
                        }
                    ]
                }
            }];

            algorithm(mockEvent);

            expect(mockImportManager.importTag).toHaveBeenCalledTimes(1);
            expect(mockLogger.debug).toHaveBeenCalledWith('Skipping unmapped file: @company/ui-components/components/input.ts');
        });

        it('should skip unmapped variables', () => {
            const options: SimpleMappingImportAlgorithmOptions = {
                mappings: [
                    {
                        packageName: '@company/ui-components',
                        files: [
                            {
                                sourceFile: 'components/button.ts',
                                targetFile: 'ui/buttons.ts',
                                variables: {
                                    'primaryButton': 'button',
                                    'secondaryButton': 'secondary'
                                }
                            }
                        ]
                    }
                ]
            };

            const algorithm = simpleMappingImportAlgorithm(options);
            
            mockEvent.exports = [{
                packageJSON: { name: '@company/ui-components' },
                exportData: {
                    baseLanguageCode: 'en',
                    files: [{
                        relativeFilePath: 'components/button.ts',
                        tags: [
                            {
                                variableName: 'primaryButton',
                                translations: { en: 'Primary Button' },
                                config: {}
                            },
                            {
                                variableName: 'tertiaryButton',
                                translations: { en: 'Tertiary Button' },
                                config: {}
                            }
                        ]
                    }]
                }
            }];

            algorithm(mockEvent);

            expect(mockImportManager.importTag).toHaveBeenCalledTimes(1);
            expect(mockLogger.debug).toHaveBeenCalledWith('Skipping unmapped variable: tertiaryButton in @company/ui-components/components/button.ts');
        });

        it('should keep original variable name when new name is undefined', () => {
            const options: SimpleMappingImportAlgorithmOptions = {
                mappings: [
                    {
                        packageName: '@company/ui-components',
                        files: [
                            {
                                sourceFile: 'components/button.ts',
                                targetFile: 'ui/buttons.ts',
                                variables: {
                                    'primaryButton': 'button',
                                    'secondaryButton': undefined // keep original name
                                }
                            }
                        ]
                    }
                ]
            };

            const algorithm = simpleMappingImportAlgorithm(options);
            
            mockEvent.exports = [{
                packageJSON: { name: '@company/ui-components' },
                exportData: {
                    baseLanguageCode: 'en',
                    files: [{
                        relativeFilePath: 'components/button.ts',
                        tags: [
                            {
                                variableName: 'primaryButton',
                                translations: { en: 'Primary Button' },
                                config: {}
                            },
                            {
                                variableName: 'secondaryButton',
                                translations: { en: 'Secondary Button' },
                                config: {}
                            }
                        ]
                    }]
                }
            }];

            algorithm(mockEvent);

            expect(mockImportManager.importTag).toHaveBeenCalledTimes(2);
            expect(mockImportManager.importTag).toHaveBeenNthCalledWith(1,
                'ui/buttons.ts',
                expect.objectContaining({
                    variableName: 'button'
                })
            );
            expect(mockImportManager.importTag).toHaveBeenNthCalledWith(2,
                'ui/buttons.ts',
                expect.objectContaining({
                    variableName: 'secondaryButton'
                })
            );
        });
    });


    describe('configRemap option', () => {
        it('should apply config remapping to imported tags', () => {
            const options: SimpleMappingImportAlgorithmOptions = {
                mappings: [
                    {
                        packageName: '@company/ui-components',
                        files: [
                            {
                                sourceFile: 'components/button.ts',
                                targetFile: 'ui/buttons.ts',
                                variables: { 'button': 'button' }
                            }
                        ]
                    }
                ],
                configRemap: (originalConfig, context) => {
                    return {
                        ...originalConfig,
                        namespace: 'custom',
                        path: `custom.${context.variableName}`
                    };
                }
            };

            const algorithm = simpleMappingImportAlgorithm(options);
            
            mockEvent.exports = [{
                packageJSON: { name: '@company/ui-components' },
                exportData: {
                    baseLanguageCode: 'en',
                    files: [{
                        relativeFilePath: 'components/button.ts',
                        tags: [{
                            variableName: 'button',
                            translations: { en: 'Button' },
                            config: { namespace: 'ui', path: 'button.primary' }
                        }]
                    }]
                }
            }];

            algorithm(mockEvent);

            expect(mockImportManager.importTag).toHaveBeenCalledWith(
                'ui/buttons.ts',
                {
                    variableName: 'button',
                    translations: { en: 'Button' },
                    config: {
                        namespace: 'custom',
                        path: 'custom.button'
                    }
                }
            );
        });

        it('should remove config when configRemap returns null', () => {
            const options: SimpleMappingImportAlgorithmOptions = {
                mappings: [
                    {
                        packageName: '@company/ui-components',
                        files: [
                            {
                                sourceFile: 'components/button.ts',
                                targetFile: 'ui/buttons.ts',
                                variables: { 'button': 'button' }
                            }
                        ]
                    }
                ],
                configRemap: () => null
            };

            const algorithm = simpleMappingImportAlgorithm(options);
            
            mockEvent.exports = [{
                packageJSON: { name: '@company/ui-components' },
                exportData: {
                    baseLanguageCode: 'en',
                    files: [{
                        relativeFilePath: 'components/button.ts',
                        tags: [{
                            variableName: 'button',
                            translations: { en: 'Button' },
                            config: { namespace: 'ui' }
                        }]
                    }]
                }
            }];

            algorithm(mockEvent);

            expect(mockImportManager.importTag).toHaveBeenCalledWith(
                'ui/buttons.ts',
                {
                    variableName: 'button',
                    translations: { en: 'Button' },
                    config: null
                }
            );
        });
    });

    describe('multiple packages and files', () => {
        it('should handle multiple packages with different mappings', () => {
            const options: SimpleMappingImportAlgorithmOptions = {
                mappings: [
                    {
                        packageName: '@company/ui-components',
                        files: [
                            {
                                sourceFile: 'components/button.ts',
                                targetFile: 'ui/buttons.ts',
                                variables: { 'button': 'button' }
                            }
                        ]
                    },
                    {
                        packageName: '@company/utils',
                        files: [
                            {
                                sourceFile: 'helpers.ts',
                                targetFile: 'utils/helpers.ts',
                                variables: { 'helper': 'helper' }
                            }
                        ]
                    }
                ]
            };

            const algorithm = simpleMappingImportAlgorithm(options);
            
            mockEvent.exports = [
                {
                    packageJSON: { name: '@company/ui-components' },
                    exportData: {
                        baseLanguageCode: 'en',
                        files: [{
                            relativeFilePath: 'components/button.ts',
                            tags: [{
                                variableName: 'button',
                                translations: { en: 'Button' },
                                config: {}
                            }]
                        }]
                    }
                },
                {
                    packageJSON: { name: '@company/utils' },
                    exportData: {
                        baseLanguageCode: 'en',
                        files: [{
                            relativeFilePath: 'helpers.ts',
                            tags: [{
                                variableName: 'helper',
                                translations: { en: 'Helper' },
                                config: {}
                            }]
                        }]
                    }
                }
            ];

            algorithm(mockEvent);

            expect(mockImportManager.importTag).toHaveBeenCalledTimes(2);
            expect(mockImportManager.importTag).toHaveBeenNthCalledWith(1,
                'ui/buttons.ts',
                expect.objectContaining({
                    variableName: 'button'
                })
            );
            expect(mockImportManager.importTag).toHaveBeenNthCalledWith(2,
                'utils/helpers.ts',
                expect.objectContaining({
                    variableName: 'helper'
                })
            );
        });

        it('should handle multiple files within the same package', () => {
            const options: SimpleMappingImportAlgorithmOptions = {
                mappings: [
                    {
                        packageName: '@company/ui-components',
                        files: [
                            {
                                sourceFile: 'components/button.ts',
                                targetFile: 'ui/buttons.ts',
                                variables: { 'button': 'button' }
                            },
                            {
                                sourceFile: 'components/input.ts',
                                targetFile: 'ui/inputs.ts',
                                variables: { 'input': 'input' }
                            }
                        ]
                    }
                ]
            };

            const algorithm = simpleMappingImportAlgorithm(options);
            
            mockEvent.exports = [{
                packageJSON: { name: '@company/ui-components' },
                exportData: {
                    baseLanguageCode: 'en',
                    files: [
                        {
                            relativeFilePath: 'components/button.ts',
                            tags: [{
                                variableName: 'button',
                                translations: { en: 'Button' },
                                config: {}
                            }]
                        },
                        {
                            relativeFilePath: 'components/input.ts',
                            tags: [{
                                variableName: 'input',
                                translations: { en: 'Input' },
                                config: {}
                            }]
                        }
                    ]
                }
            }];

            algorithm(mockEvent);

            expect(mockImportManager.importTag).toHaveBeenCalledTimes(2);
            expect(mockImportManager.importTag).toHaveBeenNthCalledWith(1,
                'ui/buttons.ts',
                expect.objectContaining({
                    variableName: 'button'
                })
            );
            expect(mockImportManager.importTag).toHaveBeenNthCalledWith(2,
                'ui/inputs.ts',
                expect.objectContaining({
                    variableName: 'input'
                })
            );
        });
    });

    describe('edge cases', () => {
        it('should handle empty mappings', () => {
            const options: SimpleMappingImportAlgorithmOptions = {
                mappings: []
            };

            const algorithm = simpleMappingImportAlgorithm(options);
            
            mockEvent.exports = [{
                packageJSON: { name: '@company/ui-components' },
                exportData: {
                    baseLanguageCode: 'en',
                    files: [{
                        relativeFilePath: 'components/button.ts',
                        tags: [{
                            variableName: 'button',
                            translations: { en: 'Button' },
                            config: {}
                        }]
                    }]
                }
            }];

            algorithm(mockEvent);

            expect(mockImportManager.importTag).not.toHaveBeenCalled();
        });

        it('should handle empty files array in package mapping', () => {
            const options: SimpleMappingImportAlgorithmOptions = {
                mappings: [
                    {
                        packageName: '@company/ui-components',
                        files: []
                    }
                ]
            };

            const algorithm = simpleMappingImportAlgorithm(options);
            
            mockEvent.exports = [{
                packageJSON: { name: '@company/ui-components' },
                exportData: {
                    baseLanguageCode: 'en',
                    files: [{
                        relativeFilePath: 'components/button.ts',
                        tags: [{
                            variableName: 'button',
                            translations: { en: 'Button' },
                            config: {}
                        }]
                    }]
                }
            }];

            algorithm(mockEvent);

            expect(mockImportManager.importTag).not.toHaveBeenCalled();
        });

        it('should handle empty variables object in file mapping', () => {
            const options: SimpleMappingImportAlgorithmOptions = {
                mappings: [
                    {
                        packageName: '@company/ui-components',
                        files: [
                            {
                                sourceFile: 'components/button.ts',
                                targetFile: 'ui/buttons.ts',
                                variables: {}
                            }
                        ]
                    }
                ]
            };

            const algorithm = simpleMappingImportAlgorithm(options);
            
            mockEvent.exports = [{
                packageJSON: { name: '@company/ui-components' },
                exportData: {
                    baseLanguageCode: 'en',
                    files: [{
                        relativeFilePath: 'components/button.ts',
                        tags: [{
                            variableName: 'button',
                            translations: { en: 'Button' },
                            config: {}
                        }]
                    }]
                }
            }];

            algorithm(mockEvent);

            expect(mockImportManager.importTag).not.toHaveBeenCalled();
        });

        it('should handle tags without variable names', () => {
            const options: SimpleMappingImportAlgorithmOptions = {
                mappings: [
                    {
                        packageName: '@company/ui-components',
                        files: [
                            {
                                sourceFile: 'components/button.ts',
                                targetFile: 'ui/buttons.ts',
                                variables: { 'button': 'button' }
                            }
                        ]
                    }
                ]
            };

            const algorithm = simpleMappingImportAlgorithm(options);
            
            mockEvent.exports = [{
                packageJSON: { name: '@company/ui-components' },
                exportData: {
                    baseLanguageCode: 'en',
                    files: [{
                        relativeFilePath: 'components/button.ts',
                        tags: [
                            {
                                variableName: 'button',
                                translations: { en: 'Button' },
                                config: {}
                            },
                            {
                                variableName: undefined,
                                translations: { en: 'No Name' },
                                config: {}
                            }
                        ]
                    }]
                }
            }];

            algorithm(mockEvent);

            expect(mockImportManager.importTag).toHaveBeenCalledTimes(1);
            expect(mockLogger.debug).toHaveBeenCalledWith('Skipping unmapped variable: undefined in @company/ui-components/components/button.ts');
        });
    });
});
