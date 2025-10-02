import {LangTagConfig} from "@/cli/config.ts";
import {describe, expect, it} from 'vitest';
import {$LT_TagProcessor, $LT_TagReplaceData} from '@/cli/core/processor.ts';

const commonConfig: Pick<LangTagConfig, 'tagName' | 'translationArgPosition'> = {
    tagName: 'lang',
    translationArgPosition: 1
}
const processor = new $LT_TagProcessor(commonConfig);

describe('findLangMatches', () => {
    it('should find single lang match with one object', () => {
        const content = "const text = lang({ key: 'hello' });";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].fullMatch).toBe(" text = lang({ key: 'hello' })");
        expect(tags[0].variableName).toBe("text");
        expect(tags[0].parameter1Text).toBe("{ key: 'hello' }");
        expect(tags[0].parameter2Text).toBeUndefined();
    });

    it('should find lang match with two objects', () => {
        const content = "const text = lang({ key: 'hello' }, { fallback: 'hi' });";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].fullMatch).toBe(" text = lang({ key: 'hello' }, { fallback: 'hi' })");
        expect(tags[0].variableName).toBe("text");
        expect(tags[0].parameter1Text).toBe("{ key: 'hello' }");
        expect(tags[0].parameter2Text).toBe("{ fallback: 'hi' }");
    });

    it('should find multiple lang tags', () => {
        const content = "const text1 = lang({ key: 'hello' }); const text2 = lang({ key: 'hi' });";

        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(2);
        expect(tags[0].fullMatch).toBe(" text1 = lang({ key: 'hello' })");
        expect(tags[0].variableName).toBe("text1");
        expect(tags[0].parameter1Text).toBe("{ key: 'hello' }");
        expect(tags[0].parameter2Text).toBeUndefined();
        expect(tags[1].fullMatch).toBe(" text2 = lang({ key: 'hi' })");
        expect(tags[1].variableName).toBe("text2");
        expect(tags[1].parameter1Text).toBe("{ key: 'hi' }");
        expect(tags[1].parameter2Text).toBeUndefined();
    });

    it('should find lang match without variable assignment', () => {
        const content = "lang({ key: 'hello' });";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].fullMatch).toBe("lang({ key: 'hello' })");
        expect(tags[0].variableName).toBeUndefined();
        expect(tags[0].parameter1Text).toBe("{ key: 'hello' }");
        expect(tags[0].parameter2Text).toBeUndefined();
    });

    it('should find lang match with two objects without variable assignment', () => {
        const content = "lang({ key: 'hello' }, { fallback: 'hi' });";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].fullMatch).toBe("lang({ key: 'hello' }, { fallback: 'hi' })");
        expect(tags[0].variableName).toBeUndefined();
        expect(tags[0].parameter1Text).toBe("{ key: 'hello' }");
        expect(tags[0].parameter2Text).toBe("{ fallback: 'hi' }");
    });

    it('should find lang tags with and without variable assignment in the same content', () => {
        const content = "const text = lang({ key: 'hello' }); lang({ key: 'direct_use' });";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(2);

        expect(tags[0].fullMatch).toBe(" text = lang({ key: 'hello' })");
        expect(tags[0].variableName).toBe("text");
        expect(tags[0].parameter1Text).toBe("{ key: 'hello' }");
        expect(tags[0].parameter2Text).toBeUndefined();

        expect(tags[1].fullMatch).toBe("lang({ key: 'direct_use' })");
        expect(tags[1].variableName).toBeUndefined();
        expect(tags[1].parameter1Text).toBe("{ key: 'direct_use' }");
        expect(tags[1].parameter2Text).toBeUndefined();
    });

    it('should return no tags if no lang function is found', () => {
        const content = "const text = 'hello world';";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(0);
    });

    // that test does not mean we handle array translations
    it('should find lang match with nested objects and arrays', () => {
        const content = `const translations = lang({
                menu: {
                    items: [
                        {label: "Home", url: "/"},
                        {label: "About", url: "/about"},
                    ]
                }
            }, {"namespace": "common"});`;
        
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].fullMatch).toBe(` translations = lang({
                menu: {
                    items: [
                        {label: "Home", url: "/"},
                        {label: "About", url: "/about"},
                    ]
                }
            }, {"namespace": "common"})`);
        expect(tags[0].variableName).toBe("translations");
        expect(tags[0].parameter1Text).toBe(`{
                menu: {
                    items: [
                        {label: "Home", url: "/"},
                        {label: "About", url: "/about"},
                    ]
                }
            }`);
        expect(tags[0].parameter2Text).toBe(`{"namespace": "common"}`);
    });
});

