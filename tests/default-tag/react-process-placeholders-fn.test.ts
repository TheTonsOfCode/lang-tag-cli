import { describe, expect, it } from 'vitest';
import { createElement, Fragment } from 'react';
import { reactProcessPlaceholders } from './react-process-placeholders-fn.ts';

describe('reactProcessPlaceholders', () => {
    describe('Basic functionality', () => {
        it('should replace placeholders with string values and return a string', () => {
            const result = reactProcessPlaceholders(
                "Hello, {{name}}! Welcome to {{place}}.",
                { name: "Alice", place: "Wonderland" }
            );
            expect(result).toBe("Hello, Alice! Welcome to Wonderland.");
        });

        it('should leave placeholders empty if corresponding values are missing in params', () => {
            const result = reactProcessPlaceholders(
                "Hello, {{name}}! Welcome to {{place}}.",
                { name: "Alice" } // place is missing
            );
            expect(result).toBe("Hello, Alice! Welcome to .");
        });

        it('should handle multiple occurrences of the same placeholder', () => {
            const result = reactProcessPlaceholders(
                "{{greeting}}, {{name}}! {{greeting}} again!",
                { greeting: "Hi", name: "Bob" }
            );
            expect(result).toBe("Hi, Bob! Hi again!");
        });

        it('should replace with empty string if no params are provided', () => {
            const result = reactProcessPlaceholders("Hello, {{name}}!");
            expect(result).toBe("Hello, !");
        });

        it('should replace with empty string if params object is empty', () => {
            const result = reactProcessPlaceholders("Hello, {{name}}!", {});
            expect(result).toBe("Hello, !");
        });

        it('should handle placeholders with whitespace inside brackets', () => {
            const result = reactProcessPlaceholders(
                "Hello {{ name }}!",
                { name: "Alice" }
            );
            expect(result).toBe("Hello Alice!");
        });

        it('should handle placeholders with extra whitespace inside brackets', () => {
            const result = reactProcessPlaceholders(
                "Hello {{  name  }}!",
                { name: "Alice" }
            );
            expect(result).toBe("Hello Alice!");
        });

        it('should be case-sensitive with placeholder names', () => {
            const result = reactProcessPlaceholders(
                "{{Name}} vs {{name}}",
                { Name: "Alice", name: "Bob" }
            );
            expect(result).toBe("Alice vs Bob");
        });
    });

    describe('React components as placeholders', () => {
        it('should replace placeholders with React elements and return ReactNode array', () => {
            const button = createElement('button', { key: 'btn' }, 'Click me');
            const result = reactProcessPlaceholders(
                "Click {{button}} to continue",
                { button }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(3);
            expect(result[0]).toBe("Click ");
            expect(result[1]).toEqual(button);
            expect(result[2]).toBe(" to continue");
        });

        it('should handle multiple React components in the same string', () => {
            const link = createElement('a', { href: '#', key: 'link' }, 'here');
            const button = createElement('button', { key: 'btn' }, 'submit');
            const result = reactProcessPlaceholders(
                "Visit {{link}} and {{button}}",
                { link, button }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(4);
            expect(result[0]).toBe("Visit ");
            expect(result[1]).toEqual(link);
            expect(result[2]).toBe(" and ");
            expect(result[3]).toEqual(button);
        });

        it('should handle React components with complex props', () => {
            const component = createElement('div', {
                className: 'highlight',
                style: { color: 'red' },
                key: 'div'
            }, 'Important text');
            const result = reactProcessPlaceholders(
                "Notice: {{component}}",
                { component }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[1]).toEqual(component);
        });

        it('should handle React components with children', () => {
            const component = createElement('span', { key: 'span' }, 
                createElement('strong', { key: 'strong' }, 'Bold text')
            );
            const result = reactProcessPlaceholders(
                "Text: {{component}}",
                { component }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[1]).toEqual(component);
        });

        it('should handle React fragments as placeholders', () => {
            const fragment = createElement(Fragment, { key: 'fragment' }, 
                'First', ' ', 'Second'
            );
            const result = reactProcessPlaceholders(
                "Content: {{fragment}}",
                { fragment }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[1]).toEqual(fragment);
        });
    });

    describe('Mixed content (strings and React components)', () => {
        it('should handle mixed string and React component placeholders', () => {
            const button = createElement('button', { key: 'btn' }, 'Click');
            const result = reactProcessPlaceholders(
                "Hello {{name}}, {{button}} to continue",
                { name: "Alice", button }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toBe("Hello ");
            expect(result[1]).toBe("Alice");
            expect(result[2]).toBe(", ");
            expect(result[3]).toEqual(button);
            expect(result[4]).toBe(" to continue");
        });

        it('should handle string values that become React components in mixed scenarios', () => {
            const icon = createElement('i', { className: 'icon', key: 'icon' });
            const result = reactProcessPlaceholders(
                "{{icon}} {{text}} {{icon}}",
                { icon, text: "Hello" }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toEqual(icon);
            expect(result[1]).toBe(" ");
            expect(result[2]).toBe("Hello");
            expect(result[3]).toBe(" ");
            expect(result[4]).toEqual(icon);
        });
    });

    describe('Edge cases and error conditions', () => {
        it('should return empty string if translation is not a string', () => {
            const result = reactProcessPlaceholders(
                12345 as any,
                { name: "Alice" }
            );
            expect(result).toBe('');
        });

        it('should return empty string if translation is null', () => {
            const result = reactProcessPlaceholders(
                null as any,
                { name: "Alice" }
            );
            expect(result).toBe('');
        });

        it('should return empty string if translation is undefined', () => {
            const result = reactProcessPlaceholders(
                undefined as any,
                { name: "Alice" }
            );
            expect(result).toBe('');
        });

        it('should handle empty translation string', () => {
            const result = reactProcessPlaceholders("", { name: "Alice" });
            expect(result).toBe("");
        });

        it('should handle string with no placeholders', () => {
            const result = reactProcessPlaceholders(
                "This is a plain string with no placeholders",
                { name: "Alice" }
            );
            expect(result).toBe("This is a plain string with no placeholders");
        });

        it('should handle malformed placeholders (missing closing bracket)', () => {
            const result = reactProcessPlaceholders(
                "Hello {{name!",
                { name: "Alice" }
            );
            expect(result).toBe("Hello {{name!");
        });

        it('should handle malformed placeholders (missing opening bracket)', () => {
            const result = reactProcessPlaceholders(
                "Hello name}}!",
                { name: "Alice" }
            );
            expect(result).toBe("Hello name}}!");
        });

        it('should handle empty placeholders', () => {
            const result = reactProcessPlaceholders(
                "Hello {{}}!",
                { "": "Empty" }
            );
            expect(result).toBe("Hello Empty!");
        });

        it('should handle placeholders with special characters in names', () => {
            const result = reactProcessPlaceholders(
                "Hello {{user-name}}!",
                { "user-name": "Alice" }
            );
            expect(result).toBe("Hello Alice!");
        });

        it('should handle placeholders with numbers in names', () => {
            const result = reactProcessPlaceholders(
                "Item {{item1}} and {{item2}}",
                { item1: "apple", item2: "banana" }
            );
            expect(result).toBe("Item apple and banana");
        });

        it('should handle placeholders with underscores in names', () => {
            const result = reactProcessPlaceholders(
                "Hello {{user_name}}!",
                { user_name: "Alice" }
            );
            expect(result).toBe("Hello Alice!");
        });
    });

    describe('Type safety and return value handling', () => {
        it('should return string when all parts are strings', () => {
            const result = reactProcessPlaceholders(
                "Hello {{name}}!",
                { name: "Alice" }
            );
            expect(typeof result).toBe('string');
            expect(result).toBe("Hello Alice!");
        });

        it('should return ReactNode array when any part is a React component', () => {
            const button = createElement('button', { key: 'btn' }, 'Click');
            const result = reactProcessPlaceholders(
                "{{button}}",
                { button }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toEqual(button);
        });

        it('should handle null and undefined values in params', () => {
            const result = reactProcessPlaceholders(
                "Value: {{nullValue}}, Other: {{undefinedValue}}",
                { nullValue: null, undefinedValue: undefined }
            );
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(["Value: ", null, ", Other: ", undefined]);
        });

        it('should handle boolean values in params', () => {
            const result = reactProcessPlaceholders(
                "Status: {{isActive}}, Debug: {{debug}}",
                { isActive: true, debug: false }
            );
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(["Status: ", true, ", Debug: ", false]);
        });

        it('should handle number values in params', () => {
            const result = reactProcessPlaceholders(
                "Count: {{count}}, Price: {{price}}",
                { count: 42, price: 19.99 }
            );
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(["Count: ", 42, ", Price: ", 19.99]);
        });

        it('should handle zero as a parameter value', () => {
            const result = reactProcessPlaceholders(
                "Count: {{count}}",
                { count: 0 }
            );
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(["Count: ", 0]);
        });

        it('should handle negative numbers as parameter values', () => {
            const result = reactProcessPlaceholders(
                "Temperature: {{temp}}°C",
                { temp: -10 }
            );
            expect(Array.isArray(result)).toBe(true);
            expect(result).toEqual(["Temperature: ", -10, "°C"]);
        });
    });

    describe('Complex scenarios', () => {
        it('should handle very long placeholder names', () => {
            const longKey = "a".repeat(1000);
            const result = reactProcessPlaceholders(
                `Hello {{${longKey}}}!`,
                { [longKey]: "Alice" }
            );
            expect(result).toBe("Hello Alice!");
        });

        it('should handle very long parameter values', () => {
            const longValue = "a".repeat(10000);
            const result = reactProcessPlaceholders(
                "Value: {{long}}",
                { long: longValue }
            );
            expect(result).toBe(`Value: ${longValue}`);
        });

        it('should handle string with only placeholders', () => {
            const result = reactProcessPlaceholders(
                "{{greeting}}{{name}}",
                { greeting: "Hello ", name: "Alice" }
            );
            expect(result).toBe("Hello Alice");
        });

        it('should handle string with placeholders at the beginning and end', () => {
            const result = reactProcessPlaceholders(
                "{{greeting}} middle {{name}}",
                { greeting: "Hello", name: "Alice" }
            );
            expect(result).toBe("Hello middle Alice");
        });

        it('should handle very large number of placeholders', () => {
            const template = Array.from({ length: 100 }, (_, i) => `{{param${i}}}`).join(", ");
            const params = Object.fromEntries(
                Array.from({ length: 100 }, (_, i) => [`param${i}`, `value${i}`])
            );
            const expected = Array.from({ length: 100 }, (_, i) => `value${i}`).join(", ");
            
            const result = reactProcessPlaceholders(template, params);
            expect(result).toBe(expected);
        });

        it('should handle unicode characters in placeholder names', () => {
            const result = reactProcessPlaceholders(
                "Hello {{имя}}!",
                { "имя": "Алиса" }
            );
            expect(result).toBe("Hello Алиса!");
        });

        it('should handle unicode characters in parameter values', () => {
            const result = reactProcessPlaceholders(
                "Message: {{msg}}",
                { msg: "Hello 世界! 🌍" }
            );
            expect(result).toBe("Message: Hello 世界! 🌍");
        });

        it('should handle emoji in placeholder names', () => {
            const result = reactProcessPlaceholders(
                "Hello {{👋}}!",
                { "👋": "wave" }
            );
            expect(result).toBe("Hello wave!");
        });

        it('should handle emoji in parameter values', () => {
            const result = reactProcessPlaceholders(
                "Reaction: {{reaction}}",
                { reaction: "👍" }
            );
            expect(result).toBe("Reaction: 👍");
        });
    });

    describe('React-specific edge cases', () => {
        it('should handle React components with null children', () => {
            const component = createElement('div', { key: 'div' }, null);
            const result = reactProcessPlaceholders(
                "Content: {{component}}",
                { component }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[1]).toEqual(component);
        });

        it('should handle React components with undefined children', () => {
            const component = createElement('div', { key: 'div' }, undefined);
            const result = reactProcessPlaceholders(
                "Content: {{component}}",
                { component }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[1]).toEqual(component);
        });

        it('should handle React components with boolean children', () => {
            const component = createElement('div', { key: 'div' }, true);
            const result = reactProcessPlaceholders(
                "Content: {{component}}",
                { component }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[1]).toEqual(component);
        });

        it('should handle React components with number children', () => {
            const component = createElement('div', { key: 'div' }, 42);
            const result = reactProcessPlaceholders(
                "Content: {{component}}",
                { component }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[1]).toEqual(component);
        });

        it('should handle React components with array children', () => {
            const component = createElement('div', { key: 'div' }, 
                'First', ' ', 'Second'
            );
            const result = reactProcessPlaceholders(
                "Content: {{component}}",
                { component }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[1]).toEqual(component);
        });

        it('should handle React components with function children', () => {
            const component = createElement('div', { key: 'div' }, 
                'Function result'
            );
            const result = reactProcessPlaceholders(
                "Content: {{component}}",
                { component }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[1]).toEqual(component);
        });

        it('should handle React components with complex nested structure', () => {
            const component = createElement('div', { 
                className: 'container',
                key: 'container'
            }, 
                createElement('h1', { key: 'title' }, 'Title'),
                createElement('p', { key: 'content' }, 'Content'),
                createElement('button', { 
                    onClick: () => {},
                    key: 'btn'
                }, 'Click me')
            );
            const result = reactProcessPlaceholders(
                "{{component}}",
                { component }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toEqual(component);
        });

        it('should handle React components with style objects', () => {
            const component = createElement('div', {
                style: {
                    color: 'red',
                    backgroundColor: 'blue',
                    padding: '10px'
                },
                key: 'styled'
            }, 'Styled content');
            const result = reactProcessPlaceholders(
                "{{component}}",
                { component }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toEqual(component);
        });

        it('should handle React components with event handlers', () => {
            const handleClick = () => console.log('clicked');
            const component = createElement('button', {
                onClick: handleClick,
                onMouseOver: () => console.log('hovered'),
                key: 'interactive'
            }, 'Interactive button');
            const result = reactProcessPlaceholders(
                "{{component}}",
                { component }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toEqual(component);
        });
    });

    describe('Performance and memory considerations', () => {
        it('should handle large number of React components efficiently', () => {
            const components = Array.from({ length: 100 }, (_, i) => 
                createElement('span', { key: `span-${i}` }, `Component ${i}`)
            );
            const template = components.map((_, i) => `{{comp${i}}}`).join(' ');
            const params = Object.fromEntries(
                components.map((comp, i) => [`comp${i}`, comp])
            );
            
            const result = reactProcessPlaceholders(template, params);
            
            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(199); // 100 components + 99 spaces
        });

        it('should handle deeply nested React components', () => {
            let component = createElement('div', { key: 'root' }, 'Root');
            for (let i = 0; i < 10; i++) {
                component = createElement('div', { key: `level-${i}` }, component);
            }
            
            const result = reactProcessPlaceholders(
                "{{component}}",
                { component }
            );
            
            expect(Array.isArray(result)).toBe(true);
            expect(result[0]).toEqual(component);
        });
    });
});
