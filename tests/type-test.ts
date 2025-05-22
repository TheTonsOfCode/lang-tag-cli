import {FlexibleTranslations, normalizeTranslations, TranslationObjectToFunctions} from "@/index.ts";

const x = {
    title: "test",
    sub: {
        aaa: "bbb"
    }
}

const a = {} as TranslationObjectToFunctions<typeof x>;

a.title()
a.sub.aaa()

const b: FlexibleTranslations<typeof a> = {
    title: "te",
    sub: {
        aaa: (xx) => "bbb" + xx?.someVariable
    }
}

const c = normalizeTranslations(b);

c.title()
c.sub.aaa()