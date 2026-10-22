# Publicación provisional autorizada — 21-oct-2026 Guatemala

## Autorización y dirección

El PO respondió «si, aun no tengo el dominio oficial asi que todo es
provicional» a la solicitud de integrar y publicar el candidato manteniendo
los cobros Live apagados. Este GO cubre integración y publicación técnica.
No autoriza canary, cargos reales ni apertura financiera al público.

Se conserva `https://pazo-app-t83r.vercel.app` como dirección provisional
estable. No se necesita comprar dominio ni cambiar los retornos PayPal, Auth
o recursos Live ya aprobados. Un dominio propio futuro requiere su revisión
de orígenes y callbacks; no forma parte de esta publicación.

## Integración efectivamente realizada

| Cambio | Resultado comprobado |
| --- | --- |
| PR67 → F13 | MERGED, `716ebcc081a1d54ecc4579860bee6f4ced3e47ed`; 17/17 jobs SUCCESS |
| PR44 → release | MERGED, `a4a61c158885eb4f9a2c516b2d68bb7f1ecc981e` |
| release → main | PR71 abierto: https://github.com/DigitalAppcorp/pazo-app/pull/71; NO fusionado todavía |
| Árbol integrado | `git diff --exit-code` entre candidato32a89b0c y releasea4a61c15 PASS; ningún cambio de aplicación por los merges |
| Candidato probado | `32a89b0c`: 5/5 Actions SUCCESS; aplicacióna3f912eb previamente validada en preview HTTPS |

Las fusiones conservaron el historial, sin force/reset ni relajar checks.
La última lectura de CI de release tenía 14/15 jobs SUCCESS y `verify` en
curso; la restricción de red posterior impide certificar su resultado final.
No atribuir a release/main un CI que no se ha podido leer.

## Preparación Production

- Pull oficial de configuración Production realizado antes del bloqueo.
  Parser real del cliente: URL/proyecto y clave pública Supabase válidos;
  Mapbox público presente; Sandbox QA UI=false y beneficios=true.
- Fecha legal real `2026-10-21` configurada solo para Production después del
  GO. No cambia el contrato inmutable de consentimiento PayPal ni activa pagos.
- Build local de Production PASS con esas variables, desde releasea4a61c15.
  Es preparación local; NO es un deployment Vercel ni evidencia del canonical.
- Chromium local390/1440 PASS sobre ese bundle: fecha efectiva2026-10-21,
  Gmail/PayPal en política real, términos, scroll/cierre/Escape/foco y sin
  overflow/errores JS. Suite existente de closure46/46 PASS. Estas pruebas
  locales no sustituyen la validación HTTPS después del despliegue.
- Helper privado preparado para comprobar metadata de deployment Production,
  alias estable, fuente exacta y navegador HTTPS390/1440 sin bypass SSO.
- Los cinco Edge continúan ACTIVE en versiones1/2/3/5/4; las 69 fuentes
  descargadas en el postflight anterior siguen idénticas al checkout actual.
  Worker reciente, modoOFF/rev0, Live=false/kill=true/procesamiento=false;
  certificados/autorizaciones/períodos0. No llamadas PayPal ni nuevos correos.

## Bloqueo concreto del entorno

Durante esta ejecución el runtime pasó de revisión2/red unrestricted a
revisión3/red restricted, cuya lista efectiva contiene solo
`api.supabase.com`. La API GitHub respondió403; también falta acceso autorizado a
Vercel y al canonical. No es falta de otro token ni de credenciales PayPal.
No se alteraron rutas, proxy, TLS, identidades ni checks para eludirlo.
Git HTTPS, que tiene un permiso independiente de la API, sí permitió el push
normal de la documentación en `ops/beta-provisional-release-20261021`. No se
utilizó Git para saltar el gate de CI o fusionar main sin su resultado.

Se leyó la configuración y se guardó un borrador con los destinos requeridos,
conservando `api.supabase.com` y los bindings de secretos existentes:
GitHub/API/fuentes/releases, registry.npmjs.org, Vercel/API/CLI, canonical,
los dos previews existentes, Supabase del proyecto, Mapbox, Google Fonts e
imágenes Unsplash. El guardado confirmó `status=saved/requires_publish=true`.
Guardar borrador no aplica red ni publica el entorno. El PO debe revisar y
guardar los cambios y publicar este entorno desde Codex Cloud. No enviar
tokens, contraseñas o Client Secret por chat. No se necesita otro GO de deploy.
También se actualizaron las instrucciones reutilizables de arranque: parser
público estricto, smoke con Comenzar y distinción de Git/API, conservando
install_script y bindings. El arranque no ejecuta deploys/migraciones/pagos.

## Scope Closure Reconciliation

| Alcance de la orden F16 | Evidencia / estado real |
| --- | --- |
| P1 conciliación/worker/renovación/refund/disputas | Código y SQL/Edge instalados; PG17 y suites sintéticas PASS. No venta Live real |
| P2 checkout/consentimiento/cancelación/retornos | Código, pruebas y preview HTTPS PASS; canonical y PWA física pendientes |
| P3 beneficios/panel/privacidad/core | Código y auditoría RPC/visibilidad PASS; Gmail entregado y confirmado; no beneficios inventados |
| P4 guardado único/MFA/activación controlada | Instalado y probado sintéticamente; certificado ausente hasta canonical real; modoOFF |
| P5 integración/despliegue | PR67/44 merged; PR71/CI final/deploy/canonical/certificado pendientes de red |
| Respaldo/recuperación | Drill real offline previo documentado; custodia offsite Drive aplazada expresamente por PO, no reabierta |
| Gates humanos reservados | Claves privadas en Admin, autorización y canary real; no se han ejecutado ni simulado |

No declarar F16 COMPLETADA, READY_FOR_PO_CREDENTIALS o LIVE_PAYMENT_PASS.
Reanudar por PR71/CI y publicación técnica al aplicarse la red; no repetir
PR62–65, Sandbox, Gmail, plan/webhook o migraciones ya aprobadas. Comprobar
canonical HTTP7/7 y Chromium/SW/callbacks antes de registrar el certificado
técnico con SHA/evidencia reales, manteniendo los controles financieros OFF.
Después actualizar handoff/hoja/RC y solicitar una sola entrada privada de
claves en Administración; la prueba financiera exige autorización distinta.
