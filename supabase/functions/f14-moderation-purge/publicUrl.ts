// Access denied (401/403), redirects, network errors and server failures do not
// prove that cached public media has disappeared. Storage.info is checked
// independently by core.ts; this verifies the original and cache-busted URL.
export async function publicUrlInaccessible(url:string, fetcher:typeof fetch=fetch):Promise<boolean> {
 const fresh=new URL(url)
 fresh.searchParams.set('pazo_verify',crypto.randomUUID())
 for(const candidate of [url,fresh.toString()]){
  const response=await fetcher(candidate,{method:'HEAD',cache:'no-store',redirect:'error',
    headers:{'Cache-Control':'no-cache'}})
  await response.body?.cancel()
  if(![404,410].includes(response.status)) return false
  // A gateway may reject HEAD while GET still serves bytes.
  const download=await fetcher(candidate,{method:'GET',cache:'no-store',redirect:'error',
    headers:{'Cache-Control':'no-cache','Range':'bytes=0-0'}})
  const unavailable=[404,410].includes(download.status)
  await download.body?.cancel()
  if(!unavailable) return false
 }
 return true
}
