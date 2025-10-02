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
});