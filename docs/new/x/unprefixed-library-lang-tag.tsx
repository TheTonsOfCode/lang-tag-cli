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
import {
    createContext,
    useContext,
    useMemo
} from "react";

export function libraryLangTag<T extends LangTagTranslations>(
    baseTranslations: T,
    config?: LangTagTranslationsConfig
) {
    const Context = createContext<CallableTranslations<T> | null>(null);

    const createTranslationHelper = (normalized: CallableTranslations<T> | null) =>
        createCallableTranslations(baseTranslations, config, {
            transform: ({unprefixedPath, value, params}) => {
                const fn = normalized && lookupTranslation(normalized, unprefixedPath);
                return processPlaceholders(fn ? fn(params) : value, params);
            }
        });

    const useT = () => {
        const contextTranslations = useContext(Context);
        return useMemo(() => createTranslationHelper(contextTranslations), [contextTranslations]);
    };

    const createT = (translations?: PartialFlexibleTranslations<T>) => {
        const normalized = useMemo(
            () => translations ? normalizeTranslations(translations) : null,
            [translations]
        );

        return useMemo(() => createTranslationHelper(normalized), [normalized]);
    };

    function Provider({translations, children}: { translations?: PartialFlexibleTranslations<T>; children: any }): any {
        const normalized = useMemo(
            () => translations ? normalizeTranslations(translations) : null,
            [translations]
        );

        return <Context.Provider value={normalized}>{children}</Context.Provider>;
    }

    return {
        useT,
        createT,
        Provider,
        InputType: {} as PartialFlexibleTranslations<T>,
        Type: {} as CallableTranslations<T>
    };
}
