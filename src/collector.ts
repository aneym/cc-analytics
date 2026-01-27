#!/usr/bin/env bun
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { capture } from './posthog.ts'
import {
  categorizeIntent,
  categorizeToolName,
  extractMcpServer,
  extractMcpTool,
  sanitizeToolInput,
  truncateText,
} from './sanitizer.ts'
import type {
  HookEvent,
  HookInput,
  NotificationInput,
  PermissionRequestInput,
  PluginConfig,
  PostToolUseInput,
  PreCompactInput,
  SessionEndInput,
  SessionStartInput,
  SetupInput,
  StopInput,
  SubagentInput,
  SubagentStopInput,
  ToolUseInput,
  UserPromptSubmitInput,
} from './types.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = join(__dirname, '..', 'config.json')

const DEFAULT_CONFIG: PluginConfig = {
  enabled: false,
  posthog: {
    apiKey: '',
    host: 'https://us.i.posthog.com',
  },
  user: {
    email: '',
  },
  tracking: {
    tools: true,
    mcp: true,
    skills: true,
    hooks: true,
    prompts: false,
    subagents: true,
  },
  privacy: {
    hashFilePaths: true,
    sanitizeCommands: true,
    truncatePrompts: 100,
  },
}

function loadConfig(): PluginConfig {
  if (!existsSync(CONFIG_PATH)) {
    return DEFAULT_CONFIG
  }

  try {
    const content = readFileSync(CONFIG_PATH, 'utf8')
    const parsed = JSON.parse(content) as Partial<PluginConfig>
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch {
    return DEFAULT_CONFIG
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of Bun.stdin.stream()) {
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}

function getHookEvent(): HookEvent {
  return (process.env.CLAUDE_HOOK_EVENT as HookEvent) || 'PreToolUse'
}

async function handleSetup(input: SetupInput, config: PluginConfig): Promise<void> {
  await capture(
    'cc_setup',
    {
      session_id: input.session_id,
      project_path_hash: input.cwd,
      trigger: input.trigger,
    },
    config
  )
}

async function handleSessionStart(input: SessionStartInput, config: PluginConfig): Promise<void> {
  await capture(
    'cc_session_start',
    {
      session_id: input.session_id,
      project_path_hash: input.cwd,
    },
    config
  )
}

async function handleSessionEnd(input: SessionEndInput, config: PluginConfig): Promise<void> {
  await capture(
    'cc_session_end',
    {
      session_id: input.session_id,
      duration_ms: input.duration_ms,
    },
    config
  )
}

async function handlePrompt(input: UserPromptSubmitInput, config: PluginConfig): Promise<void> {
  if (!config.tracking.prompts) return

  await capture(
    'cc_prompt',
    {
      session_id: input.session_id,
      prompt_length: input.prompt.length,
      intent_category: categorizeIntent(input.prompt),
      prompt_preview: truncateText(input.prompt, config.privacy.truncatePrompts),
    },
    config
  )
}

async function handleToolUse(
  input: ToolUseInput | PostToolUseInput,
  event: HookEvent,
  config: PluginConfig
): Promise<void> {
  if (!config.tracking.tools) return

  const toolName = input.tool_name
  const isMcp = toolName.startsWith('mcp__')

  if (isMcp && !config.tracking.mcp) return

  const isSkill = toolName === 'Skill'
  if (isSkill && !config.tracking.skills) return

  const category = categorizeToolName(toolName)
  const sanitizedInput = sanitizeToolInput(toolName, input.tool_input, config.privacy)

  const properties: Record<string, unknown> = {
    session_id: input.session_id,
    tool_name: toolName,
    tool_category: category,
    hook_event: event,
    ...sanitizedInput,
  }

  if (isMcp) {
    properties.mcp_server = extractMcpServer(toolName)
    properties.mcp_tool = extractMcpTool(toolName)
  }

  if ('duration_ms' in input && input.duration_ms !== undefined) {
    properties.duration_ms = input.duration_ms
  }

  if (event === 'PostToolUseFailure') {
    properties.success = false
  } else if (event === 'PostToolUse') {
    properties.success = true
  }

  const eventName = isMcp ? 'cc_mcp_call' : isSkill ? 'cc_skill_invoke' : 'cc_tool_use'
  await capture(eventName, properties, config)
}

async function handleSubagentStart(input: SubagentInput, config: PluginConfig): Promise<void> {
  if (!config.tracking.subagents) return

  await capture(
    'cc_subagent',
    {
      session_id: input.session_id,
      subagent_id: input.subagent_id,
      agent_type: input.subagent_type,
      phase: 'start',
    },
    config
  )
}

async function handleSubagentStop(input: SubagentStopInput, config: PluginConfig): Promise<void> {
  if (!config.tracking.subagents) return

  await capture(
    'cc_subagent',
    {
      session_id: input.session_id,
      subagent_id: input.subagent_id,
      agent_type: input.subagent_type,
      phase: 'stop',
      duration_ms: input.duration_ms,
      tool_count: input.tool_count,
    },
    config
  )
}

async function handleNotification(input: NotificationInput, config: PluginConfig): Promise<void> {
  await capture(
    'cc_notification',
    {
      session_id: input.session_id,
      level: input.level,
      message_length: input.message.length,
    },
    config
  )
}

async function handleStop(input: StopInput, config: PluginConfig): Promise<void> {
  await capture(
    'cc_stop',
    {
      session_id: input.session_id,
      reason: input.reason,
    },
    config
  )
}

async function handlePreCompact(input: PreCompactInput, config: PluginConfig): Promise<void> {
  await capture(
    'cc_compact',
    {
      session_id: input.session_id,
      has_summary: !!input.summary,
    },
    config
  )
}

async function handleHookExecution(
  event: HookEvent,
  startTime: number,
  config: PluginConfig
): Promise<void> {
  if (!config.tracking.hooks) return

  const duration = Date.now() - startTime
  await capture(
    'cc_hook_execute',
    {
      hook_event: event,
      hook_script: 'collector.ts',
      duration_ms: duration,
      blocked: false,
    },
    config
  )
}

async function main(): Promise<void> {
  const startTime = Date.now()
  const config = loadConfig()

  if (!config.enabled || !config.posthog.apiKey) {
    process.exit(0)
  }

  try {
    const stdin = await readStdin()
    if (!stdin.trim()) {
      process.exit(0)
    }

    const input = JSON.parse(stdin) as HookInput
    const event = getHookEvent()

    switch (event) {
      case 'SessionStart':
        await handleSessionStart(input as SessionStartInput, config)
        break
      case 'SessionEnd':
        await handleSessionEnd(input as SessionEndInput, config)
        break
      case 'UserPromptSubmit':
        await handlePrompt(input as UserPromptSubmitInput, config)
        break
      case 'PreToolUse':
      case 'PostToolUse':
      case 'PostToolUseFailure':
        await handleToolUse(input as ToolUseInput, event, config)
        break
      case 'SubagentStart':
        await handleSubagentStart(input as SubagentInput, config)
        break
      case 'SubagentStop':
        await handleSubagentStop(input as SubagentStopInput, config)
        break
      case 'Notification':
        await handleNotification(input as NotificationInput, config)
        break
      case 'Stop':
        await handleStop(input as StopInput, config)
        break
      case 'PreCompact':
        await handlePreCompact(input as PreCompactInput, config)
        break
      default:
        break
    }

    await handleHookExecution(event, startTime, config)
  } catch {
    // Silent failure - never block Claude
  }

  process.exit(0)
}

main()
