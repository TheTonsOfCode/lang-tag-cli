import {
    CallableTranslations,
    FlexibleTranslations,
    InterpolationParams,
    ParameterizedTranslation,
    normalizeTranslations,
} from '@/index';

// Example base object structure
const exampleStructure = {
    title: 'test',
    description: (params?: InterpolationParams) =>
        `Description with ${params?.count}`,
    sub: {
        aaa: 'bbb',
        ccc: (params?: InterpolationParams) => `CCC with ${params?.value}`,
    },
} as const; // Using 'as const' for more precise type inference

// Test CallableTranslations
// Type 'a' should be functions at leaves, matching exampleStructure shape
const a: CallableTranslations<typeof exampleStructure> = {
    title: () => 'test',
    description: (params?: InterpolationParams) =>
        `Description with ${params?.count}`,
    sub: {
        aaa: () => 'bbb',
        ccc: (params?: InterpolationParams) => `CCC with ${params?.value}`,
    },
};

const titleResult: string = a.title();
const descResult: string = a.description({ count: 1 });
const subAaaResult: string = a.sub.aaa();
const subCccResult: string = a.sub.ccc({ value: 'val' });

console.log(titleResult, descResult, subAaaResult, subCccResult);

// Test FlexibleTranslations and normalizeTranslations
const b: FlexibleTranslations<typeof a> = {
    title: 'flexible title', // string is flexible
    description: (params?: InterpolationParams) =>
        `Flexible desc with ${params?.count}`,
    sub: {
        aaa: 'flexible aaa',
        ccc: (params?: InterpolationParams) =>
            `Flexible CCC with ${params?.value}`,
        // exampleStructure.sub.ccc is a function, so it's also a valid FlexibleTranslation here
    },
};

const c = normalizeTranslations(b);

// After normalization, c should have the same callable structure as 'a'
const normTitle: string = c.title();
// Ensure that `c.description` is correctly typed and callable
const normDesc: string = c.description({ count: 2 });
const normSubAaa: string = c.sub.aaa();
const normSubCcc: string = c.sub.ccc({ value: 'ok' });

console.log(normTitle, normDesc, normSubAaa, normSubCcc);

// Example with a slightly different structure for FlexibleTranslations
interface MyFlexibleType {
    greeting: string;
    farewell: ParameterizedTranslation;
    details: {
        info: string;
        extra?: ParameterizedTranslation; // Optional function
    };
}

const translations = {
    title: 'Translations',
    sub: {
        ooo: (params?: InterpolationParams) => 'Hrrr!',
    },
} as const;

const fxT: FlexibleTranslations<typeof translations> = {
    title: 'Some title',
    sub: {
        ooo: (props) => 'Hrrr!' + props?.name,
    },
};

const normalizedFlex = normalizeTranslations(translations);

const titleMsg: string = normalizedFlex.title();
const oooMsg: string = normalizedFlex.sub.ooo({ name: 'Alice' });

console.log(titleMsg, oooMsg);

// This file is primarily for TypeScript type checking during development.
// The console.logs are just for basic runtime verification if someone runs this file.
