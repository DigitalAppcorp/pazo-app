## #130 — cambio de criterio del PO: cierre ahora y segundo Cron bajo seguimiento

El PO, informado de que la espera de dos ciclos no es necesaria para registrar llegadas, ordena continuar ahora. Sustituye únicamente la espera previa de dos runs por una ejecución periódica exitosa más una prueba adicional real de purga; el segundo run periódico permanece bajo seguimiento. No se cuenta una llamada manual como run periódico ni se cambia el calendario de seis horas. Resto de privacidad, protecciones, CI y E2E permanece obligatorio. Esta decisión sustituye los HOLD históricos de dos runs de este documento; no autoriza publicar anuncios ni gastar en Meta. Fecha de publicación prevista26-oct según Guatemala, conservando fecha de términos financieros.

---
# Issue130 — postflight integral en curso (26-oct Guatemala)

**No es el cierre ni el banderazo de Meta. ColecciónOFF; falta el segundo run periódico real.** La sección inferior conserva la instalaciónOFF histórica sin reinterpretarla como estado actual.

Privacidad ES/EN publicada/verificada6casos320/390/1440, fuente2ebc2f34, Verceldpl_HJL3YicGG56kgpBkWmuKbgMf6rC7READY/aliascanon. Retención14d/policyv1, Cron4único `17 */6 * * *`, primer run27oct00:17UTC SUCCESS/heartbeat14d, segundo06:17UTC pendiente. No se modificó el calendario ni se inventaron ejecuciones.

Siteverify real en Chrome habitual: token generado/validado; primera solicitud409porDBOFF, replay403/missing403/invalid403 después de protecciónatómica. Antes del arreglo el proveedor aceptaba replays: se conserva el hallazgo y se corrigió. Seis tablas marketing FORCE RLS y privadas; ledgerSHA256sin token/IP/cuenta, TTL5min/límite2048/purga6h. LandingEdgev5/JWTfalse/hashdb02fad2cc00e6d24e6d9677c909b3182864d1e8ce96ad20ba7dbd9a722d90af. No dato de atribución/landing recabado.

E2E real encontró y corrigió: auto-confirmación de correo (POautorizóConfirmemailON), retornoaappantigua (SiteURLcanon+2URLs permitidas añadidas sin quitar7previas) y403A03 por lectura de columnaprivada (retirada condición redundante; SECURITYINVOKER/ACL/RLSconservados). QA_C/D: correosrealmenteentregados/confirmados,retornocanónico,primera mascota200cadauno,0overflow. No contraseñas/tokens/IDs privados en evidencia. Reporte con sesiónadminreal7/30/90HTTP200paused; UIlectura sigueOFF hasta candidato final.

PR129merged50ed9c55; PR131d39d4db0; PR132a4fc2da7; PR1342ebc2f34. Candidatos132/134cincoCI SUCCESS; candidato135DRAFT933aead1cuatroCI SUCCESS,44unit/9legal/buildPASS. Candidato final todavía NOintegrado/publicado ni gatesabiertos. Debe completarE2EautomáticoE/atribuciónC-D/exclusiónQA/supresión/3UTM202/postflighttrasdosruns. D7soloaislado; no afirmar7dtranscurridos.

Mapa de5fuentes→APIverificadoen `docs/evidence/marketing-e2e-20261026/prepared-migrations.json`, ahora catálogo HOSTED_TARGETED_MAPPED, no permiso dbpush. Originales2byteidénticos. Las3aplicacionesnuevas tienen únicamente CRLFfinal añadido por transportePowerShell; fuenteSHA256 y statementMD5 se verifican con esa transformación exacta. No repair/renombre/replay. SQL financiero y saludpreservados: digestab734013e83acb4e2880d50a35031da7/healthTRUE.

