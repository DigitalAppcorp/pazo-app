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
 * PO-approved Card Central reference: a floating medal, one invitation card,
 * and a compact four-token thank-you strip. No client-side PayPal or entitlement
 * flags live here; children hosts the existing server-authoritative checkout.
 */
export function SupporterOfferB({lang,children}:Props) {
  const t=(es:string,en:string)=>lang==='es'?es:en
  const benefits:{kind:BenefitKind;title:string;description:string}[]=[
    {kind:'badge',title:t('Insignia especial','Special badge'),description:t('En perfil y publicaciones','On profiles and posts')},
    {kind:'themes',title:t('5 fondos especiales','5 special backgrounds'),description:t('Personaliza el perfil de tu mascota','Customize your pet profile')},
    {kind:'wall',title:t('Muro de agradecimiento','Thank-you wall'),description:t('Solo si tú autorizas a cada mascota','Only if you opt in each pet')},
    {kind:'milestone',title:t('Medallas por antigüedad','Support milestones'),description:t('Reconocimientos por el tiempo de apoyo','Recognition for the time you have supported PAZO')},
  ]
  return (
    <div data-pazo-supporter-layout="card-central" className="mx-auto w-full max-w-[420px] space-y-4">
      {/* Central card is the invitation, not a benefits storefront. The
          official medal is artwork only; never an unverified entitlement. */}
      <div className="relative pt-[57px]">
        <span aria-hidden="true" className="pointer-events-none absolute left-[21%] top-6 h-6 w-[5px] -rotate-[27deg] rounded-full bg-[#73B38E]"/>
        <span aria-hidden="true" className="pointer-events-none absolute left-[28%] top-2 h-4 w-[5px] rotate-[-42deg] rounded-full bg-[#73B38E]"/>
        <span aria-hidden="true" className="pointer-events-none absolute right-[21%] top-6 h-6 w-[5px] rotate-[27deg] rounded-full bg-[#73B38E]"/>
        <span aria-hidden="true" className="pointer-events-none absolute right-[28%] top-2 h-4 w-[5px] rotate-[42deg] rounded-full bg-[#73B38E]"/>
        <section aria-labelledby="supporter-offer-title"
          className="relative rounded-[27px] bg-white px-5 pb-4 pt-[66px] text-center shadow-[0_9px_26px_rgba(32,78,74,0.045)] sm:px-7">
          <img src="/supporter/amigo-pazo-inicio.png" alt="" aria-hidden="true"
            width="136" height="136" decoding="async"
            className="pointer-events-none absolute left-1/2 top-[-62px] z-10 h-[134px] w-[134px] -translate-x-1/2 object-contain drop-shadow-[0_8px_8px_rgba(32,78,74,0.13)]"/>
          <h3 id="supporter-offer-title" className="mx-auto max-w-[300px] text-[clamp(21px,5.8vw,24px)] font-black leading-[1.16] tracking-tight text-[#204E4A]">
            {t('Ayuda a que PAZO siga creciendo','Help PAZO keep growing')}
          </h3>
          <p className="mx-auto mt-2 max-w-[330px] text-[13px] font-normal leading-[1.45] text-[#476862]">
            {t('PAZO está dando sus primeros pasos y aún tenemos mucho por construir. Con tu apoyo podemos seguir cuidando este pequeño mundo, mejorándolo y creando nuevas experiencias para ti, tu mascota y toda nuestra comunidad.',
              'PAZO is taking its first steps, and there is still so much to build. With your support, we can keep caring for this little world, making it better and creating new experiences for you, your pet and our entire community.')}
          </p>
          <div className="mx-auto mt-3 inline-flex max-w-full items-baseline gap-1.5 rounded-full bg-[#F0F4DE] px-5 py-2 text-[#204E4A]">
            <strong className="text-[26px] font-black tracking-tight tabular-nums">US$2.99</strong>
            <span className="text-[12px] font-bold">{t('al mes','per month')}</span>
          </div>
          <section aria-label={t('Colaboración voluntaria','Voluntary support')} className="mt-3 min-w-0">
            {children}
          </section>
        </section>
      </div>

      {/* Four small thank-you tokens form a separate, quiet footer.
          Details remain in the unchanged full subscription terms. */}
      <section aria-labelledby="supporter-benefits-title"
        className="rounded-[25px] bg-white/65 px-3 pb-3 pt-3 text-center">
        <h3 id="supporter-benefits-title" className="text-[17px] font-black leading-snug text-[#204E4A]">
          {t('Como agradecimiento','As a thank-you')}
        </h3>
        <ul className="mt-3 grid min-w-0 grid-cols-4 gap-1.5">
          {benefits.map(benefit=><li key={benefit.kind}
            className="flex min-h-[92px] min-w-0 flex-col items-center rounded-[18px] bg-white px-1 py-2.5 shadow-[0_4px_13px_rgba(32,78,74,0.035)]"
            aria-label={benefit.title+': '+benefit.description}>
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDF2DF] text-[#204E4A]">
              <BenefitGlyph kind={benefit.kind}/>
            </span>
            <p className="mt-1.5 break-words text-[11px] font-extrabold leading-[1.2] text-[#204E4A]">{benefit.title}</p>
            <span className="sr-only">{benefit.description}</span>
          </li>)}
        </ul>
      </section>
    </div>
  )
}
