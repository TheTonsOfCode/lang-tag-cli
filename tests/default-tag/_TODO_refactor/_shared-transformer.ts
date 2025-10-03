
import {LangTagTranslationsConfig, TranslationTransformer} from "@/index.ts";
import {processPlaceholders} from "../vanilla-process-placeholders-fn.ts";


export const defaultTranslationTransformer: TranslationTransformer<LangTagTranslationsConfig> = ({ value, params }) => {
    return processPlaceholders(value, params);
};
