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

    it('should find lang match with trailing comma after second argument (Prettier formatting)', () => {
        const content = `export const authTranslations = lang(
    {
        common: {
            signIn: 'Sign In',
        },
    },
    { namespace: 'auth' },
);`;
        
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].fullMatch).toBe(` authTranslations = lang(
    {
        common: {
            signIn: 'Sign In',
        },
    },
    { namespace: 'auth' },
)`);
        expect(tags[0].variableName).toBe("authTranslations");
        expect(tags[0].parameter1Text).toBe(`{
        common: {
            signIn: 'Sign In',
        },
    }`);
        expect(tags[0].parameter2Text).toBe(`{ namespace: 'auth' }`);
        expect(tags[0].parameterTranslations.common.signIn).toBe('Sign In');
        expect(tags[0].parameterConfig.namespace).toBe('auth');
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
        const content = "const t1 = lang({ key: 'hello' }, { namespace: 'common' }); const t2 = lang({ key: 'hi' }, { namespace: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: { namespace: 'app', debug: true } },
            { tag: tags[1], config: { namespace: 'admin', debug: false } }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('t1')
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterConfig.namespace).toBe('app');
        expect(tag1.parameterConfig.debug).toBe(true);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBe('t2')
        expect(tag2.parameterTranslations.key).toBe('hi'); // unchanged
        expect(tag2.parameterConfig.namespace).toBe('admin');
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
        const content = "const t1 = lang({ key: 'hello' }, { namespace: 'common' }); const t2 = lang({ key: 'hi' }, { namespace: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: {} }, // empty config
            { tag: tags[1], config: { namespace: null, debug: undefined, empty: '' } } // null, undefined, empty string
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
        expect(tag2.parameterConfig.namespace).toBeNull();
        expect(tag2.parameterConfig.debug).toBeUndefined();
        expect(tag2.parameterConfig.empty).toBe('');
    });

    it('should replace config without variable assignment', () => {
        const content = "lang({ key: 'hello' }, { namespace: 'common' }); lang({ key: 'hi' }, { namespace: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: { namespace: 'app', debug: true } },
            { tag: tags[1], config: { namespace: 'admin', debug: false } }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBeUndefined();
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterConfig.namespace).toBe('app');
        expect(tag1.parameterConfig.debug).toBe(true);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBeUndefined();
        expect(tag2.parameterTranslations.key).toBe('hi'); // unchanged
        expect(tag2.parameterConfig.namespace).toBe('admin');
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
        const content = "const t1 = lang({ key: 'hello' }, { namespace: 'common' }); const t2 = lang({ key: 'hi' }, { namespace: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: "{ namespace: 'app', debug: true }" },
            { tag: tags[1], config: "{ namespace: 'admin', debug: false }" }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('t1')
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterConfig.namespace).toBe('app');
        expect(tag1.parameterConfig.debug).toBe(true);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBe('t2')
        expect(tag2.parameterTranslations.key).toBe('hi'); // unchanged
        expect(tag2.parameterConfig.namespace).toBe('admin');
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
        const content = "const t1 = lang({ key: 'hello' }, { namespace: 'common' }); const t2 = lang({ key: 'hi' }, { namespace: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: "{}" }, 
            { tag: tags[1], config: "{ namespace: null, empty: '' }" }
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
        expect(tag2.parameterConfig.namespace).toBeNull();
        expect(tag2.parameterConfig.empty).toBe('');
    });

    it('should replace config as string without variable assignment', () => {
        const content = "lang({ key: 'hello' }, { namespace: 'common' }); lang({ key: 'hi' }, { namespace: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: "{ namespace: 'app', debug: true }" },
            { tag: tags[1], config: "{ namespace: 'admin', debug: false }" }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBeUndefined();
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterConfig.namespace).toBe('app');
        expect(tag1.parameterConfig.debug).toBe(true);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBeUndefined();
        expect(tag2.parameterTranslations.key).toBe('hi'); // unchanged
        expect(tag2.parameterConfig.namespace).toBe('admin');
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

    it('should preserve comments in translations when replacing config only', () => {
        const content = `const translations = lang({
            // This is a comment
            key: 'hello',
            // Another comment
            message: 'world'
        }, { namespace: 'common' });`;

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: { namespace: 'ui', fallback: true } }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        // Check that the result contains the original comments
        expect(tag1.parameter1Text).toContain('// This is a comment');
        expect(tag1.parameter1Text).toContain('// Another comment');
        expect(tag1.variableName).toBe('translations')
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterTranslations.message).toBe('world'); // unchanged
        expect(tag1.parameterConfig.namespace).toBe('ui');
        expect(tag1.parameterConfig.fallback).toBe(true);
    });

    it('should preserve comments in multiple tags when replacing config only', () => {
        const content = `const t1 = lang({
            // First comment
            key: 'hello'
        }, { namespace: 'common' }); 
        const t2 = lang({
            // Second comment
            key: 'hi',
            // Third comment
            message: 'there'
        }, { namespace: 'ui' });`;

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: { namespace: 'app', debug: true } },
            { tag: tags[1], config: { namespace: 'admin', debug: false } }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        // Check that all comments are preserved
        expect(tag1.parameter1Text).toContain('// First comment');
        expect(tag1.variableName).toBe('t1')
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterConfig.namespace).toBe('app');
        expect(tag1.parameterConfig.debug).toBe(true);
        
        const tag2 = finalTags[1];
        // Check that all comments are preserved
        expect(tag2.parameter1Text).toContain('// Second comment');
        expect(tag2.parameter1Text).toContain('// Third comment');
        expect(tag2.variableName).toBe('t2')
        expect(tag2.parameterTranslations.key).toBe('hi'); // unchanged
        expect(tag2.parameterTranslations.message).toBe('there'); // unchanged
        expect(tag2.parameterConfig.namespace).toBe('admin');
        expect(tag2.parameterConfig.debug).toBe(false);
    });

    it('should preserve comments in complex nested translations when replacing config only', () => {
        const content = `const translations = lang({
            // Main translations object
            menu: {
                // Menu items comment
                items: [
                    {label: "Home"}, // Home item
                    {label: "About"} // About item
                ]
            },
            user: {
                // User profile comment
                profile: "Profile"
            }
        }, { namespace: 'common' });`;

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: { namespace: 'advanced', settings: { debug: true } } }
        ]

        const result = processor.replaceTags(content, replacements);


        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        // Check that all comments are preserved
        expect(tag1.parameter1Text).toContain('// Main translations object');
        expect(tag1.parameter1Text).toContain('// Menu items comment');
        expect(tag1.parameter1Text).toContain('// Home item');
        expect(tag1.parameter1Text).toContain('// About item');
        expect(tag1.parameter1Text).toContain('// User profile comment');
        expect(tag1.variableName).toBe('translations')
        expect(tag1.parameterTranslations.menu.items).toHaveLength(2);
        expect(tag1.parameterTranslations.menu.items[0].label).toBe('Home');
        expect(tag1.parameterTranslations.menu.items[1].label).toBe('About');
        expect(tag1.parameterTranslations.user.profile).toBe('Profile');
        expect(tag1.parameterConfig.namespace).toBe('advanced');
        expect(tag1.parameterConfig.settings.debug).toBe(true);
    });

    it('should preserve various comment types when replacing config only', () => {
        const content = `const translations = lang({
            // Single line comment
            key: 'hello',
            /* Multi-line comment
               with multiple lines */
            message: 'world',
            // TODO: Fix this later
            temp: 'value',
            /* Another multi-line
               comment */
            final: 'done'
        }, { namespace: 'common' });`;

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: { namespace: 'ui', fallback: true } }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        // Check that all comments are preserved
        expect(tag1.parameter1Text).toContain('// Single line comment');
        expect(tag1.parameter1Text).toContain('/* Multi-line comment');
        expect(tag1.parameter1Text).toContain('with multiple lines */');
        expect(tag1.parameter1Text).toContain('// TODO: Fix this later');
        expect(tag1.parameter1Text).toContain('/* Another multi-line');
        expect(tag1.parameter1Text).toContain('comment */');
        expect(tag1.variableName).toBe('translations')
        expect(tag1.parameterTranslations.key).toBe('hello');
        expect(tag1.parameterTranslations.message).toBe('world');
        expect(tag1.parameterTranslations.temp).toBe('value');
        expect(tag1.parameterTranslations.final).toBe('done');
        expect(tag1.parameterConfig.namespace).toBe('ui');
        expect(tag1.parameterConfig.fallback).toBe(true);
    });

    it('should replace both translations and config with objects', () => {
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
        expect(tag1.parameterTranslations.key).toBe('greeting');
        expect(tag1.parameterTranslations.message).toBe('Hello World');
        expect(tag1.parameterConfig.namespace).toBe('ui');
        expect(tag1.parameterConfig.fallback).toBe(true);
    });

    it('should replace both translations and config with strings', () => {
        const content = "const translations = lang({ key: 'hello' }, { namespace: 'common' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { 
                tag: tags[0], 
                translations: "{ key: 'greeting', message: 'Hello World' }",
                config: "{ namespace: 'ui', fallback: true }"
            }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations')
        expect(tag1.parameterTranslations.key).toBe('greeting');
        expect(tag1.parameterTranslations.message).toBe('Hello World');
        expect(tag1.parameterConfig.namespace).toBe('ui');
        expect(tag1.parameterConfig.fallback).toBe(true);
    });

    it('should replace with mixed object/string formats', () => {
        const content = "const translations = lang({ key: 'hello' }, { namespace: 'common' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { 
                tag: tags[0], 
                translations: { key: 'greeting', message: 'Hello World' }, // object
                config: "{ namespace: 'ui', fallback: true }" // string
            }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations')
        expect(tag1.parameterTranslations.key).toBe('greeting');
        expect(tag1.parameterTranslations.message).toBe('Hello World');
        expect(tag1.parameterConfig.namespace).toBe('ui');
        expect(tag1.parameterConfig.fallback).toBe(true);
    });

    it('should replace with mixed string/object formats', () => {
        const content = "const translations = lang({ key: 'hello' }, { namespace: 'common' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { 
                tag: tags[0], 
                translations: "{ key: 'greeting', message: 'Hello World' }", // string
                config: { namespace: 'ui', fallback: true } // object
            }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('translations')
        expect(tag1.parameterTranslations.key).toBe('greeting');
        expect(tag1.parameterTranslations.message).toBe('Hello World');
        expect(tag1.parameterConfig.namespace).toBe('ui');
        expect(tag1.parameterConfig.fallback).toBe(true);
    });

    it('should replace multiple tags with both parameters using different formats', () => {
        const content = "const t1 = lang({ key: 'hello' }, { namespace: 'common' }); const t2 = lang({ key: 'hi' }, { namespace: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { 
                tag: tags[0], 
                translations: { key: 'greeting', message: 'Hello' }, // object
                config: "{ namespace: 'app', debug: true }" // string
            },
            { 
                tag: tags[1], 
                translations: "{ key: 'salutation', message: 'Hi there' }", // string
                config: { namespace: 'admin', debug: false } // object
            }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('t1')
        expect(tag1.parameterTranslations.key).toBe('greeting');
        expect(tag1.parameterTranslations.message).toBe('Hello');
        expect(tag1.parameterConfig.namespace).toBe('app');
        expect(tag1.parameterConfig.debug).toBe(true);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBe('t2')
        expect(tag2.parameterTranslations.key).toBe('salutation');
        expect(tag2.parameterTranslations.message).toBe('Hi there');
        expect(tag2.parameterConfig.namespace).toBe('admin');
        expect(tag2.parameterConfig.debug).toBe(false);
    });

    it('should replace both parameters without variable assignment', () => {
        const content = "lang({ key: 'hello' }, { namespace: 'common' }); lang({ key: 'hi' }, { namespace: 'ui' });";

        const tags = processor.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { 
                tag: tags[0], 
                translations: { key: 'greeting', message: 'Hello' },
                config: "{ namespace: 'app', debug: true }"
            },
            { 
                tag: tags[1], 
                translations: "{ key: 'salutation', message: 'Hi there' }",
                config: { namespace: 'admin', debug: false }
            }
        ]

        const result = processor.replaceTags(content, replacements);

        const finalTags = processor.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBeUndefined();
        expect(tag1.parameterTranslations.key).toBe('greeting');
        expect(tag1.parameterTranslations.message).toBe('Hello');
        expect(tag1.parameterConfig.namespace).toBe('app');
        expect(tag1.parameterConfig.debug).toBe(true);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBeUndefined();
        expect(tag2.parameterTranslations.key).toBe('salutation');
        expect(tag2.parameterTranslations.message).toBe('Hi there');
        expect(tag2.parameterConfig.namespace).toBe('admin');
        expect(tag2.parameterConfig.debug).toBe(false);
    });
});

