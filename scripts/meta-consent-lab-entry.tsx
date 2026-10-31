// #169 ONLY served in synthetic CI preview. Not part of PAZO runtime.
import React,{useState} from 'react'
import {createRoot} from 'react-dom/client'
import '/src/index.css'
import {MetaConsentChoice,META_CHOICES_RELEASED} from '/src/features/marketing/MetaConsentChoice.tsx'
if(META_CHOICES_RELEASED!==false)throw Error('candidate_unexpectedly_released')
const p=new URLSearchParams(location.search)
const lang=p.get('lang')==='en'?'en':'es'
const scenario=p.get('case')||'default'
Object.defineProperty(navigator,'globalPrivacyControl',{
 configurable:true,get:()=>scenario==='gpc'||scenario==='gpc-error'
})
window.__metaLab={grantCalls:0,withdrawCalls:0,continued:0,privacy:0}
function Lab(){
 const [state,setState]=useState('ready')
 const withdraw=async()=>{
   window.__metaLab.withdrawCalls++
   if(scenario==='gpc-error'&&window.__metaLab.withdrawCalls===1)return false
   return true
 }
 const grant=async()=>{
   window.__metaLab.grantCalls++
   if(scenario==='grant-error')return false
   return true
 }
 return React.createElement('main',{className:'min-h-screen px-4 py-6',
   style:{maxWidth:'100%',margin:'0 auto'}},
   React.createElement(MetaConsentChoice,{
    lang,onGrant:grant,onWithdraw:withdraw,
    onContinue:()=>{window.__metaLab.continued++;setState('continued')},
    onPrivacy:()=>{window.__metaLab.privacy++;setState('privacy')},
   }),
   React.createElement('output',{'data-testid':'lab-result',hidden:true},state)
 )
}
createRoot(document.getElementById('qa-root')).render(React.createElement(Lab))
window.__metaLabReady=true