describe('replaceLangMatches', () => {
    it('should replace a single lang match with new content', () => {
        const content = "const translations = lang({ key: 'hello' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], translations: "{ key: 'greeting' }" }
        ]
        
        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations')
        expect(Object.keys(tag1.parameterTranslations)).toHaveLength(1);
        expect(tag1.parameterTranslations.key).toBeDefined();
        expect(tag1.parameterTranslations.key).toBe('greeting');
    });

    it('should replace a single lang match with new content (object)', () => {
        const content = "const translations = lang({ key: 'hello' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], translations: { key: 'greeting' } }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations')
        expect(Object.keys(tag1.parameterTranslations)).toHaveLength(1);
        expect(tag1.parameterTranslations.key).toBeDefined();
        expect(tag1.parameterTranslations.key).toBe('greeting');
    });

    it('should replace multiple lang tags with new content', () => {
        const content = "const translations1 = lang({ key: 'hello' }); const translations2 = lang({ key: 'hi' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], translations: "{ key: 'greeting' }" },
            { tag: tags[1], translations: "{ key: 'salutation' }" }
        ]
    
        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations1')
        expect(Object.keys(tag1.parameterTranslations)).toHaveLength(1);
        expect(tag1.parameterTranslations.key).toBeDefined();
        expect(tag1.parameterTranslations.key).toBe('greeting');
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBe('translations2')
        expect(Object.keys(tag2.parameterTranslations)).toHaveLength(1);
        expect(tag2.parameterTranslations.key).toBeDefined();
        expect(tag2.parameterTranslations.key).toBe('salutation');
    });

    it('should handle different replacement lengths correctly', () => {
        const content = "const t1 = lang({ key: 'hello' }); const t2 = lang({ key: 'hi' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], translations: "{ key: 'greeting' }" },
            { tag: tags[1], translations: "{ key: 'salutation', extraKey: 'some value' }" }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('t1')
        expect(Object.keys(tag1.parameterTranslations)).toHaveLength(1);
        expect(tag1.parameterTranslations.key).toBeDefined();
        expect(tag1.parameterTranslations.key).toBe('greeting');
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBe('t2')
        expect(Object.keys(tag2.parameterTranslations)).toHaveLength(2);
        expect(tag2.parameterTranslations.key).toBeDefined();
        expect(tag2.parameterTranslations.key).toBe('salutation');
        expect(tag2.parameterTranslations.extraKey).toBeDefined();
        expect(tag2.parameterTranslations.extraKey).toBe('some value');
    });

    it('should not change content if no match is found', () => {
        const content = "const text = 'hello world';";

        const replacements: $LT_TagReplaceData[] = []

        const result = processor.replaceTags(content, replacements);

        expect(result).toBe("const text = 'hello world';");
    });

    it('should replace multiple lang tags with object parameters', () => {
        const content = "const translations1 = lang({ key: 'hello' }); const translations2 = lang({ key: 'hi' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], translations: { key: 'greeting' } },
            { tag: tags[1], translations: { key: 'salutation' } }
        ]
    
        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations1')
        expect(Object.keys(tag1.parameterTranslations)).toHaveLength(1);
        expect(tag1.parameterTranslations.key).toBeDefined();
        expect(tag1.parameterTranslations.key).toBe('greeting');
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBe('translations2')
        expect(Object.keys(tag2.parameterTranslations)).toHaveLength(1);
        expect(tag2.parameterTranslations.key).toBeDefined();
        expect(tag2.parameterTranslations.key).toBe('salutation');
    });

    it('should handle different replacement lengths with object parameters', () => {
        const content = "const t1 = lang({ key: 'hello' }); const t2 = lang({ key: 'hi' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], translations: { key: 'greeting' } },
            { tag: tags[1], translations: { key: 'salutation', extraKey: 'some value' } }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('t1')
        expect(Object.keys(tag1.parameterTranslations)).toHaveLength(1);
        expect(tag1.parameterTranslations.key).toBeDefined();
        expect(tag1.parameterTranslations.key).toBe('greeting');
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBe('t2')
        expect(Object.keys(tag2.parameterTranslations)).toHaveLength(2);
        expect(tag2.parameterTranslations.key).toBeDefined();
        expect(tag2.parameterTranslations.key).toBe('salutation');
        expect(tag2.parameterTranslations.extraKey).toBeDefined();
        expect(tag2.parameterTranslations.extraKey).toBe('some value');
    });

    it('should replace with complex nested objects', () => {
        const content = "const translations = lang({ key: 'hello' });";

        const tags = processor.extractTags(content);

        const complexObject = {
            menu: {
                items: [
                    {label: "Home"},
                    {label: "About"},
                ]
            },
            user: {
                profile: "Profile"
            }
        };

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], translations: complexObject }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations')
        expect(tag1.parameterTranslations).toEqual(complexObject);
        expect(tag1.parameterTranslations.menu.items).toHaveLength(2);
        expect(tag1.parameterTranslations.user.profile).toBe('Profile');
    });

    it('should replace with object parameters and config', () => {
        const content = "const translations = lang({ key: 'hello' }, { namespace: 'common' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { 
                tag: tags[0], 
                translations: { key: 'greeting', message: 'Hello World' },
                config: { namespace: 'ui', fallback: true }
            }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations')
        expect(Object.keys(tag1.parameterTranslations)).toHaveLength(2);
        expect(tag1.parameterTranslations.key).toBe('greeting');
        expect(tag1.parameterTranslations.message).toBe('Hello World');
        expect(tag1.parameterConfig.namespace).toBe('ui');
        expect(tag1.parameterConfig.fallback).toBe(true);
    });

    it('should handle edge cases with object parameters', () => {
        const content = "const t1 = lang({ key: 'hello' }); const t2 = lang({ key: 'hi' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], translations: {} }, // empty object
            { tag: tags[1], translations: { key: null, value: undefined, empty: '' } } // null, undefined, empty string
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('t1')
        expect(Object.keys(tag1.parameterTranslations)).toHaveLength(0);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBe('t2')
        // undefined values are not included in Object.keys(), so we expect 2 keys (key and empty)
        expect(Object.keys(tag2.parameterTranslations)).toHaveLength(2);
        expect(tag2.parameterTranslations.key).toBeNull();
        expect(tag2.parameterTranslations.value).toBeUndefined();
        expect(tag2.parameterTranslations.empty).toBe('');
    });

    it('should replace object parameters without variable assignment', () => {
        const content = "lang({ key: 'hello' }); lang({ key: 'hi' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], translations: { key: 'greeting' } },
            { tag: tags[1], translations: { key: 'salutation' } }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBeUndefined();
        expect(tag1.parameterTranslations.key).toBe('greeting');
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBeUndefined();
        expect(tag2.parameterTranslations.key).toBe('salutation');
    });

    it('should replace with config only (single tag)', () => {
        const content = "const translations = lang({ key: 'hello' }, { namespace: 'common' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: { namespace: 'ui', fallback: true } }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations')
        // Original translations should remain unchanged
        expect(tag1.parameterTranslations.key).toBe('hello');
        // Config should be updated
        expect(tag1.parameterConfig.namespace).toBe('ui');
        expect(tag1.parameterConfig.fallback).toBe(true);
    });

    it('should replace multiple tags with config only', () => {
        const content = "const t1 = lang({ key: 'hello' }, { ns: 'common' }); const t2 = lang({ key: 'hi' }, { ns: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: { ns: 'app', debug: true } },
            { tag: tags[1], config: { ns: 'admin', debug: false } }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('t1')
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterConfig.ns).toBe('app');
        expect(tag1.parameterConfig.debug).toBe(true);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBe('t2')
        expect(tag2.parameterTranslations.key).toBe('hi'); // unchanged
        expect(tag2.parameterConfig.ns).toBe('admin');
        expect(tag2.parameterConfig.debug).toBe(false);
    });

    it('should replace with complex config objects', () => {
        const content = "const translations = lang({ key: 'hello' }, { namespace: 'common' });";

        const tags = processor.extractTags(content);

        const complexConfig = {
            namespace: 'advanced',
            settings: {
                fallback: true,
                debug: false,
                features: {
                    interpolation: true,
                    pluralization: false
                }
            },
            metadata: {
                version: '1.0.0',
                author: 'test'
            }
        };

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: complexConfig }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations')
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterConfig).toEqual(complexConfig);
        expect(tag1.parameterConfig.settings.features.interpolation).toBe(true);
        expect(tag1.parameterConfig.metadata.version).toBe('1.0.0');
    });

    it('should handle config edge cases', () => {
        const content = "const t1 = lang({ key: 'hello' }, { ns: 'common' }); const t2 = lang({ key: 'hi' }, { ns: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: {} }, // empty config
            { tag: tags[1], config: { ns: null, debug: undefined, empty: '' } } // null, undefined, empty string
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('t1')
        expect(Object.keys(tag1.parameterConfig)).toHaveLength(0);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBe('t2')
        // undefined values are not included in Object.keys(), so we expect 2 keys (ns and empty)
        expect(Object.keys(tag2.parameterConfig)).toHaveLength(2);
        expect(tag2.parameterConfig.ns).toBeNull();
        expect(tag2.parameterConfig.debug).toBeUndefined();
        expect(tag2.parameterConfig.empty).toBe('');
    });

    it('should replace config without variable assignment', () => {
        const content = "lang({ key: 'hello' }, { ns: 'common' }); lang({ key: 'hi' }, { ns: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: { ns: 'app', debug: true } },
            { tag: tags[1], config: { ns: 'admin', debug: false } }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBeUndefined();
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterConfig.ns).toBe('app');
        expect(tag1.parameterConfig.debug).toBe(true);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBeUndefined();
        expect(tag2.parameterTranslations.key).toBe('hi'); // unchanged
        expect(tag2.parameterConfig.ns).toBe('admin');
        expect(tag2.parameterConfig.debug).toBe(false);
    });

    it('should replace with config as string (single tag)', () => {
        const content = "const translations = lang({ key: 'hello' }, { namespace: 'common' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: "{ namespace: 'ui', fallback: true }" }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations')
        // Original translations should remain unchanged
        expect(tag1.parameterTranslations.key).toBe('hello');
        // Config should be updated
        expect(tag1.parameterConfig.namespace).toBe('ui');
        expect(tag1.parameterConfig.fallback).toBe(true);
    });

    it('should replace multiple tags with config as string', () => {
        const content = "const t1 = lang({ key: 'hello' }, { ns: 'common' }); const t2 = lang({ key: 'hi' }, { ns: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: "{ ns: 'app', debug: true }" },
            { tag: tags[1], config: "{ ns: 'admin', debug: false }" }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('t1')
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterConfig.ns).toBe('app');
        expect(tag1.parameterConfig.debug).toBe(true);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBe('t2')
        expect(tag2.parameterTranslations.key).toBe('hi'); // unchanged
        expect(tag2.parameterConfig.ns).toBe('admin');
        expect(tag2.parameterConfig.debug).toBe(false);
    });

    it('should replace with complex config strings', () => {
        const content = "const translations = lang({ key: 'hello' }, { namespace: 'common' });";

        const tags = processor.extractTags(content);

        const complexConfigString = `{
            namespace: 'advanced',
            settings: {
                fallback: true,
                debug: false,
                features: {
                    interpolation: true,
                    pluralization: false
                }
            },
            metadata: {
                version: '1.0.0',
                author: 'test'
            }
        }`;

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: complexConfigString }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations')
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterConfig.namespace).toBe('advanced');
        expect(tag1.parameterConfig.settings.fallback).toBe(true);
        expect(tag1.parameterConfig.settings.features.interpolation).toBe(true);
        expect(tag1.parameterConfig.metadata.version).toBe('1.0.0');
    });

    it('should handle config string edge cases', () => {
        const content = "const t1 = lang({ key: 'hello' }, { ns: 'common' }); const t2 = lang({ key: 'hi' }, { ns: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: "{}" }, // empty config string
            { tag: tags[1], config: "{ ns: null, empty: '' }" } // null, empty string (removed undefined as it's not valid JSON5)
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('t1')
        expect(Object.keys(tag1.parameterConfig)).toHaveLength(0);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBe('t2')
        expect(Object.keys(tag2.parameterConfig)).toHaveLength(2);
        expect(tag2.parameterConfig.ns).toBeNull();
        expect(tag2.parameterConfig.empty).toBe('');
    });

    it('should replace config as string without variable assignment', () => {
        const content = "lang({ key: 'hello' }, { ns: 'common' }); lang({ key: 'hi' }, { ns: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: "{ ns: 'app', debug: true }" },
            { tag: tags[1], config: "{ ns: 'admin', debug: false }" }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBeUndefined();
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterConfig.ns).toBe('app');
        expect(tag1.parameterConfig.debug).toBe(true);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBeUndefined();
        expect(tag2.parameterTranslations.key).toBe('hi'); // unchanged
        expect(tag2.parameterConfig.ns).toBe('admin');
        expect(tag2.parameterConfig.debug).toBe(false);
    });

    it('should handle config strings with special characters and formatting', () => {
        const content = "const translations = lang({ key: 'hello' }, { namespace: 'common' });";

        const tags = processor.extractTags(content);

        const configStringWithSpecialChars = `{
            namespace: 'test-namespace',
            settings: {
                'special-key': 'value with spaces',
                "quoted-key": "value with \\"quotes\\"",
                multiline: "multiline\\nstring",
                pattern: "test-pattern"
            }
        }`;

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: configStringWithSpecialChars }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations')
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterConfig.namespace).toBe('test-namespace');
        expect(tag1.parameterConfig.settings['special-key']).toBe('value with spaces');
        expect(tag1.parameterConfig.settings['quoted-key']).toBe('value with "quotes"');
        expect(tag1.parameterConfig.settings.multiline).toBe('multiline\nstring');
        expect(tag1.parameterConfig.settings.pattern).toBe('test-pattern');
    });
});