import './supporterExperience.css'
import './supporterArt.css'

export function GardenStory({className='',lang='es'}:{className?:string;lang?:'es'|'en'}){
 return <div className={'garden-story '+className} role="img" aria-label={lang==='es'?'Una persona riega un árbol acompañada por el corgi de PAZO':'A person waters a tree with PAZO’s corgi'}>
  <img className="garden-scene" src="/supporter/art/garden.png" alt="" width="1536" height="1024"/>
  <svg className="garden-water" viewBox="0 0 1536 1024" aria-hidden="true"><path d="M1101 669 Q1177 725 1218 895"/><path d="M1101 679 Q1153 754 1187 900"/><path d="M1107 688 Q1190 764 1246 898"/></svg>
  <span className="garden-leaf one" aria-hidden="true"/><span className="garden-leaf two" aria-hidden="true"/>
 </div>
}
export function GratitudeArt({compact=false,lang='es'}:{compact?:boolean;lang?:'es'|'en'}){
 return <div className={'gratitude-art'+(compact?' compact':'')} role="img" aria-label={lang==='es'?'Una persona y el corgi de PAZO comparten un momento bajo el árbol':'A person and PAZO’s corgi share a moment under a tree'}><img src="/supporter/art/gratitude.png" alt="" width="1536" height="1024"/><span className="garden-leaf one" aria-hidden="true"/></div>
}
export type BenefitKind='badge'|'themes'|'wall'|'milestones'
export function BenefitArt({kind}:{kind:BenefitKind}){return <span className={'benefit-art art-'+kind} aria-hidden="true"/>}
