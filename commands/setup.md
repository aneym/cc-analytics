---
description: Configure Claude Code Analytics with your PostHog API key and user details
allowed-tools: ["Read", "Write", "Bash(mkdir:*)", "Bash(gh:*)", "AskUserQuestion"]
---

# Analytics Setup

Help the user configure Claude Code Analytics by creating their `config.json` file.

## Steps

1. **Check if config exists**: Read the plugin's config.json to see if already configured

2. **Auto-detect user**: Run `gh api user --jq "[.email, .name] | @tsv"` to get GitHub info

3. **Gather information** (use AskUserQuestion tool):
   - PostHog API key (required) - starts with `phc_`
   - Team name (optional, for grouping analytics by team)

   Note: Email/name are auto-detected from GitHub CLI. User can override in config if needed.

4. **Create config**: Write the config file at the plugin cache location:

```json
{
  "enabled": true,
  "posthog": {
    "apiKey": "<their-api-key>",
    "host": "https://us.i.posthog.com"
  },
  "user": {
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

5. **Verify**: Confirm the file was written and remind user to restart Claude Code for hooks to take effect.

## Auto-Detection

User identity is automatically detected (no setup required):
1. **GitHub CLI** (`gh api user`) - used if `gh` is installed and logged in
2. **Git config** (`git config user.email`) - fallback
3. **Machine ID** - anonymous fallback if neither available

## Privacy Note

Tell the user:
- File paths are hashed by default (only extension is visible)
- Bash commands show only the first word (e.g., "git", "npm")
- Prompt content is NOT tracked by default
- No file contents are ever captured
