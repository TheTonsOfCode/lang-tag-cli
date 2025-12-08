const translation1 = 'Hello {{world}}';
const translation2 = 'Test {{ name}} from {{sender}}';

type ExtractParams<S extends string> =
    S extends `${string}{{${infer Param}}}${infer Rest}`
        ? Trim<Param> | ExtractParams<Rest>
        : never;

type ParamsFromTemplate<S extends string> = [ExtractParams<S>] extends [never]
    ? {}
    : Record<ExtractParams<S>, string>;

type WS = ' ' | '\n' | '\t';
type TrimLeft<S extends string> = S extends `${WS}${infer R}` ? TrimLeft<R> : S;
type TrimRight<S extends string> = S extends `${infer R}${WS}`
    ? TrimRight<R>
    : S;
type Trim<S extends string> = TrimLeft<TrimRight<S>>;

function toT<T extends string>(translation: T) {
    return (params: ParamsFromTemplate<T>) =>
        translation.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) =>
            String((params as Record<string, any>)[key] ?? '')
        );
}

const t1 = toT(translation1);
const t2 = toT(translation2);

const translated1 = t1({ world: 'świecie' });
const translated2 = t2({ name: 'John', sender: 'Paul' });
