# Auditoría técnica y de alcance — PAZO MVP Beta y PayPal Live
**Fecha:** 2026-10-19 · **Fuente:** GitHub PR #44 \`09648bc55bf39492471d97aa4ff45e840b991b78\`, Project Brain OS v1.4.1, Supabase \`mrybvqdebbgcayuvgkkr\`, Vercel \`pazo-app-t83r\`. **Solo lectura de proveedores: no se realizaron escrituras SQL, despliegues, cobros ni cambios Live durante esta auditoría.**

## Dictamen ejecutivo
**A. MVP social gratuito:** IMPLEMENTADO Y CANDIDATO A PREVIEW FINAL, **no certificado aún como beta pública**. No se ha hallado un defecto funcional central reproducido en Auth/Feed/mascotas/comunidades/mapa que justifique rehacerlo. Las QA previamente aprobadas por PO permanecen válidas salvo regresión demostrable. Falta aceptación puntual de UI reciente, una revisión mínima de exposición/operación y pruebas HTTPS/PWA en el último Preview aprobado.
**B. F16 Sandbox:** código, funciones y datos reales de prueba disponibles. OAuth del checkout Legacy verificado por PO en panel. 2 períodos con dos ventas distintas, sin anomalías de importe/moneda/fechas, pero inbox financiero retenido y la última conciliación completa siguen ABIERTOS; no considerar los eventos pendientes como cargos nuevos.
**C. PayPal Live desde el panel:** **NO IMPLEMENTADO OPERATIVAMENTE**. Hay configuración Vault/UI y lectores/contratos de seguridad offline, pero NO selector transaccional real, checkout Live, webhook Live alojado, ledger/beneficios Live, cancelación histórica Live ni autorización de conmutación. Lanzar la beta no cambia esto.

Esta auditoría es **inventario íntegro de árbol/PR + verificación de workflows + inspección profunda y selectiva de superficies críticas + estado alojado**. No constituye una revisión manual línea por línea de los 1,107 archivos, un pentest ni prueba de usuario en dispositivo. No etiquetar como tal.

