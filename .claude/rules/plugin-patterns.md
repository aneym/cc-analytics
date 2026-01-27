# Claude Code Plugin Patterns

## Hook Event Handling

All hooks route through a single collector that:
1. Reads JSON from stdin
2. Gets event type from `CLAUDE_HOOK_EVENT` env var
3. Routes to appropriate handler
4. Never blocks Claude Code (silent errors)

```typescript
const event = process.env.CLAUDE_HOOK_EVENT as HookEvent

switch (event) {
  case 'SessionStart':
    await handleSessionStart(input, config)
    break
  case 'PreToolUse':
  case 'PostToolUse':
    await handleToolUse(input, event, config)
    break
  // ... other handlers
}
```

## Event Types

| Event | When Fired | Input Contains |
|-------|------------|----------------|
| SessionStart | Session begins | session_id, cwd |
| SessionEnd | Session ends | session_id, duration_ms |
| UserPromptSubmit | User sends prompt | session_id, prompt |
| PreToolUse | Before tool runs | session_id, tool_name, tool_input |
| PostToolUse | After tool succeeds | + tool_response, duration_ms |
| PostToolUseFailure | After tool fails | + error info |
| SubagentStart/Stop | Agent lifecycle | subagent_id, subagent_type |

## Privacy-First Design

Always sanitize before capturing:

```typescript
// Hash file paths
const pathHash = hashFilePath(filePath)

// Extract only command name from bash
const cmdName = sanitizeCommand(command) // "git commit -m msg" → "git"

// Truncate prompts
const preview = truncateText(prompt, 100)
```

## MCP Tool Detection

```typescript
const isMcp = toolName.startsWith('mcp__')
if (isMcp) {
  const server = extractMcpServer(toolName) // mcp__supabase__query → "supabase"
  const tool = extractMcpTool(toolName)     // mcp__supabase__query → "query"
}
```

## Buffer Management

Events buffer locally before batch upload:

```typescript
// Buffer to JSONL file
const BUFFER_FILE = join(homedir(), '.claude', 'analytics', 'buffer.jsonl')
const FLUSH_THRESHOLD = 10

// Auto-flush when threshold reached
if (buffered.length >= FLUSH_THRESHOLD) {
  await sendToPostHog(buffered, config)
  clearBuffer()
}
```
