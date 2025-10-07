
//
//
//
//  Obsługa flagi condense w logowaniu konfliktu

    niech kolory linii w logach będą jasno szare
//
//
//
//  Jak jest 1:1 tak samo wartość to nie wykrywa teraz konfliktów i nie wiem czy to dobrze..., 
//  choc z drugiej strony mozna tworzyc takie same langtagi z wskazaniem na ta sama sciezke bez importu innego langtaga
//
        to jest przez tego if'a
        dodac do CLIConfigu i zrobic to opcjonalne "skipConflictsOnSameValues=true" zawsze pomija podstawowo, a mozna dac na false
//

- dodac ze w linii langtaga processor cofa sie i szuka // jesli znalazl to znaczy ze jest to zakomentowany lang-tag  i go pomija
// komentarz w jednej lini wycinac langtaga aby nie bralo pod uwage

- testy na to ze jak ktos se da template stringa to pominie tego lang-taga
- testy na to ze jak ktos da z json5 multiline zmienna to też nie wezmie pod uwage


 - onConfigurationGeneration, undefined powinno usuwac konfiguracje, a powinna byc inna zmienna 'save: true'



- zrobic podstawowy regenerate config ktory omija generowanie tam gdzie powinno byc common
    import from "langtag/cli/base-regenerates"
    SkipDirNameAlgorithm(
        namespace: {
            ignoreAlways: ['core', 'components', 'pages', 'app']
            ignoreStructured: {
                'app': {
                    'components': [
                        'orders', 'products'
                    ],
                    'pages'
                }
            }
        }
    )


- w readConfig jesli nie ma:
    onConflictResolution
    lub tego onCollectFinish

    (bo ktos np. napisal na chama= onConflictResolution:undefined )
    to rzucac error i informacja ze trzeba to dodać do config