## Cobertura e integridad
- GitHub: árbol de HEAD **1,107 archivos**, incluidos **138 TS/TSX**, **416 JS/MJS**, **237 SQL**, **240 documentos md/txt** y **299 rutas de pruebas/laboratorios** por inventario de nombres. PR #44 contra rama base \`release/mvp-beta-fast-track-20261010\`: **836 archivos añadidos o modificados; 0 eliminados** en el árbol resultante.
- PR #44 sigue **DRAFT, no fusionado**, HEAD \`09648bc\`, base \`f5f47b8\`. **CI + seis PostgreSQL labs: 7/7 SUCCESS** en este HEAD. Suites incluyen gobierno/arquitectura/privacidad, pruebas F14/F16, compilación TS/Vite, PWA, pruebas del artefacto distribuible y guard contra Live prematuro. No atribuir una prueba E2E a CI sintética.
- Brain OS: \`DigitalAppcorp/project-brain-os/SKILL.md\`, \`patterns/VERIFIABLE_HANDOFF.md\`, \`patterns/SCOPE_CLOSURE_RECONCILIATION.md\`. Canonidad: \`AGENTS.md\`, \`docs/PAZO_ACTIVE_HANDOFF.md\`, \`docs/PAZO_MASTER_ROADMAP.md\` y ruta R0–R9. Múltiples docs históricos del 10–18 de octubre contienen “pendientes” **superados** por commits y datos actuales. No sumar todos los TODO históricos como deuda real.

## Matriz de producto, sin repetir pruebas aprobadas
| Área | Implementación/fuente observada | Dictamen para beta social |
|---|---|---|
| Auth, registro, recuperación, mascotas | App.tsx, features/auth y onboarding, \`pets\`, QA PO histórica de registro/sesión/F5 | Código presente; **QA previamente aceptada**. Solo smoke de release final |
| Feed y comentarios/interacciones | Lectura social y recomendados paginados, estados de like/save recuperados, tests de feed | Integrado, no reabrir sin regresión |
| QR/pasaporte, cuidados/documentos/recordatorios y alertas | Vistas/modales reales + tablas/Supabase en QA anterior | Implementados; smoke limitado al build final |
| Comunidades, eventos, lugares/mapa/búsqueda | \`CommunitiesView\`, \`MapView\`, Mapbox, áreas de \`src/features/\` | Core implementado, con extensiones futuras señalizadas mediante fake doors; no exigir construir todas las extensiones |
| Mensajería | \`MessagesModal.tsx\` declara para cuentas reales una **superficie informativa de módulo futuro**, sin afirmar que envía mensajes reales | No es mensajería productiva; aceptable solo si queda claramente “en desarrollo” y fuera del núcleo beta |
| Centro administrativo | \`AdminDashboard\` y servicio RPC con usuarios, mascotas, actividad, fake doors, Sandbox e infraestructura estimada; moderación aparte | Funcional y con datos fuente; **fidelidad visual de última revisión aún no aceptada por PO**. No inventar facturación Live/egress |
| Membresía F16 — UI | Código de entrada \`PetView\` estabilizado; \`SandboxV2AccountPanel consumer\` esconde controles de laboratorio tras \`supporter_debug=1\` únicamente DEV/local | **Corrección codificada/CI PASS; aceptación visual PO específica sigue pendiente** |
| Cuatro beneficios | Insignias Feed/perfil, cinco fondos con RPC, muro opt-in/out, medallas por períodos verificados; PNG originales | Código/backend presente; E2E integral y aceptación visual de todas las superficies todavía no documentados como PASS |
| Legal | \`LEGAL_RELEASE_READY=true\`; operador y contacto ES/EN reales. \`PAZO_LEGAL_EFFECTIVE_DATE=null\` por diseño hasta publicar | NO rehacer política por docs antiguas con READY=false; asignar fecha efectiva al publicar y verificar acceso/copy |
| Moderación y bajas | Moderador/admin habilitados; denuncias y solicitud de baja existentes, flujo manual; \`DELETION_EXECUTOR_ENABLED=false\`, purga automática media por flag | Operación manual aceptable con SOP y capacidad real; no prometer borrado instantáneo de Storage/CDN |

## Supabase alojado: evidencia agregada, sin identificadores
- Auth: **8 cuentas**; social: **5 mascotas, 4 publicaciones, 2 comunidades**. Datos de QA, no métricas públicas de adopción.
- **1 administrador, 1 moderador, 1 denuncia y 1 solicitud de eliminación** (no concluir estado únicamente por count).
- F16 Sandbox: **2 períodos, 2 ventas y 2 owners distintos; 0 invalidez contractual** en oferta USD 2.99, Sandbox y fechas. **2 temas de mascota guardados, 2 consentimientos activos**. Documento anterior \`F16_REAL_SANDBOX_FOUR_BENEFITS_AUDIT_20261018.md\` decía cero por fotografía antigua: está supersedido en esos conteos.
- **26 webhooks firmados pendientes/retenidos:** 13 CREATED, 5 ACTIVATED, 5 SALE.COMPLETED, 3 CANCELLED. **0 \`paypal_payment_entries\`** en el ledger prospectivo alternativo. No comparar el valor de ese ledger con los 2 períodos QA como si fueran la misma contabilidad; reconciliar correlación y worker deliberadamente apagado antes de activarlo. No activar writer ni conceder períodos por simple contador.
- Config PayPal: \`paypal_gateway_runtime.active_environment=sandbox\`, \`live_checkout_enabled=false\`. Sandbox y Live en el nuevo panel \`paypal_gateway_settings\`: ambas filas **sin pares Vault, sin webhook y sin origen oficial configurados**. Las credenciales históricas Sandbox operan en Edge secrets, no en esas filas.
- ACL: auditoría SQL no encontró \`SELECT\` directo de \`anon\`/ \`authenticated\` en tablas de los esquemas privados revisados (\`supporter_private\`, \`admin_private\`, \`moderation_private\`, \`account_requests_private\`). Esto NO equivale a auditar cada RPC o negar riesgos lógicos.
- Security Advisor: 29 INFO RLS no-policy (muchas deny-all privadas por diseño), **4 WARN \`SECURITY DEFINER\` invocables por anon** (funciones de visibilidad/badges/muro públicas), **38 WARN** por authenticated; revisar límites/contratos, no revocar a ciegas. **Leaked Password Protection OFF** según asesor y amerita activación/revisión para beta. Performance Advisor: 16 FK sin índice, 7 índices no usados, 1 duplicado; mantenimiento sujeto a medición, no bloquear automáticamente beta pequeña.
  - Fuente técnica: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
  - Fuente técnica: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Diferencia inventario Edge alojado ↔ control de versiones (nuevo hallazgo)
- Supabase tiene **10 Edge Functions ACTIVE**. El árbol fuente contiene **9 carpetas de funciones** (excluida `.env.example`). En particular `f16-paypal-sandbox-sale-review` **v3 ACTIVE / verify_jwt=true** aparece en Supabase pero NO existe `supabase/functions/f16-paypal-sandbox-sale-review/index.ts` en el PR #44. Sus 4 helpers sí están bajo `supabase/functions/f16-paypal-webhook/`.
- Inspección del entrypoint alojado: es un **diagnóstico Sandbox P44 owner-only, read-only**, con validación JWT/owner, sin creación de suscripción ni acreditación de beneficios. La existencia de un POST interno de lectura RPC/PayPal NO significa que inicie un pago. No reescribirlo ni apagarlo sin gate.
- **Acción técnica pendiente (P1 de reproducibilidad):** recuperar su entrypoint versionado exacto, vincular los helpers compartidos de forma compatible, probar parity y registrar qué SHA/canal lo desplegó. No interpretar su ausencia de carpeta como ausencia de la función; no reinstalar ni activar cobros para cerrarlo.

## Frontend de release, hosting y PWA
- \`src/features/supporter/components/SupporterAccountManagement.tsx\`: cuando \`VITE_PAZO_F16_SANDBOX_QA_UI\` no es \`true\`, el botón «Continuar con PayPal» **permanece disabled** con texto «Las suscripciones todavía no están disponibles». **Una beta social gratuita puede operar así** si el PO acepta aplazar las nuevas membresías hasta Live.
- Vercel: proyecto \`pazo-app-t83r\` y HTTPS existente, protecciones Vercel en despliegues sin dominio personalizado. Producción vista por PO en \`main\` antiguo; los últimos previews READY encontrados tampoco coinciden con el HEAD actual. Las variables \`VITE_PAZO_F16_SANDBOX_QA_UI=true\` y \`...SUPPORTER_BENEFITS_ENABLED=true\` son **Preview restringido de la rama F13**, no certifican configuración pública final.
- \`public/manifest.webmanifest\`, íconos y \`sw.js\` network-only, \`vercel.json\` callbacks SPA, \`normalizeSupporterPaypalCallback\` sin otorgar membresía por redirect; tests estáticos y build PASS. **Instalación Android/iOS, cambio entre PWA instalada/no instalada y origen final HTTPS** requieren el Preview final; no declarar E2E PASS antes.
- Autenticación Vercel del Preview **no debe exigirse a visitantes de la beta pública**. Separar protección del Preview privado y acceso público de lanzamiento.

## PayPal Live: evaluación real del requisito de “activar desde Configuración”
1. \`AdminPayPalSettings.tsx\` permite guardar borradores/credenciales Vault y validar OAuth; activar Live aparece deshabilitado.
2. \`supabase/migrations/20261019195500_pazo_admin_paypal_gateway_settings.sql\` fija CHECK \`active_environment='sandbox'\` y CHECK \`live_checkout_enabled=false\`. **El motor no puede conmutar Live** con el esquema actual.
3. \`pazo-admin-paypal-validate/index.ts\` alojado v3 solo valida credenciales OAuth/diagnóstico histórico. \`liveProviderReadOnly.mjs\`, \`liveBetaReleasePolicy.mjs\` y \`paymentGatewayRoute.mjs\` son lectores/contratos de seguridad **offline** (no gateway Live). \`activationAuthorized=false\` y \`mayCharge=false\` por diseño.
4. No hay función PayPal Live de webhook alojada en el inventario actual; no existe flujo Live E2E de nueva suscripción, evento firmado, venta → período → beneficio → cancelación/reembolso, ni conmutación versionada + rollback que conserve merchant anterior.
5. **Conclusión:** el panel podrá servir de configuración futura, pero **no estará listo para cambiar a Live con un clic después de la beta sin programación previa**. Ese trabajo puede prepararse en la rama antes del Preview, sin activarlo y sin comprar dominio hoy.

## Alcance mínimo pendiente: NO volver a construir módulos
**Para certificación beta social gratuita**
1. PO acepta desde localhost las **dos pantallas nuevas** (entrada Amigo de PAZO sin parpadeo; Mi membresía sin herramientas QA) y última revisión visual de administración. Esto no exige nuevo pago.
2. Triage puntual seguridad de las 4 RPC anon, configurar/verificar protección de contraseñas filtradas; documentar responsable operativo de revisión de denuncias/bajas y límites de media/CDN. **No** eliminar registros de QA sin aprobación.
3. Seleccionar build público con **QA Sandbox OFF, nuevas compras OFF**, sin mensajes de pruebas visibles. El flujo social gratuito queda disponible. Beneficios públicos no deben publicarse sin QA apropiada si se anuncian activos.
4. Último Preview HTTPS, ya con código cerrado, para verificar versión exacta, protección Vercel, Auth y PWA instalada/no instalada, rutas de retorno y aceptación final. Poner fecha efectiva legal en el momento de publicar. Merge/main solo GO PO.

**Para activar PayPal Live más adelante desde el panel, SIN un nuevo desarrollo de emergencia**
1. Implementar ahora **gateway server-side versionado** para nueva compra (selección admin de ambiente/merchant/credencial/generación), consentimiento, idempotencia, aislamiento por host y conservación de las suscripciones Sandbox históricas. Añadir DDL auditado y pruebas PG17; instalación alojada bajo GO por migración.
2. Implementar de forma separada Live OAuth/plan+webhook firmado, creación/lectura/cancelación/reembolsos y proyección verificada de períodos/beneficios. Conciliar 26 eventos Sandbox bajo reglas de su propio ambiente; no procesarlos como Live.
3. Implementar selector admin **con preflight real fresco**, bitácora de operador, confirmación humana, \`compare-and-swap\`, kill switch y rollback sin cortar gestión de suscripciones históricas.
4. Después de contar con la beta pública HTTPS, guardar credenciales **Live** directamente en panel Vault, validar merchant/plan/webhook/retorno, y autorizar una única transacción supervisada antes de habilitar checkout público. Publicar beta nunca activa cobros por sí mismo.

## Dictamen final por perfil de lanzamiento
| Perfil | Dictamen |
|---|---|
| Código MVP social en rama | **MUY AVANZADO, CI PASS**, no reabrir QA aprobada |
| Beta gratuita social pública hoy | **GO CONDICIONAL al gate final visual/seguridad/HTTPS y aprobación PO**, sin checkout nuevo |
| Beta con nuevas suscripciones Sandbox abiertas a usuarios generales | **NO-GO**; QA branch/owner específico, no es servicio público normal |
| Cambiar de Sandbox a Live desde el módulo administrativo hoy | **NO-GO**; el gateway y el selector real faltan |
| Preparar el switch Live antes de publicar | **SÍ, tarea técnica prioritaria** sin activar dinero real |

**No se autorizaron ni ejecutaron despliegues, escrituras financieras, borrados, cambios Vercel, PayPal Live ni merge.** La auditoría identifica evidencias, no cierra gates pendientes por inferencia.
