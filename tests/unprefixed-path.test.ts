import {describe, expect, it, vi} from 'vitest';
import type {
    CallableTranslations,
    LangTagTranslations,
    LangTagTranslationsConfig,
    TranslationKeyProcessorContext,
    TranslationMappingStrategy,
} from '@/index.ts';
import {createCallableTranslations, lookupTranslation, TranslationTransformer} from '@/index.ts';

const translationTransformer: TranslationTransformer<LangTagTranslationsConfig> = ({ value }) => value;

describe('createCallableTranslations with unprefixedPath', () => {
    const translations = {
        greeting: 'Hello, {{name}}!',
        farewell: {
            formal: 'Goodbye, {{name}}.',
            informal: 'Bye, {{name}}!',
        },
    };
    type TestTranslationsType = typeof translations;

    it('should provide correct unprefixedPath to transform when config.path is set', () => {
        const config: LangTagTranslationsConfig = {namespace: 'test', path: 'my.prefix'};
        const transformMock = vi.fn(translationTransformer);
        const strategy: TranslationMappingStrategy<typeof config> = {
            transform: transformMock,
        };

        const callable: CallableTranslations<TestTranslationsType> = createCallableTranslations(translations, config, strategy);

        // Invoke the functions to trigger the transform
        callable.greeting({name: 'Test'});
        callable.farewell.formal({name: 'Test'});
        callable.farewell.informal({name: 'Test'});

        // Check greeting
        expect(transformMock).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'my.prefix.greeting',
                unprefixedPath: 'greeting',
                key: 'greeting',
                value: 'Hello, {{name}}!',
            })
        );

        // Check nested farewell.formal
        expect(transformMock).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'my.prefix.farewell.formal',
                unprefixedPath: 'farewell.formal',
                key: 'formal',
                value: 'Goodbye, {{name}}.',
            })
        );

        // Check nested farewell.informal
        expect(transformMock).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'my.prefix.farewell.informal',
                unprefixedPath: 'farewell.informal',
                key: 'informal',
                value: 'Bye, {{name}}!',
            })
        );
    });

    it('should provide correct unprefixedPath to transform when config.path is NOT set', () => {
        const config: LangTagTranslationsConfig = {namespace: 'test'};
        const transformMock = vi.fn(translationTransformer);
        const strategy: TranslationMappingStrategy<typeof config> = {
            transform: transformMock,
        };

        const callable: CallableTranslations<TestTranslationsType> = createCallableTranslations(translations, config, strategy);

        // Invoke the functions to trigger the transform
        callable.greeting({name: 'Test'});
        callable.farewell.formal({name: 'Test'});
        callable.farewell.informal({name: 'Test'});

        // Check greeting
        expect(transformMock).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'greeting',
                unprefixedPath: 'greeting',
                key: 'greeting',
                value: 'Hello, {{name}}!',
            })
        );

        // Check nested farewell.formal
        expect(transformMock).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'farewell.formal',
                unprefixedPath: 'farewell.formal',
                key: 'formal',
                value: 'Goodbye, {{name}}.',
            })
        );

        // Check for farewell.informal, similar to the test where path is set
        expect(transformMock).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'farewell.informal',
                unprefixedPath: 'farewell.informal',
                key: 'informal',
                value: 'Bye, {{name}}!',
            })
        );
    });

    it('should provide correct unprefixedPath to processKey when config.path is set', () => {
        const config: LangTagTranslationsConfig = {namespace: 'test', path: 'my.prefix'};
        const processKeyMock = vi.fn((context: TranslationKeyProcessorContext<typeof config>, addProcessedKey: (newKey: string, originalValue: string) => void) => {
            // Default behavior: add the original key
            addProcessedKey(context.key, context.value);
        });
        const strategy: TranslationMappingStrategy<typeof config> = {
            transform: translationTransformer,
            processKey: processKeyMock,
        };

        createCallableTranslations(translations, config, strategy);

        // Check greeting
        expect(processKeyMock).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'my.prefix.greeting',
                unprefixedPath: 'greeting',
                key: 'greeting',
                value: 'Hello, {{name}}!',
            }),
            expect.any(Function)
        );

        // Check farewell (parent of formal/informal, processKey is called for keys that have string values)
        // processKey is called for 'formal' and 'informal', not 'farewell' directly as 'farewell' is an object
        expect(processKeyMock).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'my.prefix.farewell.formal',
                unprefixedPath: 'farewell.formal',
                key: 'formal',
                value: 'Goodbye, {{name}}.',
            }),
            expect.any(Function)
        );

        expect(processKeyMock).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'my.prefix.farewell.informal',
                unprefixedPath: 'farewell.informal',
                key: 'informal',
                value: 'Bye, {{name}}!',
            }),
            expect.any(Function)
        );
    });

    it('should provide correct unprefixedPath to processKey when config.path is NOT set', () => {
        const config: LangTagTranslationsConfig = {namespace: 'test'};
        const processKeyMock = vi.fn((context: TranslationKeyProcessorContext<typeof config>, addProcessedKey: (newKey: string, originalValue: string) => void) => {
            addProcessedKey(context.key, context.value);
        });
        const strategy: TranslationMappingStrategy<typeof config> = {
            transform: translationTransformer,
            processKey: processKeyMock,
        };

        createCallableTranslations(translations, config, strategy);

        expect(processKeyMock).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'greeting',
                unprefixedPath: 'greeting',
                key: 'greeting',
                value: 'Hello, {{name}}!',
            }),
            expect.any(Function)
        );
        expect(processKeyMock).toHaveBeenCalledWith(
            expect.objectContaining({
                path: 'farewell.formal',
                unprefixedPath: 'farewell.formal',
                key: 'formal',
                value: 'Goodbye, {{name}}.',
            }),
            expect.any(Function)
        );
    });
});

