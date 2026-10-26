import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const app = readFileSync('src/App.tsx', 'utf8')
const pet = readFileSync('src/components/views/PetView.tsx', 'utf8')
const demo = readFileSync('src/features/demo/DemoExperience.tsx', 'utf8')

test('guest entry initializes a local feed and exits the loading state', () => {
  assert.match(app, /const enterDemo = \(\) => \{/)
  assert.match(app, /setPosts\(createDemoPosts\(\)\)/)
  assert.match(app, /setIsFeedLoading\(false\)/)
  assert.match(app, /setHasMoreFeed\(false\)/)
  assert.match(app, /onQuickDemo=\{enterDemo\}/)
  assert.match(app, /onClick=\{enterDemo\}/)
})

test('demo feed interactions bypass the authenticated write paths', () => {
  for (const [method, helper] of [
    ['handleLikePost', 'toggleDemoLike'],
    ['handleSavePost', 'toggleDemoSave'],
  ]) {
    const start = app.indexOf(`const ${method} = async`)
    const end = app.indexOf('if (!canUseAccount)', start)
    assert.ok(start >= 0 && end > start)
    assert.match(app.slice(start, end), new RegExp(`if \\(isDemoUser\\).*\\b${helper}\\(`, 's'))
  }
  assert.match(app, /if \(isDemoUser\) return posts\.some\(\(post\) => post\.id === postId\)/)
  assert.match(app, /appendDemoComment\(previous, postId/)
  assert.match(app, /if \(isDemoUser\) return\s+if \(\s*feedLoadMoreInFlightRef/)
  assert.match(app, /if \(isDemoUser\) \{\s+setProfilePosts\(createDemoPosts\(\)/)
})

test('guest screens only display samples and cannot expose real messaging', () => {
  assert.match(app, /isDemoUser \? \(\s*<DemoCommunities/)
  assert.match(app, /<DemoExplore lang=\{lang\}/)
  assert.match(app, /isDemo=\{false\}/)
  assert.match(demo, /Sample community/)
  assert.match(demo, /your changes are not saved/i)
})

test('guest exit avoids authenticated sign-out and offers a registration route', () => {
  const idx = pet.indexOf('const handleLogout = async () =>')
  const end = pet.indexOf('await supabase.auth.signOut()', idx)
  assert.ok(idx >= 0 && end > idx)
  assert.match(pet.slice(idx, end), /if \(isDemo\) \{ onExitDemo\?\.\(\); return \}/)
  assert.match(app, /onExitDemo=\{\(\) => leaveDemo\('welcome'\)\}/)
  assert.match(app, /leaveDemo\('signup'\)/)
  assert.match(app, /setInitialOnboardingStep\(destination === 'signup' \? 'A02' : 'A01'\)/)
})
