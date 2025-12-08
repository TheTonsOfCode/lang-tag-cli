## @lang-tag/presets

ta libka ma NIE BYC obowiązkowa, nadal rozbudowywać init-tag że ktoś w projekcie będzie mógł sobie cokolwiek ustawić itd.
ale jak ma to być praktycznie nie tknięty tag to po co zapychać neta w 15 libkach 1:1 tym samym tagiem jak można będzie zrobić coś takiego:

```ts
import { libraryLangTag } from '@lang-tag/presets/framework/react/library';

export const _lang = libraryLangTag({
    usePresetPlaceholder: true,
});
```

Gotowe tagi pod dane frameworki/libki itd.

- kompilowane tak żeby ktos z reacta mogl zaciagnac tylko z reacta a nie ze svelte i innymi.
- zrobione jak najbardziej generycznie pod 90% przypadków z jakąś konfiguracją
- dodane metody pomocnicze jak placeholder parsing itd.

/frameworks
react
library.ts
project.ts
svelte
itd
/utils
placeholders
