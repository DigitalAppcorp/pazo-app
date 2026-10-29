import fs from 'node:fs'
// QA-only cache of the exact existing index.html font. No product font changes.
export async function visualFontCss(){
 const dir='artifacts/admin-visual/fonts',path=dir+'/quicksand.css'
 if(fs.existsSync(path))return fs.readFileSync(path,'utf8')
 const source=fs.readFileSync('index.html','utf8').match(/href="(https:\/\/fonts.googleapis.com\/css2[^" ]+)"/)[1].replaceAll('&amp;','&')
 const request=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(30000),headers:{'User-Agent':'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36'}});if(!r.ok)throw Error('Existing product font unavailable: '+r.status);return r}
 let css=await(await request(source)).text()
 for(const url of new Set(css.match(/https:\/\/fonts.gstatic.com\/[^)\s]+/g))){const data=Buffer.from(await(await request(url)).arrayBuffer());css=css.replaceAll(url,'data:font/woff2;base64,'+data.toString('base64'))}
 fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path,css)
 return css
}
