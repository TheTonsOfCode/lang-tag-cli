import {LangTagConfig} from "@/cli/config";
import {describe, it, expect} from 'vitest';
import {findLangTags, LangTagMatch, replaceLangTags} from '@/cli/processor';

const commonConfig: Pick<LangTagConfig, 'tagName'> = {
    tagName: 'lang',
}

describe('findLangMatches', () => {
    it('should find single lang match with one object', () => {
        const content = "const text = lang({ key: 'hello' });";
        const matches = findLangTags(commonConfig, content);

        expect(matches).toHaveLength(1);
        expect(matches[0].fullMatch).toBe(" text = lang({ key: 'hello' })");
        expect(matches[0].variableName).toBe("text");
        expect(matches[0].content1).toBe("{ key: 'hello' }");
        expect(matches[0].content2).toBeUndefined();
    });

    it('should find lang match with two objects', () => {
        const content = "const text = lang({ key: 'hello' }, { fallback: 'hi' });";
        const matches = findLangTags(commonConfig, content);

        expect(matches).toHaveLength(1);
        expect(matches[0].fullMatch).toBe(" text = lang({ key: 'hello' }, { fallback: 'hi' })");
        expect(matches[0].variableName).toBe("text");
        expect(matches[0].content1).toBe("{ key: 'hello' }");
        expect(matches[0].content2).toBe("{ fallback: 'hi' }");
    });

    it('should find multiple lang matches', () => {
        const content = "const text1 = lang({ key: 'hello' }); const text2 = lang({ key: 'hi' });";

        const matches = findLangTags(commonConfig, content);

        expect(matches).toHaveLength(2);
        expect(matches[0].fullMatch).toBe(" text1 = lang({ key: 'hello' })");
        expect(matches[0].variableName).toBe("text1");
        expect(matches[0].content1).toBe("{ key: 'hello' }");
        expect(matches[0].content2).toBeUndefined();
        expect(matches[1].fullMatch).toBe(" text2 = lang({ key: 'hi' })");
        expect(matches[1].variableName).toBe("text2");
        expect(matches[1].content1).toBe("{ key: 'hi' }");
        expect(matches[1].content2).toBeUndefined();
    });

    it('should find lang match without variable assignment', () => {
        const content = "lang({ key: 'hello' });";
        const matches = findLangTags(commonConfig, content);

        expect(matches).toHaveLength(1);
        expect(matches[0].fullMatch).toBe("lang({ key: 'hello' })");
        expect(matches[0].variableName).toBeUndefined();
        expect(matches[0].content1).toBe("{ key: 'hello' }");
        expect(matches[0].content2).toBeUndefined();
    });

    it('should find lang match with two objects without variable assignment', () => {
        const content = "lang({ key: 'hello' }, { fallback: 'hi' });";
        const matches = findLangTags(commonConfig, content);

        expect(matches).toHaveLength(1);
        expect(matches[0].fullMatch).toBe("lang({ key: 'hello' }, { fallback: 'hi' })");
        expect(matches[0].variableName).toBeUndefined();
        expect(matches[0].content1).toBe("{ key: 'hello' }");
        expect(matches[0].content2).toBe("{ fallback: 'hi' }");
    });

    it('should find lang matches with and without variable assignment in the same content', () => {
        const content = "const text = lang({ key: 'hello' }); lang({ key: 'direct_use' });";
        const matches = findLangTags(commonConfig, content);

        expect(matches).toHaveLength(2);

        expect(matches[0].fullMatch).toBe(" text = lang({ key: 'hello' })");
        expect(matches[0].variableName).toBe("text");
        expect(matches[0].content1).toBe("{ key: 'hello' }");
        expect(matches[0].content2).toBeUndefined();

        expect(matches[1].fullMatch).toBe("lang({ key: 'direct_use' })");
        expect(matches[1].variableName).toBeUndefined();
        expect(matches[1].content1).toBe("{ key: 'direct_use' }");
        expect(matches[1].content2).toBeUndefined();
    });

    it('should return no matches if no lang function is found', () => {
        const content = "const text = 'hello world';";
        const matches = findLangTags(commonConfig, content);

        expect(matches).toHaveLength(0);
    });
});

describe('replaceLangMatches', () => {
    it('should replace a single lang match with new content', () => {
        const content = "const text = lang({ key: 'hello' });";

        const matches = findLangTags(commonConfig, content);

        const replacements: Map<LangTagMatch, string> = new Map();
        replacements.set(matches[0], " text = lang({ key: 'greeting' })");

        const result = replaceLangTags(content, replacements);

        expect(result).toBe("const text = lang({ key: 'greeting' });");
    });

    it('should replace multiple lang matches with new content', () => {
        const content = "const text1 = lang({ key: 'hello' }); const text2 = lang({ key: 'hi' });";

        const matches = findLangTags(commonConfig, content);

        const replacements: Map<LangTagMatch, string> = new Map();
        replacements.set(matches[0], " text1 = lang({ key: 'greeting' })");
        replacements.set(matches[1], " text2 = lang({ key: 'salutation' })");

        const result = replaceLangTags(content, replacements);

        expect(result).toBe("const text1 = lang({ key: 'greeting' }); const text2 = lang({ key: 'salutation' });");
    });

    it('should handle different replacement lengths correctly', () => {
        const content = "const text = lang({ key: 'hello' }); const moreText = lang({ key: 'hi' });";

        const matches = findLangTags(commonConfig, content);

        const replacements: Map<LangTagMatch, string> = new Map();
        replacements.set(matches[0], " text = lang({ key: 'greeting' })");
        replacements.set(matches[1], " moreText = lang({ key: 'salutation', language: 'en' })");

        const result = replaceLangTags(content, replacements);

        expect(result).toBe("const text = lang({ key: 'greeting' }); const moreText = lang({ key: 'salutation', language: 'en' });");
    });

    it('should not change content if no match is found', () => {
        const content = "const text = 'hello world';";
        const replacements: Map<LangTagMatch, string> = new Map();

        const result = replaceLangTags(content, replacements);

        expect(result).toBe("const text = 'hello world';");
    });
});