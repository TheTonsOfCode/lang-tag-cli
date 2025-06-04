import {FlexibleTranslations, PartialFlexibleTranslations} from "@/index.ts";

const testTranslationStructure = {
    greeting: 'Hi',
    farewell: 'Bye',
    details: {
        info: 'I like dogs',
        extra: 'and bearded agamas too!'
    }
};

const fx: FlexibleTranslations<typeof testTranslationStructure> = {
    greeting: "",
    farewell: "",
    details: {
        info: "",
        extra: ""
    }
}

const partial_fx: PartialFlexibleTranslations<typeof testTranslationStructure> = {
    greeting: "",
    details: {
        info: "",
    }
}