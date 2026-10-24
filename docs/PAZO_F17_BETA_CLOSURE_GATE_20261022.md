## POSTFLIGHT REAL — 22-oct-2026: DB/Edge/PRODUCTION DEPLOY PASS, HTTPS UX pendiente

La matriz histórica de preparación situada debajo corresponde a un **estado anterior**. La autorización nueva del PO permitió instalar las 3 migraciones del PR #81 y publicar **exactamente en https://pazo-app.vercel.app/**, no en el proyecto t83r.

- `ROLLBACK` hospedado comprobado: las 3 versiones quedaron ausentes y las 3 tablas principales no existían tras la reversión.
- `COMMIT` hospedado correcto: versiones 20261022103706/07/08, 5 tablas FORCE RLS, retención `pazo_support_retention_daily` activa, mantenimiento OFF rev0 y ningún caso ni regalo concedido todavía.
- `f16-paypal-supporter-v2-qa`: Edge27 ACTIVE, `verify_jwt=true`, helper F17 añadido sin alterar Vault ni otros Edge Live.
- Proyecto Vercel `pazo-app` id `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI`, distinto de `pazo-app-t83r`; ambiente público de compilación migrado (Supabase correcto, publishable key, token público Mapbox, flags beneficios/legales), sin secreto financiero. Preview READY `dpl_54raQqoKCAvQtsZzFLjajgDFJAxm`; PRODUCCIÓN READY `dpl_7rPxM5BzSaz3YJrDDu6NMpY1bfWT` (SHA `a8624a0b1db1e24c0487210e38ec6b62db9b8b6d`).
- Lectura autoritativa del alias confirmó `pazo-app.vercel.app` asignado al despliegue de producción nuevo, antes apuntaba a `dpl_97SkoC6xzVJcGmCFFKCU8z8gE5xb`.
- PayPal canary rev1, `live_enabled=true`, `kill_switch=false`, períodos Live0, **sin modificación**. Mantenimiento no se activó; mantener operaciones financieras fuera de la prueba funcional.
- CI para código `a8624a0b`: GitHub CI SUCCESS y F17 isolated backend security SUCCESS (runs 39771534509/39771534750), además de laboratorio local 1,818+16 y navegador40 documentados.

**LIMITACIÓN:** la herramienta de acceso web protegido de Vercel rechazó la lectura por permisos de API (403 en endpoint de aliases de bypass); no prueba un HTTP403 del sitio. No se obtuvo smoke HTTP directo ni validación de Safari/Android, Mapbox real, cuentas autenticadas o PayPal callback a origen nuevo. Quedan como aceptación operativa pendiente; jamás presentar F17 como E2E público validado solo por READY o CI. PR #81 sigue DRAFT y `main` sin merge.

---

# F17 — código y validación local; publicación pendiente

