# #168 — campaña 2, candidato sin lanzamiento

Orden del PO del 30-oct-2026: implementar #168 antes de #169, preparar PR y pruebas; ningún merge, SQL alojado, producción, publicación publicitaria ni gasto. Módulo I (infraestructura que habilita adquisición), implementación autorizada; el gate de lanzamiento permanece cerrado.

## Auditoría verificada

- Base de código: `main@0cc3ef7e8456846de5700ab78f4277bcdde46e66`, obtenida de GitHub. El parser, ambos Edge y SQL solo admitían la campaña histórica. No se encontró integración Meta en esas fuentes.
- Producción pública, 31-oct 03:37 UTC (30-oct Guatemala): HTTP200; HTML y script de entrada sin referencias a `connect.facebook.net`, `fbevents.js` o `graph.facebook.com`. Alcance limitado: no demuestra ausencia de toda integración externa fuera de esos recursos.
- SELECT en proyecto Supabase PAZO: cuatro gates existentes activos con sus fechas originales; retención14d, política `pazo-marketing-attribution-notice-v1`; heartbeat31-oct00:17UTC. Cron4 succeeded30-oct18:17 y31-oct00:17UTC. Edge attributionv4 y landingv8 ACTIVE. No escritura alojada ni reinstalación.
- Auth actual usa verificación confiable servidor `/auth/v1/user` y exige `mailer_autoconfirm=false`. SQL deriva `email_confirmed_at`, ventana72h y elegibilidad; no acepta identidad ni confirmación del navegador. Las cuentas QA, fundador, administrador y cohorte de pruebas existentes se excluyen en backend. Las pruebas de correo son dobles locales, no correos nuevos de producción.
- Events Manager leído en la cuenta visible: único origen mostrado «Guastayomi», de tipo app, inactivo; no Pixel/dataset web PAZO observado y ningún `CompleteRegistration` de PAZO verificado. No se configura ni reutiliza ese origen ajeno. `META_CONVERSION_NOT_VERIFIED`.
- El aviso first-party vigente no autoriza por inferencia transferencias a Meta. La exclusión local explícita del administrador existe; una llegada anónima no permite saber quién es administrador. Las llegadas siguen siendo solicitudes, no personas ni conversiones.

## Contrato implementado

Contrato compartido cliente/Edge: `supabase/functions/_shared/marketingCampaign.mjs`. La campaña histórica y sus seis creatividades permanecen válidas. `pazo_la_en_202611` solo admite `qr_v2_en`, `cuidados_v2_en`, `app_v2_en`; pares cruzados rechazados. Tres URLs HTTPS canónicas en [ads2-urls.json](ads2-urls.json), todas imágenes; no hay anuncios, imágenes ni copys en Git.

Migración aditiva `20261031032812_pazo_ads2_campaign_contract.sql`: tablas y lectores admiten el catálogo cerrado; campaña se deriva del creativo disjunto en servidor, sin ampliar contratos RPC ni confiar en campaña del cliente. Conserva filas históricas, retención, timestamps/gates, RLS/ACL, presupuestos antiabuso, supresión complementaria k10 y acceso agregado AAL1 de #161. Los filtros y etiquetas separan ensayo2/histórico, Cuidados nunca se reporta como Comunidad. Las tasas siguen siendo observacionales.

La migración está **PREPARED_NOT_APPLIED**. No ejecutar db push global, migration repair ni reinstalar historia. Antes de un futuro release autorizado: revisión dirigida de esta única migración, desplegar ambos Edge y frontend coherentemente, verificar SQL/retención, y probar las URLs exactas. Reversión operativa: detener uso de URLs nuevas y revertir frontend/Edge; preservar filas del ensayo y no forzar constraints históricos mientras existan filas nuevas. No apagar la purga ni resetear fechas de recogida.

## Validación y límites

Pruebas `ads2.test.mjs`: matriz completa de pares cliente/Edge, tres imágenes, signup solicitado separado de verificado y conservación de campaña al generar intake. Regresiones marketing, inteligencia, panel visual y gobernanza; build TypeScript/Vite. Los loaders de fixtures se ajustan a la nueva dependencia compartida sin retirar assertions.

`ads2-pg17.mjs` corre sobre PostgreSQL17 desechable; incluye las suites anteriores y verifica historia/gates intactos, tres creativos, aterrizaje/prerregistro/alta, ocho requests concurrentes con una sola adquisición, mascota→cuidado, QA retroactiva, pares cruzados denegados y RLS. Cron y Auth son dobles explícitos; no certifican replay de toda la historia ni correos reales. `ads2-browser.mjs` verifica cliente real→Edge real→PG17 con Auth/Turnstile interceptados en ES/EN y390/430px, tres creativos; no comunica con proveedores reales. Evidencia en artifacts del workflow Ads2.

Este PR prepara la compatibilidad, no publica la campaña ni certifica conversiones de Meta. #169 tiene autorización técnica separada para preparar Pixel/CAPI OFF; requiere gates de privacidad y proveedor antes de cualquier transmisión.
