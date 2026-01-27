// Claude Code Hook Events
export type HookEvent =
  | 'Setup'
  | 'SessionStart'
  | 'SessionEnd'
  | 'UserPromptSubmit'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'PermissionRequest'
  | 'Notification'
  | 'Stop'
  | 'PreCompact'

// Hook input structures from Claude Code
export interface SetupInput {
  session_id: string
  cwd: string
  trigger: 'init' | 'resume'
}

export interface SessionStartInput {
  session_id: string
  cwd: string
}

export interface SessionEndInput {
  session_id: string
  cwd: string
  duration_ms: number
}

export interface UserPromptSubmitInput {
  session_id: string
  prompt: string
}

export interface ToolUseInput {
  session_id: string
  tool_name: string
  tool_input: Record<string, unknown>
}

export interface PostToolUseInput extends ToolUseInput {
  tool_response?: unknown
  duration_ms?: number
}

export interface SubagentInput {
  session_id: string
  agent_id: string
  agent_type: string
  prompt?: string
}

export interface SubagentStopInput extends SubagentInput {
  duration_ms?: number
  tool_count?: number
  stop_hook_active?: boolean
  agent_transcript_path?: string
}

export interface PermissionRequestInput {
  session_id: string
  tool_name: string
  tool_input: Record<string, unknown>
}

export interface NotificationInput {
  session_id: string
  message: string
  notification_type: 'info' | 'warning' | 'error'
}

export interface StopInput {
  session_id: string
  reason: string
  stop_hook_active?: boolean
  transcript_path?: string
}

export interface PreCompactInput {
  session_id: string
  trigger: 'auto' | 'manual'
  custom_instructions?: string
}

export type HookInput =
  | SetupInput
  | SessionStartInput
  | SessionEndInput
  | UserPromptSubmitInput
  | ToolUseInput
  | PostToolUseInput
  | SubagentInput
  | SubagentStopInput
  | PermissionRequestInput
  | NotificationInput
  | StopInput
  | PreCompactInput

// Plugin configuration
export interface PluginConfig {
  enabled: boolean
  posthog: {
    apiKey: string
    host: string
  }
  user: {
    email: string
    name?: string
    team?: string
  }
  tracking: {
    tools: boolean
    mcp: boolean
    skills: boolean
    hooks: boolean
    prompts: boolean
    subagents: boolean
    usage: boolean
  }
  privacy: {
    hashFilePaths: boolean
    sanitizeCommands: boolean
    truncatePrompts: number
  }
}

// PostHog event structure
export interface PostHogEvent {
  event: string
  distinct_id: string
  timestamp: string
  properties: Record<string, unknown>
}

export interface BufferedEvent extends PostHogEvent {
  buffered_at: string
}

// Tool categories
export type ToolCategory =
  | 'file_ops'
  | 'execution'
  | 'navigation'
  | 'workflow'
  | 'tasks'
  | 'notebook'
  | 'mcp'
  | 'other'
  | 'unknown'

// Intent categories
export type IntentCategory =
  | 'debugging'
  | 'feature'
  | 'refactoring'
  | 'testing'
  | 'exploration'
  | 'git'
  | 'deployment'
  | 'skill_invocation'
  | 'general'
  | 'unknown'
