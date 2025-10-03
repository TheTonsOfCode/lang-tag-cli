import {describe, expect, it} from 'vitest';
import {processPlaceholders} from './vanilla-process-placeholders-fn.ts';

describe('processPlaceholders', () => {
    it('should replace placeholders with corresponding values from params', () => {
        const result = processPlaceholders(
            "Hello, {{name}}! Welcome to {{place}}.",
            {name: "Alice", place: "Wonderland"}
        );
        expect(result).toBe("Hello, Alice! Welcome to Wonderland.");
    });

    it('should leave placeholders empty if corresponding values are missing in params', () => {
        const result = processPlaceholders(
            "Hello, {{name}}! Welcome to {{place}}.",
            {name: "Alice"} // place is missing
        );
        expect(result).toBe("Hello, Alice! Welcome to .");
    });

    it('should handle multiple occurrences of the same placeholder', () => {
        const result = processPlaceholders(
            "{{greeting}}, {{name}}! {{greeting}} again!",
            {greeting: "Hi", name: "Bob"}
        );
        expect(result).toBe("Hi, Bob! Hi again!");
    });

    it('should replace with empty string if no params are provided for a placeholder', () => {
        const result = processPlaceholders(
            "Hello, {{name}}!"
            // No params object provided
        );
        expect(result).toBe("Hello, !");
    });

    it('should replace with empty string if params object is empty for a placeholder', () => {
        const result = processPlaceholders(
            "Hello, {{name}}!",
            {}
        );
        expect(result).toBe("Hello, !");
    });

    it('should handle values in params that are not strings (e.g., numbers)', () => {
        const result = processPlaceholders(
            "Value: {{count}}",
            { count: 123 }
        );
        expect(result).toBe("Value: 123");
    });

    it('should be case-sensitive with placeholder names', () => {
        const result = processPlaceholders(
            "{{Name}} vs {{name}}",
            { Name: "Alice", name: "Bob" }
        );
        expect(result).toBe("Alice vs Bob");
    });

    it('should handle placeholders with no spaces around them', () => {
        const result = processPlaceholders(
            "Value:{{count}}!",
            { count: 42 }
        );
        expect(result).toBe("Value:42!");
    });

    it('should return the empty string if it is not a string', () => {
        // Testing behavior if `translation` is not a string
        const result = processPlaceholders(
            12345 as any, // Bypassing type for test
            { some: "param" }
        );
        expect(result).toBe('');
    });

    it('should handle value being an empty string', () => {
        const result = processPlaceholders(
            "",
            { name: "Alice" }
        );
        expect(result).toBe("");
    });
});