describe('lookupTranslation with unprefixed paths', () => {
    const translationsData: LangTagTranslations = {
        user: {
            profile: {
                greeting: 'Welcome, {{name}}!',
            },
            settings: 'Configure settings',
        },
        common: {
            next: 'Next',
        }
    };

    const strategy: TranslationMappingStrategy<LangTagTranslationsConfig> = {
        transform: ({value, params}) => value.replace('{{name}}', params?.name || ''), // Simplified transform
    };

    it('should lookup translation using unprefixed path when config.path is set', () => {
        const configWithPrefix: LangTagTranslationsConfig = {namespace: 'app', path: 'my.app'};
        const callable = createCallableTranslations(translationsData, configWithPrefix, strategy);

        const greetingFn = lookupTranslation(callable, 'user.profile.greeting');
        expect(greetingFn).toBeInstanceOf(Function);
        expect(greetingFn!({name: 'Tester'})).toBe('Welcome, Tester!');

        const settingsFn = lookupTranslation(callable, 'user.settings');
        expect(settingsFn).toBeInstanceOf(Function);
        expect(settingsFn!()).toBe('Configure settings');
    });

    it('should lookup translation using unprefixed path when config.path is NOT set', () => {
        const configNoPrefix: LangTagTranslationsConfig = {namespace: 'app'};
        const callable = createCallableTranslations(translationsData, configNoPrefix, strategy);

        const greetingFn = lookupTranslation(callable, 'user.profile.greeting');
        expect(greetingFn).toBeInstanceOf(Function);
        expect(greetingFn!({name: 'User'})).toBe('Welcome, User!');
    });

    it('should return null when looking up with a prefixed path if translations are keyed unprefixedly', () => {
        const configWithPrefix: LangTagTranslationsConfig = {namespace: 'app', path: 'my.app'};
        const callable = createCallableTranslations(translationsData, configWithPrefix, strategy);

        // lookupTranslation expects the path relative to the structure of 'callable'
        // which is based on the original translation keys (unprefixed)
        const greetingFn = lookupTranslation(callable, 'my.app.user.profile.greeting');
        expect(greetingFn).toBeNull();
    });

    it('should return null for non-existent path', () => {
        const configNoPrefix: LangTagTranslationsConfig = {namespace: 'app'};
        const callable = createCallableTranslations(translationsData, configNoPrefix, strategy);
        const nonExistentFn = lookupTranslation(callable, 'user.profile.nonexistent');
        expect(nonExistentFn).toBeNull();
    });
}); 