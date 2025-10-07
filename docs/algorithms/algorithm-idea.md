```
const config = {
  tagName: 'lang',

  onConfigGeneration: exampleAlgorithm({
    namespace: {
      // These namespaces will always be ignored, regardless of file location
      ignoreAlways: ['core', 'utils', 'helpers'],
      
      // Structured ignore rules based on file paths
      ignoreStructured: {
        // In the 'app' directory:
        'app': {
          // All translations in 'pages' will use the common namespace
          'pages': true,
          
          // In 'components', only specific namespaces are ignored
          'components': ['header', 'footer', 'sidebar', 'navigation'],
          
          // Nested structure for deeper paths
          'features': {
            'auth': {
              // All auth form components use common namespace
              'forms': true
            }
          }
        },
        
        // In the 'src' directory:
        'src': {
          // All layout-related translations use common namespace
          'layouts': true,
          
          // Shared UI components also use common namespace
          'shared': {
            'ui': true
          }
        }
      }
    }
  })
};

```