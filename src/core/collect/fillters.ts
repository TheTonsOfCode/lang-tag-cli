import {LangTagCLILogger} from "@/logger.ts";
import {LangTagCLIConfig, LangTagCLIProcessedTag} from "@/config.ts";

export function $LT_FilterInvalidTags(tags: LangTagCLIProcessedTag[], config: LangTagCLIConfig, logger: LangTagCLILogger) {
    return tags.filter((tag) => {
        if (tag.validity === 'invalid-param-1')
            logger.debug('Skipping tag "{fullMatch}". Invalid JSON: "{invalid}"', {
                fullMatch: tag.fullMatch.trim(),
                invalid: tag.parameter1Text
            });
        if (tag.validity === 'invalid-param-2')
            logger.debug('Skipping tag "{fullMatch}". Invalid JSON: "{invalid}"', {
                fullMatch: tag.fullMatch.trim(),
                invalid: tag.parameter2Text
            });
        if (tag.validity === 'translations-not-found')
            logger.debug('Skipping tag "{fullMatch}". Translations not found at parameter position: {pos}', {
                fullMatch: tag.fullMatch.trim(),
                pos: config.translationArgPosition
            });

        return tag.validity === "ok";
    })
}

export function $LT_FilterEmptyNamespaceTags(tags: LangTagCLIProcessedTag[], logger: LangTagCLILogger) {
    return tags.filter((tag) => {
        if (!tag.parameterConfig) {
            logger.warn('Skipping tag "{fullMatch}". Tag configuration not defined. (Check lang-tag config at collect.onCollectConfigFix)', {
                fullMatch: tag.fullMatch.trim()
            });
            return false;
        }
        if (!tag.parameterConfig.namespace) {
            logger.warn('Skipping tag "{fullMatch}". Tag configuration namespace not defined. (Check lang-tag config at collect.onCollectConfigFix)', {
                fullMatch: tag.fullMatch.trim()
            });
            return false;
        }
        return true;
    })
}