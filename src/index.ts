export interface LangTagTranslationsConfig<Namespaces = string> {
    path?: string;
    namespace: Namespaces;
}

export type LangTagTranslations = {
    [key: string]: string | LangTagTranslations;
};

// export type LangTag<Config extends LangTagConfig = LangTagConfig, T = any> = (translations: LangTagTranslations, config?: Config) => T;

export type ParametrizedFunctionParams = Record<string, any>;
export type ParametrizedFunction = (params?: ParametrizedFunctionParams) => string;

export type TranslationObjectToFunctions<T> = {
    [P in keyof T]:
        T[P] extends ParametrizedFunction ? ParametrizedFunction :
        T[P] extends (...args: any[]) => any ? ParametrizedFunction :
        T[P] extends Record<string, any> ? TranslationObjectToFunctions<T[P]> :
        ParametrizedFunction;
};

interface TransformFunctionParams<Config extends LangTagTranslationsConfig> {
    config: Config | undefined;
    keyPrefix: string;
    path: string;
    key: string;
    value: string;
    params?: ParametrizedFunctionParams;
}

type TransformFunction<N extends LangTagTranslationsConfig> = (transformParams: TransformFunctionParams<N>) => string;

export type TranslationsToFunctionsMapperOnKeyAppend<
    N extends LangTagTranslationsConfig = LangTagTranslationsConfig
> = (
    params: Omit<TransformFunctionParams<N>, 'params'>,
    appendKey: (key: string) => void
) => void;

export interface TranslationsToFunctionsMapper<N extends LangTagTranslationsConfig> {

    transform: TransformFunction<N>;

    onKeyAppend?: TranslationsToFunctionsMapperOnKeyAppend<N>;
}

function transformTranslationsToFunctions<
    T extends LangTagTranslations,
    Config extends LangTagTranslationsConfig
>(
    config: Config | undefined,
    mapper: TranslationsToFunctionsMapper<Config>,
    input: T,
    keyPrefix: string
): LangTagTranslations {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(input)) {
        const path = `${keyPrefix + key}`;

        if (typeof value === 'object' && value !== null) {
            result[key] = transformTranslationsToFunctions(config, mapper, value, `${path}.`);
        } else {
            const props = { config, keyPrefix, path, key, value };

            mapper.onKeyAppend?.(props, (key: string) => {
                return result[key] = (params?: ParametrizedFunctionParams) => mapper.transform({
                    ...props,
                    key,
                    params
                });
            })

            result[key] = (params?: ParametrizedFunctionParams) => mapper.transform({...props, params});
        }
    }

    return result;
}

export function mapTranslationObjectToFunctions<
    T extends LangTagTranslations,
    Config extends LangTagTranslationsConfig
>(
    translations: T,
    config: Config | undefined,
    mapper: TranslationsToFunctionsMapper<Config>,
): TranslationObjectToFunctions<T> {
    // let {path} = config;
    // if (path === undefined || path === null) throw new Error('path must be defined');
    let path = config?.path || '';
    if (path && !path.endsWith('.')) path += '.';
    return transformTranslationsToFunctions(
        config,
        mapper,
        translations,
        path
    ) as TranslationObjectToFunctions<T>;
}

export const mockTranslateTransform: TransformFunction<LangTagTranslationsConfig> = ({ value, params }) => {
    return value.replace(/{{(.*?)}}/g, (_: any, key: string) => params?.[key.trim()] ?? '');
};

export type FlexibleTranslations<T> = {
    [P in keyof T]: T[P] extends ParametrizedFunction
        ? ParametrizedFunction | string
        : T[P] extends object
            ? FlexibleTranslations<T[P]>
            : T[P] | string;
};

export function normalizeTranslations<T>(translations: FlexibleTranslations<T>): TranslationObjectToFunctions<T>  {
    const result = {} as TranslationObjectToFunctions<T>;

    for (const key in translations) {
        const value = translations[key];

        if (value === null || value === undefined) {
            continue;
        }

        if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Function)) {
            result[key] = normalizeTranslations(value as any) as any;
        } else if (typeof value === 'string') {
            // Translation ---> () => Translation
            result[key] = ((_?: ParametrizedFunctionParams) => value) as any;
        } else {
            // Function
            result[key] = value as any;
        }
    }

    return result;
}