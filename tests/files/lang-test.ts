import {
    FlexibleTranslations,
    LangTagTranslations,
    LangTagTranslationsConfig,
    createCallableTranslations,
    normalizeTranslations,
    ParameterizedTranslation,
    CallableTranslations, lookupTranslation
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

                        const fn = lookupTranslation(normalized, path);

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