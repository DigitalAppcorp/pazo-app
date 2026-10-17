import type {ReactNode} from 'react'

type Props = {
  lang:'es'|'en'
  children: ReactNode
}

type BenefitKind = 'badge'|'themes'|'wall'|'milestone'

function BenefitGlyph({kind}:{kind:BenefitKind}) {
  const common = {
    width:25, height:25, viewBox:'0 0 24 24',
    fill:'none', stroke:'currentColor', strokeWidth:1.8,
    strokeLinecap:'round' as const, strokeLinejoin:'round' as const,
    'aria-hidden':true as const,
  }
  switch(kind) {
    case 'badge':
      return <svg {...common}><circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none"/><circle cx="17" cy="7" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="11" r="1.3" fill="currentColor" stroke="none"/><path d="M12 10c-2.5 0-3.4 3.1-5.1 4.6-1.1 1-1 4.2 1.5 4.5 1.2.2 2.5-.8 3.6-.8s2.4 1 3.6.8c2.5-.3 2.6-3.5 1.5-4.5C15.4 13.1 14.5 10 12 10Z" fill="currentColor" stroke="none"/></svg>
    case 'themes':
      return <svg {...common}><path d="M12 3a9 9 0 0 0 0 18h2a2 2 0 0 0 1-4 1 1 0 0 1 1-2h2a4 4 0 0 0 3-4c0-4.4-4-8-9-8Z"/><circle cx="7" cy="11" r="1" fill="currentColor"/><circle cx="11" cy="7" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/></svg>
    case 'wall':
      return <svg {...common}><path d="M12 20.5S3.5 15.5 3.5 9.8a4.6 4.6 0 0 1 8.5-2.4 4.6 4.6 0 0 1 8.5 2.4c0 5.7-8.5 10.7-8.5 10.7Z"/></svg>
    case 'milestone':
      return <svg {...common}><path d="m12 2.7 2.7 5.7 6.3.9-4.5 4.4 1.1 6.3-5.6-3-5.6 3 1.1-6.3L3 9.3l6.3-.9L12 2.7Z"/></svg>
  }
}

/**
 * PO-approved option B visual only. No client-side PayPal calls or entitlement
 * flags live here; children hosts the existing server-authoritative checkout.
 */
export function SupporterOfferB({lang,children}:Props) {
  const t=(es:string,en:string)=>lang==='es'?es:en
  const benefits:{kind:BenefitKind;title:string;description:string}[]=[
    {kind:'badge',title:t('Insignia especial','Special badge'),description:t('En perfil y publicaciones','On profiles and posts')},
    {kind:'themes',title:t('5 fondos especiales','5 special backgrounds'),description:t('Personaliza el perfil de tu mascota','Customize your pet profile')},
    {kind:'wall',title:t('Muro de agradecimiento','Thank-you wall'),description:t('Solo si tú autorizas a cada mascota','Only if you opt in each pet')},
    {kind:'milestone',title:t('Medallas por antigüedad','Support milestones'),description:t('Al completar 3, 6 y 12 meses pagados','After 3, 6 and 12 completed paid months')},
  ]
  return <>
    <section aria-labelledby="supporter-offer-title"
      className="relative isolate min-h-[211px] overflow-hidden rounded-[26px] bg-gradient-to-br from-[#FAF8F5] via-[#F7F7EF] to-[#EEF3E4] px-2 pb-3 pt-2">
      <span aria-hidden="true" className="pointer-events-none absolute -right-5 top-2 h-24 w-24 rounded-full bg-[#E1EBCF]/45 blur-xl"/>
      <span aria-hidden="true" className="pointer-events-none absolute right-12 top-2 h-8 w-4 -rotate-20 rounded-full bg-[#E2ECC7]/80"/>
      <span aria-hidden="true" className="pointer-events-none absolute right-3 top-6 h-9 w-5 rotate-25 rounded-full bg-[#D8E6D3]/65"/>
      <div className="relative">
        <h3 id="supporter-offer-title" className="relative z-10 max-w-[255px] text-[clamp(24px,6.8vw,28px)] font-black leading-[1.04] tracking-tight text-[#204E4A]">
          {lang==='es'
            ? <><span className="block">Pequeñas</span><span className="block">acciones, grandes</span><span className="block">historias.</span></>
            : <><span className="block">Small acts,</span><span className="block">big stories.</span></>}
        </h3>
        <img src="/supporter/amigo-pazo-inicio.png" alt="" aria-hidden="true"
          width="126" height="126"
          className="pointer-events-none absolute right-[-1px] top-[63px] z-0 h-[116px] w-[116px] object-contain drop-shadow-[0_5px_7px_rgba(32,78,74,0.12)]"/>
        <p className="relative z-10 mt-3 max-w-[215px] text-[11px] font-medium leading-[1.45] text-[#476862]">
          {t('Tu apoyo ayuda a que PAZO siga creciendo y conectando mascotas, personas y comunidades.',
            'Your support helps PAZO grow and connect pets, people and communities.')}
        </p>
        <div className="relative z-10 mt-3 inline-flex max-w-full items-baseline gap-1.5 rounded-full bg-[#F2F5DE] px-3 py-1.5 text-[#204E4A]">
          <strong className="text-[27px] font-black tracking-tight tabular-nums">US$2.99</strong>
          <span className="text-[11px] font-bold">{t('al mes','per month')}</span>
        </div>
      </div>
    </section>

    <section aria-labelledby="supporter-benefits-title" className="space-y-2">
      <h3 id="supporter-benefits-title" className="px-1 text-[15px] font-black text-[#204E4A]">
        {t('Lo que recibirás','What you get')}
      </h3>
      <ul className="grid min-w-0 grid-cols-1 gap-1.5">
        {benefits.map(benefit=><li key={benefit.kind}
          className="flex min-h-[49px] min-w-0 items-center gap-2.5 rounded-[18px] bg-white px-3 py-2 shadow-[0_3px_12px_rgba(32,78,74,0.035)]">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ECF1DD] text-[#204E4A]">
            <BenefitGlyph kind={benefit.kind}/>
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="break-words text-[12px] font-extrabold leading-tight text-[#204E4A]">{benefit.title}</h4>
            <p className="mt-0.5 break-words text-[10px] leading-snug text-[#5C7470]">{benefit.description}</p>
          </div>
          <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-[#8BA5A1]" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 5 7 7-7 7"/>
          </svg>
        </li>)}
      </ul>
    </section>

    <section aria-label={t('Colaboración voluntaria','Voluntary support')} className="space-y-2">
      {children}
    </section>
  </>
}
