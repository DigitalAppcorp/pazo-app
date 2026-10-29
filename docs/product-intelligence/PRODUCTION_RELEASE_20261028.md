# PAZO #153 — Publicación y postflight de inteligencia global

**Estado:** PRODUCCIÓN PUBLICADA / NUEVA RECOPILACIÓN ACTIVA.  
**GO final:** autorizado expresamente por el Product Owner después de `PO_VISUAL_ACCEPTED=YES`.  
**Fecha de apertura:** 2026-10-28 18:09:01, Los Ángeles (PDT) / 2026-10-29T01:09:01.761072Z.  
**Versión:** taxonomía v1, 37 tareas autenticadas y 19 señales anónimas cerradas. El hecho de activar la observación **no** acredita eventos de usuarios reales ni una conversión.

## Secuencia ejecutada y fuentes exactas

1. [PR #155](https://github.com/DigitalAppcorp/pazo-app/pull/155): implementación integrada en `main` mediante merge `be3084997fc91aa1cbaebd3896d2d70559d3373e`. Las ocho suites del candidato aprobado inicialmente estaban en verde.
2. Migración única `supabase/migrations/20261029010000_pazo_product_intelligence.sql`, con **SHA256 LF** `7e3e12eb0968aa97c8f0d8f92cd32e46b18b5bf111e916758bc54468db87ba2f` **calculado nuevamente y coincidente** con el manifiesto, instalada alojada bajo versión **`20261029005231`**. Total 135 versiones; no se usó `supabase db push` ni reparación global. Instalación nueva inicialmente `intelligence_enabled=false`; fuentes/fechas anteriores preservadas.
3. Edge `pazo-marketing-landing` desplegada secuencialmente v7 **con nueva señal OFF** y v8 **con recepción nueva ON**, estado **ACTIVE**, conservando `verify_jwt=false` existente, Turnstile de un uso y los receptores de landing y prerregistro anteriores habilitados. La DB rechazó la nueva recogida hasta el último paso.
4. [PR #156](https://github.com/DigitalAppcorp/pazo-app/pull/156): aviso de privacidad ES/EN activado primero, sin nuevas señales, merge **`ba717b4de1192d2d7ea47e128d3b1dbf0f01cd29`**. Vercel producción `dpl_2qWofjo2BHtUuCiTCVPySNPajnX9` verificado **READY** en dominio canónico.
5. [PR #157](https://github.com/DigitalAppcorp/pazo-app/pull/157): clientes autenticados/anónimos activados con límites; se actualizaron pruebas históricas al estado alojado real, y se corrigió la evaluación de visibilidad DOM en entornos sin `window`/`document`. **7/7 workflows SUCCESS** sobre head `1dc7c72a28de209e54b15adc5da7d199566e8107`, incluido CI, PostgreSQL, UX y seguridad; merge final **`b70dff6c372b43d87389c5d5a0423a8f54455d3c`**.
6. Vercel final `dpl_6XNVw4afbDtim71jUPHjp76xDfiM` **READY**, alias **https://pazo-app.vercel.app/** confirmado y SHA igual al merge final.
7. **Último paso:** `marketing_private.collection_gate` habilitado mediante UPDATE condicionado a salud y retención existente: `intelligence_notice_version='pazo-intelligence-notice-v1'`, `intelligence_started_at='2026-10-29T01:09:01.761072Z'`, `intelligence_enabled=true`. `marketing_private.intelligence_ready()=true` verificado posteriormente.

## Controles de seguridad y compatibilidad confirmados

- Anteriores `enabled=true`, `utility_enabled=true`, `behavior_enabled=true` y retención **14 días** preservados; `behavior_ready()=true` antes de la activación final.
- Tablas nuevas `marketing_private.task_events` y `marketing_private.experience_daily`: RLS **ENABLE + FORCE**, sin permisos de lectura directa para visitantes o usuarios autenticados. Los resultados agregados siguen el contrato de MFA `aal2`, muestra mínima de diez cuentas y controles de supresión por filtros.
- **Cron #4** activo, calendario `17 */6 * * *` UTC; últimas tres ejecuciones consultadas previas al lanzamiento: **succeeded**, última `2026-10-29T00:17:00Z`. **Límite:** esa última ejecución ocurrió *antes* de la nueva instalación; **todavía no se ha observado aquí la primera ejecución periódica de la versión nueva del wrapper de purga**. El nuevo wrapper/retención fue validado en laboratorio, no debe presentarse como cron post-release ya confirmado.
- **Snapshot inmediatamente posterior al GO:** `task_events=0`, `experience_daily=0`, `behavior_sessions=0`. En el momento de consulta, `auth.users` elegibles no-QA = **0**; **13** cuentas activas clasificadas QA y excluidas. **No** se fabricaron eventos, conversiones, usuarios ni pagos en producción.
- Meta, PayPal, invitaciones, recomendación del feed y fake doors permanecen sin cambios de reglas. Las fuentes originales siguen siendo los registros autoritativos; la analítica no sustituye ni alimenta directamente el ranking.
- Los nuevos contadores anónimos son **solicitudes**, no personas únicas ni trayectorias vinculadas a registro; campañas desconocidas no equivalen a tráfico orgánico demostrado.

## Evidencia y límites de QA

[Informe del candidato](FINAL_CANDIDATE_REPORT.md) · [Matriz de pruebas](TEST_MATRIX_AND_EVIDENCE.md) · [Taxonomía](EVENT_TAXONOMY_V1.md) · [Runbook](RELEASE_RUNBOOK.md) · [Manifiesto instalado/activo](PREPARED_MIGRATIONS.json).

El candidato empleó navegador nativo, casos sintéticos controlados y PostgreSQL 17 aislado. Se verificó el estado **READY** de producción, esquema/gates, seguridad y cron; **no se ejecutó una sesión completa con una persona real autenticada ni se verificó todavía una señal anónima humana protegida por Turnstile después de habilitar el gate**. No equiparar laboratorio con un E2E humano en producción. Tampoco se acreditó INP de campo, escalabilidad a grandes volúmenes o retención estadística real.

Las posibles mejoras de estética quedan para otra iniciativa, por decisión del PO. **El diseño actual fue aceptado para este lanzamiento**.

## Operación, seguimiento y reversión

- Administración → **Comportamiento** ya muestra cinco preguntas. Con muestra pequeña o inexistente aparecen estados de observación insuficiente: no falsificar ceros como datos reales.
- Siguiente control operativo: comprobar primera ejecución real de Cron #4 **posterior a la migración**, estudiar los primeros informes con muestra elegible, distinguir recepción de señal de éxito real y mantener exclusiones de QA.
- Si aparece un problema material, **pausar solo `marketing_private.collection_gate.intelligence_enabled=false`**. Si es necesario, volver a desplegar frontend/Edge publicados del #150 (referencia `dpl_9uXdNs5HAXmLZAaDd7r2z59uQw8K`) con comprobación de compatibilidad de aviso, conservando SQL privado, ventanas de retención, supresión y Cron. No apagar las mediciones previas ni reiniciar fechas; no borrar tablas o usuarios.
- No ejecutar de nuevo migración `20261029010000`, no hacer `db push`, no crear QA sintético alojado ni activar gastos o invitaciones. Este documento supera la etiqueta histórica `READY_FOR_PO_GO` del candidato.

**Resultado:** fase 7 ejecutada y observabilidad inicial de PAZO publicada. El siguiente trabajo es monitorizar resultados reales, no reconstruir la implementación.
