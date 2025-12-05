dodać semantic versioning i rozpisać changeloga wstecz
i wyłączyć pushowanie na maina
ALBO NIE bo łatwo się będzie pomylić w feat itd.
Dodevelopować wszystko co uznaję że jest potrzebne do 1.0.0, potem wstecz wszystko opisać zrobić docsy itd i wtedy wpiąć semantic.
Np. to hide-compiled-exports mogłoby trafić do osobnej paczki z utilami do buildowania

Zrobić to cli/core itd jako jedno monorepo jednak

package.json
...
packages/
core - lang-tag
cli - @lang-tag/cli
presets - @lang-tag/presets
docs - docssaurus
...
publish.sh - sprawdza date modyfikacji, albo jakis semantic plugin ustawic tak zeby publikowal jesli były zmiany pod daną paczką

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

## zrobić obslugę plural itd do tego w lang-tagu

### i zrobić całe wsparcie mini transform pluginów jako value żeby ludzie mogli se pisać własne

```ts
import { count } from 'lang-tag';

export const translations = _lang({
    test: 'Test',
    order: count({
        one: '1 order',
        few: '{{count}} orders',
        many: '{{count}} orders',
    }),
});
```

### sam lang-tag rozbić z 1 pliku (nadal wszystko eksportować z barell-file), ale miec kilka podziałów:

- coś co jest do samego core
- mini pluginów jak count itd
- itd.
  tak do max 4 plików sprowadzić, to nadal ma być turbo lightweight
