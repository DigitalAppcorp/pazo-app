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