Backups: SupabaseFree y UI sin backups/PITR; copiaslocales24octanterioresmarketing,offsite diferido porPO,no rehacer ni subir. No tareaWindowsPAZOencontrada; no se asegura ausencia de copias externas desconocidas. Cualquier export/restore futuro exige revisión, colecciónOFF y reaplicar purga/supresiones antes de reabrir. Logs API/DBFree1día,Authaudit1hora según [plan oficial](https://supabase.com/pricing); VercelHobby confirmado, runtime1hora según [documentación](https://vercel.com/docs/logs/runtime). No se modifican ni borran logs/backups históricos. La purga14d de tablas activas no elimina esas copias.

Operación de privacidad: contacto existente publicado; verificar identidad en privado, limitar datos/ticket, ejecutar eliminación únicamente de atribución de la persona verificada, conservar obligacionesfinancieras y evidencia mínima de trámite bajo el ciclo existente de soporte. Objetivo operativo conservador: responder dentro45díascalendario, sin prórroga automática; respetar un plazo legal aplicable más corto. Referencia [CaliforniaAG](https://oag.ca.gov/privacy/ccpa), sin afirmar aplicabilidad global ni certificaciónlegal. Antes de restaurar, resolver solicitudes pendientes y comprobar que no vuelven filas retiradas; no reabrir si no se puede garantizarlo. No se crea un ledger perpetuo nuevo ni se interviene PayPal.

**META_ADS_SPEND=NOT_STARTED. READY_TO_PUBLISH_THREE_META_ADS=NO hasta cierre comprobado.**

Revalidación27oct00:48UTC: Cron conserva una sola ejecución periódica exitosa; segunda prevista06:17UTC (00:17 Guatemala). CandidatoPR135, HEADb02ac22f, cuatro workflows SUCCESS; lint dirigido PASS. La prueba de caducidad real del token quedó inconclusa por rechazo del challenge automatizado600010/300030; no llegó un token expirado al servidor. El rechazo estricto tras300s está probado únicamente con tiempo controlado en unidad. No se interpreta como PASS de caducidad real. Meta, inspección solo lectura: tres estados Borrador y cinco objetos pendientes de revisión/publicación; no se editaron ni publicaron ni se valida su aprobación por Meta.

---
# Marketing instalado OFF — postflight real, 26-oct-2026

**Instalación dirigida ejecutada con GO explícito del PO. Recopilación y reportes
siguen OFF; retención0.** Privacidad, proveedores y gasto no están autorizados.
Este registro sustituye el estado de instalación pendiente de los informes anteriores;
sus manifiestos NOT_APPLIED se conservan como snapshots previos, no como estado actual.

## Versiones verificadas

- [PR125 integrado](https://github.com/DigitalAppcorp/pazo-app/pull/125), candidato
  `3f050eada8c71f3cfbbf9ce549c08d9bc3f91600`,14/14 checks SUCCESS antes del merge.
- Merge `0ee700df99619dfe36b7a9848298297a7ead8bba`; árbol idéntico al candidato.
  [CI posterior](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40393231525)
  SUCCESS, más auditoría canónica40393231549. Los9 check-runs del merge incluyen
  el comentario automático Vercel; no se cuenta ese comentario como prueba técnica.
- Frontend producción READY `dpl_7vsKww6Jh3dwrobN1MiNvDbMohgJ`,
  `pazo-c9e5bdl0i-digitalapp.vercel.app`, alias `pazo-app.vercel.app` comprobado,
  fuente exactamente del merge0ee700df. Un solo create; no promoción manual.
- Rollback conservado: `dpl_GeqCir3UT9hyKN8bDygQqiUW6N7F`, fuentea8d83799.
  No se ejecutó rollback ni se alteraron PayPal o tablas financieras.

## SQL instalado, sin replay histórico

| Fuente revisada | Versión generada por API | MD5 del statement alojado, igual al archivo completo |
| --- | --- | --- |
| 20261024020632_pazo_marketing_firstparty_attribution.sql | 20261026201027 | 1f38e25c2fd0dd0b2057a7b1e9fcb77d |
| 20261024034549_pazo_marketing_retention_health.sql | 20261026201043 | a45b2a3b382cf621dd9d42ae7569992e |

Cada API registró un statement completo idéntico al SQL fuente, con sus BEGIN/COMMIT.
SHA256 originales3259767f49e9b3be7dbe2dbe0a979c2a36a25ac21bcd74e3b8eaa5ec8ba85bee
y72e5edda023a49c44a81d742092c026359815765afc9ce8c8067372847c40a3e.
El mapeo de versiones no es drift reparado ni permiso de db push. No se renombraron
fuentes históricas, no migration repair/reset ni SQL financiero.

Postflight alojado: collection_gate.enabled=false (collection_enabled=false),
enabled_atNULL, retention_days0, policy_versionNULL. Acquisition, landing_daily y
landing_minute_budget tienen0filas. No Cron de marketing, last_success_atNULL:
esto es esperado con retención/recopilación desactivadas, no salud de purga activa.

Las5tablas marketing tienen RLS ENABLE+FORCE. anon/authenticated/service_role no
tienen USAGE de marketing_private, acceso directo a tablas ni EXECUTE privado.
Puentes públicos son SECURITY DEFINER con search_path vacío y grants mínimos:
reporte solo authenticated y comprobación admin; intake/purga/retiro solo servicio.
El reporte frontend está OFF y no invoca RPC. Schema privado no expuesto por REST.

## Edge y frontend inactivos

| Edge | Versión | JWT | Gate |
| --- | --- | --- | --- |
| pazo-marketing-attribution | 1 | true | MARKETING_INTAKE_RELEASED=false |
| pazo-marketing-landing | 1 | false, por diseño revisado | MARKETING_LANDING_RELEASED=false |

9/9 archivos de las dos clausuras instaladas coinciden byte por byte con fuente.
Estado ACTIVE significa función servida, no recopilación activa. Las22 Edge
anteriores mantienen versión y digest de bundle idénticos a la lectura previa.
No secretos nuevos, Turnstile, Pixel, CAPI o proveedores habilitados.

Frontend conserva COLLECTION=false, LANDING=false y ADMIN_REPORT=false.
En las3URLs oficiales servidas realmente a320/390/1440 no hubo llamadas de
marketing/Meta/Turnstile ni staging local/sessionStorage. Tampoco overflow o errores
JavaScript en los recorridos públicos examinados.

## UTM: discrepancia corregida en la fuente de anuncios

El plan histórico de14/oct usaba pazo_us_pilot_30d y códigos por pieza que el
tracking cerrado no admite. No es el piloto actual de45USD/3d. Se reemplazaron sus
destinos operativos por [las3URLs oficiales](marketing/traffic-pilot-urls.json),
con campaña pazo_beta_local_202610 y contenidos perfil_en/qr_en/comunidad_en para
imagen/carrusel/video. El paquete local ahora incluye URLS-PILOTO-ACTUAL.csv y un
aviso que excluye los destinos históricos de30d. No se crearon anuncios.

`npm run marketing:validate-urls` valida los3destinos antes de copiar a Ads Manager.
Una URL candidata distinta obtiene diagnóstico explícito y exit1 si no coincide,
sin imprimir query potencialmente personal. Se prueban parser y ambos Edge reales
con dobles Auth/challenge; PG17 ejerce ambos RPC con ROLLBACK por cada destino.
Resultado40unit+31PG17 adicionales PASS, SQL legado y54browser aisladas PASS enCI.
No se amplía captura a UTMs libres ni se alteran las dos migraciones revisadas.

## Regresiones y límites

| Comprobación real después del despliegue | Resultado |
| --- | --- |
| Auth /health y /settings sin cuenta | HTTP200; sin registro ni correo enviado |
| Llegada OFF | HTTP503 collection_disabled, sin prueba antiabuso/proveedor |
| Intake sin credenciales | HTTP401 |
| Intake con API key pública o JWT anon, sin persona | HTTP503 collection_disabled |
| Reporte anon / esquema privado | HTTP401 /406 |
| Catálogo público de lugares, solo status | HTTP200, sin solicitar identidades |
| PWA HTTPS, home/return/cancel/manifest/SW/iconos | 7/7PASS; callbacks con marcador ficticio, ningún pago |
| Welcome/registro inicial/privacidad inglesa,3anchos | PASS, sin enviar formularios y con POST bloqueado |
| Finanzas internas | healthtrue/checkoutsON/invitacionesOFF, digest de funciones ab734013e83acb4e2880d50a35031da7 idéntico antes/después |

No se afirma compra PayPal Live, sesión real admin/usuario, entrega de email o PWA
instalada físicamente. El mapa conserva sus fuentes/servicios y sus pruebas F17
PG17/navegador pasan; catálogo alojado legible. Su render visual público no pudo
certificarse desde Demo porque la pantalla permanece en Sincronizando feed.
El PO indicó que Demo se corrige en otro trabajo: **no se cambió Demo ni el gate
de carga**. Esta limitación no activa nuevas tareas ni cambia la instalación OFF.

Seguridad Supabase conserva los4grupos de avisos previos (INFO RLS sin policies y
WARN definer anon/auth y protección de contraseñas). No se cambió configuración
Auth. Los grants de marketing se verificaron explícitamente; sus tablas sin
policies son deliberadamente inaccesibles a roles de aplicación. No se ocultaron
avisos ni se alteraron controles para presentar éxito.

Una aserción inicial del harness esperaba401 al usar API key pública sin sesión;
el gateway acepta esa clave como acceso público y el códigoOFF devuelve503. Se
separó de la petición sin credenciales, que sí devuelve401; ninguna configuración
de autenticación se relajó. Se corrigió una ruta local de captura URL-encoded;
no cambió producto ni resultados de seguridad.

## Estado y continuación

HOSTED INSTALLATION=PASS (instalación OFF, con límites de QA anteriores).
TRACKING COLLECTION=OFF. PRIVACY & RETENTION=PENDING. REAL COLLECTION E2E=BLOCKED
por gates deliberados. TRAFFIC LAUNCH=BLOCKED. Ninguna cuenta real o conversión
fabricada; filas de marketing0 después de todas las comprobaciones.

No hace falta reinstalar ni repetir este release para aprobar privacidad.
Antes de recopilar: política/retención y backups/logs aprobados, proveedor real
autorizado/configurado, Cron separado y dos ejecuciones periódicas reales,
entorno alojado aislado autorizado y GO de colección. Gasto publicitario separado.
No usar estas evidencias para habilitar automáticamente ningún gate.

Evidencia saneada: [directorio](evidence/marketing-off-installation-20261026).
