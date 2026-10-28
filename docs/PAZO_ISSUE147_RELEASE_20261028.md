# PAZO #142 / #147 — RELEASED_AND_VERIFIED

Fecha:28-oct-2026, Guatemala. [GO único del PO](https://github.com/DigitalAppcorp/pazo-app/issues/147#issuecomment-6477690521). Publicación y activación ejecutadas; no se requiere otra autorización para los subpasos ya cubiertos. Este informe sustituye los estados «no publicado» de los paquetes anteriores, que se conservan como historia.

## Integración y producción

| Elemento | Resultado verificado |
| --- | --- |
| [PAZO PR #148](https://github.com/DigitalAppcorp/pazo-app/pull/148) | MERGED; main de producto `4ce38450bd0e3b5dee3249525b56aaaef08eaece` |
| [Brain OS PR #13](https://github.com/DigitalAppcorp/project-brain-os/pull/13) | MERGED; `84ce94f39f461e44cf320f10319612c5eedf0f03` |
| Código aprobado | Producto39943f15, head revisado cbf3b22c; fuente y configuración de compilación idénticas en4ce38450 |
| Producción | `dpl_GRzYRttARoYb6QaKX6fEuvWo2p4p`, READY, targetproduction, GitSHA4ce38450 |
| Dominio canónico | [pazo-app.vercel.app](https://pazo-app.vercel.app), resuelto a `dpl_GRzYRttARoYb6QaKX6fEuvWo2p4p` / Git4ce38450 |
| Artefacto inmutable | [pazo-momenv2xm-digitalapp.vercel.app](https://pazo-momenv2xm-digitalapp.vercel.app) |
| Configuración | Build separado con variables de producción; proyecto Supabasemrybvqdebbgcayuvgkkr y clave pública compilada comparados contra configuración de producción sin imprimir credenciales |

Se promovió el build de producción sin reconstruirlo, después de probarlo. No se promocionó la preview de staging ni una interfaz anterior. El bundle publicado por el canónico coincide con los seis hashes del build validado; contiene el aviso ES/EN y las piezas correctas: carga/error son pantallas ilustradas enmain y solo el primer uso es un aviso independiente.

## SQL, activación y privacidad

Se instaló **únicamente** `20261028075145_pazo_first_utility_outcomes.sql` mediante `apply_migration`. HashSHA256 `3cd09d8a97c3f65644a2ac269d549c9b46c9c9da1b39cc7b4dd4ba73420bb83c`,11710bytes. Supabase asignó versión`20261028185856`; el contenido alojado coincide byte por byte. El [índice aditivo](evidence/marketing-e2e-20261026/prepared-migrations.json) relaciona ambas versiones. No se renombró/reparó la historia ni se usó `db push`:132 filas anteriores conservan susMD5 y solo se añadió una, total133.

La instalación quedó OFF y se verificaron RLS/ACL/trigger antes de seguir. Tras publicar y ver el aviso en ambos idiomas se activaron únicamente:

- `utility_enabled=true`.
- `utility_started_at=2026-10-28T19:17:46.696036Z`: **13:17:46 del28-oct, Guatemala**.
- `utility_notice_version=pazo-first-utility-notice-v1`.

El gate previo de marketing conserva enabled, fecha y versión originales. Retención14d, `retention_ready=true`; tarea existente activa cada seis horas, horario y huella de su comando sin cambios. Las dos tablas nuevas son privadas con FORCE RLS y sin privilegios de lectura para anon/authenticated/service_role. Las RPC rechazan anon; la señal verifica propiedad y el agregado exige administrador. El trigger de cuidado sigue siendo opcional y no puede impedir guardar el cuidado por un error de medición.

QA existente marcada por app_metadata resulta no elegible y sus señales se rechazan con la medición ON. No se crearon cuentas ni conversiones alojadas para demostrar éxito; resultado observado:0 filas de primera utilidad tras los controles. No se presenta como resultado de negocio: solo son elegibles cuentas verificadas desde la activación y D7 aún no ha madurado. Sin Pixel/CAPI, texto de cuidados, QR, ubicación ni contactos en métricas; supresión/baja y purga conservadas.

## Verificación

| Alcance | Evidencia |
| --- | --- |
| Build producción real, Auth/datos controlados |24 casos ES/EN320/390/430, seis recuperaciones, cuatro casos de altura568 PASS |
| Primer perfil / QR / Agenda |Seis recorridos del frontend de producción con PostgreSQL17/RLS/trigger real aislado PASS; Share simulado, descarga bajo fallo métrico |
| Navegación y sesiones |Seis recorridos/18 visitas con feed pendiente, ABA, offline y reintento PASS;0 pageerrors y0 escrituras QA alojadas |
| Canónico público real |51 comprobaciones Chromium de Auth/formularios, rutas PayPal negativas, labels, escritorio/móvil, ES/EN y PWA/SW network-only PASS |
| Aviso público real |Privacidad abierta y visible ES/EN: primera utilidad,14d y ausencia de envío individual a Meta;0 pageerrors, sin enviar registro |
| Backend alojado real |11 checks existentes HTTPS/PayPal readiness/denegaciones/maintenance PASS; dos RPC nuevas presentes y anon401/42501; Auth sin token401 |
| Permisos / agregado |QA confiable excluida, señales rechazadas, nonadmin denegado y agregado admin collecting/14d/array PASS en aserción transaccional, sin modificar sesiones reales |
| Retención e historia |Salud14d y Cron activos,133 versiones,132 hashes anteriores intactos, RLS/ACL y mapeo SQL exactos |
| Regresiones previas |Gobernanza776 (App27/primer uso24/cierre527 incluidos), F161196, F1453, dist/PWA4 yPG32 PASS;15 guards históricos/reconciliación PASS |

CI del head aprobado cbf3: [principal](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40747240097), [PG/browser/composición](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40747240185), [marketing](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40747239928), [F17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40747239910), [F18](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40747239927), todos SUCCESS. [Brain13:13+12 pruebas](https://github.com/DigitalAppcorp/project-brain-os/actions/runs/40745078592) SUCCESS. Los gates del PR documental final se enlazan en la incidencia para no introducir un hash autorreferencial en este archivo.

[Paquete de publicación](evidence/issue147-release-20261028/): JSON, capturas completas, origen, límites y manifiestoSHA256. El mapa original se amplió; los guards de historia ahora comprueban instalación dirigida exacta en vez de seguir afirmando que está pendiente. No hay cambios de producto posteriores a4ce38450 en ese cierre documental.

## Observación, límites y reversión

PayPal sigue public, revisión3/generación1, Live habilitado y kill-switchfalse. Checkout e invitaciones públicas conservan sus flags y certificación anteriores; no se activó una oferta ni se efectuó un cobro. El postflight usa readiness y peticiones inválidas denegadas, nunca una compra real.

En la ventana inspeccionada13:00–13:19 Guatemala (19:00–19:19UTC), Supabase no devolvió HTTP5xx ni errores de funciones. Hubo cuatro eventos PostgreSQL42501 de denegación de permisos durante la ventana con pruebas negativas; no FATAL/PANIC. Vercel no devolvió errores runtime en los15min consultados. Es una observación acotada, no una garantía futura ni telemetría completa del navegador.

La deuda ESLint166 diagnósticos se conserva. Los [avisos de security-definer](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) de las dos RPC nuevas son esperados y están protegidos por guards/ACL; las [tablas privadas sin políticas cliente](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) son deliberadamente inaccesibles. La [advertencia heredada de contraseñas filtradas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) no se cambió en este alcance.

Los flujos de primera mascota y herramientas se probaron con assets reales de producción y servicios interceptados hacia PostgreSQL aislado. Los formularios/privacidad/PWA/denegaciones y controles de esquema/QA excluida sí se probaron contra producción real. No se afirma un login humano/MFA positivo nuevo, entrega externa de Share, compra real, dispositivo físico, conversión ni mejora de rendimiento.

Reversión disponible: deployment`dpl_3KrqGdJmijURjdirv1W1iwhkhSW7`, Git`8dbf4ef5fe7a926f1caee3a55ee3c60f31400c04`, [artefacto estable](https://pazo-o7ggl0531-digitalapp.vercel.app). Ante fallo crítico: primero `UPDATE marketing_private.collection_gate SET utility_enabled=false WHERE singleton;`, luego `vercel rollback https://pazo-o7ggl0531-digitalapp.vercel.app --scope digitalapp --yes`, verificar canónico y conservar purga/auditoría. No DROP ni alteración de Auth/pagos. No fue necesario ejecutar rollback del lanzamiento final.
