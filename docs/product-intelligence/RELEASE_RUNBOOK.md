# Runbook #153 — preparado, no ejecutado

La entrega de fases 0–6 no autoriza fase 7. No fusionar ni publicar producción ni activar nueva recogida hasta GO final explícito del PO. Staging usa frontend de preview y servicios/Auth controlados con PostgreSQL 17 desechable; no existe una rama Supabase facturable ni una base de staging con datos reales.

## Base protegida

Main de partida `98f6d599b622803bcf495d8f6d3fa0e0d8490f69`. #150 ya publicado: PR151 merge `3dcd2e2e978bd9ea833c10efad0573d56ad57231`, producción `dpl_9uXdNs5HAXmLZAaDd7r2z59uQw8K`, canónico `pazo-app.vercel.app`. 134 migraciones; #150 SQL fuente `20261028210000` corresponde a versión alojada `20261028215020`, no volver a aplicar. Fechas behavior `2026-10-28T22:04:51.67516Z`, utilidad `2026-10-28T19:17:46.696036Z`; no reiniciar. [Snapshot de metadatos](evidence/baseline.json), [gates/algoritmos/Cron](evidence/protection-preflight.json).

## Solo después del GO final

1. Revalidar main, deployment, diff aprobado, CI, 134 versiones/MD5 previos, gates y hashes de funciones protegidas. Si hubo cambios externos, reconciliar; nunca `supabase db push` indiscriminado.
2. Aplicar exclusivamente `supabase/migrations/20261029010000_pazo_product_intelligence.sql` en transacción, cotejando el SHA256 normalizado LF del Git blob del informe final y [manifest preparado](PREPARED_MIGRATIONS.json). Registrar versión alojada real y digest sin repetir la fuente; actualizar el mapeo preparado/instalado y sus guardas históricas en el commit de release. La instalación deja `intelligence_enabled=false`; no cambia fechas/gates previos, ranking, pagos o fake doors.
3. Publicar aviso ES/EN preparado (`INTELLIGENCE_NOTICE_RELEASED=true`), frontend y Edge con sus gates nuevos todavía OFF. Revalidar funciones/grants/RLS, misma cadena Cron y purga saludable, campos del aviso, Auth/MFA/QR/PWA y rollback. La Edge conserva flags previos landing/prereg true, mismo Turnstile y `verify_jwt=false` existente; no sustituir configuración o secretos.
4. En el commit de activación autorizado actualizar las expectativas OFF de las pruebas solo con el GO y la evidencia de instalación/aviso; preservar denegaciones, privacidad y regresiones. Habilitar `INTELLIGENCE_COLLECTION_ENABLED` y `INTELLIGENCE_EXPERIENCE_RELEASED`; revalidar artefactos y aviso publicado. Registrar el inicio real, sin retroactividad, sin reiniciar el inicio si es una reactivación, con `intelligence_notice_version='pazo-intelligence-notice-v1'` e `intelligence_started_at` real antes de `intelligence_enabled=true`. El orden puede perder señales mientras DB está OFF; nunca recoger antes del aviso.
5. Postflight: gates/fechas anteriores iguales, nueva cobertura correcta, RPC no-admin/AAL1 denegados, GPC/retirada, Cron saludable, límites/muestras, navegación móvil lenta/offline y recuperación. No crear QA artificial en producción ni activar cobros/invitaciones para comprobar analítica. Sin muestra real, mostrar observación insuficiente y esperar; no prometer demanda o retención.

## Reversión

Pausar únicamente `intelligence_enabled=false` y los gates frontend/Edge nuevos. Conservar el aviso histórico de tratamiento si hubo datos. Reponer el frontend/Edge #150 verificado si es necesario; referencia de rollback de esta mejora es `dpl_9uXdNs5HAXmLZAaDd7r2z59uQw8K`, no una versión anterior sin #150. No apagar marketing/behavior/utility anteriores ni reiniciar fechas. Mantener Cron y purga encadenada para eliminar datos nuevos al vencer; no borrar tablas o migraciones durante una reversión rutinaria. Una eliminación extraordinaria exige instrucción específica y verificación del ámbito.

Frenar activación ante RLS/grants inesperados, metadatos de migración divergentes, filtración de identidad, purga no saludable, reintentos sin límite o regresión crítica. Esta lista orienta el futuro release; no es una solicitud de aprobación parcial ni un despliegue en curso.
