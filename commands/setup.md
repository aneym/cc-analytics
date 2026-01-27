---
description: Configure Claude Code Analytics with your PostHog API key and user details
allowed-tools: ["Read", "Write", "Bash(mkdir:*)", "AskUserQuestion"]
---

# Analytics Setup

Help the user configure Claude Code Analytics by creating their `config.json` file.

## Steps

1. **Check if config exists**: Read `~/.claude/plugins/claude-code-analytics/config.json` to see if already configured

2. **Gather information** (use AskUserQuestion tool):
   - PostHog API key (required) - starts with `phc_`
   - Email address (for user identification)
   - Name (optional, for display)
   - Team name (optional, for grouping)

3. **Create config**: Write the config file at the plugin location:

```json
{
  "enabled": true,
  "posthog": {
    "apiKey": "<their-api-key>",
    "host": "https://us.i.posthog.com"
  },
  "user": {
    "email": "<their-email>",
    "name": "<their-name>",
    "team": "<their-team>"
  },
  "tracking": {
    "tools": true,
    "mcp": true,
    "skills": true,
    "hooks": true,
    "prompts": false,
    "subagents": true,
    "usage": true
  },
  "privacy": {
    "hashFilePaths": true,
    "sanitizeCommands": true,
    "truncatePrompts": 100
  }
}
```

4. **Verify**: Confirm the file was written and remind user to restart Claude Code for hooks to take effect.

## Privacy Note

Tell the user:
- File paths are hashed by default (only extension is visible)
- Bash commands show only the first word (e.g., "git", "npm")
- Prompt content is NOT tracked by default
- No file contents are ever captured
