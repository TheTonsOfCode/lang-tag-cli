import { LangTagTranslations, createCallableTranslations } from '@/index';

const f = {
    p1: 'Val 1',
    p2: 'Val 2',
    sub: {
        p3: 'Val 3',
    },
};

function t<T extends LangTagTranslations>(translations: T) {
    return createCallableTranslations(translations, undefined, {
        transform: ({ path }) => path,
    });
}

const F = t(f);
F.p1();
F.sub.p3();
F.p2();
