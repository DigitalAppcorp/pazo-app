import {browserAnalyticsAllowed,subscribeAnalyticsPreference} from './analyticsPreference'
import { supabase } from '../../services/supabaseClient'
import {INTELLIGENCE_COLLECTION_ENABLED,intelligenceTasks,intelligenceKinds,type IntelligenceItem,type IntelligenceTask,type IntelligenceKind} from './intelligenceCatalog'

/** #150 released. #153 keeps its own independent collection gate. */
export const BEHAVIOR_COLLECTION_ENABLED = true
export const behaviorScreens = ['home','pet','qr','agenda','communities','places','explore','first_pet'] as const
export type BehaviorScreen = typeof behaviorScreens[number]
type Event = 'screen_view'|'loading'|'error'|'retry'
type Item = {seq:number;screen:BehaviorScreen;event:Event;category:'none'|'network'|'unavailable'}
type Identity = {owner:string;token:string}

/** Memory only. Each auth boundary retires requests even if the account ID returns. */
export function createBehaviorRecorder({send,sendTasks,taskEnabled=false,now=Date.now,random=()=>crypto.randomUUID(),enabled=false,canRecord=()=>true}:{
 send:(identity:Identity,session:string,item:Item,signal:AbortSignal)=>Promise<boolean>;
 sendTasks?:(identity:Identity,session:string,items:IntelligenceItem[],signal:AbortSignal)=>Promise<boolean>;taskEnabled?:boolean;
 now?:()=>number;random?:()=>string;enabled?:boolean;canRecord?:()=>boolean;
}) {
 let epoch=0,identity:Identity|null=null,session='',started=0,last=0,seq=0,busy=false,screen=''
 let queue:Item[]=[],controller=new AbortController()
 let tasks:IntelligenceItem[]=[],taskSeq=0,taskBusy=false,timer:ReturnType<typeof setTimeout>|undefined
 const seen=new Set<string>()
 let taskContext='',contextVersion=0
 const setContext=(value:string)=>{if(value!==taskContext){taskContext=value;contextVersion++}}
 const retire=()=>{epoch++;controller.abort();controller=new AbortController();queue=[];tasks=[];seen.clear();taskSeq=0;taskBusy=false;clearTimeout(timer);timer=undefined;busy=false;session='';screen='';seq=0}
 const bind=(next:Identity|null)=>{retire();identity=next}
 const refresh=(next:Identity)=>{if(identity?.owner===next.owner)identity=next}
 async function flush(){
  if(!canRecord()||!enabled||busy||!identity||!queue.length)return
  const generation=epoch,actor={...identity},sid=session,signal=controller.signal
  busy=true
  try {
   while(queue.length&&generation===epoch){
    const item=queue[0]
    // One timeout retry, identical sequence. No unbounded background upload.
    let accepted=false
    for(let attempt=0;attempt<2&&!accepted&&generation===epoch&&canRecord();attempt++){
     try{accepted=await send(actor,sid,item,signal)}catch{/* Optional telemetry */}
    }
    if(generation!==epoch)return
    if(!accepted){retire();return}
    queue.shift()
   }
  }finally{if(generation===epoch)busy=false}
 }
 function observe(next:BehaviorScreen,event:Event='screen_view',category:Item['category']='none',visible=true){
  if(!canRecord()||!enabled||!identity||!visible||!behaviorScreens.includes(next)||!['screen_view','loading','error','retry'].includes(event)||!['none','network','unavailable'].includes(category))return
  const at=now()
  if(!session||at-last>30*60_000||at-started>4*60*60_000){retire();session=random();started=at}
  if(event==='screen_view'&&screen===next)return
  if(seq>=110||queue.length>=8)return
  if(event==='screen_view')screen=next
  last=at;queue.push({seq:++seq,screen:next,event,category:event==='error'?category:'none'})
  void flush()
 }
 async function flushTasks(){
  timer=undefined
  if(!canRecord()||!taskEnabled||!sendTasks||taskBusy||!identity||!tasks.length)return
  const generation=epoch,actor={...identity},sid=session,signal=controller.signal
  taskBusy=true
  try{
   while(tasks.length&&generation===epoch){
    const batch=tasks.slice(0,8);let accepted=false
    for(let attempt=0;attempt<2&&!accepted&&generation===epoch&&canRecord();attempt++)try{accepted=await sendTasks(actor,sid,batch,signal)}catch{/* Optional; never delays product. */}
    if(generation!==epoch)return
    if(!accepted){tasks=[];taskSeq=64;return}
    tasks.splice(0,batch.length)
   }
  }finally{if(generation===epoch)taskBusy=false}
 }
 function task(key:IntelligenceTask,kind:IntelligenceKind='intent'){
  if(!canRecord()||!taskEnabled||!enabled||!identity||!Object.hasOwn(intelligenceTasks,key)||!intelligenceKinds.includes(kind))return
  const at=now()
  if(!session||at-last>30*60_000||at-started>4*60*60_000){retire();session=random();started=at}
  // Once per task/kind/session: repeats are not an unbounded click stream.
  const dedupe=`${key}:${kind}`
  if(seen.has(dedupe)||taskSeq>=64||tasks.length>=16)return
  seen.add(dedupe);last=at;tasks.push({seq:++taskSeq,task:key,kind})
  timer??=setTimeout(()=>void flushTasks(),250)
 }
 const captureTask=(key:IntelligenceTask)=>{
  task(key,'attempt')
  if(seen.has(`${key}:failure`))task(key,'retry')
  const generation=epoch,context=contextVersion
  return(kind:IntelligenceKind)=>{if(canRecord()&&generation===epoch&&context===contextVersion)task(key,kind)}
 }
 return {bind,refresh,observe,task,captureTask,setContext,retire,flush,flushTasks}
}
export const behaviorRecorder = createBehaviorRecorder({enabled:BEHAVIOR_COLLECTION_ENABLED,canRecord:browserAnalyticsAllowed,taskEnabled:INTELLIGENCE_COLLECTION_ENABLED,sendTasks:async(identity,session,items,signal)=>{
 if(!browserAnalyticsAllowed())return false
 const {data,error}=await supabase.rpc('pazo_intelligence_record_v1',{p_session:session,p_items:items})
  .setHeader('Authorization',`Bearer ${identity.token}`).abortSignal(AbortSignal.any([signal,AbortSignal.timeout(5000)]))
 return !error&&data===true
},send:async(identity,session,item,signal)=>{
 if(!browserAnalyticsAllowed())return false
 const {data,error}=await supabase.rpc('pazo_behavior_record_v1',{p_session:session,p_seq:item.seq,p_screen:item.screen,p_event:item.event,p_category:item.category})
  .setHeader('Authorization',`Bearer ${identity.token}`).abortSignal(AbortSignal.any([signal,AbortSignal.timeout(5000)]))
 return !error&&data===true
}})

// Retire queued/in-flight observations without deleting history or unbinding Auth.
subscribeAnalyticsPreference(()=>behaviorRecorder.retire())

export async function withdrawBehavior():Promise<boolean>{
 behaviorRecorder.bind(null)
 try{const {data,error}=await supabase.rpc('pazo_behavior_withdraw_v1');return !error&&data===true}catch{return false}
}