describe('Error handling and edge cases', () => {
    const commonConfig: Pick<LangTagConfig, 'tagName' | 'translationArgPosition'> = {
        tagName: 'lang',
        translationArgPosition: 1
    }
    const processor = new $LT_TagProcessor(commonConfig);

    it('should handle broken syntax - missing closing bracket', () => {
        const content = "const text = lang({ key: 'hello' }; // missing closing bracket\n const x = 1; function a(){}";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(0);
    });

    it('should not find tags with broken syntax - missing opening bracket', () => {
        const content = "const text = lang key: 'hello' }); // missing opening bracket";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(0);
    });

    it('should not find tags with broken syntax - unclosed string', () => {
        const content = "const text = lang({ key: 'hello }); // unclosed string";
        const tags = processor.extractTags(content);

        // The processor might still find the tag but it should be invalid
        expect(tags).toHaveLength(1);
        expect(tags[0].validity).toBe('invalid-param-1');
    });

    it('should handle broken syntax - missing comma', () => {
        const content = "const text = lang({ key: 'hello' } { fallback: 'hi' }); // missing comma";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(0);
    });

    it('should not find tags with broken syntax - nested unclosed brackets', () => {
        const content = "const text = lang({ key: 'hello', nested: { inner: 'value' }); // missing closing bracket";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(0);
    });

    it('should handle malformed JSON in parameters', () => {
        const content = "const text = lang({ key: 'hello', invalid: json }); // invalid JSON";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].validity).toBe('invalid-param-1');
    });

    it('should handle malformed JSON in second parameter', () => {
        const content = "const text = lang({ key: 'hello' }, { namespace: invalid json });";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].validity).toBe('invalid-param-2');
    });

    it('should throw error when replaceTags is called without translations and config', () => {
        const content = "const text = lang({ key: 'hello' });";
        const tags = processor.extractTags(content);

        expect(() => {
            processor.replaceTags(content, [
                { tag: tags[0] } // No translations or config
            ]);
        }).toThrow('Replacement data is required!');
    });

    it('should throw error when replaceTags is called with invalid translations object', () => {
        const content = "const text = lang({ key: 'hello' });";
        const tags = processor.extractTags(content);

        expect(() => {
            processor.replaceTags(content, [
                { tag: tags[0], translations: "invalid json syntax" }
            ]);
        }).toThrow('Tag translations are invalid object!');
    });

    it('should throw error when replaceTags is called with invalid config object', () => {
        const content = "const text = lang({ key: 'hello' }, { namespace: 'common' });";
        const tags = processor.extractTags(content);

        expect(() => {
            processor.replaceTags(content, [
                { tag: tags[0], config: "invalid json syntax" }
            ]);
        }).toThrow('Tag config is invalid object!');
    });

    it('should handle empty replaceTags array', () => {
        const content = "const text = lang({ key: 'hello' });";
        const result = processor.replaceTags(content, []);

        expect(result).toBe(content); // Should return unchanged content
    });

    it('should handle replaceTags with undefined translations and config', () => {
        const content = "const text = lang({ key: 'hello' });";
        const tags = processor.extractTags(content);

        expect(() => {
            processor.replaceTags(content, [
                { tag: tags[0], translations: undefined, config: undefined }
            ]);
        }).toThrow('Replacement data is required!');
    });

    it('should handle replaceTags with null translations and config', () => {
        const content = "const text = lang({ key: 'hello' });";
        const tags = processor.extractTags(content);

        expect(() => {
            processor.replaceTags(content, [
                { tag: tags[0], translations: null, config: null }
            ]);
        }).toThrow('Replacement data is required!');
    });

    it('should handle replaceTags with empty string translations and config', () => {
        const content = "const text = lang({ key: 'hello' });";
        const tags = processor.extractTags(content);

        expect(() => {
            processor.replaceTags(content, [
                { tag: tags[0], translations: '', config: '' }
            ]);
        }).toThrow('Replacement data is required!');
    });

    it('should handle replaceTags with incomplete object syntax', () => {
        const content = "const text = lang({ key: 'hello' });";
        const tags = processor.extractTags(content);

        expect(() => {
            processor.replaceTags(content, [
                { tag: tags[0], translations: "{ key: 'hello'" } // Missing closing brace
            ]);
        }).toThrow('Tag translations are invalid object!');
    });

    it('should handle replaceTags with incomplete config syntax', () => {
        const content = "const text = lang({ key: 'hello' }, { namespace: 'common' });";
        const tags = processor.extractTags(content);

        expect(() => {
            processor.replaceTags(content, [
                { tag: tags[0], config: "{ namespace: 'ui'" } // Missing closing brace
            ]);
        }).toThrow('Tag config is invalid object!');
    });

    it('should handle replaceTags with malformed nested objects', () => {
        const content = "const text = lang({ key: 'hello' });";
        const tags = processor.extractTags(content);

        expect(() => {
            processor.replaceTags(content, [
                { tag: tags[0], translations: "{ key: 'hello', nested: { inner: 'value'" } // Missing closing braces
            ]);
        }).toThrow('Tag translations are invalid object!');
    });

    it('should handle replaceTags with invalid array syntax', () => {
        const content = "const text = lang({ key: 'hello' });";
        const tags = processor.extractTags(content);

        expect(() => {
            processor.replaceTags(content, [
                { tag: tags[0], translations: "{ key: 'hello', items: ['item1', 'item2'" } // Missing closing bracket
            ]);
        }).toThrow('Tag translations are invalid object!');
    });

    it('should handle replaceTags with invalid string quotes', () => {
        const content = "const text = lang({ key: 'hello' });";
        const tags = processor.extractTags(content);

        expect(() => {
            processor.replaceTags(content, [
                { tag: tags[0], translations: "{ key: 'hello', message: \"unclosed string }" } // Unclosed string
            ]);
        }).toThrow('Tag translations are invalid object!');
    });

    it('should handle replaceTags with invalid number syntax', () => {
        const content = "const text = lang({ key: 'hello' });";
        const tags = processor.extractTags(content);

        expect(() => {
            processor.replaceTags(content, [
                { tag: tags[0], translations: "{ key: 'hello', count: 123abc }" } // Invalid number
            ]);
        }).toThrow('Tag translations are invalid object!');
    });

    it('should handle replaceTags with invalid boolean syntax', () => {
        const content = "const text = lang({ key: 'hello' });";
        const tags = processor.extractTags(content);

        expect(() => {
            processor.replaceTags(content, [
                { tag: tags[0], translations: "{ key: 'hello', enabled: tru }" } // Invalid boolean
            ]);
        }).toThrow('Tag translations are invalid object!');
    });

    it("should not find tag when '}' appears inside string value without real closing brace", () => {
        const content = "const text = lang({ key: 'he}llo');\nconst x = 1;";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(0);
    });

    it("should not find tag when ')' appears inside string value without real closing paren", () => {
        const content = "const text = lang({ key: 'he)llo' } ; // missing real closing paren\nconst y = 2;";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(0);
    });
});

