# Issue96 — cierre técnico de medición interna de campañas

Fecha de trabajo: 23-oct-2026 (America/Guatemala; archivos de migración y logs usan UTC).
Rama: `feat/f17-marketing-firstparty-20261023`, [PR91 DRAFT](https://github.com/DigitalAppcorp/pazo-app/pull/91).
Orden: [#96](https://github.com/DigitalAppcorp/pazo-app/issues/96) / [orden Codex](CODEX_F17_MARKETING_PROGRAMMING_FINISH_ORDER_20261023.md).
Alcance: programación, pruebas y procedimientos; instalación, activación y publicidad requieren GO separado.

## Matriz de alcance

| Paso de la orden | Implementación / validación | Estado |
| --- | --- | --- |
| 1. Reconciliar F17 | Merge conservador de F17 `19c0b659` en `29bb62e4`. Se conservan orden96 y handoff actual. Cuatro SQL financieros y beneficios/mapa idénticos a base; guard de versiones intacto | PASS |
| 2. Antiabuso fiable | Token Turnstile efímero, un uso, validado en servidor contra hostname/action/fecha exactos antes del RPC y sus cupos. Sin configuración/éxito auténtico: cerrado. Origin solo CORS. Flood/replay/fallo proveedor/host ajeno probados | PASS código; proveedor no configurado ni activado |
| 3. Retención automática | Migración nueva separada; NULL-safe policy, purga atómica/mutex, heartbeat mínimo, última ejecución Cron exitosa obligatoria, bloqueo ante fallo/ausencia/vencimiento. Instalación/remoción idempotentes y separadas de db push | PASS local PG17; Cron es un doble de proveedor explícito |
| 4. E2E / semántica | UTM→señal protegida→solicitud Auth→confirmación sintética→mascota real en SQL→panel agregado. Auth no confirma por solicitar. QA/admin/fundador retroactivos, TTL72h, primera mascota literal <7d, D7, roles, concurrencia, borrado y LA/DST | PASS local |
| 5. Administración | OFF sin llamadas/números ficticios; JSON estricto, carga/error/reintento, teclado, tabla responsive ES/EN, error independiente del resumen y solo agregados. No visitas únicas/ROAS/tasa falsa | PASS local Chromium |
| 6. CI y seguridad | 5 runs /13 jobs PASS sobre código5cb0056f: marketing37 Node/26 PG/54 navegador; governance/build, F16/PG17 y checksums financieros | PASS |
| 7. Preparación y evidencia | [Runbook](PAZO_MARKETING_INSTALLATION_RUNBOOK_20261023.md), operaciones/póstflight separados, privacidad/inventario y handoff actualizados. Cero operaciones alojadas | PASS código/documentación |

No declarar F17 fase COMPLETADA: no merge main, backend alojado ni activación en esta tarea.

**TECHNICAL_CODE_DONE / COLLECTION_OFF / NOT_DEPLOYED.** No quedan fallos técnicos conocidos dentro del alcance de programación autorizado. El GO de instalación/privacidad/proveedor/activación es una decisión futura, no se solicita para terminar este código. [Evidencia CI estructurada](evidence/issue96/ci-code.json). Código fuente verificado: `5cb0056fcdb56abd144d5b8dce372becc6ad5953`; cambios posteriores de cierre son documentación únicamente.

| Workflow del código final | Run | Resultado |
| --- | --- | --- |
| Marketing PR / push | [40061797087](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40061797087), [40061793986](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40061793986) | 1+1 jobs PASS;37/26/54 |
| CI general | [40061797088](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40061797088) | 7/7 PASS, sin quitar gates |
| F16 gradual | [40061797116](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40061797116) | 2/2 PASS |
| F17 seguridad PG/navegador | [40061816438](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40061816438) | 2/2 PASS, dispatch en la misma rama |

Checksums fuente SQL: primera migración `3259767f49e9b3be7dbe2dbe0a979c2a36a25ac21bcd74e3b8eaa5ec8ba85bee`; nueva retención `72e5edda023a49c44a81d742092c026359815765afc9ce8c8067372847c40a3e`. Ninguna instalada en hosted. Build PASS con advertencia preexistente de chunks grandes.

## Cambios concretos

- `pazo-marketing-landing/challengeVerifier.mjs`: solo Siteverify oficial HTTPS, secreto servidor, token acotado en cabecera, timeout5s, éxito booleano/hostname `pazo-app.vercel.app`/acción `pazo_marketing_landing` y timestamp≤5min. Sin reintentos/reutilización, IP remota, logs o token persistido. La garantía de un solo uso es del proveedor y se prueba su límite con un doble; no se presenta como verificación Cloudflare real.
- Cliente carga el script oficial únicamente si el gate y site key están configurados. Solo clave Invisible: un fallo/interacción requerida descarta la señal, sin interfaz o casilla de registro y sin bloquear Auth. Código, tokens, secretos y recursos de Cloudflare permanecen inactivos con flags actuales. La marca de intento en sessionStorage suprime repeticiones24h; no garantiza entrega ni visitantes únicos.
- CORS de ambos intakes admite cabeceras de supabase-js; ningún campo de cuerpo adicional. Cuenta viene de Auth GET verificado, jamás metadata editable o user ID del navegador. Primera sesión restaurada y refresco pueden completar confirmación pendiente; callback Auth difiere transporte para evitar bloqueo de sesión. Un envío en vuelo se deduplica y solo limpia el mismo payload; cambio de cuenta limpia staging.
- Ambos cuerpos tienen límite de bytes y plazo total3s, con cancelación de streams lentos antes de consultar Auth/proveedor/SQL. El token no va en URL ni cuerpo persistido.
- `20261024034549_pazo_marketing_retention_health.sql`: archivo generado por CLI, preparado y no aplicado. No modifica la migración inicial ni SQL F16. Política NULL no puede abrir gate. Una purga fallida revierte todas las eliminaciones y heartbeat; mutex evita solapamientos. Guarda solo última fecha/política y conteos. Sin filas por persona en auditoría de limpieza.
- Gate de recopilación e intakes requieren último Cron completado exitoso y heartbeat compatibles con política vigente en≤7h; job activo, dueño/base/comando/calendario exactos. Fallo reciente no se oculta con éxito anterior. El reporte devuelve paused cuando la salud de borrado no permite ingreso. No se activa cron desde migración.
- Instalar calendario exige OFF, política válida y cero conflictos; instalación idéntica retorna mismo job. Retirar exige OFF y ausencia de datos pendientes de borrado: no se detiene eliminación para revertir frontend. Plantillas separadas exigen GO de operador. El wrapper de activación además comprueba extensión pg_cron real.
- El primer animal es min(created_at), dentro de la ventana semiabierta de siete días y no futuro; una segunda mascota no sustituye la primera. Índice de recorded_at apoya caducidad. QA/fundador/admin se excluyen al consultar, incluso tras atribución. Baja Auth borra atribución por FK; no altera finanzas/mascotas.
- Validador de resumen rechaza identidades/etiquetas libres, fechas imposibles, conteos inválidos, duplicados, períodos arbitrarios y totales inconsistentes antes de pintar. Campañas no muestra timestamp, refresh ni rótulo de prueba pertenecientes al resumen general. Conserva estilos de PAZO/cero contornos.

## Evidencia reproducible

- `npm run test:marketing`: incluye casos de proveedor, replay y64 ataques con Origin falsificado sin consumir RPC; payload/no PII, Auth, TTL, UI y agregado.
- `npm run test:marketing:pg17`: contenedor fijo **pazo-marketing-lab**, DB **pazo_marketing_synthetic**; nunca acepta URL remota. Legacy SQL + migración nueva exacta, roles/RLS,40 escrituras concurrentes y12 atribuciones duplicadas, primera mascota/exclusión/expiry, fallos de purga y calendario. CI usa servicio postgres17 aislado con guard de host/base.
- `npm run test:marketing:e2e`: Vite en127.0.0.1:5185, Chromium real. Utiliza AuthProvider, OnboardingView, handlers/adaptadores Edge y AdminDashboard reales conectados a ese PG. Email/Auth y Siteverify son proveedores sintéticos. Toda red externa se intercepta antes de conectar; ningún usuario alojado. Positivos habilitan flags **solo en respuestas de módulos del fixture local**, sin cambiar fuente OFF. El caso OFF usa fuente sin transformar y confirma cero tráfico/almacenamiento.
- Capturas ES/EN390/1440 en artefacto CI `marketing-synthetic-browser`. Solo números de fixtures, sin pagadores/identidades. Inspección técnica y teclado/reduced-motion, no atribuir aprobación visual nueva al PO.
- `npm run test:governance`, `npm run test:gradual`, `npm run test:gradual:pg17`, `npm run test:f16:synthetic`, `npm run build`; CI general conserva todos sus gates. Los1197 casos financieros son offline; no repetir Sandbox aprobado ni crear ventas.
- `node --test scripts/f17-hosted-migration-versions.test.mjs` preservado; diff de cuatro migraciones financieras y src/features/supporter/places contra F17 vacío.

El doble Cron reproduce schedule/job/history/unschedule y ejecuta el comando SQL en transacciones separadas, con fallos y dos ejecuciones sucesivas. **No es extensión pg_cron real ni prueba de reloj alojado**. El instalador real exige extensión y un GO; antes de recopilar habrá que observar ejecuciones reales según runbook. El fixture de30 días no decide la retención: fuente conserva0.

## Límites externos y gates futuros

Todo el trabajo técnico se puede verificar sin autorizar producción. Siguen pendientes **para una futura instalación/activación**, fuera del alcance actual:

1. GO para instalar únicamente las dos migraciones/Edge/frontend con gates OFF y auditar versiones históricas; nunca db push global.
2. Decisión del plazo (0 ahora;30 días no aprobado), aviso público ES/EN, obligaciones aplicables y ciclo de backups/PITR/restauración. Borrado de tabla viva no borra copias.
3. Aprobación/configuración de Cloudflare Turnstile Invisible y tratamiento de metadatos de red/logs del proveedor, site key y secreto mediante canal privado; evaluar cuotas/WAF del alojamiento. No se creó cuenta, adquirió plan ni usó secretos. La modalidad gratuita no promete precio, SLA o defensa absoluta contra DDoS; verificar condiciones vigentes al GO. Alternativa actual: señal anónima OFF.
4. GO para instalar/observar Cron real con colección OFF. Solo después GO independiente para recopilar. Anuncios/creativos/Meta Pixel/CAPI/PostHog y presupuesto no pertenecen a este PR.

No se cambiaron Supabase, Vercel, secretos, cron, campañas o datos alojados. El estado financiero L1 descrito por F17 se conserva; no se repite ni deshace la operación ajena de #88/#85.
