import { spawnSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const localWorkdir = process.env.PAZO_LOCAL_SUPABASE_WORKDIR || '.local-supabase'
const expectedPort = process.env.PAZO_LOCAL_SUPABASE_PORT || '54321'
const cliArgs = [
  '--no-install',
  'supabase',
  '--workdir',
  localWorkdir,
  'status',
  '-o',
  'env',
]
const command = process.platform === 'win32' ? 'cmd.exe' : 'npx'
if (process.platform === 'win32' && /[\s"&|<>^%]/u.test(localWorkdir)) {
  throw new Error('El workdir local contiene caracteres no compatibles con cmd.exe.')
}
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', `npx ${cliArgs.join(' ')}`]
  : cliArgs
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
if (!['127.0.0.1', 'localhost'].includes(parsedUrl.hostname) || parsedUrl.port !== expectedPort) {
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
let communityId = null
let documentId = null
const uploadedObjects = []

const expectNoError = (label, error) => {
  if (error) throw new Error(`${label}: ${error.message}`)
}

const uploadObject = async (bucket, path, bytes = avatarBytes) => {
  const result = await client.storage.from(bucket).upload(path, bytes, {
    cacheControl: '60',
    contentType: 'image/png',
    upsert: false,
  })
  expectNoError(`${bucket} upload`, result.error)
  uploadedObjects.push({ bucket, path })
}

const removeObject = async (bucket, path) => {
  const result = await client.storage.from(bucket).remove([path])
  expectNoError(`${bucket} delete`, result.error)
  const index = uploadedObjects.findIndex(
    (entry) => entry.bucket === bucket && entry.path === path,
  )
  if (index >= 0) uploadedObjects.splice(index, 1)
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

  const rejectedPath = `${crypto.randomUUID()}/${crypto.randomUUID()}.png`
  const rejectedUpload = await client.storage
    .from('pet-avatars')
    .upload(rejectedPath, avatarBytes, {
      cacheControl: '60',
      contentType: 'image/png',
      upsert: false,
    })
  if (!rejectedUpload.error) {
    uploadedObjects.push({ bucket: 'pet-avatars', path: rejectedPath })
    throw new Error('pet-avatars accepted an object outside the authenticated owner prefix')
  }

  const avatarPath = `${userId}/${crypto.randomUUID()}.png`
  await uploadObject('pet-avatars', avatarPath)

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

  const recommendedFeed = await client.rpc('get_recommended_posts_page', {
    p_actor_pet_id: petId,
    p_limit: 10,
    p_offset: 0,
  })
  expectNoError('recommended Feed RPC', recommendedFeed.error)

  for (const { table, columns = '*' } of [
    { table: 'communities' },
    { table: 'community_memberships' },
    { table: 'community_posts' },
    { table: 'care_items' },
    { table: 'care_completions' },
    { table: 'pet_documents' },
    { table: 'pet_places' },
    {
      table: 'pet_place_checkins',
      columns: 'id,place_id,pet_id,visible,checked_in_at,expires_at,ended_at',
    },
    {
      table: 'pet_place_presence',
      columns: 'place_id,visible_pet_id,expires_at',
    },
    { table: 'pet_public_links' },
    { table: 'lost_pet_alerts' },
    { table: 'pet_sightings' },
    { table: 'notifications' },
  ]) {
    const smoke = await client.from(table).select(columns).limit(1)
    expectNoError(`${table} read`, smoke.error)
  }

  const postPhotoPath = `${userId}/${petId}/${crypto.randomUUID()}.png`
  await uploadObject('post-photos', postPhotoPath)
  await removeObject('post-photos', postPhotoPath)

  const community = await client.rpc('create_community', {
    p_name: `Comunidad local ${suffix}`,
    p_description: 'Contrato local desechable',
    p_category: 'general',
    p_species: null,
    p_zone: null,
    p_rules: null,
    p_display_pet_id: petId,
  })
  expectNoError('create_community', community.error)
  communityId = community.data
  if (!communityId) throw new Error('create_community no devolvió id')

  const communityAvatarPath = `${communityId}/${userId}/${crypto.randomUUID()}.png`
  await uploadObject('community-avatars', communityAvatarPath)
  await removeObject('community-avatars', communityAvatarPath)

  const communityPostPath = `${communityId}/${userId}/${crypto.randomUUID()}.png`
  await uploadObject('community-post-photos', communityPostPath)
  await removeObject('community-post-photos', communityPostPath)

  const reservation = await client.rpc('begin_pet_document_upload', {
    p_pet_id: petId,
    p_title: 'Documento local de verificación',
    p_category: 'other',
    p_original_file_name: 'local-contract.png',
    p_mime_type: 'image/png',
    p_size_bytes: avatarBytes.length,
  })
  expectNoError('begin_pet_document_upload', reservation.error)
  const reservedDocument = Array.isArray(reservation.data)
    ? reservation.data[0]
    : reservation.data
  documentId = reservedDocument?.id || null
  const documentPath = reservedDocument?.storage_path || null
  if (!documentId || !documentPath) throw new Error('document reservation did not return id/path')

  await uploadObject('pet-documents', documentPath)
  const finalizeUpload = await client.rpc('finalize_pet_document_upload', {
    p_document_id: documentId,
  })
  expectNoError('finalize_pet_document_upload', finalizeUpload.error)

  const download = await client.storage.from('pet-documents').download(documentPath)
  expectNoError('pet-documents download', download.error)

  const beginDelete = await client.rpc('begin_delete_pet_document', {
    p_document_id: documentId,
  })
  expectNoError('begin_delete_pet_document', beginDelete.error)
  if (beginDelete.data !== documentPath) throw new Error('document delete returned an unexpected path')

  await removeObject('pet-documents', documentPath)
  const finalizeDelete = await client.rpc('try_finalize_delete_pet_document', {
    p_document_id: documentId,
  })
  expectNoError('try_finalize_delete_pet_document', finalizeDelete.error)
  if (finalizeDelete.data !== true) throw new Error('document delete did not finalize')
  documentId = null

  await removeObject('pet-avatars', avatarPath)

  console.log(
    'PAZO local flow PASS: signup → pet → Feed/RPC → module reads → all Storage buckets.',
  )
} finally {
  for (const { bucket, path } of uploadedObjects) {
    await admin.storage.from(bucket).remove([path])
  }
  if (documentId) await admin.from('pet_documents').delete().eq('id', documentId)
  if (communityId) {
    await admin.from('community_memberships').delete().eq('community_id', communityId)
    await admin.from('communities').delete().eq('id', communityId)
  }
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
