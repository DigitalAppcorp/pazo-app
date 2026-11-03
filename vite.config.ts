import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// The splash uses a quiet, numeric identifier derived from the Git revision.
// It is a QA/build identifier, not an official semantic release version.
const git = (args: string[]): string | null => {
  try {
    return execFileSync('git', args, { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

// Vercel builds have no .git folder; it passes the deployed commit instead.
const fromCI = (process.env.VITE_APP_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA)?.trim()
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

// An open app compares its own stamp with /version.json to notice a newer release.
// Builds without a clean Git revision still get a stamp of their own.
const buildId = numericBuild && revision
  ? revision.slice(0, 12).toLowerCase() + (modified ? '-' + Date.now().toString(36) : '')
  : 'b' + Date.now().toString(36)

const releaseStamp = (): Plugin => ({
  name: 'pazo-release-stamp',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ build: buildId }) })
  },
})

export default defineConfig({
  plugins: [react(), releaseStamp()],
  build: {rollupOptions: {input: {app:resolve('index.html'),maintenance:resolve('maintenance-admin.html')}}},
  define: {
    __PAZO_BUILD_VERSION__: JSON.stringify(version),
    __PAZO_BUILD_ID__: JSON.stringify(buildId),
  },
})
