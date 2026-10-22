// Exact previously approved Live-only public function, without its old one-time
// no-sales guard: synthetic lab has existing synthetic paid rows. No hosted SQL.
import {readFileSync,writeFileSync} from 'node:fs'
const path='supabase/migrations/20261022052854_pazo_f16_public_benefits_live_only.sql'
const source=readFileSync(path,'utf8')
const start=source.indexOf('CREATE OR REPLACE FUNCTION public.pazo_supporter_public_pet_benefits')
const end=source.indexOf('$pet$;',start)
if(start<0||end<start)throw Error('Approved public baseline source drift')
writeFileSync('supabase/tests/supporter/fixtures/f17-public-baseline.generated.sql',
 '//SYNTHETIC_FIXTURE_ONLY\n'.replace('//','-- ')+source.slice(start,end+6)+'\n')
console.log('F17_EXACT_PUBLIC_BASELINE_STAGED_SYNTHETIC_ONLY')