**22-oct-2026, Guatemala. PR [#81](https://github.com/DigitalAppcorp/pazo-app/pull/81), DRAFT.**
Continuación del HEAD `a7b1f2c830e6c16c354b0a4463ed1529c94b154c`, con base
`main=a99f05d2dab3baf5a4bc26b8fb64d790e7c4be2d`. No se reconstruyeron los
seis módulos ni los entregables F16/PR62–80 ya completados por ChatGPT.

**Autorización heredada de F17:** completar programación en rama; la aplicación
SQL y merge/publicación quedaron sujetos a GO. Esta continuación no ejecutó
DDL alojado, despliegues, llamadas PayPal ni envíos de correo. No declarar F17
COMPLETADA antes de backend, runtime, aceptación y merge a main.

## Resultado del código

| Alcance | Estado verificable |
| --- | --- |
| Instalación PWA | Conservados listener temprano, aviso Inicio y ajustes, descarte local7 días y detección standalone/iOS. Prueba de evento de instalación de un solo uso; aceptar el prompt no se presenta como instalación física |
| Mapa | Conservada corrección Streetsv12 y degradados móviles de ChatGPT. Corregida clasificación de401/403 (regex escapada de más), errores de teselas y logs: nunca URL/token/coordenadas crudos. Falta verificar cartografía real por red y teléfono |
| Altura/navegación | Conservados viewport exterior/interior100dvh y safe areas. Formularios revisados390/1440; no se atribuye Chrome/Safari físico al emulador |
| Soporte | RPC de envío idempotente, tres casos/hora serializados, dueño confirmado y sin INSERT directo. Respuesta del admin separada de nota privada, consulta propia y guardado en bandeja. Escape/foco y respuestas pendientes protegidas al cambiar cuenta |
| Cortesías | Duración nula rechazada; permanente solo con0 explícito. Nonce/auditoría evita extender o resucitar una concesión antigua al reintentar. Historial privado, vencimiento/revocación/transferencia/moderación y temas/muro con consentimiento. Nivel1 normalizado al contrato gráfico base0, sin fabricar ciclos/ventas |
| Mantenimiento | CAS/replay/auditoría, hook REST y políticas restrictivas sobre RLS existente, Storage protegido y `realtime.messages` cuando existe. CREATE/recuperación Live y nuevas admisiones Sandbox se bloquean; cancelaciones, firma, worker e historia permanecen disponibles |
| Recuperación administrativa | Entrada independiente `/maintenance-admin.html`, compilada sin App/React. Login efímero, rol admin comprobado en servidor y restauración solo con confirmación/revisión vigente. Probada con entradas JS de App bloqueadas; sin guardar sesión de recuperación |

El soporte conserva un identificador por envío incierto, consulta el resultado
y reutiliza el mismo identificador si se reenvía. No crea otro ticket por perder
la respuesta. Consultas/formularios administrativos descartan respuestas de una
cuenta anterior; suscripciones Auth se limpian al desmontar.

La cortesía no es evidencia de pago: solo afecta beneficios cosméticos, nunca
ledger, períodos, Merchant ni recaudación. La UI explica que no genera cobros ni
renovaciones. No publica automáticamente una mascota en el muro.

## Privacidad y retención aprobada

El PO eligió **90 días después de resolver el caso**. SQL prepara limpieza diaria
con el pg_cron ya existente: elimina mensaje, respuesta y nota juntos. Guardar
otra nota no reinicia ese plazo; reabrir elimina `resolved_at` y una nueva
resolución inicia su propio plazo. Pendientes permanecen para atención; baja
confirmada de Auth elimina las solicitudes por FK. Backups conservan su ciclo,
sin prometer eliminación instantánea de sus copias.

La auditoría de mantenimiento guarda actor/acción/revisión/nonce y huella de los
mensajes; no duplica anuncios en texto libre. Cortesías e historial quedan
ligados al destinatario y su baja. Sin telemetría nueva, emails automáticos,
session replay, GPS ni datos de pago. Privacidad ES/EN e inventario actualizados
para el incremento; no se cambió la oferta PayPal inmutable.

## SQL versionado y preparación de instalación

Los tres borradores se consolidaron en fuentes únicas, **NO APLICADAS**:

1. `supabase/migrations/20261022103706_pazo_f17_private_support.sql`.
2. `supabase/migrations/20261022103707_pazo_f17_gift_benefits.sql`.
3. `supabase/migrations/20261022103708_pazo_f17_maintenance_guard.sql`.

Auditoría Management API readonly: cinco cuerpos que se reemplazan coinciden
con fuentes ya versionadas. Guardas MD5 abortan ante cambios no revisados. El
instalador tampoco reemplaza otro hook `db_pre_request`, incluidas las reglas
por defecto de base de datos. Las cinco tablas nuevas llevan RLS ENABLE/FORCE.

`scripts/f17-schema-batch.mjs` **solo genera SQL**, no usa credenciales ni ejecuta
nada. Sin argumentos muestra archivos/digests. `--sql` prepara una transacción
con `ROLLBACK`; `--sql --commit` prepara COMMIT para el operador autorizado.
Incluye los tres cambios, historial de migraciones y postflight en la misma
transacción. El ensayo aislado demostró que ROLLBACK retira también cron,
configuración de rol e historial, y que COMMIT conserva el estado coherente.
El lote contiene DDL y metadata de migración; no contiene credenciales ni datos de usuarios.

Mantenimiento se instala **OFF/revisión0**. Activarlo después exige que las nuevas
compras Live estén detenidas mediante su control existente; no se detienen por
SQL de F17 ni se cancelan renovaciones automáticamente. Un trigger impide abrir
compras mientras mantenimiento está activo. El administrador puede restaurar
acceso por la entrada independiente; restaurar no cambia controles PayPal.

**Límites explícitos:** Auth sigue disponible para recuperación y operaciones
financieras históricas; objetos ya públicos/cacheados y URLs firmadas ya
emitidas pueden seguir disponibles hasta su vencimiento. RLS protege los datos
de PostgresChanges y canales privados aplicables; PAZO no usa canales públicos
Realtime. No se afirma apagar universalmente el proveedor o revocar contenido
público distribuido. Las políticas intersectan los permisos existentes, sin
conceder acceso adicional ni sustituir ownership/moderación.

## Edge que requiere actualización dirigida

`f16-paypal-supporter-v2-qa` observado **v26 ACTIVE/JWT ON**. Descarga original
antes del cambio:19/20 archivos idénticos a Git; el restante solo difiere en dos
comentarios explicativos. La continuidad funcional del Sandbox aprobado se
preserva, sin repetir compras de prueba.

Su única extensión de runtime es un guard server-side para begin/retry/recovery
que puede crear una suscripción. Usa la RPC service-only
`pazo_f17_service_new_checkout_allowed`, falla cerrado y no sigue redirects.
No intercepta cancel/list/status/verificación histórica. Desplegar solo este
Edge después del SQL, conservando **verify_jwt=true**; no prune ni redeploy
masivo. No modificar Vaultv2 ni los cinco Edge Live ya aprobados.

## Pruebas ejecutadas

Resumen versionado con huellas de fuentes y migraciones:
[`evidence/PAZO_F17_LOCAL_VALIDATION_20261022.json`](evidence/PAZO_F17_LOCAL_VALIDATION_20261022.json).
No contiene identidades reales, tokens ni respuestas de proveedores.

| Verificación | Resultado |
| --- | --- |
| `npm run verify:prepreview` | **1,818 PASS**:11+103+5+4+498+1193+4; TypeScript/build/dist PASS |
| Contratos F17 + errores Mapbox + guard Edge | **16/16 PASS** |
| PG17 completo + F17 | PASS con roles anon/authenticated/service_role y SQL versionado, ROLLBACK/COMMIT e historial atómicos |
| Concurrencia real SQL |12 envíos simultáneos:3 aceptados;8 reenvíos mismo ID:1 fila;8 toggles misma revisión:1 aceptado, después restaurado |
| Chromium local390/1440 | **40 comprobaciones PASS**: roles, recuperación compilada, respuestas sin notas, envío incierto, nonce de cortesía, cambio de cuenta con respuesta pendiente, PWA y ES/EN |
| Lint módulos nuevos/terminados |0 errores/0 warnings; deuda legacy global conservada |

El navegador intercepta Auth/API con fixtures sintéticas: **0 Auth/PayPal alojados,
0 cargos, no instalación física**. No confundir con E2E de una sesión admin
real. CI reproducible preparado en `f17-beta-security.yml` (PG17/concurrencia y
navegador local); CI del nuevo SHA todavía debe leerse en GitHub.

Hallazgos reproducidos antes de corregir: el SQL anterior aceptaba una
`admin_reply` insertada por el dueño y una duración NULL se convertía en regalo
permanente. Las pruebas nuevas rechazan ambas rutas.

## Estado alojado y gates que siguen abiertos

Último postflight readonly: **tres tablas primarias F17 ausentes**, hook REST
sin configurar; pg_cron e historial estándar disponibles. PayPal está ahora en
**canary/revisión1**, Live=true/kill=false, credenciales marcadas válidas y
0 intentos/períodos Live. Es avance externo posterior al handoff antiguo OFF;
no fue activado, detenido ni modificado por esta continuación. No pedir guardar
de nuevo claves ya registradas ni declarar una venta real.

1. **Red:** runtime revisión3 solo permite api.supabase.com. Git HTTPS permite
   push, pero API GitHub/Vercel/Mapbox no están habilitadas. Borrador guardado con
   destinos y `*.vercel.app` para previews dinámicos, conservando bindings;
   requiere que el PO revise/guarde/publique el entorno. No pedir otro token ni
   usar rutas alternas para eludir el bloqueo.
2. Leer CI del SHA exacto, aplicar el gate de autorización F17 y preparar prueba
   alojada ROLLBACK antes del COMMIT del lote. Verificar después fuentes, ACL,
   cinco tablas RLS, cron e historial; no activar mantenimiento ni cambiar canary.
3. Desplegar Edge dirigido y candidato HTTPS aprobado; probar mapa real,
   roles/soporte/cortesía/mantenimiento con cuentas autorizadas y PWA física.
   Las pruebas locales ya hechas no se repiten sin cambio o hallazgo.
4. Aceptación visual/funcional PO y GO de merge/publicación; luego verificar
   main/canonical y refrescar evidencia técnica bajo sus controles originales.
   La URL estable sigue provisional: `https://pazo-app-t83r.vercel.app`.
5. Canary financiero y apertura pública siguen su autorización/evidencia real
   independiente. No inferir `LIVE_CANARY_PASS` de canary activo ni del CI.

**Scope Closure:** código y ensayo local PASS; DB_APPLIED_F17=NO,
EDGE_DEPLOYED_F17=NO, HTTPS_F17/PWA física=NO, MAIN_MERGED_F17=NO.
No sustituir estos gates por el despliegue anterior de F16.
