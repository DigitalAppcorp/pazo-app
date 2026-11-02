import type {LegalKind,LegalLanguage,LegalText} from './legalCopy'

/** Staged proposal only. This file does not establish asset ownership or release changes. */
export const PROPOSED_INDIVIDUAL_OPERATOR='Brandon Estuardo Alvarado Vasquez' as const
const PRIOR_OPERATOR='Alvarado Solutions LLC'
export function stageIndividualOperatorCopy(copy:LegalText,kind:LegalKind,lang:LegalLanguage,effectiveDate:string):LegalText {
  const es=lang==='es'
  const notice=es?`Fecha de vigencia: ${effectiveDate}.`:`Effective date: ${effectiveDate}.`
  const update=(s:string)=>s
    .replaceAll(PRIOR_OPERATOR,PROPOSED_INDIVIDUAL_OPERATOR)
    .replaceAll('empresa registrada en California, Estados Unidos','persona física que opera desde California, Estados Unidos')
    .replaceAll('a company registered in California, United States','an individual operating from California, United States')
    .replaceAll('Operador: Brandon Estuardo Alvarado Vasquez (California)','Operador: Brandon Estuardo Alvarado Vasquez (persona física, California)')
    .replaceAll('Operator: Brandon Estuardo Alvarado Vasquez (California)','Operator: Brandon Estuardo Alvarado Vasquez (sole proprietor, California)')
  const previousNotice=es
    ? /^(?:Fecha de vigencia: \d{4}-\d{2}-\d{2}\.|La fecha de vigencia se fijará al publicar la beta\.)/
    : /^(?:Effective date: \d{4}-\d{2}-\d{2}\.|The effective date will be set when the beta is published\.)/
  const sections=[...copy.sections.map(section=>({...section,text:update(section.text)}))]
  if(kind==='privacy')sections.push({
    heading:es?'Cambio de operador':'Change of operator',
    text:es
      ? `A partir del ${effectiveDate}, Brandon Estuardo Alvarado Vasquez figura como operador individual de PAZO. Los avisos anteriores que identifican a Alvarado Solutions LLC permanecen como historial. Para consultas y solicitudes sobre tus datos y tu cuenta, utiliza el contacto de privacidad indicado. Este aviso no elimina derechos ni obligaciones anteriores.`
      : `Effective ${effectiveDate}, Brandon Estuardo Alvarado Vasquez is the individual operator of PAZO. Earlier notices identifying Alvarado Solutions LLC remain in the historical record. For personal-data and account requests, use the listed privacy contact. This notice does not erase prior rights or obligations.`,
  })
  return {...copy,introduction:notice,alert:update(copy.alert).replace(previousNotice,notice),sections}
}
