# Bun Patterns

## Use Bun Instead of Node.js

- `bun <file>` instead of `node <file>` or `ts-node <file>`
- `bun test` instead of `jest` or `vitest`
- `bun install` instead of `npm install`
- `bun run <script>` instead of `npm run <script>`
- Bun auto-loads `.env` - no dotenv needed

## Bun APIs

### File I/O

```typescript
// Prefer Bun.file for simple reads
const content = await Bun.file('path').text()

// For node:fs compatibility (existing code)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
```

### Stdin Reading

```typescript
async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}
```

### Hashing

```typescript
// Use Bun's built-in hasher
const hasher = new Bun.CryptoHasher('sha256')
hasher.update(data)
const hash = hasher.digest('hex')
```

### HTTP Requests

```typescript
// Use native fetch (built into Bun)
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
  signal: AbortSignal.timeout(5000),
})
```

## Testing

```typescript
import { test, expect, describe } from 'bun:test'

describe('sanitizer', () => {
  test('hashes file paths', () => {
    const hash = hashFilePath('/some/path')
    expect(hash).toHaveLength(16)
  })
})
```