describe('findLangMatches with different config', () => {
    const differentConfig: Pick<LangTagConfig, 'tagName' | 'translationArgPosition'> = {
        tagName: 't',
        translationArgPosition: 2
    }
    const processorWithDifferentConfig = new $LT_TagProcessor(differentConfig);

    it('should find single t match with translations on position 2', () => {
        const content = "const text = t({ namespace: 'common' }, { key: 'hello' });";
        const tags = processorWithDifferentConfig.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].fullMatch).toBe(" text = t({ namespace: 'common' }, { key: 'hello' })");
        expect(tags[0].variableName).toBe("text");
        expect(tags[0].parameter1Text).toBe("{ namespace: 'common' }");
        expect(tags[0].parameter2Text).toBe("{ key: 'hello' }");
        expect(tags[0].parameterTranslations.key).toBe('hello'); // translations on position 2
        expect(tags[0].parameterConfig.namespace).toBe('common'); // config on position 1
    });

    it('should find t match with two objects and translations on position 2', () => {
        const content = "const text = t({ namespace: 'common', debug: true }, { key: 'hello', message: 'world' });";
        const tags = processorWithDifferentConfig.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].fullMatch).toBe(" text = t({ namespace: 'common', debug: true }, { key: 'hello', message: 'world' })");
        expect(tags[0].variableName).toBe("text");
        expect(tags[0].parameter1Text).toBe("{ namespace: 'common', debug: true }");
        expect(tags[0].parameter2Text).toBe("{ key: 'hello', message: 'world' }");
        expect(tags[0].parameterTranslations.key).toBe('hello');
        expect(tags[0].parameterTranslations.message).toBe('world');
        expect(tags[0].parameterConfig.namespace).toBe('common');
        expect(tags[0].parameterConfig.debug).toBe(true);
    });

    it('should find multiple t tags with different config', () => {
        const content = "const text1 = t({ namespace: 'app' }, { key: 'hello' }); const text2 = t({ namespace: 'ui' }, { key: 'hi' });";

        const tags = processorWithDifferentConfig.extractTags(content);

        expect(tags).toHaveLength(2);
        expect(tags[0].fullMatch).toBe(" text1 = t({ namespace: 'app' }, { key: 'hello' })");
        expect(tags[0].variableName).toBe("text1");
        expect(tags[0].parameter1Text).toBe("{ namespace: 'app' }");
        expect(tags[0].parameter2Text).toBe("{ key: 'hello' }");
        expect(tags[0].parameterTranslations.key).toBe('hello');
        expect(tags[0].parameterConfig.namespace).toBe('app');
        
        expect(tags[1].fullMatch).toBe(" text2 = t({ namespace: 'ui' }, { key: 'hi' })");
        expect(tags[1].variableName).toBe("text2");
        expect(tags[1].parameter1Text).toBe("{ namespace: 'ui' }");
        expect(tags[1].parameter2Text).toBe("{ key: 'hi' }");
        expect(tags[1].parameterTranslations.key).toBe('hi');
        expect(tags[1].parameterConfig.namespace).toBe('ui');
    });

    it('should find t match without variable assignment', () => {
        const content = "t({ namespace: 'common' }, { key: 'hello' });";
        const tags = processorWithDifferentConfig.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].fullMatch).toBe("t({ namespace: 'common' }, { key: 'hello' })");
        expect(tags[0].variableName).toBeUndefined();
        expect(tags[0].parameter1Text).toBe("{ namespace: 'common' }");
        expect(tags[0].parameter2Text).toBe("{ key: 'hello' }");
        expect(tags[0].parameterTranslations.key).toBe('hello');
        expect(tags[0].parameterConfig.namespace).toBe('common');
    });

    it('should return no tags if no t function is found', () => {
        const content = "const text = lang({ key: 'hello' });";
        const tags = processorWithDifferentConfig.extractTags(content);

        expect(tags).toHaveLength(0);
    });
});

