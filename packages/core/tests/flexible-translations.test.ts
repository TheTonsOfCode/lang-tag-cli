import { describe, expect, it } from 'vitest';

import {
    FlexibleTranslations,
    InterpolationParams,
    ParameterizedTranslation,
    normalizeTranslations,
} from '@/index';

describe('normalizeTranslations and FlexibleTranslations', () => {
    it('should convert string leaves to parameterless functions', () => {
        const input: FlexibleTranslations<{
            title: string;
            description: string;
        }> = {
            title: 'Test Title',
            description: 'Test Description',
        };

        const normalized = normalizeTranslations(input);

        expect(typeof normalized.title).toBe('function');
        expect(typeof normalized.description).toBe('function');
        expect(normalized.title()).toBe('Test Title');
        expect(normalized.description()).toBe('Test Description');
    });

    it('should keep existing functions as they are', () => {
        const inputFunc: ParameterizedTranslation = (
            params?: InterpolationParams
        ) => `Hello ${params?.name}`;
        const input: FlexibleTranslations<{
            welcome: ParameterizedTranslation;
        }> = {
            welcome: inputFunc,
        };

        const normalized = normalizeTranslations(input);

        expect(typeof normalized.welcome).toBe('function');
        expect(normalized.welcome).toBe(inputFunc); // Should be the same function instance
        expect(normalized.welcome({ name: 'User' })).toBe('Hello User');
        expect(normalized.welcome()).toBe('Hello undefined'); // Behavior with undefined params
    });

    it('should handle mixed strings and functions', () => {
        const inputFunc: ParameterizedTranslation = () =>
            'Static Function Message';
        const input: FlexibleTranslations<{
            title: string;
            message: ParameterizedTranslation;
        }> = {
            title: 'Mixed Object',
            message: inputFunc,
        };

        const normalized = normalizeTranslations(input);

        expect(typeof normalized.title).toBe('function');
        expect(typeof normalized.message).toBe('function');
        expect(normalized.title()).toBe('Mixed Object');
        expect(normalized.message).toBe(inputFunc);
        expect(normalized.message()).toBe('Static Function Message');
    });

    it('should recursively normalize nested objects', () => {
        const inputFunc: ParameterizedTranslation = (
            params?: InterpolationParams
        ) => `Contact at ${params?.email}`;
        const input: FlexibleTranslations<{
            header: { title: string };
            footer: { copyright: string; contact: ParameterizedTranslation };
        }> = {
            header: {
                title: 'Nested Title',
            },
            footer: {
                copyright: '© 2024',
                contact: inputFunc,
            },
        };

        const normalized = normalizeTranslations(input);

        // Check header
        expect(typeof normalized.header.title).toBe('function');
        expect(normalized.header.title()).toBe('Nested Title');

        // Check footer
        expect(typeof normalized.footer.copyright).toBe('function');
        expect(typeof normalized.footer.contact).toBe('function');
        expect(normalized.footer.copyright()).toBe('© 2024');
        expect(normalized.footer.contact).toBe(inputFunc);
        expect(normalized.footer.contact({ email: 'test@example.com' })).toBe(
            'Contact at test@example.com'
        );
        expect(normalized.footer.contact()).toBe('Contact at undefined'); // Behavior with undefined params
    });

    it('should handle empty objects', () => {
        const input: FlexibleTranslations<{}> = {};
        const normalized = normalizeTranslations(input);
        expect(normalized).toEqual({});
    });

    it('should ignore null, undefined, and other non-string/object/function primitive types', () => {
        const input: FlexibleTranslations<{
            title: string | null;
            description?: string; // Will be undefined if not provided
            count: number;
            active: boolean;
            id: symbol;
            bigNum: bigint;
            someString: string;
            someFunc: ParameterizedTranslation;
        }> = {
            title: null,
            // description is implicitly undefined
            count: 5,
            active: true,
            id: Symbol('id'),
            bigNum: 100n,
            someString: 'I will stay',
            someFunc: () => 'I am a function',
        };

        const normalized = normalizeTranslations(input);

        expect(normalized).not.toHaveProperty('title');
        expect(normalized).not.toHaveProperty('description');
        expect(normalized).not.toHaveProperty('count');
        expect(normalized).not.toHaveProperty('active');
        expect(normalized).not.toHaveProperty('id');
        expect(normalized).not.toHaveProperty('bigNum');

        expect(normalized).toHaveProperty('someString');
        expect(typeof normalized.someString).toBe('function');
        expect(normalized.someString()).toBe('I will stay');

        expect(normalized).toHaveProperty('someFunc');
        expect(typeof normalized.someFunc).toBe('function');
        expect(normalized.someFunc()).toBe('I am a function');

        expect(Object.keys(normalized).length).toBe(2);
        expect(Object.keys(normalized)).toEqual(
            expect.arrayContaining(['someString', 'someFunc'])
        );
    });

    it('should correctly type the output when using FlexibleTranslations', () => {
        const input: FlexibleTranslations<{
            staticMsg: string;
            dynamicMsg: ParameterizedTranslation;
            nested: { subStatic: string };
        }> = {
            staticMsg: 'Static',
            dynamicMsg: (params?: InterpolationParams) =>
                `Dynamic ${params?.value ?? 'default'}`,
            nested: {
                subStatic: 'Nested Static',
            },
        };

        const normalized = normalizeTranslations(input);

        const msg1: string = normalized.staticMsg();
        const msg2: string = normalized.dynamicMsg({ value: 123 });
        const msg3: string = normalized.nested.subStatic();
        const msg4: string = normalized.dynamicMsg();

        expect(msg1).toBe('Static');
        expect(msg2).toBe('Dynamic 123');
        expect(msg3).toBe('Nested Static');
        expect(msg4).toBe('Dynamic default');

        expect(typeof normalized.staticMsg).toBe('function');
        expect(typeof normalized.dynamicMsg).toBe('function');
        expect(typeof normalized.nested.subStatic).toBe('function');
    });
});
