import { describe, it, expect, vi } from 'vitest';
import { pathBasedConfigGenerator } from '../../src/algorithms/config-generation/path-based-config-generator';
import { LangTagCLIConfigGenerationEvent } from '../../src/config';

const TRIGGER_NAME = 'path-based-config-generator';

function createMockEvent(
    relativePath: string,
    includes: string[] = ['src/**/*.{js,ts,jsx,tsx}'],
    collectDefaultNamespace: string = 'common'
): LangTagCLIConfigGenerationEvent {
    let savedConfig: any = null;

    return {
        absolutePath: `/project/${relativePath}`,
        relativePath,
        isImportedLibrary: false,
        config: undefined,
        langTagConfig: {
            tagName: 'lang',
            includes,
            excludes: [],
            outputDir: 'locales/en',
            collect: {
                defaultNamespace: collectDefaultNamespace,
                ignoreConflictsWithMatchingValues: true,
            },
            import: {
                dir: 'src/lang-libraries',
                tagImportPath: 'import { lang } from "@/lang"',
                onImport: () => {},
            },
            translationArgPosition: 1,
            language: 'en',
            isLibrary: false,
            onConfigGeneration: async () => {},
        },
        save: vi.fn((config: any) => {
            savedConfig = config;
        }),
        get savedConfig() {
            return savedConfig;
        },
    } as any;
}

