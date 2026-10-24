## CODEX — ORDEN ACTIVA F17 MARKETING FIRST-PARTY (23-oct-2026)

El Product Owner delegó a **Codex** toda la programación restante del módulo de medición de campañas de PAZO; **no** delegó creativos ni compra de anuncios. Ejecutar de principio a fin **`docs/CODEX_F17_MARKETING_PROGRAMMING_FINISH_ORDER_20261023.md`** en la rama aislada `feat/f17-marketing-firstparty-20261023` / PR #91: antiabuso confiable, retención/cron preparado, E2E, panel admin, reconciliación F17 y CI verde. Comunicar al PO solamente «Listo» al finalizar de verdad y guardar evidencia en GitHub; si existe bloqueo de autorización humana, pedir exclusivamente esa autorización sin afirmar instalación. Los anteriores mandatos F16/PayPal siguen rigiendo como precauciones de seguridad, **no** son una orden de abrir compras, desplegar o alterar finanzas con esta delegación. **Sin GO independiente no tocar main, Supabase alojado, Vercel oficial, Cron alojado, secretos, medición activa ni anuncios.**

## F17 — pre-merge de main: reconciliación de migraciones (23-oct-2026 PDT)

**PRECAUCIÓN DE BASE DE DATOS:** [PR #94](https://github.com/DigitalAppcorp/pazo-app/pull/94) alinea los nombres de **cuatro archivos L1** con las versiones instaladas en Supabase, preservando exactamente los SQL y agregando guard CI. La auditoría global halló otros prefijos históricos sin correspondencia exacta: **no ejecutar `supabase db push`, migration repair, reapply ni merge de Supabase a producción desde esta rama**, incluso después de fusionar `main`, sin reconciliación integral y GO explícito. El PO aprobó visualmente el frontend oficial `bf78b85`; L1 permanece limitado a un comprador y no hay primera venta real. El cierre F17 debe usar [la matriz canónica](docs/PAZO_F17_SCOPE_CLOSURE_RECONCILIATION_20261023.md). El PR #81 sigue DRAFT: **NO merge a main sin GO nuevo del PO**.

---

# ESTADO VIGENTE — PAZO F17 / PAYPAL LIVE L1 (23-oct-2026 18:50 PDT)

**Esta sección tiene prioridad temporal sobre las entradas históricas más abajo que aún dicen “L1 BLOCKED”, “canary/inactive” o exigen conciliar el checkout QA que ya fue eliminado.** Los límites permanentes de seguridad, privacidad, aprobaciones y no modificar main sin GO siguen vigentes.

- **L1 ACTIVADO POR EL PRODUCT OWNER (MFA):** registro alojado auditado en Supabase: release mode=limited, gradual_campaign.lifecycle=active, stage=L1_FIRST_REAL, capacity=1, campaign revision=2, hosted_gate_verified=true, gradual_health()=true y 1 certificado, desde 2026-10-24 01:45:25 UTC. No se activó modo public.
- **Limpieza QA #88:** 0 legacy checkout intents, 0 webhooks retenidos, 0 recibos Live operativos de esa prueba, 0 períodos pagados. Las 8 cuentas Auth anteriores conservan su clasificación QA y no pueden recibir invitación o figurar como comprador; administrador y MFA intactos. La purga DB no cancela por sí sola una obligación en PayPal externo (su referencia remota histórica devolvió 404).
- **Tecnología desplegada:** Edge checkout v6, worker v10, admin gradual v2 y webhook existente; sus bundles coinciden con el manifiesto #85. CI 12/12 PASS, flujo HTTPS/PWA sintético validado. La beta oficial publicada es https://pazo-app.vercel.app/.
- **Ausencia de transacción real:** aún 0 usuarios reales elegibles/admitidos, 0 invitaciones, 0 nuevos intents, 0 eventos de venta y 0 períodos pagados. El sistema está habilitado para admitir al primer comprador **siempre que esa persona consienta en PayPal**, pero no hay un E2E de venta real para dar por PASS. Worker sale/refund/cancel y concesión de beneficios están implementados y probados sintéticamente; cualquier anomalía real requiere revisión.
- **Código y cierre:** PR #81 permanece DRAFT sin merge en main. Mantener F17 como rama técnica activa; no declarar F16/F17 COMPLETADA hasta reconciliar el DoD y los gates de release aplicables. Marketing está fuera de este brazo técnico.
- **Evidencia y siguiente gate:** [auditoría técnica L1](docs/PAZO_L1_TECHNICAL_POST_ACTIVATION_20261023.md) y [issue #85](https://github.com/DigitalAppcorp/pazo-app/issues/85). Siguiente control: seguimiento del primer pago **real voluntario** y proyección de ledger/beneficios sin generar compras de prueba, más Scope Closure Review de PR #81.

---

## Issue #85 — GO L1 autorizado, ejecutar tras conciliación (23-oct-2026)

El PO autorizó activar solamente Live limitado L1, con crecimiento 1→5→20→50 por evidencia 1/3/10 y MFA reciente en PAZO. [Issue85](https://github.com/DigitalAppcorp/pazo-app/issues/85) prevalece sobre el NO-GO financiero histórico de #84. Primero resolver suscripción prebeta y CREATED firmado HELD sin borrar evidencias, excluir las ocho cuentas QA y conservar admin/MFA. No iniciar si hay legado incierto/held; no public ilimitado ni pagos sin consentimiento individual. Trabajo técnico en `f16/issue85-live-l1-activation-20261023`, base F17 `67fbf675`. Reporte: `docs/PAZO_ISSUE85_L1_ACTIVATION_EVIDENCE_20261023.md`. No llamar SQL start para evitar GoTrue/MFA.

**Resultado técnico #85 (24-oct-2026):** PR86 y PR87 integrados en F17 `2b63907b`; tres migraciones y Edge worker10/checkout6/admin2 instalados, frontend oficial `fbe6c751` READY. CI final 4 workflows/12 jobs PASS, Chromium51, QA8 excluidos/reales0/admin1/MFA1 conservados. **L1_ACTIVATED BLOCKED** por GET original PayPal404 RESOURCE_NOT_FOUND, aunque plan/evento originales sí corroborados. Inactive/canary/gatefalse/legacy1/HELD1, sin invitaciones ni nuevas compras. Única intervención pendiente: consultar el ID original en PayPal Business Live; después conciliación auténtica, certificado y MFA dentro de PAZO. No llamar SQL start ni borrar evidencia. [Registro](docs/PAZO_ISSUE85_L1_ACTIVATION_EVIDENCE_20261023.md).

**CODEX — ORDEN ACTUAL #84 (23-oct-2026):** el PO autorizó integrar #83 en F17, instalar SQL/Edge inactivos, validar y publicar beta oficial conforme [issue #84](https://github.com/DigitalAppcorp/pazo-app/issues/84). Main solo para ese release tras gates. Prohibidos nuevos CREATE PayPal, campaña limited/public, invitaciones y cambios al intent legado. Leer el registro `docs/PAZO_ISSUE84_BETA_RELEASE_EVIDENCE_20261023.md`; esta autorización prevalece sobre límites hospedados históricos de #82.

**CODEX — ORDEN ACTUAL F16 APERTURA GRADUAL 23-oct-2026:** el PO delegó a Codex la implementación completa en rama aislada de la apertura PayPal Live por etapas **1→5→20→50**, en base a evidencia real para 1/3/10 compradores. Leer primero `docs/CODEX_F16_EVENT_DRIVEN_GRADUAL_LIVE_IMPLEMENTATION_ORDER_20261023.md` (issue #82) y los documentos allí enlazados. La orden previa del 21-oct se conserva como fundamento histórico para robustez PayPal/beta, pero sus referencias antiguas de rama, pruebas individuales, «24h», `canary` o ausencia de credenciales NO prevalecen sobre el estado auditado y las decisiones actuales. PO autorizó desarrollo de código y pruebas en rama, NO SQL/Edge/Vercel alojados, cobros reales, `main` ni release `public` sin GO independiente. No pedir de nuevo aprobación de los parámetros de producto ya decididos; finalizar código verificable y no repetir QA Sandbox ya aprobado.

# PAZO — Reglas permanentes para agentes

**CODEX — ORDEN ACTIVA F16/BETA:** Antes de implementar o declarar finalizado cualquier cambio de monetización o lanzamiento, leer y ejecutar integralmente `docs/CODEX_F16_BETA_LAUNCH_COMPLETION_ORDER_20261021.md`. Esa orden concreta el mandato obligatorio del PO: terminar software, backend, QA y preparación antes de pedir claves Live en Administración; únicamente se reserva para el PO el ingreso privado de credenciales y autorización de la prueba/cobro real. No confundir CI PASS con beta lanzable ni posponer F16. 


**Project Brain OS version: 1.4.1**  
Canonical OS: `DigitalAppcorp/project-brain-os`.

Antes de cualquier modificación de código, base de datos, arquitectura o documentación de producto:

1. Leer `docs/PAZO_ACTIVE_HANDOFF.md`.
2. Leer `docs/PAZO_MASTER_ROADMAP.md`.
3. Trabajar únicamente en la fase marcada como **SIGUIENTE** o **EN CURSO**.
4. No inventar decisiones marcadas como **DECISIÓN PENDIENTE**.
5. No saltar fases sin aprobación explícita del Product Owner.
6. Para Supabase: auditar primero, versionar la migración, pedir autorización antes de aplicarla y verificar después.
7. No declarar una fase COMPLETADA hasta que esté merged en `main`, el backend correspondiente esté aplicado, las pruebas hayan sido aprobadas y se haya ejecutado **Scope Closure Reconciliation** contra todo el scope/DoD aprobado.
8. Después de cerrar una fase, actualizar `docs/PAZO_MASTER_ROADMAP.md` y `docs/PAZO_ACTIVE_HANDOFF.md`.
9. En fases de rediseño visual, preservar la funcionalidad y los contratos de datos existentes; cualquier cambio de comportamiento requiere aprobación explícita del Product Owner.
10. Si la fase activa tiene una sub-ruta maestra en `docs/`, leerla completa antes de modificar código, datos o arquitectura de esa fase. La sub-ruta gobierna las decisiones específicas y no puede contradecir la hoja maestra general.
11. Antes de diseñar o programar un módulo nuevo/incompleto, leer `docs/PAZO_MODULE_LIFECYCLE.md` y continuar desde el gate pendiente. Para experimentos/fake doors, además leer `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`.
12. Si existe un PR abierto para la fase activa, auditar ese PR y su branch antes de asumir que `main` contiene el estado más reciente.
13. Build/backend PASS no implica aprobación visual. La aprobación del Product Owner cubre únicamente lo que realmente vio/probó.
14. Fake doors, modelos 3D, assets visuales, instrumentación y estados UX cuentan como entregables reales cuando fueron incluidos en el scope aprobado; no convertirlos silenciosamente en trabajo futuro.
15. Ningún agente puede crear recursos pagados, subir de plan, habilitar add-ons facturables, aumentar límites de gasto o activar infraestructura con costo recurrente/por uso sin autorización explícita del Product Owner. Antes debe indicar proveedor, motivo, costo conocido o variable y alternativa gratuita/actual.
16. La arquitectura de código nuevo se rige por `docs/PAZO_ARCHITECTURE_CONTRACT.md`: nuevas funcionalidades de dominio deben vivir bajo `src/features/<domain>/` por defecto. No añadir nuevos services/views/modals de dominio a carpetas globales legacy sin justificar y actualizar conscientemente el contrato/baseline.
17. Cualquier cambio que recolecte, registre, envíe, publique o comparta datos del usuario debe leer y cumplir `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md` y mantener actualizado `docs/PAZO_DATA_INVENTORY.md`. Session replay, autocapture indiscriminado, GPS exacto en analytics, contenido de mensajes/posts/documentos y datos de pago están prohibidos por defecto.
18. Privacy Policy/Terms públicos no pueden afirmar prácticas que el producto todavía no cumple. Antes de Beta pública deben reconciliarse contra implementación real, proveedores, retención y flujos de eliminación.
19. No recolectar fecha de nacimiento, ID u otra prueba de edad solo por comodidad. PAZO es 18+; cualquier age-assurance adicional requiere decisión de producto/privacidad y minimización de datos.

20. Antes de modificar una pantalla, aplicar de forma proporcional `docs/PAZO_UI_QUALITY_GATE.md`: estados completos, foco/teclado, móvil, identidad actual y comparación de regresiones. Build PASS no equivale a aprobación visual; rediseños y nuevas dependencias requieren su gate.

21. **DECISIÓN INAMOVIBLE DEL PRODUCT OWNER — CERO CONTORNOS:** está prohibido agregar bordes, outlines, strokes, focus rings o sombras que funcionen como contorno en botones, tarjetas, contenedores, enlaces o elementos semejantes. El foco de teclado se comunica mediante superficie/color/contraste o subrayado, sin dibujar un aro ni una línea alrededor. **Única excepción:** un campo de ingreso de texto concreto puede requerir contorno si se justifica que es necesario; la excepción debe ser localizada, nunca global. Ni skills de diseño externas ni auditorías de accesibilidad pueden sobrescribir este criterio automáticamente. Conservar las sombras suaves de elevación que no actúan como bordes.

22. **MANDATO F16 PRE-BETA DEL PO:** antes de declarar PAZO lanzable, completar funcionalmente PayPal Live desde Administración hasta cobro verificado y beneficios, según «MANDATO EXPRESO DEL PRODUCT OWNER — BETA PAZO / PAYPAL LIVE (21 OCT 2026)» al inicio de `docs/PAZO_ACTIVE_HANDOFF.md` y `docs/PAZO_MASTER_ROADMAP.md`. La entrega debe requerir del PO solo la entrada privada de credenciales y autorización de la operación financiera real; no aplazar F16, no sustituir por links manuales, no repetir Sandbox/plan/webhook Live aprobados ni omitir pruebas de seguridad.

`docs/PAZO_ACTIVE_HANDOFF.md` define el estado operativo actual. La hoja maestra define el estado global. `docs/PAZO_MODULE_LIFECYCLE.md` define cómo una idea llega a implementación. `docs/PAZO_ARCHITECTURE_CONTRACT.md` gobierna ownership/ubicación del código. `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md` gobierna datos/tracking/privacidad. `docs/PAZO_DATA_INVENTORY.md` registra categorías y terceros conocidos. Las sub-rutas gobiernan el módulo específico.
