// Inventario inicial de escenas REALMENTE montadas por el laboratorio.
// No representar estas escenas como las 86 superficies visualmente aprobadas.
// "synthetic" indica datos de relleno; "blocked" prueba una recuperación, no mapa cargado.
export const VISUAL_CASES = Object.freeze([
  {id:'welcome',          group:'acceso',   level:'component', title:'Bienvenida A01'},
  {id:'signup',           group:'acceso',   level:'component', title:'Registro A02 (sin enviar)'},
  {id:'pet-onboarding',   group:'acceso',   level:'component', title:'Alta inicial A03 (sin enviar)'},
  {id:'interests',        group:'acceso',   level:'component', title:'Intereses A04'},
  {id:'feed-one',         group:'social',   level:'synthetic', title:'Feed con una publicación ficticia'},
  {id:'feed-empty',       group:'social',   level:'synthetic', title:'Feed sin publicaciones'},
  {id:'communities-empty',group:'social',   level:'component', title:'Comunidades sin sesión'},
  {id:'search-disabled',  group:'social',   level:'component', title:'Buscar sin sesión'},
  {id:'pet-summary',      group:'mascota',  level:'synthetic', title:'Mi mascota sintética'},
  {id:'create-menu',      group:'creacion', level:'synthetic', title:'Menú Crear (sin guardar)'},
  {id:'create-post',      group:'creacion', level:'synthetic', title:'Crear publicación (sin guardar)'},
  {id:'create-community', group:'creacion', level:'synthetic', title:'Crear comunidad (sin guardar)'},
  {id:'add-pet',          group:'mascota',  level:'synthetic', title:'Añadir mascota (sin guardar)'},
  {id:'care-empty',       group:'servicios',level:'synthetic', title:'Agenda de cuidados vacía'},
  {id:'documents-empty',  group:'servicios',level:'synthetic', title:'Documentos vacíos'},
  {id:'map-unavailable',  group:'lugares',  level:'blocked',   title:'Mapa sin conexión externa (NO mapa listo)'},
  {id:'nav',              group:'navegacion',level:'synthetic',title:'Cabecera y barra flotante'},
  {id:'invitation',       group:'membresia',level:'component', title:'Invitación Amigo de PAZO'},
  {id:'lost-review',      group:'rescate',level:'synthetic',title:'Revisión de aviso perdido antes de publicar'},
  {id:'lost-active',      group:'rescate',level:'synthetic',title:'Panel de alerta perdida ya activa (token ficticio)'},
  {id:'password-expired', group:'acceso',level:'synthetic',title:'Recuperación con enlace caducado'},
  {id:'password-ready',   group:'acceso',level:'synthetic',title:'Formulario de nueva contraseña (sin enviar)'},
  {id:'legal-privacy',    group:'legal',level:'component',title:'Política de privacidad, diálogo'},
  {id:'legal-terms',      group:'legal',level:'component',title:'Condiciones de uso, diálogo'},
  {id:'report-post',      group:'moderacion',level:'synthetic',title:'Denunciar publicación (sin enviar)'},
  {id:'wall-empty',       group:'membresia',level:'synthetic',title:'Muro de agradecimiento sin mascotas'}
]);
export const VISUAL_VIEWPORTS = Object.freeze({
  '320':{width:320,height:568},
  '390':{width:390,height:844},
  '430':{width:430,height:932},
  '768':{width:768,height:1024},
  '1440':{width:1440,height:900}
});
export const VISUAL_LANGUAGES = Object.freeze(['es','en']);
export const selectVisualCases = (scope='pilot') => scope==='pilot'
  ? VISUAL_CASES.filter(c=>['welcome','signup','pet-onboarding','feed-one','pet-summary','add-pet','care-empty','communities-empty','invitation'].includes(c.id))
  : VISUAL_CASES;
export const selectVisualViewports = (scope='pilot') => scope==='pilot'
  ? {'390':VISUAL_VIEWPORTS['390']}
  : VISUAL_VIEWPORTS;
