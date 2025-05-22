import {
    FlexibleTranslations,
    LangTagTranslations,
    LangTagTranslationsConfig,
    createCallableTranslations,
    normalizeTranslations,
    ParameterizedTranslation,
    CallableTranslations
} from "@/index";

// import React, {createContext, useContext, ReactNode} from 'react';

export function lang<T extends LangTagTranslations>(
    translations: T,
    config?: LangTagTranslationsConfig
) {

    type FlexibleT = FlexibleTranslations<T>;

    const Context: CallableTranslations<T> | null = null;

    return {
        useT() {
            const normalized = Context;

            return createCallableTranslations(
                translations,
                config,
                {
                    transform: ({path, params, value}) => {
                        if (!normalized) return value;

                        const fn = getTranslationFunctionByPath(normalized, path);

                        if (fn) return fn(params)

                        return value;
                    }
                }
            );
        },

        Provider: (props: { translations: FlexibleT; children: any }) => {

            const x = normalizeTranslations(props.translations)

            // Same as context
            const TEST_TYPE: CallableTranslations<T> | null = x;

            return TEST_TYPE;
            // return (<Context.Provider value={x}>{props.children}</Context.Provider>);
        },

        FlexibleType: {} as FlexibleT
    }

}


const a = {
    title: 'Translations',
    sub: {
        ooo: "Hrrr!"
    }
}

type CallableT = CallableTranslations<typeof a>;

type FlexibleT = FlexibleTranslations<CallableT>;

const b: CallableT = {
    title: params => "dasd",
    sub: {
        ooo: params => "hrrr!",
    }
}

const c: FlexibleT = {
    title: params => "dasd",
    sub: {
        ooo: params => "hrrr!",
    }
}


function resolveTranslationFunction<T>(
    translations: CallableTranslations<T>,
    path: string[]
): ParameterizedTranslation | null {
    let current: any = translations;

    for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
            current = current[key];
        } else {
            return null;
        }
    }

    return typeof current === 'function' ? (current as ParameterizedTranslation) : null;
}

export function getTranslationFunctionByPath<T>(
    translations: CallableTranslations<T>,
    dottedPath: string
): ParameterizedTranslation | null {
    const pathSegments = dottedPath.split('.');
    return resolveTranslationFunction(translations, pathSegments);
}


const x = lang({
    title: 'Translations',
    sub: {
        ooo: "Hrrr!"
    }
})

const input: typeof x.FlexibleType = {
    title: 'Some title',
    sub: {
        ooo: (props) => "Hrrr!" + props?.name
    }
}

function XComponent() {

    return x.Provider({
        translations: {
            title: "xxasfasfe",
            sub: {
                ooo: (props) => "Aaaa!" + props?.name
            }
        },
        children: null
    })
}