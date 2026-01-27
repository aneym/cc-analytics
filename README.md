# Claude Code Analytics

Track Claude Code usage with PostHog. See what tools your team uses, how long sessions last, which skills get invoked, and more.

## What's Tracked

| Event | Description |
|-------|-------------|
| `cc_session_start/end` | Session lifecycle and duration |
| `cc_tool_use` | Core tool usage (Edit, Read, Bash, etc.) |
| `cc_mcp_call` | MCP tool invocations by server |
| `cc_skill_invoke` | Skill usage and arguments |
| `cc_subagent` | Subagent spawning and completion |
| `cc_hook_execute` | Hook execution timing |

## Installation

### Option 1: Via Marketplace (Recommended)

```
/plugin marketplace add aneym/claude-code-analytics
/plugin install claude-code-analytics
```

Then run setup:

```
/claude-code-analytics:setup
```

Restart Claude Code to activate hooks.

### Option 2: Manual Clone

```bash
git clone git@github.com:aneym/claude-code-analytics.git ~/.claude/plugins/claude-code-analytics
cd ~/.claude/plugins/claude-code-analytics
bun install
cp config.template.json config.json
# Edit config.json with your PostHog API key
```

## Configuration

Edit `config.json` (created by setup or manually):

```json
{
  "enabled": true,
  "posthog": {
    "apiKey": "phc_YOUR_PROJECT_KEY",
    "host": "https://us.i.posthog.com"
  },
  "user": {
    "email": "you@company.com",
    "name": "Your Name",
    "team": "engineering"
  },
  "tracking": {
    "tools": true,
    "mcp": true,
    "skills": true,
    "hooks": true,
    "prompts": false,
    "subagents": true
  },
  "privacy": {
    "hashFilePaths": true,
    "sanitizeCommands": true,
    "truncatePrompts": 100
  }
}
```

## Privacy

By default, the plugin protects sensitive data:

| Setting | Default | Effect |
|---------|---------|--------|
| `hashFilePaths` | `true` | SHA256 hash instead of full path |
| `sanitizeCommands` | `true` | First word only (git, npm, curl) |
| `truncatePrompts` | `100` | Max chars if prompt tracking enabled |
| `tracking.prompts` | `false` | Prompt content NOT tracked by default |

**File contents are never captured.**

## Skills

| Skill | Description |
|-------|-------------|
| `/claude-code-analytics:setup` | Configure API key and user details |
| `/claude-code-analytics:dashboard` | View analytics summary |

## Updating

Marketplace handles auto-updates. To manually update:

```
/plugin marketplace update
```

## Development

```bash
# Clone for development
git clone git@github.com:aneym/claude-code-analytics.git
cd claude-code-analytics
bun install

# Lint & typecheck
bun run check

# Test locally (without installing)
claude --plugin-dir .
```

## PostHog Dashboards

Create these insights in PostHog:

1. **Tool Usage**: Breakdown by `tool_name`
2. **Session Duration**: Distribution of `duration_ms`
3. **MCP Servers**: Breakdown by `mcp_server`
4. **User Activity**: Events by `distinct_id`

## Tech Stack

- **Runtime**: Bun (TypeScript native)
- **Linting**: Biome
- **Analytics**: PostHog

## License

MIT

# Test 2
# Test 3
# Auto-version test
