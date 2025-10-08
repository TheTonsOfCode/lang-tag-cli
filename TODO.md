
## E2E:

- Implement watch mode with config regeneration

# Documentation:

- Verify that tree shaking only utilizes /src/index.ts, then highlight in the README that it's a lightweight package using only that small file with no dependencies in the final build
- Review accuracy of documentation for react-i18n (it was AI-generated and refined based on subjective assessment, but never formally verified)

# Features:

- if lang-tag is only proxy for translations by defining in file, or at component levels
objects which are struct for translations containing default values for that translations
in instance in English, so it would be nice if there will be command which detects
in build lang-tags and replaces whole string values to just empty string `""` if somebody does
not use that default value, so he can run that command on dist or other eg.: Next.js build directory and clean it

- when importing - list all node_modules packages containing lang-tag.exports, then importing them first, and change depth of scanning to 2 directories and 3 organization namespaced directories

- When importing tags via `lang-tag collect -l`, e.g., from an updated package, implement a process to parse local imported tags, then imported ones, then implement a prompting mechanism similar to Drizzle's question system (yes/no) asking whether users want to replace their modified translations with ones updated in the library
- Implement a collision detection system that throws information about path, file A, file B with tag indices when the same translation path is used in multiple locations (can be helpful for incorrectly written onGenerationConfig functions)
- Consider adding an onCollision function that automatically resolves path conflicts
- Regenerating tags/configs with same indices/tabs as set with translations part, or maybe prettier/editor config configuration


Prompting system:
configuration variable: nameVariablesAtImport: true;

At .lang-tag.import-cache.json in format:
"fileName_variableName": "userInputVariableName"
Then always at update use "userInputVariableName"

System/Function to decide output file(json collectFile), so instead of /locale/en/[namespace].json we can redirect collecting all translations to something like: /locale/en.json 



Processor: Consider switching to acorn:
    1. Simple regex checks if file contains lang() functions
    2. Later on acorn parses to AST and checks if top level functions are valid lang-tags without some rubberish comments iteration and etc.


IMPORTANT: If replace tags was NULL and translation pos is 2 then instead of removing them we need to set them to "{}"


- zrobic ze jak save robi undefined to konvertowac to na null
  - co pozniej funkcja łyka i zeruje config i nie ma:
    "Replacement data is required!


- dodac brakujący test na replaceTags gdzie konfig leci jako null


- w logu ze updatowano plik dawać link do pliku



- w debug, dodać że loguje zawsze jaki plik miał wywołany jaki save


- generowac tagi w init-tag z zmienną `keepOnGeneration: 'namespace' | 'path' | 'both'`


- tutaj może setCancelled też dodać
, { path: 'testimonials', namespace: 'auth' });
podmienia na:
, { namespace: 'auth' });
przy takim configu: 
```
onConfigGeneration: async event => {
		// We do not modify imported configurations
		if (event.isImportedLibrary) return;

		if (event.config?.manual) return;

		await generationAlgorithm(event);
	},
```
Dodać/przerobić logikę tak, że moge po fakcie sprawdzić czy np. config miał 'keepPath:true' i wtedy wrócić path na poprzednie, 
albo zrobić drugi algorytm który jest nakładany na ten i podaje się mu nazwy zmienny które mają być na true aby jak one sa w configu to blokował nadpisywanie ich przez algorytmy
jakos nazwac go: 'configKeeper' czy jakos tak
ale nakłada się go PO wykonaniu algorytmu zeby mozna go bylo kombinowac z innymi 


```
const generationAlgorithm = pathBasedConfigGenerator({
	ignoreIncludesRootDirectories: true,
	removeBracketedDirectories: true,
	namespaceCase: 'kebab',
	pathCase: 'camel',
	clearOnDefaultNamespace: true,
	ignoreDirectories: ['core', 'utils', 'helpers'],
	ignoreStructured: {
		app: ['dashboard']
	}
});
```
pod "app/dashboard/dashboard.page.translations.ts" produkuje "dashboard" co jest błędne