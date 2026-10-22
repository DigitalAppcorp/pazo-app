# PAZO F16 — Decisión pendiente: retención, eliminación y recuperación de pagos

**ACTUALIZACIÓN VERIFIED HOSTED (2026-10-14 UTC):** el Product Owner autorizó y se aplicaron únicamente las dos migraciones F16 en Supabase `mrybvqdebbgcayuvgkkr`; tablas privadas de eventos, intenciones, pagos y reversos están instaladas, vacías (0 filas), con RLS forzada y RPC de servidor restringidas. Versiones alojadas: `20261014042616_f16_private_verified_event_inbox.sql` y `20261014042646_f16_private_intents_financial_ledger.sql`. NO se desplegaron Edge Functions, NO se modificó PayPal/webhook ni se activaron cobros, períodos pagados o membresías. Las afirmaciones históricas inferiores «NO APLICADAS» se refieren al momento anterior a este gate; NO se deben tratar como estado actual. Retención de ledger e intenciones pendiente.


**Estado:** propuesta para Product Owner; NO APROBADA, NO IMPLEMENTADA. Versión 2026-10-13. Este documento es un diseño de privacidad/producto, no asesoría legal. NO activar eliminación automática ni beneficios hasta aprobación.

## Evidencia y límites actuales

- PayPal Sandbox: plan existente **USD 2.99 mensual**, `P-14V25407JP6850922NLHMDKI`. Webhook `6N7889790V1467139` con URL de dashboard mal configurada; no recibe hoy el receptor F16.
- Migración `20261014042616_f16_private_verified_event_inbox.sql` **creada con Supabase CLI y validada únicamente en PostgreSQL descartable**. Permite guardar ID y tipo de evento, fechas técnicas y estado/reintentos. No almacena emails, datos de tarjeta, cuerpo del webhook ni datos de comprador; estos IDs siguen siendo **datos potencialmente vinculables** a una persona a través del proveedor.
- No hay contabilidad de pagos instalada ni cuentas con entitlement F16 activado. `wall_has_verified_entitlement()=false` permanece.
- La política de privacidad de PAZO prohíbe recopilar datos personales «por si acaso» y exige categorías, motivo, mínimo, retención y tratamiento de bajas definidos.

## Decisiones separadas (sin duración comprometida)

| Categoría | Uso necesario | Propuesta operativa para evaluación (NO aprobada) |
| --- | --- | --- |
| **Inbox de webhook** (ID opaco de evento, tipo, fecha, estado/reintentos) | Deduplicar entrega, rastrear errores y reintentar conciliación | Elegir entre 90 o 180 días **después** de conciliación definitiva, condicionado a deduplicación por payment ID en ledger y disponibilidad de reconsulta PayPal. Sin purga automática mientras el sistema no tenga worker/estado terminal |
| **Intentos incompletos** (correlación, owner, suscripción) | Asociar de forma legítima Auth y PayPal | Borrar intentos no materializados tras ventana de expiración aprobada; nunca borrar el vínculo activo mientras existan períodos pagados o una disputa |
| **Pagos/ledger** (ID transacción, monto, fecha, owner, estado y reversión) | Cumplimiento contable, conciliación de devoluciones, comprobación de beneficios y reclamaciones | Retención separada de la inbox y vinculada al período que requieran las obligaciones legales/fiscales y conflictos reales, validado por revisión legal. **NO asumir siete años ni otro número sin determinar jurisdicción y requisitos** |
| **Reversal tombstones** (ID de pago revertido y confirmación del proveedor) | Impedir que un pago tardío vuelva a conceder cobertura | No eliminarlos antes de que el ledger ya no permita revalidación/acreditación retrospectiva del mismo payment ID; ligados a política financiera y reclamaciones |
| **Consentimientos de mascota al muro** | Publicación exclusivamente opt-in y revocable | Revocar inmediatamente en sistema operativo; política de historia de consentimientos/backups separada, no asociada directamente a retención de PayPal |

## Borrado de cuenta / privacy request

1. Cuando el dueño solicita eliminar su cuenta, **desactivar beneficios, publicación y renovación futura cuando corresponda** sin confundir cancelar suscripción con reembolsar pagos o borrar el historial financiero.
2. El SOP F14 vigente exige validar identidad, dependencias, archivos, datos de terceros y obligaciones de retención antes de completar la baja. La base de pagos aún no forma parte del preflight F14; deberá agregarse **antes de activar F16**.
3. Para cualquier pago que deba conservarse legalmente, separar datos de acceso/visualización del perfil: bloquear acceso a la cuenta eliminada, conservar solo los metadatos mínimos justificables durante el plazo aprobado, limitar privilegios y eliminar el vínculo cuando sea legalmente posible. No prometer borrar el proveedor PayPal mediante una baja de PAZO.
4. Nunca hacer `ON DELETE CASCADE` indiscriminado sobre pagos/reversos ni usar `profiles.is_founder` como identificador de membresía. No ejecutar `DELETE auth.users` directo.
5. Para la **inbox del esquema actual** no hay campo owner ni FK a Auth; el borrado de una cuenta no permite concluir qué eventos deben eliminarse sin consultar el ledger, por lo que la retención/custodia se define a nivel de sistema con acceso limitado.
6. Para datos en backup/provider, declarar límites y plazos reales según documentos de PAZO; no afirmar borrado instantáneo en todos los sistemas.

## Opciones para la decisión PO (no bloquea el código de pruebas)

- **A (sugerencia técnica):** inbox procesada durante **90 días** después de estado terminal; nunca purgar pendientes; ledger y tombstones según retención financiera/legal específica a definir.
- **B:** inbox procesada **180 días** después de estado terminal, más margen operativo a costa de conservar identificadores por más tiempo.
- **C:** política específica de otro plazo si soporte, reconciliación u obligaciones lo justifican.

Cualquier opción requiere aprobar: reloj de inicio, excepciones por disputa/reversión, tratamiento de pendientes atascados, registros de limpieza sin PII, derecho de acceso/supresión y pruebas de que un webhook antiguo no duplica un payment ID tras purgar su event ID.

## Gates posteriores

1. PO elige duración de inbox y el procedimiento para eventos pendientes/disputados; validar obligación de ledger/documentación contable por revisión legal.
2. Implementar job privado de retención con idempotencia y simulación de limpieza; no dar `DELETE` público ni habilitar cron pagado sin aprobación.
3. Auditar e integrar el preflight de eliminación de cuentas con los nuevos objetos antes de activar suscripciones reales.
4. Actualizar privacidad/términos ES/EN con prácticas efectivas, no propuestas.
5. Desplegar SQL y Edge solo por gate PO independiente tras QA; webhook Sandbox y PayPal Live tienen gates distintos.

**Fuente técnica:** `docs/PAZO_F16_PRIVATE_PAYMENT_SCHEMA_PREFLIGHT_20261013.md`, `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`, `docs/PAZO_MVP_MANUAL_DELETION_SOP_20261010.md`, `docs/PAZO_F16_PAYPAL_RECONCILIATION_MODEL_20261013.md`.
