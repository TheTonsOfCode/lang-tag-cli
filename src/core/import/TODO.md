
- tutaj ma wczytywac istniejace tagi o tej samej nazwie
    brac ich oryginalne wartosci
    a stare ktore nie istnieją wykomentowywac

    tutaj tez jest miejsce do popisu dla toola UI





- ten algorytm powinien wykrywac na jakims etapie ze w generowanych plikach powielona jest nazwa exportu i walic error

- ten caseType jest uzywany w kilku miejscach, dac go do osobnego pliku


- funkcja do przydzielania i nadpisywania configów przed zapisaniem

- wywalic case transformy z variable ktore nie mają prawa dzialac np. kebab, dot notation itd.

    i zamieniac wszystkie - na _ w nazwie variabla aby nie generowalo głupot
  powinno transformowac dla sciezek usuwac @ a zamiast _ dawac - aby to
  się nazywało scope-package a _ w nazwach zmiennych



- dodac mapping algorytm który przyjmuje liste paczek i tagów po nazwać/indeksach i wskazuje nowe sciezki/nazwy_zmiennych/jak remapowac config


