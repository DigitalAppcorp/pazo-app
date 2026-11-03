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
  assert.match(sql,/new\.name is not distinct from old\.name/)
  const translate=sql.match(/translate\(lower\(coalesce\(p_name,''\)\),'([^']+)','([^']+)'\)/)
  assert.equal([...translate[1]].length,[...translate[2]].length)
  assert.match(sql,/update public\.profiles set is_founder = true\s+where id in\(select g\.user_id from admin_private\.admin_grants g\)/)
})