describe('replaceLangMatches with different config', () => {
    const differentConfig: Pick<LangTagConfig, 'tagName' | 'translationArgPosition'> = {
        tagName: 't',
        translationArgPosition: 2
    }
    const processorWithDifferentConfig = new $LT_TagProcessor(differentConfig);

    it('should replace translations on position 2 with object', () => {
        const content = "const text = t({ namespace: 'common' }, { key: 'hello' });";

        const tags = processorWithDifferentConfig.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], translations: { key: 'greeting', message: 'Hello World' } }
        ]

        const result = processorWithDifferentConfig.replaceTags(content, replacements);

        const finalTags = processorWithDifferentConfig.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('text')
        expect(tag1.parameterTranslations.key).toBe('greeting');
        expect(tag1.parameterTranslations.message).toBe('Hello World');
        expect(tag1.parameterConfig.namespace).toBe('common'); // unchanged
    });

    it('should replace config on position 1 with object', () => {
        const content = "const text = t({ namespace: 'common' }, { key: 'hello' });";

        const tags = processorWithDifferentConfig.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { tag: tags[0], config: { namespace: 'ui', fallback: true } }
        ]

        const result = processorWithDifferentConfig.replaceTags(content, replacements);

        const finalTags = processorWithDifferentConfig.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('text')
        expect(tag1.parameterTranslations.key).toBe('hello'); // unchanged
        expect(tag1.parameterConfig.namespace).toBe('ui');
        expect(tag1.parameterConfig.fallback).toBe(true);
    });

    it('should replace both parameters with different config', () => {
        const content = "const text = t({ namespace: 'common' }, { key: 'hello' });";

        const tags = processorWithDifferentConfig.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { 
                tag: tags[0], 
                translations: { key: 'greeting', message: 'Hello World' },
                config: { namespace: 'ui', fallback: true }
            }
        ]

        const result = processorWithDifferentConfig.replaceTags(content, replacements);

        const finalTags = processorWithDifferentConfig.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('text')
        expect(tag1.parameterTranslations.key).toBe('greeting');
        expect(tag1.parameterTranslations.message).toBe('Hello World');
        expect(tag1.parameterConfig.namespace).toBe('ui');
        expect(tag1.parameterConfig.fallback).toBe(true);
    });

    it('should replace with mixed formats using different config', () => {
        const content = "const text = t({ namespace: 'common' }, { key: 'hello' });";

        const tags = processorWithDifferentConfig.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { 
                tag: tags[0], 
                translations: "{ key: 'greeting', message: 'Hello World' }", // string
                config: { namespace: 'ui', fallback: true } // object
            }
        ]

        const result = processorWithDifferentConfig.replaceTags(content, replacements);

        const finalTags = processorWithDifferentConfig.extractTags(result);

        expect(finalTags).toHaveLength(1);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('text')
        expect(tag1.parameterTranslations.key).toBe('greeting');
        expect(tag1.parameterTranslations.message).toBe('Hello World');
        expect(tag1.parameterConfig.namespace).toBe('ui');
        expect(tag1.parameterConfig.fallback).toBe(true);
    });

    it('should handle multiple tags with different config', () => {
        const content = "const t1 = t({ namespace: 'app' }, { key: 'hello' }); const t2 = t({ namespace: 'ui' }, { key: 'hi' });";

        const tags = processorWithDifferentConfig.extractTags(content);

        const replacements: $LT_TagReplaceData[] = [
            { 
                tag: tags[0], 
                translations: { key: 'greeting', message: 'Hello' },
                config: "{ namespace: 'admin', debug: true }"
            },
            { 
                tag: tags[1], 
                translations: "{ key: 'salutation', message: 'Hi there' }",
                config: { namespace: 'public', debug: false }
            }
        ]

        const result = processorWithDifferentConfig.replaceTags(content, replacements);

        const finalTags = processorWithDifferentConfig.extractTags(result);

        expect(finalTags).toHaveLength(2);
        const tag1 = finalTags[0];
        expect(tag1.variableName).toBe('t1')
        expect(tag1.parameterTranslations.key).toBe('greeting');
        expect(tag1.parameterTranslations.message).toBe('Hello');
        expect(tag1.parameterConfig.namespace).toBe('admin');
        expect(tag1.parameterConfig.debug).toBe(true);
        
        const tag2 = finalTags[1];
        expect(tag2.variableName).toBe('t2')
        expect(tag2.parameterTranslations.key).toBe('salutation');
        expect(tag2.parameterTranslations.message).toBe('Hi there');
        expect(tag2.parameterConfig.namespace).toBe('public');
        expect(tag2.parameterConfig.debug).toBe(false);
    });

});