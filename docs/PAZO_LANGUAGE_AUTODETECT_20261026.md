# PAZO — Idioma inicial según dispositivo/navegador (26-oct-2026)

## Alcance autorizado
El Product Owner aprobó «ok go» tras la propuesta de detectar inglés/español antes de lanzar anuncios, preservar el selector manual ES/EN, la preferencia tras reiniciar la PWA, el idioma del documento y verificar antes de publicar. Ajuste puntual de frontend, sin rediseño.

## Contrato
- Primera visita: usar `navigator.languages` en orden de preferencia, después `navigator.language`. Admitir variantes regionales `en-*`/`es-*`. Si no existe idioma soportado, inglés.
- La elección manual ES/EN tiene prioridad y se guarda **solo en el navegador/PWA** bajo `pazo_language_preference_v1`. Reabrir, recargar o iniciar/cerrar sesión no debe revertirla. Si Storage está bloqueado, el cambio funciona al menos en la sesión.
- No equiparar el idioma de un anuncio con el idioma de dispositivo; no leer UTM ni agregar segmentación/tracking.
- Sin parpadeo español para visitantes anglófonos: `index.html` usa inglés de respaldo; `src/main.tsx` inicializa metadatos antes de importar la app, `App.tsx` aplica cambios posteriores.
- HTML `lang` y título se sincronizan para pestañas/lectores de pantalla. Los botones originales ES/EN siguen presentes con nombres accesibles.
- Se conserva toda la UI, precio, navegación, Auth, perfiles, Supabase, PayPal, invitaciones, permisos, PWA y el apagado de telemetría de marketing.

## Pruebas y limitaciones
- Suite focalizada en `src/features/i18n/languagePreference.test.mjs`; integrada al comando existente `npm run test:closure` y por tanto al CI.
- Matriz: `en-US`, `en-GB`, `es-MX`, `es-GT`, `es-419`; preferencia multidioma, idioma desconocido, fallback; override manual y almacenamiento bloqueado; actualización de metadatos.
- Verificación de TypeScript y build PWA mediante CI normal. El comportamiento en iOS/Android instalados y la revisión visual con un navegador real requieren QA manual independiente; no confundir un test aislado con verificación de dispositivos.
- Rollback: revertir únicamente el PR de i18n. No tocar datos de suscripciones ni flags de invitación.

## Publicación
La integración a `main`/Vercel solo procede si todas las comprobaciones aplicables están verdes y se verifica el commit exacto publicado. Registrar PR y SHA en el cierre sin inventar resultados.
