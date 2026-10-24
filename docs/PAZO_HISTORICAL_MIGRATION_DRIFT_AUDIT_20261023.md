# PAZO — Auditoría de historial de migraciones (solo lectura)

**Corte:** 23-oct-2026 PDT, después del merge de F17 a `main` (`5d4464f`). Base de datos alojada: `mrybvqdebbgcayuvgkkr`. **No se ejecutó `db push`, `migration repair`, DDL, SQL de provisión, ni modificaciones de PayPal.**

## Hallazgo cuantificado

- Estado inicial: **110 migraciones versionadas en GitHub** y **122 versiones alojadas** en `supabase_migrations.schema_migrations`.
- Comparación de prefijos de versión: **36 nombres de archivo locales sin versión remota exacta** y **48 versiones remotas sin prefijo GitHub exacto**.
- Se encontró una pareja por `name` para **28** de esos casos, pero se comparó el texto íntegro de `statements` alojados contra cada archivo. **23 coincidieron byte por byte**. Las otras **5 NO son idénticas**, aunque compartan nombre.
- Los otros casos sin pareja por `name`: **8 exclusivamente locales** y **20 exclusivamente remotos**. Sin prueba de contenido, su naturaleza sigue por investigar.
- Cambio aplicado a rama **aislada**: renombrados **solo los 23 archivos byte-idénticos** a sus versiones alojadas; comprobación mediante blobs Git y test `scripts/f17-historical-migration-alignment.test.mjs`. No se alteró ninguna línea SQL.
- Con estos 23 renombres, el desajuste numérico esperado es **13 prefijos locales sin versión remota exacta** y **25 versiones remotas sin prefijo local exacto**. La discrepancia **sigue abierta**.

## Las 23 correspondencias con contenido idéntico

| Versión local original | Versión alojada | Fuente | Prueba |
| --- | --- | --- | --- |
| `20261005213000` | `20261006054510` | `care_agenda` | SQL exacto |
| `20261006092000` | `20261006090654` | `fix_private_document_storage_policies` | SQL exacto |
| `20261006134500` | `20261006133945` | `trim_validation_indexes` | SQL exacto |
| `20261006135500` | `20261006134050` | `restore_validation_fk_indexes` | SQL exacto |
| `20261007013000` | `20261007014214` | `communities_mvp_core` | SQL exacto |
| `20261007015000` | `20261007014624` | `fix_community_storage_policies` | SQL exacto |
| `20261007025000` | `20261007023927` | `harden_community_extension_experiment_eligibility` | SQL exacto |
| `20261007054500` | `20261007053859` | `fix_place_checkin_checkout_rls` | SQL exacto |
| `20261007073500` | `20261007072355` | `place_extension_experiments` | SQL exacto |
| `20261012063205` | `20261012071140` | `f14_one_object_admin_reconcile` | SQL exacto |
| `20261018165000` | `20261018132808` | `f16_sandbox_v2_append_only_checkout_retries` | SQL exacto |
| `20261018170000` | `20261018132828` | `f16_sandbox_v2_multiattempt_account_read_and_finance` | SQL exacto |
| `20261018190000` | `20261018154128` | `f16_v2_created_webhook_candidate_readonly` | SQL exacto |
| `20261018193000` | `20261018163723` | `f16_sandbox_fresh_owner_qa_admission` | SQL exacto |
| `20261018201000` | `20261018170858` | `f16_local_sandbox_automatic_qa_admission` | SQL exacto |
| `20261018213000` | `20261018184603` | `f16_sandbox_qa_owner_membership_read` | SQL exacto |
| `20261019044000` | `20261019042653` | `f16_sandbox_v2_pending_abandonment_preflight` | SQL exacto |
| `20261019092000` | `20261019134346` | `f16_sandbox_v2_automatic_reconciled_retry` | SQL exacto |
| `20261019150000` | `20261019150118` | `f16_sandbox_qa_two_abandoned_v2_reset` | SQL exacto |
| `20261019180000` | `20261019173620` | `f16_qa_pending_approval_restart` | SQL exacto |
| `20261019193000` | `20261019175722` | `f16_qa_repeat_abandonment_restart` | SQL exacto |
| `20261019195500` | `20261019183232` | `pazo_admin_paypal_gateway_settings` | SQL exacto |
| `20261020200800` | `20261020200238` | `pazo_f16_secret_provision_audit_guarded` | SQL exacto |

## Cinco casos con `name` coincidente pero bytes diferentes

| Archivo local original | Versión alojada | Comparación |
| --- | --- | --- |
| `20261006090000_private_pet_documents.sql` | `20261006090551` | Diferencias de comentarios y formato SQL; no verificado como identidad semántica |
| `20261006124500_communities_validation_instrumentation.sql` | `20261006133534` | Únicamente un salto de línea final |
| `20261007021500_community_extension_experiments.sql` | `20261007023800` | Únicamente un salto de línea final |
| `20261007052000_phase_8_places_map_core.sql` | `20261007052747` | Diferencias en comentarios/espacios; texto SQL normalizado por líneas coincidente |
| `20261007053000_phase_8_places_initial_catalog.sql` | `20261007052749` | Diferencias en comentarios/espacios; texto SQL normalizado por líneas coincidente |

Aunque cuatro parecen variantes cosméticas, **ninguno de los cinco fue renombrado**, porque esta operación exige identidad exacta de bytes. El caso de documentos privados requiere revisión particular de seguridad y dependencias.

## Estado sin pareja por nombre

**8 archivos exclusivamente locales:** `feed_like_save_integrity`, `post_comments_source_of_truth`, `pet_registration_editing`, `security_stabilization`, `prevent_same_owner_follows`, `rescue_passport_alerts`, `sighting_contact_details`, `feed_scroll_pagination`. No asumir que no están operativos; pueden haberse instalado sin historial o bajo otro nombre.

**20 versiones exclusivamente remotas:** `register_places_map_validation`, `grant_module_validation_inserts`, 16 migraciones de la serie `f14_*` (moderación/media/control), `f16_p22_claim_scoped_bound_intent_read_only`, `f16_p28_minimal_hmac_historical_admin_audit`. Son registros históricos reales, pero el repositorio no contiene archivos versionados con esos mismos nombres.

## Decisión técnica / bloqueo

**PROHIBIDO `supabase db push`, `supabase migration repair` y automatismos de migración contra producción mientras estos 13/25 desajustes permanezcan.** No convertir ausencia de archivo Git en autorización para borrar migraciones remotas; no ejecutar scripts locales con efectos laterales para “alinear” versiones. Cualquier reparación posterior necesita identificar el SQL real, comparar estados y probar en laboratorio con rollback.

**Esta rama contiene solo una reconciliación de 23 archivos de fuente ya aplicados.** GitHub PR debe dirigir a `main`, pero **no se fusionará sin nueva autorización del Product Owner**. La versión oficial de PAZO y PayPal Live L1 permanecen separados del trabajo.
