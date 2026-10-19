# PAZO F16 — Vinculación Live, ventas y reembolsos verificables (sin desplegar)

Fecha: 2026-10-19. PR #44 DRAFT. **Código y laboratorio, NO pagos Live operativos.**

## Migraciones candidatas
- \`20261019235000_pazo_f16_live_verified_binding_and_receipts_private_staging.sql\`: función privada para vincular la suscripción \`I-...\` a la intención previamente reclamada y al mismo propietario, plan y generación; registro mínimo de evento PayPal firmado, con \`linked_intent_id\` y FK inmutable para impedir transferencia a otra cuenta; registro transaccional e idempotente de venta \`PAYMENT.SALE.COMPLETED\` sobre un período no superpuesto. Bloquea event replay y duplicación de pagos por \`sale_id\`, \`cycle_key\` y evento firmado.
- \`20261019235400_pazo_f16_live_verified_refund_private_staging.sql\`: asocia un refund/reversal original al evento firmado PayPal Live, a la venta y propietario existentes, con vínculo único del evento al hold. Reembolso repetido no crea un segundo hold; una reversión de otra cuenta no bloquea el pago del propietario.
- Ambas son **SECURITY DEFINER privadas sin EXECUTE para anon/auth/service_role**; no hay rutas Edge que las ejecuten, ni lectura directa de tablas.

## Advertencia esencial sobre origen de la prueba
Las RPC SQL verifican **integridad y relaciones de datos**, pero **NO pueden confirmar una venta o devolución remotamente a PayPal**. Un futuro servicio autenticado debe obtener y verificar con las credenciales Vault de la *generación del merchant original* los IDs de suscripción, intent custom_id, plan, venta COMPLETED, monto USD 2.99, periodo de servicio y evento con firma verificada. Solo entonces debe llamar a las funciones privadas. El permiso de ejecución a ese único servicio requerirá revisión técnica y un GO posterior independiente. El laboratorio PostgreSQL utiliza fixtures simulados, no PayPal Live real.

## Pruebas de fallo seguro
Los laboratorios \`scripts/f16-live-binding-receipt-disposable-lab.sql\` y \`scripts/f16-live-refund-disposable-lab.sql\` verifican, con PostgreSQL 17:
- Suscripción solo después de reclamo de creación; recuperación \`already_bound\` idempotente sin cambiar owner/comerciante.
- Rechazo de otros propietarios, suscripciones ajenas, eventos de otro owner y duplicados/reutilizados.
- Un webhook \`CREATED\` no puede acreditar dinero; un evento SALE tiene una única venta, con importe exacto y ventana no solapada.
- Refund ligado a evento de devolución/reverso y venta original, no una venta de otro usuario; reenvío no registra otro hold.
- Todo con Live OFF fuera de la simulación, sin desplegar ni otorgar permisos.

## Pendientes antes de habilitar Live
1. Implementar adaptadores Edge privados: GoTrue owner auth, autenticación/merchant Vault, PayPal Live GET de suscripciones y ventas, firma webhook, correlación por merchant original y periodos; preservar tratamiento sin PII y sin información del pagador.
2. Revisar reembolsos parciales, disputas, tiempos de acceso pagado y reglas de retención/borrado/backups. No asumir que 90 días aprobados para eventos conciliados aplica a registros contables.
3. Revisar ACL/grants service-only y transacciones, hacer pruebas PG17+falsificación/fallos y obtener un GO específico antes de aplicar SQL y otro antes de publicar Edge.
4. Después de lanzar la beta HTTPS y con Live aún OFF, realizar la prueba real supervisada de una venta, periodo y cancelación. Activación administrativa solo tras consentimiento y gate PO.

El inbox Sandbox histórico de 26 eventos y sus dos períodos QA siguen independientes; no procesar la cola bajo estas RPC Live.
