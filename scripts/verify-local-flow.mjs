import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const command = process.platform === 'win32' ? 'cmd.exe' : 'npx'
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'npx --no-install supabase status -o env']
  : ['--no-install', 'supabase', 'status', '-o', 'env']
const status = spawnSync(command, args, {
  encoding: 'utf8',
  shell: false,
})

const parseCliEnv = (value) => {
  const entries = new Map()
  for (const line of value.split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/)
    if (!match) continue
    let parsed = match[2].trim()
    if (parsed.startsWith('"') && parsed.endsWith('"')) parsed = JSON.parse(parsed)
    entries.set(match[1], parsed)
  }
  return entries
}

const local = parseCliEnv(status.stdout || '')
const apiUrl = local.get('API_URL')
const publishableKey = local.get('PUBLISHABLE_KEY') || local.get('ANON_KEY')
const serviceRoleKey = local.get('SERVICE_ROLE_KEY')

if (!apiUrl || !publishableKey || !serviceRoleKey) {
  throw new Error('Faltan credenciales del stack local en `supabase status -o env`.')
}

const parsedUrl = new URL(apiUrl)
if (!['127.0.0.1', 'localhost'].includes(parsedUrl.hostname) || parsedUrl.port !== '54321') {
  throw new Error('La prueba se negó a usar un Supabase que no sea local.')
}

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
}

const client = createClient(apiUrl, publishableKey, clientOptions)
const admin = createClient(apiUrl, serviceRoleKey, clientOptions)
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`
const email = `pazo-local-${suffix}@pazo.local`
const password = `PazoLocal${Date.now()}Aa1`
const avatarBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1ZkAAAAASUVORK5CYII=',
  'base64',
)

let userId = null
let petId = null
let avatarPath = null

const expectNoError = (label, error) => {
  if (error) throw new Error(`${label}: ${error.message}`)
}

try {
  const signup = await client.auth.signUp({ email, password })
  expectNoError('signup', signup.error)
  userId = signup.data.user?.id || null

  if (!signup.data.session) {
    const signin = await client.auth.signInWithPassword({ email, password })
    expectNoError('signin', signin.error)
  }

  if (!userId) throw new Error('signup no devolvió user id')

  const profile = await client.from('profiles').select('id').eq('id', userId).single()
  expectNoError('profile trigger', profile.error)

  avatarPath = `${userId}/${crypto.randomUUID()}.png`
  const upload = await client.storage.from('pet-avatars').upload(avatarPath, avatarBytes, {
    cacheControl: '60',
    contentType: 'image/png',
    upsert: false,
  })
  expectNoError('avatar upload', upload.error)

  const publicUrl = client.storage.from('pet-avatars').getPublicUrl(avatarPath).data.publicUrl
  const created = await client.rpc('create_pet_profile', {
    p_name: 'Mascota local de verificación',
    p_species: 'perro',
    p_age: '2 años',
    p_photo_url: publicUrl,
    p_zone: 'Entorno local',
    p_interests: ['Prueba local'],
    p_bio: null,
    p_breed: null,
    p_gender: null,
  })
  expectNoError('create_pet_profile', created.error)
  petId = created.data

  const pet = await client.from('pets').select('id,owner_id,name').eq('id', petId).single()
  expectNoError('pet read', pet.error)
  if (pet.data.owner_id !== userId) throw new Error('la mascota no pertenece al usuario de prueba')

  const privateDetails = await client
    .from('pet_private_details')
    .select('pet_id,zone')
    .eq('pet_id', petId)
    .single()
  expectNoError('private pet details', privateDetails.error)

  const feed = await client.from('posts').select('id').limit(1)
  expectNoError('feed query', feed.error)

  const remove = await client.storage.from('pet-avatars').remove([avatarPath])
  expectNoError('avatar cleanup policy', remove.error)
  avatarPath = null

  console.log('PAZO local flow PASS: signup → profile → avatar → pet → Feed query.')
} finally {
  if (avatarPath) await admin.storage.from('pet-avatars').remove([avatarPath])
  if (petId) {
    await admin.from('pet_private_details').delete().eq('pet_id', petId)
    await admin.from('pet_private_metrics').delete().eq('pet_id', petId)
    await admin.from('pets').delete().eq('id', petId)
  }
  if (userId) {
    await admin.from('profiles').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
  }
}
