import { execFileSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The splash uses a quiet, numeric identifier derived from the Git revision.
// It is a QA/build identifier, not an official semantic release version.
const git = (args: string[]): string | null => {
  try {
    return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

const fromCI = process.env.VITE_APP_RELEASE?.trim()
const revision = fromCI && /^[a-f\d]{7,40}$/i.test(fromCI)
  ? fromCI
  : git(['rev-parse', 'HEAD'])

// The first 24 bits of the commit hash render as decimal digits only.
// Distinct builds can therefore be compared without exposing a Git SHA.
const numericBuild = revision && /^[a-f\d]{7,40}$/i.test(revision)
  ? String(parseInt(revision.slice(0, 6), 16)).padStart(8, '0')
  : null
const modified = Boolean(git(['status', '--porcelain', '--untracked-files=no']))
const version = numericBuild
  ? `0.1.${numericBuild}${modified ? '.1' : ''}`
  : '0.0.0'

export default defineConfig({
  plugins: [react()],
  define: {
    __PAZO_BUILD_VERSION__: JSON.stringify(version),
  },
})
