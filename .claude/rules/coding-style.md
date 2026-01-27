# Coding Style Rules

## Formatting (Enforced by Biome)

- **2 spaces** for indentation
- **Single quotes** for strings
- **No semicolons**
- **Trailing commas** in multiline objects/arrays (ES5 style)
- **Max line length**: 100 characters

## TypeScript

### Types Over Any

```typescript
// WRONG
const data: any = await fetchData()

// CORRECT
interface UserData { id: string; name: string }
const data: UserData = await fetchData()
```

### Prefer Interfaces for Objects

```typescript
// Prefer interface for object shapes
interface User {
  id: string
  name: string
}

// Use type for unions, intersections, primitives
type Status = 'active' | 'inactive' | 'pending'
```

### Avoid Type Assertions

```typescript
// WRONG - hiding type errors
const user = response.data as User

// CORRECT - validate or narrow
if (isUser(response.data)) {
  const user = response.data
}
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables/Functions | camelCase | `getUserData`, `isActive` |
| Interfaces/Types | PascalCase | `UserService`, `ApiResponse` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES`, `FLUSH_THRESHOLD` |
| Files | kebab-case | `posthog.ts`, `sanitizer.ts` |
| Boolean variables | `is`, `has`, `should` prefix | `isLoading`, `hasError` |

## Functions

### Prefer Early Returns

```typescript
// WRONG - deep nesting
function processUser(user: User | null) {
  if (user) {
    if (user.isActive) {
      // do stuff
    }
  }
}

// CORRECT - early returns
function processUser(user: User | null) {
  if (!user) return
  if (!user.isActive) return
  // do stuff
}
```

## Error Handling

### Silent Failure Pattern (for hooks)

Hooks must never block Claude Code. Always catch errors and exit cleanly:

```typescript
async function main(): Promise<void> {
  try {
    // ... processing
  } catch {
    // Silent failure - never block Claude
  }
  process.exit(0)
}
```

## Imports

### Order

1. Node.js built-ins (`node:fs`, `node:path`)
2. External packages (none in this project)
3. Local imports (`./types.ts`, `./posthog.ts`)

### Use Named Exports

```typescript
// CORRECT - explicit, refactor-friendly
export function capture() {}
export { BUFFER_DIR, BUFFER_FILE }
```
