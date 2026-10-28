import type {PetPlace} from '../../types/pazo';

// Authored equivalents of the six existing curated entries. Keys are the exact
// source text: never apply another venue's policy to an unknown or edited entry.
const english:Record<string,string>={
 'Perros':'Dogs',
 'Perros en la terraza':'Dogs on the patio',
 'Perros y gatos':'Dogs and cats',
 'Solo perros; menores de cuatro meses no permitidos. Licencia, vacunas y placas vigentes; recoge los desechos. Correa en el estacionamiento.':'Dogs only; dogs under four months are not allowed. Keep licenses, vaccinations and tags up to date; pick up waste. Leashes are required in the parking lot.',
 'Parque canino municipal con zona designada para perros. Consulta los avisos y reglamentos publicados antes de acudir.':'Municipal dog park with a designated area for dogs. Check posted notices and rules before visiting.',
 'Perros sin correa únicamente en zonas señalizadas; en otras zonas deben ir con correa. Lleva agua y revisa posibles cierres de senderos.':'Dogs may be off leash only in designated areas; leashes are required elsewhere. Bring water and check for trail closures.',
 'Parque con senderos y vistas de Los Ángeles; acceso por North Fuller Avenue.':'Park with trails and views of Los Angeles; access via North Fuller Avenue.',
 'Terraza apta para perros según el directorio de turismo de Los Ángeles; confirma condiciones y disponibilidad con el restaurante.':'Dog-friendly patio according to the Los Angeles tourism directory; confirm conditions and availability with the restaurant.',
 'Restaurante con espacio exterior que figura como pet-friendly en Discover Los Angeles.':'Restaurant with an outdoor area listed as pet-friendly on Discover Los Angeles.',
 'Atención veterinaria para perros y gatos; confirma horarios y disponibilidad de consulta directamente con el hospital.':'Veterinary care for dogs and cats; confirm opening hours and appointment availability directly with the hospital.',
 'Hospital veterinario con consultas y cuidados preventivos para perros y gatos.':'Veterinary hospital offering consultations and preventive care for dogs and cats.',
 'Servicios de grooming para perros y gatos; consulta y reserva directamente con el negocio antes de acudir.':'Grooming services for dogs and cats; contact the business and book directly before visiting.',
 'Salón de cuidado y estética de mascotas con atención individualizada.':'Pet grooming salon offering individual care.',
 'Tienda de suministros para mascotas; consulta las condiciones de ingreso y servicios disponibles con el establecimiento.':'Pet supply store; check entry requirements and available services directly with the store.',
 'Tienda de mascotas con productos y servicios; esta sede indica lavado canino autoservicio y clínica de vacunación.':'Pet store offering products and services; this location lists a self-service dog wash and vaccination clinic.',
};
export function localizePlaceContent(place:PetPlace,lang:'es'|'en'):PetPlace{
 if(lang!=='en')return place;
 const text=(value:string|undefined)=>value?(english[value]??value):value;
 return {...place,speciesAllowed:text(place.speciesAllowed),description:text(place.description),petRules:text(place.petRules)};
}
