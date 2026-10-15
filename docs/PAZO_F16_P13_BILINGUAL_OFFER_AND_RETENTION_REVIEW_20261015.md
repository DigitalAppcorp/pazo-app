# PAZO F16-P13 — propuesta ES/EN de la oferta, revisión y retención

**Fecha:** 2026-10-15. Estado: **PRODUCT OWNER REVIEW / LEGAL REVIEW REQUIRED — NO PUBLICAR / NO COBRAR**. PR #44 DRAFT. Continuación «ok sigamos» autoriza preparar y probar, no sustituye un GO de términos ni autoriza desplegar SQL alojado, PayPal buyer, Edge o Live.

## Fuente literal de ambas versiones

`src/features/supporter/offerCopyDraftP13.mjs` contiene los **dos textos completos** `exactCopy` (ES y EN), título y casilla de consentimiento sin preselección. Las versiones son **borradores de revisión**, NO términos vigentes, y deliberadamente incluyen marcas de enlace de cancelación y acuse conservable aún no implementados. `publishedAt=null`, `mayPublish=false`, `mayStartPayPalCheckout=false`; NO incluir el borrador como seed para P06, ni asumir que las cuatro recompensas son funcionales por estar aprobadas a nivel de producto. El copy explica explícitamente su estado de no disponibilidad y no promete rescates prioritarios o eliminación de anuncios.

**Decisiones de producto ya tomadas (NO reabrir):** solo USD 2.99 mensuales, ninguna modalidad anual, voluntaria y sin quitar funciones gratuitas. Cuatro reconocimientos aprobados en `docs/PAZO_SUPPORTER_MEMBERSHIP_DISCOVERY.md`: insignia Amigo de PAZO en perfil y publicación, cinco estilos cosméticos aprobados como vista previa, muro público con permiso **independiente por mascota**, y medallas de constancia 3/6/12 períodos mensuales. Los diseños/beneficios aún no están conectados a pagos; publicarlos como entregados sería incorrecto. Responsable/contacto PAZO aprobado en `src/features/legal/supportContact.ts`: `appdigital.corp@gmail.com`.

## Obligaciones de California — verificación jurídica pendiente

- **CA Business and Professions Code §17602(a)(1–8):** divulgar precio y renovación claramente junto al consentimiento; recabar aceptación afirmativa expresa ANTES del cobro; entregar acuse durable con términos y forma de cancelar; botón/enlace de cancelación online no obstructivo para alta online; fecha/cadencia y contacto. El hecho de que PayPal gestione cobros no transfiere automáticamente el cumplimiento de PAZO. Fuentes: https://www.oag.ca.gov/news/press-releases/attorney-general-bonta-issues-consumer-alert-california%E2%80%99s-automatic-renewal-law y https://law.justia.com/codes/california/code-bpc/division-7/part-3/chapter-1/article-9/section-17602/.
- **Consentimiento de renovación para ofertas sujetas a esta ley:** conservar evidencia durante **al menos 3 años desde el consentimiento o 1 año después de finalizar el contrato, lo que sea mayor**. Mientras la cuenta sea contratante activa, no iniciar borrado de la prueba. Versiones inmutables de ES/EN y SHA256 deben poder reconstruirse, junto con idioma, instante y opt-in real. No almacenar tarjeta/CVV/IP precisa/payer email por defecto. La regla de 3 años NO se extiende arbitrariamente a todos los datos de PAZO.
- **Avisos:** según la norma aplicable, prever recordatorio anual y aviso con antelación por cambios de precio. Si se usan métodos concretos, deberán estar funcionando antes de la oferta. Sin prueba ni plan anual en el MVP.
- **Confirmación retenible:** debe ser genuinamente entregada (p. ej. registro descargable o email confirmado), no solo texto prometido en pantalla.
- **Cancelación:** enlace real accesible desde la misma experiencia online, autenticado y confirmado por proveedor sin obligar a contactar soporte. El email de contacto NO reemplaza un mecanismo online operativo si es exigible.
- **Importe/impuestos:** confirmar si el cargo total tiene tasas/impuestos aplicables y explicarlo antes de consentir. El sistema solo conoce el plan mensual USD 2.99; no inventar que cualquier impuesto está incluido o excluido.
- **Primer período:** decisión PO prospectiva aprobada en `docs/PAZO_F16_P05_FIRST_SERVICE_PERIOD_POLICY_APPROVED_20261014.md`: [activación PayPal comprobada, próxima fecha de facturación merchant observada en activación), solo cuando venta regular COMPLETED y ciclo identificado. No derivar período de estado ACTIVE, ni inventar +30 días, ni acreditar retroactivamente el QA cancelado.
- **Renovaciones/reembolsos/disputas:** conservar las decisiones PO P05-L y P06-A–E, sin inferir meses desde transacciones o futuras fechas de cobro.

