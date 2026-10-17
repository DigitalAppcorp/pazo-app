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
      className="relative isolate overflow-hidden rounded-[30px] bg-gradient-to-br from-[#FAF5EB] via-[#F4F5E9] to-[#E6EFDF] px-5 pb-5 pt-6">
      <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#DEE9D8]/70 blur-2xl"/>
      <span aria-hidden="true" className="pointer-events-none absolute right-9 top-5 h-8 w-8 rounded-full bg-[#E2E9BC]/60"/>
      <div className="relative">
        <p className="inline-block rounded-full bg-[#E6EEDB] px-3 py-2 text-[10px] font-extrabold uppercase tracking-widest text-[#204E4A]">
          {t('Amigo de PAZO','Friend of PAZO')}
        </p>
        <div className="mt-4 flex min-w-0 items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <h3 id="supporter-offer-title" className="text-[clamp(24px,6.7vw,30px)] font-black leading-[1.12] tracking-tight text-[#204E4A]">
              {t('Pequeñas acciones, grandes historias.','Small acts, big stories.')}
            </h3>
          </div>
          <img src="/supporter/amigo-pazo-inicio.png" alt="" aria-hidden="true"
            width="110" height="110"
            className="h-[106px] w-[106px] shrink-0 object-contain drop-shadow-[0_8px_8px_rgba(32,78,74,0.12)]"/>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-[#476862]">
          {t('Tu apoyo ayuda a que PAZO siga creciendo y conectando mascotas, personas y comunidades.',
            'Your support helps PAZO grow and connect pets, people and communities.')}
        </p>
        <div className="mt-4 inline-flex max-w-full items-baseline gap-1.5 rounded-full bg-[#F8F8E9] px-4 py-2.5 text-[#204E4A]">
          <strong className="text-[28px] font-black tracking-tight tabular-nums">US$2.99</strong>
          <span className="text-xs font-bold">{t('al mes','per month')}</span>
        </div>
      </div>
    </section>

    <section aria-labelledby="supporter-benefits-title" className="space-y-2.5">
      <h3 id="supporter-benefits-title" className="px-1 text-[17px] font-black text-[#204E4A]">
        {t('Lo que recibirás','What you get')}
      </h3>
      <ul className="grid min-w-0 grid-cols-1 gap-2">
        {benefits.map(benefit=><li key={benefit.kind}
          className="flex min-w-0 items-center gap-3 rounded-[22px] bg-white px-4 py-3 shadow-[0_4px_16px_rgba(32,78,74,0.04)]">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E9F0DF] text-[#204E4A]">
            <BenefitGlyph kind={benefit.kind}/>
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="break-words text-[13px] font-extrabold leading-snug text-[#204E4A]">{benefit.title}</h4>
            <p className="mt-1 break-words text-[11px] leading-relaxed text-[#5C7470]">{benefit.description}</p>
          </div>
        </li>)}
      </ul>
    </section>

    <section aria-label={t('Colaboración voluntaria','Voluntary support')} className="space-y-3">
      {children}
    </section>
  </>
}
