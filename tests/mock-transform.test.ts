import {describe, expect, it} from 'vitest';
import {defaultTranslationTransformer, InterpolationParams, LangTagTranslationsConfig, TranslationTransformContext} from '@/index';

// Minimal config for testing purposes
const mockConfig: LangTagTranslationsConfig = {
    namespace: "test_namespace"
};

// Helper to create a minimal context for the transformer
const createContext = (value: string, params?: InterpolationParams): TranslationTransformContext<LangTagTranslationsConfig> => ({
    value,
    params,
    path: 'test.path', // Dummy value, not used by default transformer
    key: 'path', // Dummy value, not used by default transformer
    parentPath: 'test.', // Dummy value, not used by default transformer
    config: mockConfig // Dummy value, not used by default transformer
});

describe('defaultTranslationTransformer', () => {
    it('should replace placeholders with corresponding values from params', () => {
        const result = defaultTranslationTransformer(createContext(
            "Hello, {{name}}! Welcome to {{place}}.",
            {name: "Alice", place: "Wonderland"}
        ));
        expect(result).toBe("Hello, Alice! Welcome to Wonderland.");
    });

    it('should leave placeholders empty if corresponding values are missing in params', () => {
        const result = defaultTranslationTransformer(createContext(
            "Hello, {{name}}! Welcome to {{place}}.",
            {name: "Alice"} // place is missing
        ));
        expect(result).toBe("Hello, Alice! Welcome to .");
    });

    it('should handle multiple occurrences of the same placeholder', () => {
        const result = defaultTranslationTransformer(createContext(
            "{{greeting}}, {{name}}! {{greeting}} again!",
            {greeting: "Hi", name: "Bob"}
        ));
        expect(result).toBe("Hi, Bob! Hi again!");
    });

    it('should replace with empty string if no params are provided for a placeholder', () => {
        const result = defaultTranslationTransformer(createContext(
            "Hello, {{name}}!"
            // No params object for the call to createContext, so params in context will be undefined
        ));
        expect(result).toBe("Hello, !");
    });

    it('should replace with empty string if params object is empty for a placeholder', () => {
        const result = defaultTranslationTransformer(createContext(
            "Hello, {{name}}!",
            {}
        ));
        expect(result).toBe("Hello, !");
    });

    it('should handle values in params that are not strings (e.g., numbers)', () => {
        const result = defaultTranslationTransformer(createContext(
            "Value: {{count}}",
            { count: 123 }
        ));
        expect(result).toBe("Value: 123");
    });

    it('should be case-sensitive with placeholder names', () => {
        const result = defaultTranslationTransformer(createContext(
            "{{Name}} vs {{name}}",
            { Name: "Alice", name: "Bob" }
        ));
        expect(result).toBe("Alice vs Bob");
    });

    it('should handle placeholders with no spaces around them', () => {
        const result = defaultTranslationTransformer(createContext(
            "Value:{{count}}!",
            { count: 42 }
        ));
        expect(result).toBe("Value:42!");
    });

    it('should return the empty string if it is not a string', () => {
        // Testing behavior if `value` is not a string, though `TranslationTransformContext` types it as string.
        // This test is more for JS robustness if types were bypassed.
        const contextWithValueNotString = {
            value: 12345 as any, // Bypassing type for test
            params: { some: "param" },
            path: 'test.path',
            key: 'path',
            parentPath: 'test.',
            config: mockConfig
        } as TranslationTransformContext<LangTagTranslationsConfig>; 
        // Explicit cast for safety, though `value` is `any` here.

        const result = defaultTranslationTransformer(contextWithValueNotString);
        expect(result).toBe('');
    });

    it('should handle value being an empty string', () => {
        const result = defaultTranslationTransformer(createContext(
            "",
            { name: "Alice" }
        ));
        expect(result).toBe("");
    });
});