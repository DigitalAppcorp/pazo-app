# PAZO F16-P40 — almacenamiento privado de vinculación PayPal: decisión y retención

**2026-10-15 — Product Owner aprobó expresamente el PRINCIPIO DE ALMACENAMIENTO
LIMITADO** de la relación evento de activación ↔ suscripción de PayPal ↔ propietario
interno para conciliar cobros y prevenir atribuciones indebidas.

**NO APROBADO** por esa respuesta: migración Supabase alojada, plazo de
retención, política de borrado/backup, RPC que inserte vínculos, activación
de webhooks/worker, compra PayPal Sandbox, cobros LIVE, ledger, beneficios
o publicación de términos. La app general PAZO permanece gratuita.

## Categoría y minimización aprobadas
- `provider_event_id` — identificador pseudónimo del evento firmado.
- `subscription_id` — referencia de suscripción del proveedor.
- `owner_id` — UID interno de propietario, privado.
- `created_at` — marca técnica de registro necesaria para auditoría mínima.

NO almacenar email, nombre de persona, token OAuth, raw webhook payload,
IP, datos de tarjeta/pagador, dirección, secreto ni información publicitaria.
La relación se considera **dato personal financiero privado**, no contenido
público ni dato para analítica. `subscription_id` no se expone por API pública.

## Borrador alojado de SOLO ESQUEMA — NO APLICAR
`supabase/drafts/f16_p40_private_activation_storage_hosted_REVIEW_ONLY_DO_NOT_APPLY.sql`

- Guard de base/rol + gate del worker apagado y ledger sin pagos.
- PK por `provider_event_id` y FK estricta a inbox privado.
- Trigger de integridad: evento ACTIVATED verificado en inbox, intent BOUND,
  propietario exacto, plan aprobado; registro inmutable.
- RLS ENABLED + FORCE, REVOKE ALL para PUBLIC/anon/authenticated/service_role.
- Ninguna RPC de creación/lectura y ningún permiso cliente; cero pagos/beneficios.
- Prueba del MISMO esquema en PostgreSQL 17 desechable con casos adversariales.
- El trigger **no** autentica por sí solo la firma PayPal: se requiere
  proveedor de procedencia validada y frontera de permisos independiente.

## Retención — propuesta para DECISIÓN PENDIENTE
El plazo de retención de esta relación no debe copiarse automáticamente del
consentimiento de renovación. La documentación legal del proyecto identifica
plazo específico para **prueba de consentimiento expreso** en California
(3 años o 1 año después del fin del contrato, el mayor); esa clasificación
NO determina por sí sola el plazo para esta tabla de reconciliación.

**Propuesta de criterio, sin duración todavía aprobada:**
1. Mantener la relación mientras se use para identificar una suscripción
   activa o resolver cobros/reembolsos/disputas relacionados.
2. A partir de cierre/cancelación, aplicar un plazo máximo concreto, que el
   PO definirá tras revisión contable/legal de reclamaciones y obligaciones.
3. Si hay un hold legal/financiero justificado, extender con revisión explícita,
   acceso restringido y trazabilidad de la excepción.
4. Una vez vencido el plazo y liberados los holds, eliminar también de copias
   y backups según política efectiva y límites técnicos revisados.
5. Coordinar solicitud de eliminación de cuenta, retenciones obligatorias,
   acceso de operadores y política pública de privacidad antes de desplegar.

Hasta definir **plazo máximo, inicio de cómputo, excepciones y tratamiento
de backups**, no está aprobado insertar filas alojadas ni habilitar un
mecanismo automático de borrado. El borrador no tiene escritor ni borrador.

## Gates independientes aún abiertos
A. Aprobación de retención y reconciliación Privacy/Data Inventory/Terms.
B. Revisión PO del SQL hospedado definitivo y GO explícito de DDL.
C. Contrato de writer vinculado únicamente al webhook realmente verificado;
   el valor string `postback_verified_sandbox_activation` NO es firma.
D. Pruebas de reintentos/out-of-order y correlación merchant real.
E. GO separado PayPal Sandbox buyer, activación worker, checkout y ledger.

**Estado:** PR #44 DRAFT; P28 histórico diferido; worker OFF; pagos = 0.
