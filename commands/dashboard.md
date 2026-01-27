---
description: View Claude Code analytics summary from local buffer
allowed-tools: ["Read", "Bash(jq:*)", "Bash(wc:*)"]
---

# Analytics Dashboard

Show a summary of collected Claude Code analytics.

## Instructions

1. Read the buffer file at `~/.claude/analytics/buffer.jsonl`
2. Parse and summarize the events:
   - Total events buffered
   - Events by type (cc_tool_use, cc_session_start, etc.)
   - Most used tools
   - Recent session durations
3. Show buffer stats (oldest event, total count)
4. If buffer is empty, inform user no events collected yet

## Output Format

```
📊 Claude Code Analytics Summary
================================

Buffer Status:
  Events pending: X
  Oldest event: YYYY-MM-DD HH:MM

Event Breakdown:
  cc_tool_use: X events
  cc_session_start: X events
  ...

Top Tools:
  1. Edit (X uses)
  2. Read (X uses)
  ...

Recent Sessions:
  - Session abc123: 15 min, 42 tools
  ...
```
