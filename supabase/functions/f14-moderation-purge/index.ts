// F14 A2: safe parked endpoint. No Storage mutations or elevated credentials.
Deno.serve((_req: Request) => new Response(
  JSON.stringify({ message: 'Media cleanup disabled pending security verification' }),
  { status: 503, headers: { 'Content-Type': 'application/json' } }
))
