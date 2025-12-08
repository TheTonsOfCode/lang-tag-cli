import { describe, expect, it } from 'vitest';

import {
    CallableTranslations,
    LangTagTranslationsConfig,
    ParameterizedTranslation,
    TranslationKeyProcessor,
    TranslationKeyProcessorContext,
    TranslationMappingStrategy,
    createCallableTranslations,
} from '@/index';

const mockConfigBasic: LangTagTranslationsConfig = { namespace: 'orders' }; // Path will be added or empty by default
const mockConfigWithPath: LangTagTranslationsConfig = {
    path: 'my.path',
    namespace: 'orders',
};

describe('createCallableTranslations', () => {
    it('should transform a simple translation object, applying path from config', () => {
        const translations = {
            hello: 'Hello',
            goodbye: 'Goodbye',
        } as const;

        const strategy: TranslationMappingStrategy<LangTagTranslationsConfig> =
            {
                transform: ({ path, value }) => `${path}: ${value}`,
            };

        const result = createCallableTranslations(
            translations,
            mockConfigWithPath,
            strategy
        );

        expect(result.hello()).toBe('my.path.hello: Hello');
        expect(result.goodbye()).toBe('my.path.goodbye: Goodbye');
    });

    it('should handle nested translation objects', () => {
        const translations = {
            greetings: {
                morning: 'Good morning',
                evening: 'Good evening',
            },
        } as const;

        const strategy: TranslationMappingStrategy<LangTagTranslationsConfig> =
            {
                transform: ({ path, value }) => `${path}: ${value}`,
            };

        const result = createCallableTranslations(
            translations,
            mockConfigWithPath,
            strategy
        );

        // TypeScript should infer the nested structure correctly with 'as const'
        // and CallableTranslations handling recursive types.
        expect(result.greetings.morning()).toBe(
            'my.path.greetings.morning: Good morning'
        );
        expect(result.greetings.evening()).toBe(
            'my.path.greetings.evening: Good evening'
        );
    });

    it('should handle keys with various suffixes if no processKey is provided', () => {
        const translations = {
            item_other: 'Items',
            item_one: 'Item',
        } as const;
        const strategy: TranslationMappingStrategy<LangTagTranslationsConfig> =
            {
                transform: ({ path, value }) => `${path}: ${value}`,
            };
        const result = createCallableTranslations(
            translations,
            mockConfigWithPath,
            strategy
        );

        expect(result.item_other()).toBe('my.path.item_other: Items');
        expect(result.item_one()).toBe('my.path.item_one: Item');
    });

    it('should not prefix keys when the config path is empty or undefined', () => {
        const translations = {
            foo: 'bar',
        } as const;
        const strategy: TranslationMappingStrategy<LangTagTranslationsConfig> =
            {
                transform: ({ path }) => path,
            };

        const result1 = createCallableTranslations(
            translations,
            { path: '', namespace: 'test' },
            strategy
        );
        expect(result1.foo()).toBe('foo');

        const result2 = createCallableTranslations(
            translations,
            { namespace: 'test' },
            strategy
        );
        expect(result2.foo()).toBe('foo');
    });

    it('should correctly use processKey to create an alias for keys ending with _other', () => {
        const sourceTranslations = {
            plural_key_zero: 'zero items',
            plural_key_one: 'one item',
            plural_key_other: 'many items',
        } as const;

        const keyProcessor: TranslationKeyProcessor<
            LangTagTranslationsConfig
        > = (
            context: TranslationKeyProcessorContext<LangTagTranslationsConfig>,
            addProcessedKey: (newKey: string, originalValue: string) => void
        ) => {
            if (context.key.endsWith('_other')) {
                const baseKey = context.key.slice(
                    0,
                    context.key.lastIndexOf('_other')
                );
                addProcessedKey(
                    baseKey,
                    sourceTranslations[
                        context.key as keyof typeof sourceTranslations
                    ]
                );
            }
        };

        const strategy: TranslationMappingStrategy<LangTagTranslationsConfig> =
            {
                transform: ({ value, params }) => {
                    if (params && params.count)
                        return `${value} (count: ${params.count})`;
                    return value;
                },
                processKey: keyProcessor,
            };
        type ExpectedResultType = CallableTranslations<
            typeof sourceTranslations
        > & { plural_key?: ParameterizedTranslation };
        const result = createCallableTranslations(
            sourceTranslations,
            { namespace: 'test' },
            strategy
        ) as ExpectedResultType;

        expect(result.plural_key_zero()).toBe('zero items');
        expect(result.plural_key_one()).toBe('one item');
        expect(result.plural_key_other()).toBe('many items');
        expect(result.plural_key_other({ count: 5 })).toBe(
            'many items (count: 5)'
        );

        expect(result.plural_key).toBeDefined();
        expect(result.plural_key!()).toBe('many items');
        expect(result.plural_key!({ count: 10 })).toBe(
            'many items (count: 10)'
        );
    });

    it('processKey should handle nested structures correctly', () => {
        const sourceTranslations = {
            deeperSection: {
                status_available_one: '1 available',
                status_available_other: '{{count}} available',
                simpleKey: 'simple value',
            },
        } as const;

        const keyProcessor: TranslationKeyProcessor<
            LangTagTranslationsConfig
        > = (
            context: TranslationKeyProcessorContext<LangTagTranslationsConfig>,
            addProcessedKey: (newKey: string, originalValue: string) => void
        ) => {
            if (context.key.endsWith('_other')) {
                const shorten = context.key.slice(
                    0,
                    context.key.lastIndexOf('_other')
                );
                addProcessedKey(shorten, context.value);
            }
        };

        const strategy: TranslationMappingStrategy<LangTagTranslationsConfig> =
            {
                transform: ({ key, value, params }) => {
                    if (params?.count && typeof value === 'string') {
                        return value.replace('{{count}}', String(params.count));
                    }
                    return value;
                },
                processKey: keyProcessor,
            };

        // Define the expected type for the result, including the dynamically added key
        type ExpectedNestedResult = CallableTranslations<
            typeof sourceTranslations.deeperSection
        > & {
            status_available?: ParameterizedTranslation;
        };
        type ExpectedFullResult = {
            deeperSection: ExpectedNestedResult;
        };

        const result = createCallableTranslations(
            sourceTranslations,
            { path: 'app', namespace: 'inventory' },
            strategy
        ) as ExpectedFullResult;

        expect(result.deeperSection.status_available_one()).toBe('1 available');
        expect(result.deeperSection.status_available_other({ count: 5 })).toBe(
            '5 available'
        );
        expect(result.deeperSection.simpleKey()).toBe('simple value');

        expect(result.deeperSection.status_available).toBeDefined();
        expect(result.deeperSection.status_available!({ count: 10 })).toBe(
            '10 available'
        );
    });

    it('should correctly use params in transform function', () => {
        const translations = {
            greeting: 'Hello {{name}} from {{city}}!',
        } as const;
        const strategy: TranslationMappingStrategy<LangTagTranslationsConfig> =
            {
                transform: ({ value, params }) =>
                    value.replace(
                        /{{(.*?)}}/g,
                        (_, key) => params?.[key.trim()] || ''
                    ),
            };
        const result = createCallableTranslations(
            translations,
            mockConfigWithPath,
            strategy
        );
        expect(result.greeting({ name: 'Alice', city: 'Wonderland' })).toBe(
            'Hello Alice from Wonderland!'
        );
        expect(result.greeting({ name: 'Bob' })).toBe('Hello Bob from !');
    });

    it('should ensure basePath always ends with a dot if not empty', () => {
        const translations = { key: 'value' } as const;
        const strategy: TranslationMappingStrategy<LangTagTranslationsConfig> =
            {
                transform: ({ path }) => path,
            };

        const res1 = createCallableTranslations(
            translations,
            { path: 'custom', namespace: 'test' },
            strategy
        );
        expect(res1.key()).toBe('custom.key');

        const res2 = createCallableTranslations(
            translations,
            { path: 'custom.', namespace: 'test' },
            strategy
        );
        expect(res2.key()).toBe('custom.key');

        const res3 = createCallableTranslations(
            translations,
            { path: '', namespace: 'test' },
            strategy
        );
        expect(res3.key()).toBe('key');
    });
});
