// Tiny marketing requests only. Bounds slow streams as well as byte size;
// never logs or retains body bytes. Shared by both marketing intake handlers.
export async function readMarketingBody(request,maxBytes,timeoutMs=3000){
 const length=request.headers.get('content-length')
 if(length!==null&&(!/^\d+$/.test(length)||Number(length)>maxBytes))throw {status:413}
 if(!request.body)throw {status:400}
 const reader=request.body.getReader();let timer
 const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{void reader.cancel().catch(()=>{});reject({status:408})},timeoutMs)})
 try{return await Promise.race([deadline,(async()=>{
  let total=0,raw='';const decoder=new TextDecoder('utf-8',{fatal:true})
  for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength
   if(total>maxBytes){void reader.cancel().catch(()=>{});throw {status:413}}
   raw+=decoder.decode(value,{stream:true})
  }
  return raw+decoder.decode()
 })()])}finally{clearTimeout(timer)}
}
