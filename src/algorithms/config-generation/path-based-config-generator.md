# Path-Based Config Generator Algorithm

Automatically generates `namespace` and `path` configuration from file path structure.

## How It Works

1. **Extract Path Segments**
   - Takes the `relativePath` from the event
   - Splits it into directory segments using path separator

2. **Handle Filename** (option `includeFileName`)
   - `false`: Removes filename from segments (default)
   - `true`: Strips extension and includes filename as a segment

3. **Process Bracketed Directories** (option `removeBracketedDirectories`)
   - `true`: Completely removes directories wrapped in `()` or `[]` (default)
   - `false`: Only removes the brackets, keeps directory name

4. **Extract Root Directories from Includes** (option `ignoreIncludesRootDirectories`)
   - When enabled, automatically extracts root directory names from `config.includes` patterns
   - Adds extracted directories to the ignore list
   - Handles group patterns like `(src|app)` and `[frontend|backend]`

5. **Apply Path Transformation Rules** (option `pathRules` or `ignoreStructured`)
   - **`pathRules`** (recommended): Advanced hierarchical rules with ignore and rename
     - `_: false` - Ignores current segment but continues with nested rules
     - `>: 'name'` - Renames current segment to specified value
     - String value - Shorthand for rename (e.g., `segment: 'newName'`)
     - Boolean value - Shorthand for ignore (e.g., `segment: false`)
   - **`ignoreStructured`** (legacy): Hierarchical ignore-only rules
     - `_: true` - Ignores current segment but continues with nested rules
     - `true` - Ignores segment and stops hierarchy
     - Array - Ignores specific child segments
   - **Note:** Cannot use both `pathRules` and `ignoreStructured` simultaneously

6. **Apply Global Ignore** (option `ignoreDirectories`)
   - Removes all segments matching globally ignored directory names
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

| Option                          | Type     | Default | Description                                                                                          |
| ------------------------------- | -------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `includeFileName`               | boolean  | `false` | Include filename (without extension) as path segment                                                 |
| `removeBracketedDirectories`    | boolean  | `true`  | Remove directories in `()` or `[]`, otherwise just remove brackets                                   |
| `ignoreDirectories`             | string[] | `[]`    | Directory names to ignore globally                                                                   |
| `ignoreIncludesRootDirectories` | boolean  | `false` | Auto-extract and ignore root directories from `includes` patterns                                    |
| `ignoreStructured`              | object   | `{}`    | Hierarchical ignore rules matching path structure. Supports `_: true` to ignore segment but continue |
| `pathRules`                     | object   | `{}`    | Advanced hierarchical rules with ignore and rename. Supports `_: false` (ignore), `>` (rename)       |
| `lowercaseNamespace`            | boolean  | `false` | Convert namespace to lowercase                                                                       |
| `namespaceCase`                 | string   | -       | Case transformation for namespace (camel, snake, kebab, etc.)                                        |
| `pathCase`                      | string   | -       | Case transformation for path segments                                                                |
| `fallbackNamespace`             | string   | -       | Namespace when no segments remain (defaults to config default)                                       |
| `clearOnDefaultNamespace`       | boolean  | `true`  | Clear config when namespace equals default                                                           |

## Examples

### Basic Usage

```typescript
pathBasedConfigGenerator({
  ignoreDirectories: ['src', 'app'],
  lowercaseNamespace: true,
});
```

**File:** `src/app/features/orders/OrderList.tsx`  
**Result:** `{ namespace: 'features', path: 'orders' }`

### With Filename Included

```typescript
pathBasedConfigGenerator({
  includeFileName: true,
  ignoreDirectories: ['src'],
});
```

**File:** `src/components/Button.tsx`  
**Result:** `{ namespace: 'components', path: 'Button' }`

### Bracketed Directories

```typescript
pathBasedConfigGenerator({
  removeBracketedDirectories: true,
  ignoreDirectories: ['app'],
});
```

**File:** `app/(admin)/users/UserList.tsx`  
**Result:** `{ namespace: 'users' }`

### Hierarchical Ignore (Legacy)

```typescript
pathBasedConfigGenerator({
  ignoreStructured: {
    src: {
      app: true,
      features: ['auth', 'admin'],
    },
  },
});
```

**File:** `src/app/components/Button.tsx` → `{ namespace: 'src', path: 'components' }`  
**File:** `src/features/auth/Login.tsx` → `{ namespace: 'src', path: 'features' }`  
**File:** `src/features/orders/List.tsx` → `{ namespace: 'src', path: 'features.orders' }`

### Hierarchical Ignore with Continue

```typescript
pathBasedConfigGenerator({
  ignoreStructured: {
    app: {
      dashboard: {
        _: true, // ignore "dashboard" but continue with nested rules
        modules: true, // also ignore "modules"
      },
    },
  },
});
```

**File:** `app/dashboard/modules/advanced/facility/page.tsx`  
**Result:** `{ namespace: 'app', path: 'advanced.facility' }`

### Path Rules with Ignore and Rename

```typescript
pathBasedConfigGenerator({
  pathRules: {
    app: {
      dashboard: {
        _: false, // ignore "dashboard" but continue
        modules: false, // also ignore "modules"
      },
      admin: {
        '>': 'management', // rename "admin" to "management"
        users: false, // ignore "users"
      },
    },
  },
});
```

**File:** `app/dashboard/modules/advanced/facility/page.tsx`  
**Result:** `{ namespace: 'app', path: 'advanced.facility' }`

**File:** `app/admin/settings/edit.tsx`  
**Result:** `{ namespace: 'app', path: 'management.settings' }`

**File:** `app/admin/users/list.tsx`  
**Result:** `{ namespace: 'app', path: 'management' }`

### Case Transformations

```typescript
pathBasedConfigGenerator({
  namespaceCase: 'kebab',
  pathCase: 'camel',
  ignoreDirectories: ['src'],
});
```

**File:** `src/UserProfile/EditForm.tsx`  
**Result:** `{ namespace: 'user-profile', path: 'editForm' }`

### Auto-Ignore Root Directories from Includes

```typescript
// With config.includes: ['(src|app)/**/*.{js,ts,jsx,tsx}', 'components/**/*.{jsx,tsx}']
pathBasedConfigGenerator({
  ignoreIncludesRootDirectories: true, // Auto-ignores: src, app, components
  lowercaseNamespace: true,
});
```

**File:** `src/features/auth/Login.tsx`  
**Result:** `{ namespace: 'features', path: 'auth' }`

**File:** `app/admin/users/List.tsx`  
**Result:** `{ namespace: 'admin', path: 'users' }`

**File:** `components/ui/Button.tsx`  
**Result:** `{ namespace: 'ui' }`

### Complete Example with pathRules

```typescript
pathBasedConfigGenerator({
  ignoreIncludesRootDirectories: true,
  removeBracketedDirectories: true,
  namespaceCase: 'kebab',
  pathCase: 'camel',
  clearOnDefaultNamespace: true,
  ignoreDirectories: ['views'],
  pathRules: {
    app: {
      dashboard: {
        _: false, // ignore "dashboard"
        modules: false, // ignore "modules"
      },
      admin: {
        '>': 'management', // rename "admin" to "management"
      },
    },
  },
});
```

**File:** `app/dashboard/modules/advanced/facility/[id]/edit/page.tsx`  
**Includes:** `['app/**/*.{js,ts,jsx,tsx}']`  
**Result:** `{ namespace: 'advanced', path: 'facility.edit' }`

**File:** `app/admin/users/UserProfile/edit.tsx`  
**Result:** `{ namespace: 'management', path: 'users.userProfile' }`