## Retención: lo aprobado vs lo pendiente (NO habilita purga)

| Clase | Estado | Regla |
| --- | --- | --- |
| Verificación consentimientos California | Obligación legal condicional identificada | Mayor de 3 años desde aceptación o 1 año después del término si ARL aplica; preservar evidencia hasta revisión legal |
| Inbox de eventos ya conciliados | PO aprobó **90 días** solo tras conciliación final y liberación del hold | Nunca purgar eventos pending/disputados por el reloj; preservar idempotencia en ledger. No worker automático instalado |
| Pagos, ventas, facturas, refunds, reversals, disputas | Plazo específico **PENDIENTE** de asesoría fiscal/contable y holds | No adoptar «7 años para todo» ni borrar al cerrar cuenta |
| Intenciones nuevas, pendientes y vinculadas | Plazos específicos **PENDIENTES** | Unicidad de PayPal/consentimientos y litigios requieren trazabilidad; no borrar por timeout arbitrario |
| Solicitudes CCPA y respuesta | Aplicabilidad legal por revisar | En empresas sujetas, regulación contempla al menos 24 meses; no extrapolar a datos financieros |
| Copias, logs y eliminación de cuenta | Ventanas/retención **PENDIENTES** | No prometer purga instantánea de backups/PayPal; conservar mínimo solo con base aprobada |

Fuentes internas: `docs/PAZO_F16_P06_BENEFITS_AND_RETENTION_DECISION_GATE_20261014.md`, `docs/PAZO_F16_P05_RETENTION_AND_PROVIDER_PROVENANCE_GATE_20261014.md`, `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`.

## Pasos de liberación concretos (sin retomar arquitectura ni nuevos labs infinitos)

1. **Revisión PO del texto ES/EN:** confirmar que las palabras prometidas representan el producto aprobado y qué recompensas estarán realmente operativas al contratar. Hoy están marcadas no disponibles.
2. **Revisión legal/contable focalizada:** obligación de facturación total/impuestos, identidad mercantil, retención financiera por clase y notices conforme CA. Aprobar un calendario de retención o formalizar holds limitados y auditables; no prometer borrado automático.
3. **Implementar de verdad antes de publicar** la cancelación web sin obstáculos, el comprobante retenible, la aceptación opt-in server-side, entrega de notices y beneficios facturados verificados. Sustituir marcadores, versionar nuevo texto ES/EN y reconstruir SHA256 exacto antes de solicitar a PO un GO de publicación.
4. **GO separado para instalar P12 en Supabase alojado** con migración CLI versionada, postflight de grants, y pruebas Sandbox del checkout/ledger/worker/desenlace disputas; no ejecutar `DO_NOT_APPLY` alojado ni activar Live.
5. **Sin permiso de compra ni release por defecto.** El PR sigue DRAFT; `paidThrough=null` y `mayGrantBenefits=false`.

Prueba CI: `src/features/supporter/testing/f16P13OfferCopyDraft.test.mjs` comprueba alcance, ES/EN, los marcadores y que P12 no publica este borrador.
