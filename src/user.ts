import { execSync } from 'node:child_process'
import { homedir } from 'node:os'

interface UserInfo {
  email: string
  name: string
  source: 'config' | 'github' | 'git' | 'machine'
}

/**
 * Try to get user info from GitHub CLI
 */
function getGitHubUser(): { email: string; name: string } | null {
  try {
    const result = execSync('gh api user --jq "[.email, .name, .login] | @tsv"', {
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()

    const [email, name, login] = result.split('\t')

    // GitHub API sometimes returns null for email if it's private
    // Use login@users.noreply.github.com as fallback
    const resolvedEmail = email && email !== 'null' ? email : `${login}@users.noreply.github.com`
    const resolvedName = name && name !== 'null' ? name : login || ''

    if (resolvedEmail) {
      return { email: resolvedEmail, name: resolvedName }
    }
  } catch {
    // gh not installed or not logged in
  }
  return null
}

/**
 * Try to get user info from git config
 */
function getGitUser(): { email: string; name: string } | null {
  try {
    const email = execSync('git config user.email', {
      encoding: 'utf8',
      timeout: 1000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()

    const name = execSync('git config user.name', {
      encoding: 'utf8',
      timeout: 1000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()

    if (email) {
      return { email, name: name || '' }
    }
  } catch {
    // git not configured
  }
  return null
}

/**
 * Generate a stable machine identifier
 */
function getMachineId(): string {
  const hasher = new Bun.CryptoHasher('sha256')
  hasher.update(homedir())
  hasher.update(process.env.USER || process.env.USERNAME || 'unknown')
  return `machine-${hasher.digest('hex').slice(0, 12)}`
}

/**
 * Auto-detect user info with fallback chain:
 * 1. Config (if provided)
 * 2. GitHub CLI
 * 3. Git config
 * 4. Machine ID
 */
export function detectUser(configUser?: {
  email?: string
  name?: string
  team?: string
}): UserInfo {
  // If config has email, use it
  if (configUser?.email) {
    return {
      email: configUser.email,
      name: configUser.name || '',
      source: 'config',
    }
  }

  // Try GitHub CLI
  const ghUser = getGitHubUser()
  if (ghUser) {
    return {
      ...ghUser,
      source: 'github',
    }
  }

  // Try git config
  const gitUser = getGitUser()
  if (gitUser) {
    return {
      ...gitUser,
      source: 'git',
    }
  }

  // Fallback to machine ID
  return {
    email: getMachineId(),
    name: '',
    source: 'machine',
  }
}
