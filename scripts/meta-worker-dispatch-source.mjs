// The body argument of the worker call in the newest SQL that defines the tick,
// so tests exercise what production runs instead of a hand-written request.
import {readdirSync,readFileSync} from 'node:fs'
import {join} from 'node:path'

const DIR='supabase/migrations'
export function currentTickBodyArgument(dir=DIR){
 const definitions=readdirSync(dir).filter(name=>name.endsWith('.sql')).sort()
  .map(name=>readFileSync(join(dir,name),'utf8'))
  .filter(source=>/FUNCTION marketing_private\.meta_worker_tick\(\)/.test(source)
   &&source.includes('net.http_post('))
 const current=definitions.at(-1)
 if(!current)throw Error('meta_worker_tick_definition_missing')
 const match=/\bbody:=(.+?),timeout_milliseconds/.exec(current)
 if(!match)throw Error('meta_worker_tick_body_missing')
 return match[1]
}
