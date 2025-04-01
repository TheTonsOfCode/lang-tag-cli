import {describe, expect, it} from 'vitest';
import {mockTranslateTransform, ParametrizedFunctionParams} from '@/index';

const partialTransform = (props: {value: string, params: ParametrizedFunctionParams}) =>
    // @ts-ignore
    mockTranslateTransform(props);

describe('mockTransform', () => {
    it('should replace placeholders with corresponding values from params', () => {
        const result = partialTransform({
            value: "Hello, {{name}}! Welcome to {{place}}.",
            params: {name: "Alice", place: "Wonderland"}
        });
        expect(result).toBe("Hello, Alice! Welcome to Wonderland.");
    });

    it('should leave placeholders empty if corresponding values are missing', () => {
        const result = partialTransform({
            value: "Hello, {{name}}! Welcome to {{place}}.",
            params: {name: "Alice"}
        });
        expect(result).toBe("Hello, Alice! Welcome to .");
    });

    it('should handle multiple occurrences of the same placeholder', () => {
        const result = partialTransform({
            value: "{{greeting}}, {{name}}! {{greeting}} again!",
            params: {greeting: "Hi", name: "Bob"}
        });
        expect(result).toBe("Hi, Bob! Hi again!");
    });
});