describe('pathRules >> wildcard', () => {
    describe('Basic string syntax', () => {
        it('should transform components to ui namespace', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        dashboard: {
                            '>>': 'ui'
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/dashboard/views/modal/list.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'ui',
                path: 'views.modal'
            }, TRIGGER_NAME);
        });

        it('should transform features to pages namespace', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    features: {
                        auth: {
                            '>>': 'pages'
                        }
                    }
                }
            });
            
            const event = createMockEvent('features/auth/login/form/validation.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'pages',
                path: 'login.form'
            }, TRIGGER_NAME);
        });
    });

    describe('Object syntax with prefix', () => {
        it('should add prefix with dot at the end', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        admin: {
                            '>>': {
                                namespace: 'management',
                                pathPrefix: 'admin.'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('app/admin/users/roles/permissions.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'management',
                path: 'admin.users.roles'
            }, TRIGGER_NAME);
        });

        it('should add prefix without dot at the end', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    src: {
                        modules: {
                            '>>': {
                                namespace: 'core',
                                pathPrefix: 'app'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('src/modules/payments/checkout/summary.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'core',
                path: 'app.payments.checkout'
            }, TRIGGER_NAME);
        });

        it('should add multi-level prefix with dots', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    features: {
                        dashboard: {
                            '>>': {
                                namespace: 'widgets',
                                pathPrefix: 'app.dashboard.'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('features/dashboard/charts/analytics/report.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'widgets',
                path: "app.dashboard.charts.analytics"
            }, TRIGGER_NAME);
        });

        it('should work with empty prefix', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    lib: {
                        components: {
                            '>>': {
                                namespace: 'shared',
                                pathPrefix: ''
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('lib/components/buttons/primary/icon.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'shared',
                path: 'buttons.primary'
            }, TRIGGER_NAME);
        });

        it('should work without prefix property', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    pages: {
                        public: {
                            '>>': {
                                namespace: 'marketing'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('pages/public/landing/hero/cta.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'marketing',
                path: 'landing.hero',
            }, TRIGGER_NAME);
        });
    });

    describe('Prefix that already has prefix', () => {
        it('should add prefix to existing prefix', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    src: {
                        features: {
                            '>>': {
                                namespace: 'app',
                                pathPrefix: 'features.'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('src/features/billing/invoices/details.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'app',
                path: "features.billing.invoices",
            }, TRIGGER_NAME);
        });

        it('should add multi-level prefix to multi-level namespace', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        modules: {
                            '>>': {
                                namespace: 'core.system',
                                pathPrefix: 'app.modules.'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('app/modules/settings/preferences/theme.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'core.system',
                path: "app.modules.settings.preferences",
            }, TRIGGER_NAME);
        });
    });

    describe('Case transformations', () => {
        it('should apply kebab-case transformation', async () => {
            const generator = pathBasedConfigGenerator({
                namespaceCase: 'kebab',
                pathRules: {
                    components: {
                        forms: {
                            '>>': 'FormValidation'
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/forms/inputs/email/validator.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'form-validation',
                path: "inputs.email",
            }, TRIGGER_NAME);
        });

        it('should apply camelCase transformation', async () => {
            const generator = pathBasedConfigGenerator({
                namespaceCase: 'camel',
                pathRules: {
                    features: {
                        admin: {
                            '>>': 'user-management'
                        }
                    }
                }
            });
            
            const event = createMockEvent('features/admin/users/list/table.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'userManagement',
                path: "users.list",
            }, TRIGGER_NAME);
        });
    });

    describe('Nested structures', () => {
        it('should work with ignored parent segment', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    src: {
                        features: {
                            _: false,
                            '>>': 'app'
                        }
                    }
                }
            });
            
            const event = createMockEvent('src/features/profile/settings/account.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'app',
                path: "profile.settings",
            }, TRIGGER_NAME);
        });

        it('should work in deeply nested structure', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        modules: {
                            admin: {
                                users: {
                                    '>>': 'permissions'
                                }
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('app/modules/admin/users/roles/groups/list.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'permissions',
                path: "roles.groups",
            }, TRIGGER_NAME);
        });
    });

    describe('Edge cases', () => {
        it('should return null when namespace is missing', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        dashboard: {
                            '>>': {
                                pathPrefix: 'ui.'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/dashboard/views/list.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'dashboard',
                path: "ui.views",
            }, TRIGGER_NAME);
        });

        it('should return null when namespace is null', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        dashboard: {
                            '>>': {
                                namespace: null,
                                pathPrefix: 'ui.'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/dashboard/views/list.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'dashboard',
                path: "ui.views",
            }, TRIGGER_NAME);
        });

        it('should return null when namespace is empty string', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        dashboard: {
                            '>>': ''
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/dashboard/views/list.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'dashboard',
                path: "views",
            }, TRIGGER_NAME);
        });

        it('should handle >> with empty string object', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        dashboard: {
                            '>>': {
                                namespace: '',
                                pathPrefix: 'ui.'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/dashboard/views/list.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'dashboard',
                path: "ui.views",
            }, TRIGGER_NAME);
        });

        it('should handle >> with null namespace object', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        dashboard: {
                            '>>': {
                                namespace: null,
                                pathPrefix: 'ui.'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/dashboard/views/list.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'dashboard',
                path: "ui.views",
            }, TRIGGER_NAME);
        });

        it('should handle >> with undefined namespace object', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        dashboard: {
                            '>>': {
                                pathPrefix: 'ui.'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/dashboard/views/list.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'dashboard',
                path: "ui.views",
            }, TRIGGER_NAME);
        });

        it('should handle >> with null object', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        dashboard: {
                            '>>': null
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/dashboard/views/list.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'dashboard',
                path: "views",
            }, TRIGGER_NAME);
        });

        it('should handle >> with undefined object', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        dashboard: {
                            '>>': undefined
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/dashboard/views/list.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'views',
            }, TRIGGER_NAME);
        });

        it('should handle >> with empty object', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        dashboard: {
                            '>>': {}
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/dashboard/views/list.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'dashboard',
                path: "views",
            }, TRIGGER_NAME);
        });

        it('should handle >> with object containing only pathPrefix', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        dashboard: {
                            '>>': {
                                pathPrefix: 'ui.'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/dashboard/views/list.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'dashboard',
                path: "ui.views",
            }, TRIGGER_NAME);
        });

        it('should handle >> with object containing only namespace', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        dashboard: {
                            '>>': {
                                namespace: 'custom'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/dashboard/views/list.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'custom',
                path: "views",
            }, TRIGGER_NAME);
        });
    });

    describe('Integration with other options', () => {
        it('should work with ignoreDirectories', async () => {
            const generator = pathBasedConfigGenerator({
                ignoreDirectories: ['__tests__', 'utils'],
                pathRules: {
                    src: {
                        features: {
                            '>>': 'app'
                        }
                    }
                }
            });
            
            const event = createMockEvent('src/features/__tests__/utils/helpers.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'app',
            }, TRIGGER_NAME);
        });

        it('should work with removeBracketedDirectories', async () => {
            const generator = pathBasedConfigGenerator({
                removeBracketedDirectories: true,
                pathRules: {
                    app: {
                        routes: {
                            '>>': 'pages'
                        }
                    }
                }
            });
            
            const event = createMockEvent('app/routes/(auth)/login/form.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'pages',
                path: "login",
            }, TRIGGER_NAME);
        });
    });

    describe('>> directly in directory before component', () => {
        it('should work without pathPrefix', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        '>>': 'ui'
                    }
                }
            });
            
            const event = createMockEvent('components/Button.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'ui',
            }, TRIGGER_NAME);
        });

        it('should work with pathPrefix without dot at the end', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    features: {
                        '>>': {
                            namespace: 'pages',
                            pathPrefix: 'feature'
                        }
                    }
                }
            });
            
            const event = createMockEvent('features/Dashboard.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'pages',
                path: 'feature',
            }, TRIGGER_NAME);
        });

        it('should work with pathPrefix with dot at the end', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    modules: {
                        '>>': {
                            namespace: 'core',
                            pathPrefix: 'module.'
                        }
                    }
                }
            });
            
            const event = createMockEvent('modules/Analytics.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'core',
                path: 'module',
            }, TRIGGER_NAME);
        });

        it('should work with multi-level pathPrefix with dots', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    views: {
                        '>>': {
                            namespace: 'app',
                            pathPrefix: 'app.views.'
                        }
                    }
                }
            });
            
            const event = createMockEvent('views/Profile.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'app',
                path: 'app.views',
            }, TRIGGER_NAME);
        });
    });

    describe('Nested >> redirects', () => {
        it('should use the deepest >> redirect when nested', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    app: {
                        '>>': 'fallback',
                        features: {
                            '>>': 'pages',
                            auth: {
                                '>>': 'security',
                                login: {
                                    '>': 'auth'
                                }
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('app/features/auth/login/form.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'security',
                path: 'auth',
            }, TRIGGER_NAME);
        });

        it('should use the deepest >> redirect with pathPrefix when nested', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    src: {
                        '>>': 'fallback',
                        modules: {
                            '>>': {
                                namespace: 'core',
                                pathPrefix: 'modules.'
                            },
                            admin: {
                                '>>': {
                                    namespace: 'management',
                                    pathPrefix: 'admin.'
                                }
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('src/modules/admin/users/roles.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'management',
                path: 'admin.users',
            }, TRIGGER_NAME);
        });

        it('should use the deepest >> redirect even when parent has string redirect', async () => {
            const generator = pathBasedConfigGenerator({
                pathRules: {
                    components: {
                        '>>': 'ui',
                        forms: {
                            '>>': {
                                namespace: 'validation',
                                pathPrefix: 'forms.'
                            }
                        }
                    }
                }
            });
            
            const event = createMockEvent('components/forms/inputs/email.tsx');
            await generator(event);
            
            expect(event.save).toHaveBeenCalledWith({
                namespace: 'validation',
                path: 'forms.inputs',
            }, TRIGGER_NAME);
        });
    });
});

