import { describe, expect, it } from 'vitest';

import { processPlaceholders } from './vanilla-process-placeholders-fn';

describe('processPlaceholders', () => {
    it('should replace placeholders with corresponding values from params', () => {
        const result = processPlaceholders(
            'Hello, {{name}}! Welcome to {{place}}.',
            { name: 'Alice', place: 'Wonderland' }
        );
        expect(result).toBe('Hello, Alice! Welcome to Wonderland.');
    });

    it('should leave placeholders empty if corresponding values are missing in params', () => {
        const result = processPlaceholders(
            'Hello, {{name}}! Welcome to {{place}}.',
            { name: 'Alice' } // place is missing
        );
        expect(result).toBe('Hello, Alice! Welcome to .');
    });

    it('should handle multiple occurrences of the same placeholder', () => {
        const result = processPlaceholders(
            '{{greeting}}, {{name}}! {{greeting}} again!',
            { greeting: 'Hi', name: 'Bob' }
        );
        expect(result).toBe('Hi, Bob! Hi again!');
    });

    it('should replace with empty string if no params are provided for a placeholder', () => {
        const result = processPlaceholders(
            'Hello, {{name}}!'
            // No params object provided
        );
        expect(result).toBe('Hello, !');
    });

    it('should replace with empty string if params object is empty for a placeholder', () => {
        const result = processPlaceholders('Hello, {{name}}!', {});
        expect(result).toBe('Hello, !');
    });

    it('should handle values in params that are not strings (e.g., numbers)', () => {
        const result = processPlaceholders('Value: {{count}}', { count: 123 });
        expect(result).toBe('Value: 123');
    });

    it('should be case-sensitive with placeholder names', () => {
        const result = processPlaceholders('{{Name}} vs {{name}}', {
            Name: 'Alice',
            name: 'Bob',
        });
        expect(result).toBe('Alice vs Bob');
    });

    it('should handle placeholders with no spaces around them', () => {
        const result = processPlaceholders('Value:{{count}}!', { count: 42 });
        expect(result).toBe('Value:42!');
    });

    it('should return the empty string if it is not a string', () => {
        // Testing behavior if `translation` is not a string
        const result = processPlaceholders(
            12345 as any, // Bypassing type for test
            { some: 'param' }
        );
        expect(result).toBe('');
    });

    it('should handle value being an empty string', () => {
        const result = processPlaceholders('', { name: 'Alice' });
        expect(result).toBe('');
    });

    // Additional comprehensive tests
    it('should handle boolean values in params', () => {
        const result = processPlaceholders(
            'Status: {{isActive}}, Debug: {{debug}}',
            { isActive: true, debug: false }
        );
        expect(result).toBe('Status: true, Debug: false');
    });

    it('should handle null and undefined values in params', () => {
        const result = processPlaceholders(
            'Value: {{nullValue}}, Other: {{undefinedValue}}',
            { nullValue: null, undefinedValue: undefined }
        );
        expect(result).toBe('Value: null, Other: ');
    });

    it('should handle object values in params (converted to string)', () => {
        const result = processPlaceholders('Config: {{config}}', {
            config: { theme: 'dark', lang: 'en' },
        });
        expect(result).toBe('Config: [object Object]');
    });

    it('should handle array values in params (converted to string)', () => {
        const result = processPlaceholders('Items: {{items}}', {
            items: ['apple', 'banana', 'cherry'],
        });
        expect(result).toBe('Items: apple,banana,cherry');
    });

    it('should handle function values in params (converted to string)', () => {
        const fn = () => 'test';
        const result = processPlaceholders('Function: {{fn}}', { fn });
        expect(result).toBe('Function: () => "test"');
    });

    it('should handle placeholders with whitespace inside brackets', () => {
        const result = processPlaceholders('Hello {{ name }}!', {
            name: 'Alice',
        });
        expect(result).toBe('Hello Alice!');
    });

    it('should handle placeholders with extra whitespace inside brackets', () => {
        const result = processPlaceholders('Hello {{  name  }}!', {
            name: 'Alice',
        });
        expect(result).toBe('Hello Alice!');
    });

    it('should handle malformed placeholders (missing closing bracket)', () => {
        const result = processPlaceholders('Hello {{name!', { name: 'Alice' });
        expect(result).toBe('Hello {{name!');
    });

    it('should handle malformed placeholders (missing opening bracket)', () => {
        const result = processPlaceholders('Hello name}}!', { name: 'Alice' });
        expect(result).toBe('Hello name}}!');
    });

    it('should handle empty placeholders', () => {
        const result = processPlaceholders('Hello {{}}!', { '': 'Empty' });
        expect(result).toBe('Hello Empty!');
    });

    it('should handle placeholders with special characters in names', () => {
        const result = processPlaceholders('Hello {{user-name}}!', {
            'user-name': 'Alice',
        });
        expect(result).toBe('Hello Alice!');
    });

    it('should handle placeholders with numbers in names', () => {
        const result = processPlaceholders('Item {{item1}} and {{item2}}', {
            item1: 'apple',
            item2: 'banana',
        });
        expect(result).toBe('Item apple and banana');
    });

    it('should handle placeholders with underscores in names', () => {
        const result = processPlaceholders('Hello {{user_name}}!', {
            user_name: 'Alice',
        });
        expect(result).toBe('Hello Alice!');
    });

    it('should handle very long placeholder names', () => {
        const longKey = 'a'.repeat(1000);
        const result = processPlaceholders(`Hello {{${longKey}}}!`, {
            [longKey]: 'Alice',
        });
        expect(result).toBe('Hello Alice!');
    });

    it('should handle very long parameter values', () => {
        const longValue = 'a'.repeat(10000);
        const result = processPlaceholders('Value: {{long}}', {
            long: longValue,
        });
        expect(result).toBe(`Value: ${longValue}`);
    });

    it('should handle string with only placeholders', () => {
        const result = processPlaceholders('{{greeting}}{{name}}', {
            greeting: 'Hello ',
            name: 'Alice',
        });
        expect(result).toBe('Hello Alice');
    });

    it('should handle string with placeholders at the beginning and end', () => {
        const result = processPlaceholders('{{greeting}} middle {{name}}', {
            greeting: 'Hello',
            name: 'Alice',
        });
        expect(result).toBe('Hello middle Alice');
    });

    it('should handle string with no placeholders', () => {
        const result = processPlaceholders(
            'This is a plain string with no placeholders',
            { name: 'Alice' }
        );
        expect(result).toBe('This is a plain string with no placeholders');
    });

    it('should handle string with literal double braces', () => {
        const result = processPlaceholders(
            'This has literal {{ and }} braces',
            {
                name: 'Alice',
            }
        );
        expect(result).toBe('This has literal  braces');
    });

    it('should handle mixed literal and placeholder braces', () => {
        const result = processPlaceholders(
            'Literal {{ and placeholder {{name}} and literal }}',
            { name: 'Alice' }
        );
        expect(result).toBe('Literal  and literal }}');
    });

    it('should handle zero as a parameter value', () => {
        const result = processPlaceholders('Count: {{count}}', { count: 0 });
        expect(result).toBe('Count: 0');
    });

    it('should handle negative numbers as parameter values', () => {
        const result = processPlaceholders('Temperature: {{temp}}°C', {
            temp: -10,
        });
        expect(result).toBe('Temperature: -10°C');
    });

    it('should handle decimal numbers as parameter values', () => {
        const result = processPlaceholders('Price: ${{price}}', {
            price: 19.99,
        });
        expect(result).toBe('Price: $19.99');
    });

    it('should handle scientific notation numbers as parameter values', () => {
        const result = processPlaceholders('Value: {{scientific}}', {
            scientific: 1.23e-4,
        });
        expect(result).toBe('Value: 0.000123');
    });

    it('should handle Infinity and NaN as parameter values', () => {
        const result = processPlaceholders('Infinity: {{inf}}, NaN: {{nan}}', {
            inf: Infinity,
            nan: NaN,
        });
        expect(result).toBe('Infinity: Infinity, NaN: NaN');
    });

    it('should handle Symbol values in params (converted to string)', () => {
        const sym = Symbol('test');
        const result = processPlaceholders('Symbol: {{sym}}', { sym });
        expect(result).toBe('Symbol: Symbol(test)');
    });

    it('should handle BigInt values in params (converted to string)', () => {
        const result = processPlaceholders('Big number: {{big}}', {
            big: BigInt(12345678901234567890),
        });
        expect(result).toBe('Big number: 12345678901234567168');
    });

    it('should handle Date objects in params (converted to string)', () => {
        const date = new Date('2023-01-01T00:00:00Z');
        const result = processPlaceholders('Date: {{date}}', { date });
        expect(result).toBe('Date: ' + date.toString());
    });

    it('should handle RegExp objects in params (converted to string)', () => {
        const regex = /test/gi;
        const result = processPlaceholders('Pattern: {{regex}}', { regex });
        expect(result).toBe('Pattern: /test/gi');
    });

    it('should handle very large number of placeholders', () => {
        const template = Array.from(
            { length: 100 },
            (_, i) => `{{param${i}}}`
        ).join(', ');
        const params = Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`param${i}`, `value${i}`])
        );
        const expected = Array.from(
            { length: 100 },
            (_, i) => `value${i}`
        ).join(', ');

        const result = processPlaceholders(template, params);
        expect(result).toBe(expected);
    });

    it('should handle unicode characters in placeholder names', () => {
        const result = processPlaceholders('Hello {{имя}}!', { имя: 'Алиса' });
        expect(result).toBe('Hello Алиса!');
    });

    it('should handle unicode characters in parameter values', () => {
        const result = processPlaceholders('Message: {{msg}}', {
            msg: 'Hello 世界! 🌍',
        });
        expect(result).toBe('Message: Hello 世界! 🌍');
    });

    it('should handle emoji in placeholder names', () => {
        const result = processPlaceholders('Hello {{👋}}!', { '👋': 'wave' });
        expect(result).toBe('Hello wave!');
    });

    it('should handle emoji in parameter values', () => {
        const result = processPlaceholders('Reaction: {{reaction}}', {
            reaction: '👍',
        });
        expect(result).toBe('Reaction: 👍');
    });
});
