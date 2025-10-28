import { describe, expect, it } from 'vitest';

import { deepFreezeObject } from '@/core/utils';

describe('deepFreezeObject', () => {
    it('should throw error when trying to modify frozen config.namespace', () => {
        const config = {
            namespace: 'common',
            path: 'greetings',
        };

        const frozenConfig = deepFreezeObject(config);

        expect(() => {
            (frozenConfig as any).namespace = 'modified';
        }).toThrow("Cannot assign to read only property 'namespace'");
    });

    it('should throw error when trying to modify nested frozen config property', () => {
        const config = {
            namespace: 'common',
            path: 'greetings',
            custom: {
                nested: 'value',
            },
        };

        const frozenConfig = deepFreezeObject(config);

        expect(() => {
            (frozenConfig as any).custom.nested = 'modified';
        }).toThrow("Cannot assign to read only property 'nested'");
    });

    it('should throw error when trying to add new property to frozen config', () => {
        const config = {
            namespace: 'common',
            path: 'greetings',
        };

        const frozenConfig = deepFreezeObject(config);

        expect(() => {
            (frozenConfig as any).newProperty = 'value';
        }).toThrow('Cannot add property newProperty, object is not extensible');
    });

    it('should allow reading frozen config properties', () => {
        const config = {
            namespace: 'common',
            path: 'greetings',
            custom: {
                nested: 'value',
            },
        };

        const frozenConfig = deepFreezeObject(config);

        expect(frozenConfig.namespace).toBe('common');
        expect(frozenConfig.path).toBe('greetings');
        expect(frozenConfig.custom.nested).toBe('value');
    });

    it('should freeze arrays within objects', () => {
        const config = {
            namespace: 'common',
            tags: ['tag1', 'tag2'],
        };

        const frozenConfig = deepFreezeObject(config);

        expect(() => {
            (frozenConfig as any).tags.push('tag3');
        }).toThrow();

        expect(() => {
            (frozenConfig as any).tags[0] = 'modified';
        }).toThrow();
    });

    it('should handle deeply nested objects', () => {
        const config = {
            namespace: 'common',
            meta: {
                level1: {
                    level2: {
                        level3: {
                            value: 'deep',
                        },
                    },
                },
            },
        };

        const frozenConfig = deepFreezeObject(config);

        expect(() => {
            (frozenConfig as any).meta.level1.level2.level3.value = 'modified';
        }).toThrow("Cannot assign to read only property 'value'");
    });

    it('should handle null and undefined values', () => {
        const config = {
            namespace: 'common',
            path: null,
            optional: undefined,
        };

        const frozenConfig = deepFreezeObject(config);

        expect(frozenConfig.namespace).toBe('common');
        expect(frozenConfig.path).toBe(null);
        expect(frozenConfig.optional).toBe(undefined);
    });
});
