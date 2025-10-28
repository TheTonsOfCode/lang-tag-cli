import {LangTagCLIConfig} from "@/type.ts";
import {describe, expect, it} from 'vitest';
import {$LT_TagProcessor} from '@/core/processor.ts';

const commonConfig: Pick<LangTagCLIConfig, 'tagName' | 'translationArgPosition'> = {
    tagName: 'lang',
    translationArgPosition: 1
}
const processor = new $LT_TagProcessor(commonConfig);

describe('Commented lang-tags should be ignored', () => {
    it('should ignore single-line commented lang tags', () => {
        const content = `// const text = lang({ key: 'hello' });
const active = lang({ key: 'active' });`;
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].parameterTranslations.key).toBe('active');
    });

    it('should ignore block commented lang tags', () => {
        const content = `/* const text = lang({ key: 'hello' }); */
const active = lang({ key: 'active' });`;
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].parameterTranslations.key).toBe('active');
    });

    it('should allow inline comments after lang tags', () => {
        const content = "const text = lang({ key: 'hello' }); // comment";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].parameterTranslations.key).toBe('hello');
    });
});

describe('Template strings with interpolation are not allowed', () => {
    it('should reject lang tag with template string interpolation in translations', () => {
        const content = "const x = 'test';\nconst text = lang({ hello: `Hello ${x}` });";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(0); // Should be rejected
    });

    it('should reject lang tag with template string interpolation in config', () => {
        const content = "const ns = 'common';\nconst text = lang({ key: 'hello' }, { namespace: `${ns}` });";
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(0); // Should be rejected
    });
});

describe('JSON5 multiline strings should be ignored', () => {
    it('should ignore lang tag in multiline string', () => {
        const content = `const str = "line 1
const text = lang({ key: 'hello' })
line 3";`;
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(0);
    });

    it('should allow multiline strings inside lang parameters', () => {
        const content = `const text = lang({
    key: 'hello',
    message: "multiline
    string value"
});`;
        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(1);
        expect(tags[0].parameterTranslations.key).toBe('hello');
    });
});

describe('Combined edge cases', () => {
    it('should handle realistic code with all edge cases', () => {
        const content = `// const old = lang({ key: 'old' });
const active1 = lang({ key: 'active1' });
/* const commented = lang({ key: 'commented' }); */
const template = \`fake: lang({ key: 'fake' })\`;
const active2 = lang({ key: 'active2' }); // inline comment`;

        const tags = processor.extractTags(content);

        expect(tags).toHaveLength(2);
        expect(tags[0].parameterTranslations.key).toBe('active1');
        expect(tags[1].parameterTranslations.key).toBe('active2');
    });
});

