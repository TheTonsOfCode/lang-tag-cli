import { describe, it, expect } from 'vitest';
import { normalizeTranslations, FlexibleTranslations, ParametrizedFunction, ParametrizedFunctionParams } from '@/index';

describe('normalizeTranslations and FlexibleTranslations', () => {

    it('should convert string leaves to parameterless functions', () => {
        const input: FlexibleTranslations<{ title: string; description: string }> = {
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
        const inputFunc: ParametrizedFunction = (params?: ParametrizedFunctionParams) => `Hello ${params?.name}`;
        const input: FlexibleTranslations<{ welcome: ParametrizedFunction }> = {
            welcome: inputFunc,
        };

        const normalized = normalizeTranslations(input);

        expect(typeof normalized.welcome).toBe('function');
        expect(normalized.welcome).toBe(inputFunc); // Should be the same function instance
        expect(normalized.welcome({ name: 'User' })).toBe('Hello User');
        expect(normalized.welcome()).toBe('Hello undefined');
    });

    it('should handle mixed strings and functions', () => {
        const inputFunc: ParametrizedFunction = () => 'Static Function Message';
        const input: FlexibleTranslations<{ title: string; message: ParametrizedFunction }> = {
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
        const inputFunc: ParametrizedFunction = (params?: ParametrizedFunctionParams) => `Contact at ${params?.email}`;
        const input: FlexibleTranslations<{
            header: { title: string };
            footer: { copyright: string; contact: ParametrizedFunction };
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
        expect(normalized.footer.contact({ email: 'test@example.com' })).toBe('Contact at test@example.com');
        expect(normalized.footer.contact()).toBe('Contact at undefined');
    });

    it('should handle empty objects', () => {
        const input: FlexibleTranslations<{}> = {};
        const normalized = normalizeTranslations(input);
        expect(normalized).toEqual({});
    });

     it('should skip null/undefined and keep other non-string/object types', () => {
        const input: FlexibleTranslations<{ title: string | null; description?: string; count: number | undefined; active: boolean }> = {
            title: null,
            description: undefined,
            count: 5 as any, // Keep as any to test skipping non-string/object/function
            active: true // Add boolean test case
        };

        const normalized = normalizeTranslations(input);

        // Expect keys with null/undefined to not exist
        expect(normalized).not.toHaveProperty('title');
        expect(normalized).not.toHaveProperty('description');

        // TODO: rethink that, maybe we should throw an error on non-string values/translations
        // Expect other types (number, boolean) to be kept as they are
        expect(normalized).toHaveProperty('count', 5);
        expect(normalized).toHaveProperty('active', true);

        // Check the resulting object keys
        expect(Object.keys(normalized).length).toBe(2);
        expect(Object.keys(normalized)).toEqual(expect.arrayContaining(['count', 'active']));
     });

    it('should correctly type the output when using FlexibleTranslations', () => {
         const input: FlexibleTranslations<{
             staticMsg: string;
             dynamicMsg: ParametrizedFunction;
             nested: { subStatic: string; };
         }> = {
             staticMsg: 'Static',
             // Align function signature with ParametrizedFunction
             dynamicMsg: (params?: ParametrizedFunctionParams) => `Dynamic ${params?.value ?? 'default'}`,
             nested: {
                 subStatic: 'Nested Static'
             }
         };

         // No explicit type annotation needed here, but TS should infer correctly
         const normalized = normalizeTranslations(input);

         // Type checks (compile-time) - these lines primarily check TypeScript inference
         const msg1: string = normalized.staticMsg();
         const msg2: string = normalized.dynamicMsg({ value: 123 });
         const msg3: string = normalized.nested.subStatic();
         const msg4: string = normalized.dynamicMsg(); // Check call without params

         // Runtime checks
         expect(msg1).toBe('Static');
         expect(msg2).toBe('Dynamic 123');
         expect(msg3).toBe('Nested Static');
         expect(msg4).toBe('Dynamic default'); // Check fallback value

         // Ensure all leaves are functions
         expect(typeof normalized.staticMsg).toBe('function');
         expect(typeof normalized.dynamicMsg).toBe('function');
         expect(typeof normalized.nested.subStatic).toBe('function');
    });
}); 