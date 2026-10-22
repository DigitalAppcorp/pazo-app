# F16-P38 — vínculo de activación, ensayo PG17 descartable (NO-GO hosted)

## Diseño preparado
- Tabla aislada `supporter_private.p38_lab_verified_activation_binding` liga
  `provider_event_id`, `subscription_id` y `owner_id`.
- La lectura P38 exige evento de tipo ACTIVATED en inbox verificado,
  lease vivo, gate P21 habilitado y cutoff prospectivo, vínculo exacto
  con intent BOUND, origen de vinculación explícito y titular idéntico.
- Tabla con RLS FORCE, sin INSERT/SELECT directo para anon,
  authenticated o service_role; RPC ejecutable solo por service_role.
- Pruebas negativas para gate apagado, otro evento sin vínculo,
  token equivocado o expirado, otra suscripción y otro titular.

## Límite decisivo
El laboratorio inserta `provider_provenance='verified_provider_ingestion'`
desde fixture de confianza. **Este texto no autentica el webhook ni la
correspondencia con Merchant GET**. En producción no hay aún un
componente aprobado para poblar esa vinculación con una firma PayPal
validada, claim correcto y retención definida; por tanto, la propuesta
NO es una migración alojable ni autoriza pagos.

## Requisitos antes de siguiente gate
1. Fuente independiente de activación y comprobación Merchant GET;
   correlación Auth-owner / intent / suscripción.
2. Ingestión privada que no admita vínculos inventados por service_role.
3. Demostrar concurrencia, lease fencing, histórico anterior al cutoff,
   cancelaciones y rechazos por firma/procedencia incorrecta.
4. Política de retención e inventario de datos actualizado antes de
   cualquier cambio que almacene nuevas relaciones alojadas.
5. GO distinto para DDL alojada, habilitar el worker, checkout y beneficios.

P28 diferido; nada cambia Supabase alojado ni datos financieros.
