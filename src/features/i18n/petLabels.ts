/** Presentation only: never rewrite pet enums or owner-entered details. */
const englishSpecies:Record<string,string>={gato:'Cat',perro:'Dog',conejo:'Rabbit',ave:'Bird',otro:'Other'}
export function petSpeciesLabel(species:string,lang:'es'|'en'):string {
  return lang==='en'?(englishSpecies[species]??species):species
}
export function petAgeLabel(age:string,lang:'es'|'en'):string {
  return lang==='en'&&age==='Desconocida'?'Unknown':age
}
