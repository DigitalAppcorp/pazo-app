import fs from 'node:fs/promises'
import path from 'node:path'
const from=process.argv[2],to=process.argv[3]
const get=async n=>JSON.parse((await fs.readFile(path.join(from,n),'utf8')).replace(/^\uFEFF/,''))
const extra=await get('source-extra.private.json'),inv=await get('data-inventory.json')
await fs.mkdir(to)
let generatedColumns=0
for(const entry of inv){
 const columns=extra.columns.filter(x=>x.nspname===entry.schema&&x.relname===entry.table).sort((a,b)=>a.ordinal-b.ordinal)
 const suppliedColumns=entry.columns
 entry.columns=columns.filter(x=>!x.attgenerated).map(x=>x.attname)
 if(suppliedColumns&&JSON.stringify(suppliedColumns)!==JSON.stringify(entry.columns))throw Error('Explicit column inventory drift')
 if(entry.excluded)continue
 const bytes=await fs.readFile(path.join(from,entry.file))
 const skip=new Set(suppliedColumns?[]:columns.map((x,i)=>x.attgenerated?i:-1).filter(i=>i>=0))
 let result=bytes
 if(skip.size){
  generatedColumns+=skip.size
  if(bytes.subarray(0,11).toString('hex')!=='5047434f50590aff0d0a00'||bytes.readInt32BE(11)!==0)throw Error('Unexpected COPY header')
  let pos=19+bytes.readInt32BE(15)
  const parts=[bytes.subarray(0,pos)]
  for(;;){
   const count=bytes.readInt16BE(pos);pos+=2
   if(count===-1){parts.push(bytes.subarray(pos-2,pos));break}
   if(count!==columns.length)throw Error('COPY column drift')
   const countBytes=Buffer.alloc(2);countBytes.writeInt16BE(count-skip.size);parts.push(countBytes)
   for(let i=0;i<count;i++){
    const start=pos,len=bytes.readInt32BE(pos);pos+=4
    if(len < -1)throw Error('COPY length invalid')
    if(len>=0)pos+=len
    if(pos>bytes.length)throw Error('COPY truncated')
    if(!skip.has(i))parts.push(bytes.subarray(start,pos))
   }
  }
  if(pos!==bytes.length)throw Error('COPY trailing bytes')
  result=Buffer.concat(parts)
 }
 await fs.writeFile(path.join(to,entry.file),result,{flag:'wx'})
}
for(const n of ['source-catalog.private.json','source-extra.private.json'])await fs.copyFile(path.join(from,n),path.join(to,n),fs.constants.COPYFILE_EXCL)
await fs.writeFile(path.join(to,'data-inventory.json'),JSON.stringify(inv,null,2)+'\n',{flag:'wx'})
console.log(JSON.stringify({copyTables:inv.length,generatedColumnsOmittedFromInput:generatedColumns,originalsPreserved:true}))
