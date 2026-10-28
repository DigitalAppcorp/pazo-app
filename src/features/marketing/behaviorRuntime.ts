import { supabase } from '../../services/supabaseClient'

/** #150 candidate. Enable only in a separately authorized release after notice/retention. */
export const BEHAVIOR_COLLECTION_ENABLED = false
export const behaviorScreens = ['home','pet','qr','agenda','communities','places','explore','first_pet'] as const
export type BehaviorScreen = typeof behaviorScreens[number]
type Event = 'screen_view'|'loading'|'error'|'retry'
type Item = {seq:number;screen:BehaviorScreen;event:Event;category:'none'|'network'|'unavailable'}
type Identity = {owner:string;token:string}

/** Memory only. Each auth boundary retires requests even if the account ID returns. */
export function createBehaviorRecorder({send,now=Date.now,random=()=>crypto.randomUUID(),enabled=false}:{
 send:(identity:Identity,session:string,item:Item,signal:AbortSignal)=>Promise<boolean>;
 now?:()=>number;random?:()=>string;enabled?:boolean;
}) {
 let epoch=0,identity:Identity|null=null,session='',started=0,last=0,seq=0,busy=false,screen=''
 let queue:Item[]=[],controller=new AbortController()
 const retire=()=>{epoch++;controller.abort();controller=new AbortController();queue=[];busy=false;session='';screen='';seq=0}
 const bind=(next:Identity|null)=>{retire();identity=next}
 const refresh=(next:Identity)=>{if(identity?.owner===next.owner)identity=next}
 async function flush(){
  if(!enabled||busy||!identity||!queue.length)return
  const generation=epoch,actor={...identity},sid=session,signal=controller.signal
  busy=true
  try {
   while(queue.length&&generation===epoch){
    const item=queue[0]
    // One timeout retry, identical sequence. No unbounded background upload.
    let accepted=false
    for(let attempt=0;attempt<2&&!accepted&&generation===epoch;attempt++){
     try{accepted=await send(actor,sid,item,signal)}catch{/* Optional telemetry */}
    }
    if(generation!==epoch)return
    if(!accepted){retire();return}
    queue.shift()
   }
  }finally{if(generation===epoch)busy=false}
 }
 function observe(next:BehaviorScreen,event:Event='screen_view',category:Item['category']='none',visible=true){
  if(!enabled||!identity||!visible||!behaviorScreens.includes(next)||!['screen_view','loading','error','retry'].includes(event)||!['none','network','unavailable'].includes(category))return
  const at=now()
  if(!session||at-last>30*60_000||at-started>4*60*60_000){retire();session=random();started=at}
  if(event==='screen_view'&&screen===next)return
  if(seq>=110||queue.length>=8)return
  if(event==='screen_view')screen=next
  last=at;queue.push({seq:++seq,screen:next,event,category:event==='error'?category:'none'})
  void flush()
 }
 return {bind,refresh,observe,retire,flush}
}
export const behaviorRecorder = createBehaviorRecorder({enabled:BEHAVIOR_COLLECTION_ENABLED,send:async(identity,session,item,signal)=>{
 const {data,error}=await supabase.rpc('pazo_behavior_record_v1',{p_session:session,p_seq:item.seq,p_screen:item.screen,p_event:item.event,p_category:item.category})
  .setHeader('Authorization',`Bearer ${identity.token}`).abortSignal(AbortSignal.any([signal,AbortSignal.timeout(5000)]))
 return !error&&data===true
}})

export async function withdrawBehavior():Promise<boolean>{
 behaviorRecorder.bind(null)
 try{const {data,error}=await supabase.rpc('pazo_behavior_withdraw_v1');return !error&&data===true}catch{return false}
}
