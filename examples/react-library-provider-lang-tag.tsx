import {
    PartialFlexibleTranslations,
    LangTagTranslations,
    LangTagTranslationsConfig,
    createCallableTranslations,
    normalizeTranslations,
    CallableTranslations,
    lookupTranslation,
    processPlaceholders
} from "lang-tag";
import React, {
    createContext,
    useContext,
    ReactNode,
    useMemo,
    FC
} from "react";

export function lang<T extends LangTagTranslations>(
    baseTranslations: T,
    config?: LangTagTranslationsConfig
) {
    type Type = CallableTranslations<T>;
    type InputType = PartialFlexibleTranslations<T>;

    const Context = createContext<Type | null>(null);

    const createTranslationHelper = (normalized: CallableTranslations<T> | null) =>
        createCallableTranslations(baseTranslations, config, {
            transform: ({ path, value, params } ) => {
                const fn = normalized && lookupTranslation(normalized, path);
                return processPlaceholders(fn ? fn(params) : value, params);
            }
        });

    const useT = () => {
        const contextTranslations = useContext(Context);
        return useMemo(() => createTranslationHelper(contextTranslations), [contextTranslations]);
    };

    const createT = (translations?: InputType) => {
        const normalized = useMemo(
            () => translations ? normalizeTranslations(translations) : null,
            [translations]
        );

        return useMemo(() => createTranslationHelper(normalized), [normalized]);
    };

    const Provider: FC<{ translations?: InputType; children: ReactNode }> = ({ translations, children }) => {
        const normalized = useMemo(
            () => translations ? normalizeTranslations(translations) : null,
            [translations]
        );

        return <Context.Provider value={normalized}>{children}</Context.Provider>;
    };

    return {
        useT,
        createT,
        Provider,
        InputType: {} as InputType,
        Type: {} as Type
    };
}
