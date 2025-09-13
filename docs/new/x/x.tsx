// import { createContext, useContext, useMemo } from 'react';
//
// import {
//     CallableTranslations,
//     LangTagTranslations,
//     LangTagTranslationsConfig,
//     PartialFlexibleTranslations,
//     createCallableTranslations,
//     lookupTranslation,
//     normalizeTranslations,
//     processPlaceholders,
// } from 'lang-tag';
//
// export function libLang<T extends LangTagTranslations>(
//     baseTranslations: T,
//     config?: LangTagTranslationsConfig
// ) {
//     type Type = CallableTranslations<T>;
//     type InputType = PartialFlexibleTranslations<T>;
//
//     const Context = createContext<Type | null>(null);
//
//     const createTranslationHelper = (normalized: CallableTranslations<T> | null) =>
//         createCallableTranslations(baseTranslations, config, {
//             transform: ({ path, value, params }) => {
//                 const fn = normalized && lookupTranslation(normalized, path);
//                 return processPlaceholders(fn ? fn(params) : value, params);
//             },
//         });
//
//     const useT = () => {
//         const contextTranslations = useContext(Context);
//         return useMemo(() => createTranslationHelper(contextTranslations), [contextTranslations]);
//     };
//
//     const createT = (translations?: InputType) => {
//         const normalized = useMemo(
//             () => (translations ? normalizeTranslations(translations) : null),
//             [translations]
//         );
//
//         return useMemo(() => createTranslationHelper(normalized), [normalized]);
//     };
//
//     function Provider({
//                           translations,
//                           children,
//                       }: {
//         translations?: InputType;
//         children: any;
//     }): any {
//         const normalized = useMemo(
//             () => (translations ? normalizeTranslations(translations) : null),
//             [translations]
//         );
//
//         return <Context.Provider value={normalized}>{children}</Context.Provider>;
//     }
//
//     return {
//         useT,
//         createT,
//         Provider,
//         InputType: {} as InputType,
//         Type: {} as Type,
//     };
// }
