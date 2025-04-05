import {describe, it, expect} from 'vitest';
import {mapTranslationObjectToFunctions, LangTagTranslationsConfig} from '@/index';

const mockConfig: LangTagTranslationsConfig = {path: 'my.path', namespace: 'orders'};

describe('mapTranslationObjectToFunctions', () => {
    it('should transform a simple translation object', () => {
        const translations = {
            hello: 'Hello',
            goodbye: 'Goodbye'
        };

        const result = mapTranslationObjectToFunctions(
            translations,
            mockConfig,
            {
                transform: ({path, value}) => `${path}: ${value}`
            }
        );

        expect(result.hello()).toBe('my.path.hello: Hello');
        expect(result.goodbye()).toBe('my.path.goodbye: Goodbye');
    });

    it('should handle nested translation objects', () => {
        const translations = {
            greetings: {
                morning: 'Good morning',
                evening: 'Good evening'
            }
        };

        const result = mapTranslationObjectToFunctions(
            translations,
            mockConfig,
            {
                transform: ({path, value}) => `${path}: ${value}`
            }
        );

        expect(result.greetings.morning()).toBe('my.path.greetings.morning: Good morning');
        expect(result.greetings.evening()).toBe('my.path.greetings.evening: Good evening');
    });

    it('should handle keys ending with _other', () => {
        const translations = {
            item_other: 'Items'
        };

        const result = mapTranslationObjectToFunctions(
            translations,
            mockConfig,
            {
                transform: ({path, value}) => `${path}: ${value}`
            }
        );

        expect(result.item_other()).toBe('my.path.item_other: Items');
        // expect(result.item).toBeDefined();
    });

    // it('should throw an error when config path is undefined', () => {
    //     expect(() => mapTranslationObjectToFunctions(
    //         {},
    //         {} as LangTagConfig,
    //         {
    //             transform: () => ''
    //         }
    //     )).toThrow('path must be defined');
    // });

    it('should not prefix keys when the path is empty', () => {
        const translations = {
            foo: 'bar'
        };

        const result = mapTranslationObjectToFunctions(
            translations,
            {
                path: '',
                namespace: 'orders'
            },
            {
                transform: ({path}) => path
            }
        );

        expect(result.foo()).toBe('foo');
    });

    it('TODO i18n _other functionality', () => {
        const translations = {
            "plural_key_zero": "zero",
            "plural_key_one": "singular",
            "plural_key_two": "two",
            "plural_key_few": "few",
            "plural_key_many": "many",
            "plural_key_other": "other"
        };

        const result = mapTranslationObjectToFunctions(
            translations,
            {
                path: '',
                namespace: 'orders'
            },
            {
                transform: ({key}) => `${key}!`,

                // TODO: how to type it?!?!?!
                // we_allow_i18n_plural
                onKeyAppend: ({key}, appendKey) => {
                    if (key.endsWith('_other')) {
                        const shorten = key.slice(0, key.lastIndexOf('_other'));

                        appendKey(shorten);
                    }
                }
            }
        );

        expect(result.plural_key_other).toBeDefined();
        // @ts-ignore
        expect(result.plural_key).toBeDefined();
        // @ts-ignore
        expect(result.plural_key()).toBe('plural_key!');
    });

    it('TODO i18n _other functionality 2222', () => {
        const translations = {
            deeperSection: {
                "plural_key_zero": "zero",
                "plural_key_one": "singular",
                "plural_key_two": "two",
                "plural_key_few": "few",
                "plural_key_many": "many",
                "plural_key_other": "other"
            }
        };

        const result = mapTranslationObjectToFunctions(
            translations,
            {
                path: '',
                namespace: 'orders'
            },
            {
                transform: ({key}) => `${key}!`,

                // TODO: how to type it?!?!?!
                // we_allow_i18n_plural
                onKeyAppend: ({key}, appendKey) => {
                    if (key.endsWith('_other')) {
                        const shorten = key.slice(0, key.lastIndexOf('_other'));
                        appendKey(shorten);
                    }
                }
            }
        );

        expect(result.deeperSection.plural_key_other()).toBeDefined();
        // @ts-ignore
        expect(result.deeperSection.plural_key).toBeDefined();
        // @ts-ignore
        expect(result.deeperSection.plural_key()).toBe('plural_key!');
    });
});
