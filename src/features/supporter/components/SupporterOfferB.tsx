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
      className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FAF8F5] via-[#F7F7EF] to-[#EEF3E4] px-5 pb-5 pt-5">
      <span aria-hidden="true" className="pointer-events-none absolute -right-4 -top-6 h-28 w-28 rounded-full bg-[#E1EBCF]/50 blur-2xl"/>
      <div className="relative z-10 flex items-start gap-2">
        <h3 id="supporter-offer-title" className="min-w-0 flex-1 text-[clamp(24px,6.5vw,28px)] font-black leading-[1.12] tracking-tight text-[#204E4A]">
          {t('Ayuda a que PAZO siga creciendo','Help PAZO keep growing')}
        </h3>
        <img src="/supporter/amigo-pazo-inicio.png" alt="" aria-hidden="true"
          width="90" height="90" decoding="async"
          className="pointer-events-none h-[88px] w-[88px] shrink-0 object-contain drop-shadow-[0_5px_7px_rgba(32,78,74,0.10)]"/>
      </div>
      <p className="relative z-10 mt-4 text-[14px] font-medium leading-[1.6] text-[#476862]">
        {t('PAZO está dando sus primeros pasos y aún tenemos mucho por construir. Con tu apoyo podemos seguir cuidando este pequeño mundo, mejorándolo y creando nuevas experiencias para ti, tu mascota y toda nuestra comunidad.',
          'PAZO is taking its first steps, and there is still so much to build. With your support, we can keep caring for this little world, making it better and creating new experiences for you, your pet and our entire community.')}
      </p>
      <div className="relative z-10 mt-4 inline-flex max-w-full items-baseline gap-1.5 rounded-full bg-[#F2F5DE] px-4 py-2 text-[#204E4A]">
        <strong className="text-[27px] font-black tracking-tight tabular-nums">US$2.99</strong>
        <span className="text-[13px] font-bold">{t('al mes','per month')}</span>
      </div>
    </section>

    <section aria-label={t('Colaboración voluntaria','Voluntary support')} className="space-y-2">
      {children}
    </section>

    <section aria-labelledby="supporter-benefits-title" className="space-y-2 pt-2">
      <h3 id="supporter-benefits-title" className="px-1 text-[19px] font-black text-[#204E4A]">
        {t('Como agradecimiento','As a thank-you')}
      </h3>
      <ul className="grid min-w-0 grid-cols-1 gap-1.5">
        {benefits.map(benefit=><li key={benefit.kind}
          className="flex min-h-[49px] min-w-0 items-center gap-2.5 rounded-[18px] bg-white px-3 py-2 shadow-[0_3px_12px_rgba(32,78,74,0.035)]">
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ECF1DD] text-[#204E4A]">
            <BenefitGlyph kind={benefit.kind}/>
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="break-words text-[14px] font-extrabold leading-tight text-[#204E4A]">{benefit.title}</h4>
            <p className="mt-0.5 break-words text-[12px] leading-snug text-[#5C7470]">{benefit.description}</p>
          </div>
        </li>)}
      </ul>
    </section>
  </>
}
