

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