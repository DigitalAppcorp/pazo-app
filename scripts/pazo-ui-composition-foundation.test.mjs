import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFileSync(join(root, path), 'utf8')

const css = read('src/index.css')
const welcome = read('src/components/views/OnboardingView.tsx')
const feed = read('src/components/views/HomeView.tsx')
const invitation = read('src/features/supporter/components/SupporterInvitationPrompt.css')

const rgb = (hex) => [1, 3, 5].map((pos) => parseInt(hex.slice(pos, pos + 2), 16) / 255)
const luminance = (hex) => {
  const [r, g, b] = rgb(hex).map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (first, second) => {
  const [a, b] = [luminance(first), luminance(second)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

test('no universal !important spacing overrides headings, paragraphs or labels', () => {
  assert.doesNotMatch(css, /h1\s*,\s*h2\s*,\s*h3\s*,\s*h4\s*,\s*h5\s*,\s*h6\s*,\s*p\s*,\s*label\s*\{[^}]*margin\s*:/s)
  assert.doesNotMatch(css, /margin\s*:\s*2px\s*!important/)
})

test('welcome typography contrasts against all declared olive gradient stops', () => {
  const gradient = welcome.match(/bg-\[linear-gradient\(145deg,#([\dA-Fa-f]{6})_0%,#([\dA-Fa-f]{6})_58%,#([\dA-Fa-f]{6})_100%\)\]/)
  assert.ok(gradient, 'welcome olive gradient stops should be inspectable')
  const title = welcome.match(/<h1 id="pazo-welcome-title"[\s\S]*?className="([^"]+)"/)?.[1]
  const description = welcome.match(/<p className="mt-2 max-w-\[285px\]([^"]+)"/)?.[1]
  assert.ok(title && description, 'welcome title/description must be present')
  const titleColor = title.match(/text-\[(#[\dA-Fa-f]{6})\]/)?.[1]
  const descriptionColor = description.match(/text-\[(#[\dA-Fa-f]{6})\]/)?.[1]
  assert.ok(titleColor && descriptionColor, 'explicit current text colors needed for baseline contrast gate')
  for (const hex of gradient.slice(1)) {
    const background = '#' + hex
    assert.ok(contrast(titleColor, background) >= 3, 'title contrast should meet WCAG 1.4.3 large text AA on ' + background)
    assert.ok(contrast(descriptionColor, background) >= 4.5, 'body contrast should meet WCAG 1.4.3 normal text AA on ' + background)
  }
})

test('feed filter text is not below the intended compact type minimum', () => {
  const following = feed.match(/flex-\[1_1_40%\][^\n]*?text-\[([\d.]+)px\]/)?.[1]
  const nearby = feed.match(/flex-\[1_1_60%\][^\n]*?text-\[([\d.]+)px\]/)?.[1]
  assert.ok(following && nearby, 'both feed filters should be inspectable')
  assert.ok(Number(following) >= 11)
  assert.ok(Number(nearby) >= 11)
})

test('invitation typography retains meaningful layout and legible secondary copy', () => {
  assert.match(invitation, /\.supporter-growth h2\s*\{[^}]*line-height:\s*1\.13/s)
  assert.match(invitation, /\.supporter-growth-optout\s*\{[^}]*font-size:\s*12px/s)
  assert.match(invitation, /\.supporter-growth-eyebrow\s*\{[^}]*font-size:\s*11px/s)
  assert.match(invitation, /\.supporter-growth-primary\s*\{[^}]*min-height:\s*54px/s)
})
