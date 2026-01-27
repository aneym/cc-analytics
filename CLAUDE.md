# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code Analytics is a Claude Code plugin that tracks usage analytics and sends to PostHog. It intercepts hook events, sanitizes data for privacy, buffers events locally, and batch-uploads to PostHog.

## Commands

```bash
bun run lint:fix     # Lint and format with Biome
bun run typecheck    # TypeScript type checking
bun run check        # Run both typecheck and lint

bun install          # Install dependencies
bun run src/collector.ts  # Run collector directly (for testing)
```

## Architecture

```
Hook Events → collector.ts → sanitizer.ts → posthog.ts → ~/.claude/analytics/buffer.jsonl → PostHog API
```

### Key Files

- `src/collector.ts` - Main entry point, handles all 12 Claude Code hook events, routes to handlers
- `src/posthog.ts` - Local JSONL buffer management, batch API uploads (flush at 10 events)
- `src/sanitizer.ts` - Privacy layer: hashes file paths, sanitizes commands, categorizes tools/intents
- `src/types.ts` - TypeScript interfaces for hook inputs, config, events
- `hooks/hooks.json` - Hook registration (all events route to collector.ts)
- `.claude-plugin/plugin.json` - Plugin metadata for Claude Code

### Data Flow

1. Claude Code triggers hook event (SessionStart, PreToolUse, etc.)
2. Hook runs: `bun run collector.ts` with JSON on stdin
3. Collector loads config, sanitizes input, captures event
4. Event buffers to `~/.claude/analytics/buffer.jsonl`
5. Auto-flush to PostHog when buffer reaches 10 events

### Configuration

`config.json` (git-ignored) contains PostHog API key and tracking settings. Copy from `config.template.json`.

## Code Style

- Biome for linting/formatting (2-space indent, single quotes, no semicolons)
- TypeScript strict mode
- Silent failure pattern - hooks never block Claude Code (catch errors, exit 0)
- Use `Bun.CryptoHasher` for hashing, not Node crypto

## Bun Usage

Use Bun instead of Node.js throughout:
- `bun <file>` instead of `node` or `ts-node`
- `bun test` instead of jest/vitest
- `Bun.file` over `node:fs` readFile/writeFile
- `Bun.stdin.stream()` for reading stdin
- Bun auto-loads .env (no dotenv needed)

## Testing Hooks Locally

```bash
echo '{"session_id":"test","tool_name":"Read","tool_input":{"file_path":"/test.ts"}}' | \
  CLAUDE_HOOK_EVENT=PreToolUse bun run src/collector.ts
```

## Privacy Defaults

- File paths: SHA256 hashed (first 16 chars)
- Bash commands: Only command name captured (e.g., `git` not `git commit -m "msg"`)
- Prompts: Opt-in, truncated to 100 chars
- File contents: Never captured
