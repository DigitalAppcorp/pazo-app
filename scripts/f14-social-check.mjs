import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const sql = readFileSync('supabase/migrations/20261008090000_f14_account_blocks_hidden_posts.sql','utf8')
for (const s of ['CREATE TABLE public.account_blocks','CREATE TABLE public.hidden_posts','f14_follows_guard','f14_interactions_guard','f14_comments_guard','f14_community_likes_guard','AS RESTRICTIVE','public.f14_can_interact(candidate_pet.owner_id)']) assert.ok(sql.includes(s),s)
for (const p of ['src/features/moderation/socialSafety.ts','src/features/moderation/useSocialSafety.ts','src/features/moderation/SafetySettings.tsx','supabase/tests/database/f14_social.test.sql']) assert.ok(readFileSync(p,'utf8').length>50,p)
console.log('F14 A1 static contract PASS (SQL/runtime NOT tested)')
