//
// Note: tutaj nie powinnismy dawac __lt w obiekcie jak w LangTagTranslationsValuePlugin bo wtedy będzie podpowiadać przy tworzeniu translacji a tego nie chcemy
//
type LangTagTranslationWithParams = {
    __lt: any;
    params?: readonly string[] | string;
};

export type LangTagTranslations = {
    [key: string]: string | LangTagTranslationWithParams | LangTagTranslations;
};

function count(params: {
    one?: string;
    few?: string;
    many?: string;
    other?: string;
}) {
    return {
        __lt: 'count',
        params: ['count'] as const,
    };
}

// ====
const aa1 = {
    aaa: 'a',
    // bbb: {
    //     ccc: 'c',
    //     ddd: count({
    //         one: '1 product',
    //         other: '{{count}} products'
    //     })
    // },
    eee: count({
        one: '1 order',
        other: '{{count}} orders',
    }),
} satisfies LangTagTranslations;
// ====

//
// type LangTagTranslationsValuePlugin = {
//     __lt: true;
// }
//
// export type LangTagTranslations = {
//     [key: string]: string | LangTagTranslationsValuePlugin | LangTagTranslations;
// };

export type InterpolationParams = Record<string, any>;

export type ParameterizedTranslation<
    P extends Record<string, any> = InterpolationParams,
> = (params?: P) => string;

type ParamsFrom<T> = T extends readonly (infer Keys)[]
    ? Record<Extract<Keys, string>, any>
    : T extends string
      ? Record<T, any>
      : InterpolationParams;

export type CallableTranslations<T> = {
    [P in keyof T]: NonNullable<T[P]> extends ParameterizedTranslation
        ? ParameterizedTranslation
        : // Allow for pre-existing functions that might not strictly be ParameterizedTranslation
          // but are still callable and return a string, or a nested structure.
          NonNullable<T[P]> extends (...args: any[]) => string
          ? NonNullable<T[P]>
          : NonNullable<T[P]> extends Record<string, any>
            ? CallableTranslations<NonNullable<T[P]>>
            : ParameterizedTranslation; // Fallback for basic strings that will be converted
};

// export type PX<T> = {
//     [P in keyof T]:
//     NonNullable<T[P]> extends ParameterizedTranslation ? ParameterizedTranslation :
//         // Allow for pre-existing functions that might not strictly be ParameterizedTranslation
//         // but are still callable and return a string, or a nested structure.
//         NonNullable<T[P]> extends (...args: any[]) => string ? NonNullable<T[P]> :
//             NonNullable<T[P]> extends Record<string, any> ? CallableTranslations<NonNullable<T[P]>> :
//                 ParameterizedTranslation; // Fallback for basic strings that will be converted
// };
export type PX<T> = {
    [P in keyof T]: NonNullable<T[P]> extends {
        __lt: any;
        params?: infer Params;
    }
        ? ParameterizedTranslation<ParamsFrom<Params>>
        : NonNullable<T[P]> extends ParameterizedTranslation
          ? ParameterizedTranslation
          : // Allow for pre-existing functions that might not strictly be ParameterizedTranslation
            // but are still callable and return a string, or a nested structure.
            NonNullable<T[P]> extends (...args: any[]) => string
            ? NonNullable<T[P]>
            : NonNullable<T[P]> extends Record<string, any>
              ? PX<NonNullable<T[P]>>
              : ParameterizedTranslation; // Fallback for basic strings that will be converted
};

function xxx<T extends LangTagTranslations>(translations: T): PX<T> {
    return translations as PX<T>;
}

const bb1 = xxx(aa1);

bb1.aaa();
bb1.eee({ count: 123 });
