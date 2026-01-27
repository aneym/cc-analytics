# Claude Code Analytics

A Claude Code plugin that tracks comprehensive usage analytics and sends to PostHog. Shareable across teams.

## What It Tracks

| Event | Description |
|-------|-------------|
| `cc_session_start/end` | Session lifecycle and duration |
| `cc_tool_use` | Core tool usage (Edit, Read, Bash, etc.) |
| `cc_mcp_call` | MCP tool invocations by server |
| `cc_skill_invoke` | Skill usage and arguments |
| `cc_subagent` | Subagent spawning and completion |
| `cc_prompt` | User prompt patterns (opt-in) |
| `cc_hook_execute` | Hook execution timing |

## Installation

```bash
# Clone to your plugins directory
git clone git@github.com:aneym/claude-code-analytics.git ~/.claude/plugins/claude-code-analytics

# Install dependencies
cd ~/.claude/plugins/claude-code-analytics
bun install

# Create your config
cp config.template.json config.json
# Edit config.json with your PostHog API key and email
```

## Configuration

Edit `config.json`:

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

- **File paths**: SHA256 hashed (first 16 chars)
- **Bash commands**: Only command name captured (e.g., `git`, `npm`)
- **Prompts**: Opt-in, truncated to 100 chars
- **File contents**: Never captured

## Usage

Once configured, the plugin automatically tracks all Claude Code activity. Events are buffered locally and sent to PostHog in batches.

### View Local Stats

Use the dashboard skill:

```
/analytics:dashboard
```

### Buffer Location

Events are buffered at `~/.claude/analytics/buffer.jsonl` before being sent to PostHog.

## Development

```bash
# Lint and format
bun run lint:fix

# Type check
bun run typecheck

# Run all checks
bun run check
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
