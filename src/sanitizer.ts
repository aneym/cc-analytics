import type { IntentCategory, PluginConfig, ToolCategory } from './types.ts'

/**
 * Hash a file path to preserve privacy while maintaining uniqueness
 */
export function hashFilePath(filePath: string): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(filePath)
  return hasher.digest('hex').substring(0, 16)
}

/**
 * Extract file extension from a path
 */
export function extractExtension(filePath: string): string | null {
  const match = filePath.match(/\.[^./\\]+$/)
  return match ? match[0] : null
}

/**
 * Sanitize a bash command - keep only the command name
 */
export function sanitizeCommand(command: string): string {
  const trimmed = command.trim()
  const firstWord = trimmed.split(/\s+/)[0] ?? ''
  return firstWord.split('/').pop() ?? firstWord
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return `${text.substring(0, maxLength)}...`
}

/**
 * Categorize a tool into a high-level category
 */
export function categorizeToolName(toolName: string): ToolCategory {
  if (toolName.startsWith('mcp__')) {
    return 'mcp'
  }

  const categories: Record<ToolCategory, string[]> = {
    file_ops: ['Read', 'Write', 'Edit', 'Glob', 'Grep'],
    execution: ['Bash', 'Task', 'TaskOutput', 'TaskStop'],
    navigation: ['WebFetch', 'WebSearch'],
    workflow: ['Skill', 'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode'],
    tasks: ['TaskCreate', 'TaskGet', 'TaskUpdate', 'TaskList'],
    notebook: ['NotebookEdit'],
    mcp: [],
    other: [],
    unknown: [],
  }

  for (const [category, tools] of Object.entries(categories)) {
    if (tools.includes(toolName)) {
      return category as ToolCategory
    }
  }

  return 'other'
}

/**
 * Extract MCP server name from tool name
 */
export function extractMcpServer(toolName: string): string | null {
  if (!toolName.startsWith('mcp__')) return null
  const parts = toolName.split('__')
  return parts[1] ?? null
}

/**
 * Extract MCP tool name from full tool name
 */
export function extractMcpTool(toolName: string): string | null {
  if (!toolName.startsWith('mcp__')) return null
  const parts = toolName.split('__')
  return parts[2] ?? null
}

/**
 * Categorize user intent from a prompt
 */
export function categorizeIntent(prompt: string): IntentCategory {
  const lower = prompt.toLowerCase()

  if (/\b(fix|bug|error|issue|broken)\b/.test(lower)) return 'debugging'
  if (/\b(add|create|implement|build|make)\b/.test(lower)) return 'feature'
  if (/\b(refactor|clean|simplify|improve)\b/.test(lower)) return 'refactoring'
  if (/\b(test|spec|coverage)\b/.test(lower)) return 'testing'
  if (/\b(explain|what|how|why|where)\b/.test(lower)) return 'exploration'
  if (/\b(commit|push|pr|merge)\b/.test(lower)) return 'git'
  if (/\b(deploy|release|publish)\b/.test(lower)) return 'deployment'
  if (/^\/\w+/.test(prompt)) return 'skill_invocation'

  return 'general'
}

/**
 * Sanitize tool input based on tool type and privacy settings
 */
export function sanitizeToolInput(
  _toolName: string,
  toolInput: Record<string, unknown>,
  privacy: PluginConfig['privacy']
): Record<string, unknown> {
  const props: Record<string, unknown> = {}

  // File paths
  const filePath = toolInput.file_path as string | undefined
  if (filePath) {
    props.file_ext = extractExtension(filePath)
    props.file_path_hash = privacy.hashFilePaths ? hashFilePath(filePath) : filePath
  }

  const path = toolInput.path as string | undefined
  if (path) {
    props.path_ext = extractExtension(path)
    props.path_hash = privacy.hashFilePaths ? hashFilePath(path) : path
  }

  // Bash commands
  const command = toolInput.command as string | undefined
  if (command) {
    props.command_name = privacy.sanitizeCommands ? sanitizeCommand(command) : command
    props.command_length = command.length
  }

  // Patterns (safe to include)
  if (toolInput.pattern) props.pattern = toolInput.pattern
  if (toolInput.glob) props.glob = toolInput.glob

  // Skill info
  if (toolInput.skill) props.skill_name = toolInput.skill
  if (toolInput.args) props.has_args = true

  // Task agent info
  if (toolInput.subagent_type) props.agent_type = toolInput.subagent_type
  const description = toolInput.description as string | undefined
  if (description) {
    props.task_description = truncateText(description, 50)
  }

  return props
}
