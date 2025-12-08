export type LangTagTranslations = {
    [key: string]: string | LangTagTranslations;
};

type ProcessorMarker<Params extends Record<string, any> = InterpolationParams> =
    string & { readonly __ltParams?: Params };

function _processor<Params extends Record<string, any>>(
    key: string,
    shape: Record<string, string>
) {
    return {
        __lt: key as ProcessorMarker<Params>,
        ...shape,
    };
}

function count(params: {
    one?: string;
    few?: string;
    many?: string;
    other?: string;
}) {
    return _processor<{ count: number }>('count', params);
}

const aa1 = {
    aaa: 'a',
    bbb: {
        ccc: 'c',
        ddd: count({
            one: '1 product',
            other: '{{count}} products',
        }),
    },
    eee: count({
        one: '1 order',
        other: '{{count}} orders',
    }),
    dd: {},
} satisfies LangTagTranslations;

export type InterpolationParams = Record<string, any>;

export type ParameterizedTranslation<
    P extends Record<string, any> = InterpolationParams,
> = (params?: P) => string;

type ParamsFrom<T> = T extends readonly (infer Keys)[]
    ? Record<Extract<Keys, string>, any>
    : T extends string
      ? Record<T, any>
      : T extends Record<string, any>
        ? T
        : InterpolationParams;

export type PX<T> = {
    [P in keyof T]: NonNullable<T[P]> extends {
        __lt: ProcessorMarker<infer Params>;
    } // 1. Processor objects with __lt marker
        ? ParameterizedTranslation<ParamsFrom<Params>>
        : // 2. Already parametrized translation
          NonNullable<T[P]> extends ParameterizedTranslation
          ? ParameterizedTranslation
          : // 3. Allow for pre-existing functions that might not strictly be ParameterizedTranslation
            // but are still callable and return a string, or a nested structure.
            NonNullable<T[P]> extends (...args: any[]) => string
            ? NonNullable<T[P]>
            : // 4. Nested translation object
              NonNullable<T[P]> extends Record<string, any>
              ? PX<NonNullable<T[P]>>
              : // 5. Fallback for basic strings that will be converted
                ParameterizedTranslation;
};

function xxx<T extends LangTagTranslations>(translations: T): PX<T> {
    return translations as PX<T>;
}

const bb1 = xxx(aa1);

bb1.aaa();
bb1.eee({ count: 123 });
