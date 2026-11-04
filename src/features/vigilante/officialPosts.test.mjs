import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {mapOfficialPostRow,placeOfficialPosts} from './officialPosts.ts'

const sql=readFileSync(new URL('../../../supabase/migrations/20261103210000_pazo_official_author.sql',import.meta.url),'utf8')
const row=(id,priority,published_at,extra={})=>({id,title:'T',body:'B',source_name:'FDA',source_url:'https://fda.gov/x',source_published_at:'2026-11-03',priority,published_at,expires_at:null,likes:'2',liked:true,...extra})

test('official posts map strictly and drop anything unexpected',()=>{
  assert.deepEqual(mapOfficialPostRow(row('a','high','2026-11-03T10:00:00Z')),{id:'a',title:'T',body:'B',titleEn:null,bodyEn:null,sourceName:'FDA',sourceUrl:'https://fda.gov/x',sourcePublishedAt:'2026-11-03',priority:'high',publishedAt:'2026-11-03T10:00:00Z',expiresAt:null,likes:2,isLiked:true})
  assert.equal(mapOfficialPostRow(row('b','urgent','2026-11-03T10:00:00Z')),null)
  assert.equal(mapOfficialPostRow(row('c','low','2026-11-03T10:00:00Z',{source_url:'javascript:alert(1)'})),null)
})

test('high alerts sit above the feed; the rest follow the first two posts, newest first',()=>{
  const official=['high','low','medium'].map((p,i)=>mapOfficialPostRow(row('o'+i,p,`2026-11-0${i+1}T00:00:00Z`)))
  const layout=placeOfficialPosts(['p1','p2','p3'],official).map(e=>e.kind==='official'?e.post.id:e.post)
  assert.deepEqual(layout,['o0','p1','p2','o2','o1','p3'])
  assert.deepEqual(placeOfficialPosts([],official).map(e=>e.post.id),['o0','o2','o1'])
  assert.deepEqual(placeOfficialPosts(['p1'],[]).map(e=>e.post),['p1'])
})

test('PAZO is an author without an account and only the server can publish as it',()=>{
  assert.match(sql,/create table public\.official_posts/)
  assert.doesNotMatch(sql,/user_id uuid[^,]*\n[^)]*official_posts\(/)
  assert.match(sql,/revoke all on public\.official_posts from anon,authenticated;\ngrant select on public\.official_posts to anon,authenticated;/)
  assert.doesNotMatch(sql,/grant (insert|update|delete)[^;]*official_posts/i)
  assert.match(sql,/source_url ~ '\^https:\/\/'/)
  assert.match(sql,/v_species = any\(o\.audience_species\)/)
  assert.match(sql,/v_postal = any\(o\.audience_postal_codes\)/)
  assert.match(sql,/o\.expires_at is null or o\.expires_at > now\(\)/)
})

test('names that pass for PAZO are reserved for pets and usernames, only when the name changes',()=>{
  assert.match(sql,/create trigger pazo_reserved_pet_name before insert or update of name on public\.pets/)
  assert.match(sql,/create trigger pazo_reserved_username before insert or update of username on public\.profiles/)
  assert.match(sql,/v_value is not distinct from to_jsonb\(old\)->>v_column/)
  assert.doesNotMatch(sql,/new\.username/,'a pets trigger must never name a profiles column')
  const translate=sql.match(/translate\(lower\(coalesce\(p_name,''\)\),'([^']+)','([^']+)'\)/)
  assert.equal([...translate[1]].length,[...translate[2]].length)
  assert.match(sql,/update public\.profiles set is_founder = true\s+where id in\(select g\.user_id from admin_private\.admin_grants g\)/)
})

test('the official feed is asked only with a pet of the signed-in account, never the Demo pet',()=>{
  const app=readFileSync(new URL('../../App.tsx',import.meta.url),'utf8')
  assert.match(app,/const ownPetsReady = petBootstrap\?\.userId === user\?\.id && petBootstrap\?\.status === 'ready' && !isOnboardingActive/)
  assert.match(app,/const officialFeedPetId = !isDemoUser && canUseAccount && ownPetsReady && activeTab === 'inicio' \? currentPet\?\.id : undefined/)
})

test('every badge sits in the photo corner Amigo de PAZO uses, one per account', () => {
  const read = (path) => readFileSync(new URL('../../../' + path, import.meta.url), 'utf8')
  const card = read('src/features/vigilante/OfficialPostCard.tsx')
  const feed = read('src/components/views/HomeView.tsx')
  const profile = read('src/components/views/PublicProfileView.tsx')
  // Approved art, served like the supporter medals and hidden if it fails to load.
  assert.match(card, /src=\{'\/vigilante\/insignia-' \+ kind \+ '\.png'\}/)
  assert.match(card, /onError=\{\(\) => setFailed\(true\)\}/)
  for (const kind of ['fundador', 'oficial']) {
    const png = readFileSync(new URL('../../../public/vigilante/insignia-' + kind + '.png', import.meta.url))
    assert.equal(png.subarray(1, 4).toString(), 'PNG')
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [543, 545], kind + ' matches the supporter medal canvas')
    assert.equal(png[25], 6, kind + ' keeps its transparent background')
  }
  // Never beside a name, and the old pill is gone.
  assert.doesNotMatch(feed, /ml-1\.5 align-middle"><FounderBadge/)
  assert.doesNotMatch(feed, /\{!post\.isAuthorDeleted && founderPetIds\?\.has\(post\.petId\) && <FounderBadge/)
  assert.doesNotMatch(card, /PAZO<\/span>\s*<OfficialBadge/)
  assert.doesNotMatch(profile, /h-\[46px\] items-center gap-1 rounded-full bg-\[#E1E53F\]/)
  // The corner shows Fundador instead of Amigo de PAZO, never both.
  assert.match(feed, /founderPetIds\?\.has\(post\.petId\) \? \(\s*<span className="pointer-events-none absolute -bottom-1 -right-1 z-10 block h-\[20px\] w-\[20px\]">\s*<FounderBadge lang=\{lang\} \/>\s*<\/span>\s*\) : supporterBadgesEnabled && supporterBadge\?\.badge/)
  assert.equal((feed.match(/<FounderBadge lang=\{lang\} ?\/>/g) ?? []).length, 3, 'post header and both comment lists')
  assert.match(card, /absolute -bottom-1 -right-1 z-10 block h-\[20px\] w-\[20px\]">\s*<OfficialBadge lang=\{lang\} \/>/)
  assert.match(profile, /\{isFounder \? \(\s*<span className="absolute -bottom-3 -left-2 z-20">\s*<FounderBadge lang=\{lang\} size="large" \/>\s*<\/span>\s*\) : supporterVisualsEnabled && supporterPerks\?\.badge/)
})
