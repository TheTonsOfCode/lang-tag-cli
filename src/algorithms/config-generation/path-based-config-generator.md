# Path-Based Config Generator Algorithm

Automatically generates `namespace` and `path` configuration from file path structure.

## How It Works

1. **Extract Path Segments**
   - Takes the `relativePath` from the event
   - Splits it into directory segments using path separator

2. **Handle Filename** (option `includeFileName`)
   - `false`: Removes filename from segments (default)
   - `true`: Strips extension and includes filename as a segment

3. **Process Bracketed Folders** (option `removeBracketedFolders`)
   - `true`: Completely removes folders wrapped in `()` or `[]` (default)
   - `false`: Only removes the brackets, keeps folder name

4. **Extract Root Folders from Includes** (option `ignoreIncludesRootFolders`)
   - When enabled, automatically extracts root folder names from `config.includes` patterns
   - Adds extracted folders to the ignore list
   - Handles group patterns like `(src|app)` and `[frontend|backend]`

5. **Apply Hierarchical Ignore** (option `ignoreStructured`)
   - Matches path structure against hierarchical ignore rules
   - Removes segments that match the structured pattern
   - Supports nested structures for precise path matching

6. **Apply Global Ignore** (option `ignoreFolders`)
   - Removes all segments matching globally ignored folder names
   - Applied regardless of position in path

7. **Generate Namespace**
   - If segments remain: First segment becomes `namespace`
   - If no segments: Uses `fallbackNamespace` (defaults to `langTagConfig.collect.defaultNamespace`)

8. **Generate Path**
   - If multiple segments remain: Remaining segments joined with `.` become `path`
   - If empty: No `path` is set

9. **Apply Case Transformations** (options `lowercaseNamespace`, `namespaceCase`, `pathCase`)
   - `lowercaseNamespace`: Converts namespace to lowercase
   - `namespaceCase`: Applies case transformation to namespace (camel, snake, kebab, etc.)
   - `pathCase`: Applies case transformation to each path segment

10. **Handle Default Namespace** (option `clearOnDefaultNamespace`)
    - `true` (default): When namespace equals fallback/default, omits it from config
    - `false`: Always includes namespace even if it's the default

11. **Save Configuration**
    - Calls `event.save()` with the generated config
    - If config would be empty and namespace is default: `event.save(undefined)` to clear

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `includeFileName` | boolean | `false` | Include filename (without extension) as path segment |
| `removeBracketedFolders` | boolean | `true` | Remove folders in `()` or `[]`, otherwise just remove brackets |
| `ignoreFolders` | string[] | `[]` | Folder names to ignore globally |
| `ignoreIncludesRootFolders` | boolean | `false` | Auto-extract and ignore root folders from `includes` patterns |
| `ignoreStructured` | object | `{}` | Hierarchical ignore rules matching path structure |
| `lowercaseNamespace` | boolean | `false` | Convert namespace to lowercase |
| `namespaceCase` | string | - | Case transformation for namespace (camel, snake, kebab, etc.) |
| `pathCase` | string | - | Case transformation for path segments |
| `fallbackNamespace` | string | - | Namespace when no segments remain (defaults to config default) |
| `clearOnDefaultNamespace` | boolean | `true` | Clear config when namespace equals default |

## Examples

### Basic Usage
```typescript
pathBasedConfigGenerator({
  ignoreFolders: ['src', 'app'],
  lowercaseNamespace: true
})
```

**File:** `src/app/features/orders/OrderList.tsx`  
**Result:** `{ namespace: 'features', path: 'orders' }`

### With Filename Included
```typescript
pathBasedConfigGenerator({
  includeFileName: true,
  ignoreFolders: ['src']
})
```

**File:** `src/components/Button.tsx`  
**Result:** `{ namespace: 'components', path: 'Button' }`

### Bracketed Folders
```typescript
pathBasedConfigGenerator({
  removeBracketedFolders: true,
  ignoreFolders: ['app']
})
```

**File:** `app/(admin)/users/UserList.tsx`  
**Result:** `{ namespace: 'users' }`

### Hierarchical Ignore
```typescript
pathBasedConfigGenerator({
  ignoreStructured: {
    'src': {
      'app': true,
      'features': ['auth', 'admin']
    }
  }
})
```

**File:** `src/app/components/Button.tsx` → `{ namespace: 'components' }`  
**File:** `src/features/auth/Login.tsx` → `{ namespace: 'features' }`  
**File:** `src/features/orders/List.tsx` → `{ namespace: 'features', path: 'orders' }`

### Case Transformations
```typescript
pathBasedConfigGenerator({
  namespaceCase: 'kebab',
  pathCase: 'camel',
  ignoreFolders: ['src']
})
```

**File:** `src/UserProfile/EditForm.tsx`  
**Result:** `{ namespace: 'user-profile', path: 'editForm' }`

### Auto-Ignore Root Folders from Includes
```typescript
// With config.includes: ['(src|app)/**/*.{js,ts,jsx,tsx}', 'components/**/*.{jsx,tsx}']
pathBasedConfigGenerator({
  ignoreIncludesRootFolders: true,  // Auto-ignores: src, app, components
  lowercaseNamespace: true
})
```

**File:** `src/features/auth/Login.tsx`  
**Result:** `{ namespace: 'features', path: 'auth' }`

**File:** `app/admin/users/List.tsx`  
**Result:** `{ namespace: 'admin', path: 'users' }`

**File:** `components/ui/Button.tsx`  
**Result:** `{ namespace: 'ui' }`

