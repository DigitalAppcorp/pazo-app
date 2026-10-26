# F18 — Alternativa sin Codex: auditoría original desde el panel de PAZO

## Propósito
Desbloquear **solo la obtención de evidencia** del incidente #112 sin entregar
el invocador de `pazo-paypal-live-worker` a un agente ni al navegador.

El objetivo es consultar una vez el contrato histórico con las credenciales
de la generación comercial original en Vault. El administrador debe iniciar
sesión en PAZO y superar **un TOTP nuevo**; una sesión `aal2` antigua
no basta. La petición del navegador no recibe ni controla IDs de PayPal.

## Arquitectura preparada (sin despliegue)

- `pazo-admin-paypal-original-audit`: nueva Edge Function desactivada
  en `supabase/config.toml`, `verify_jwt=true`, GETs internos únicamente
  tras `GoTrue + pazo_is_admin + MFA TOTP reciente`.
- Importa el `createOriginalQaAudit` original, sin duplicar el criterio
  de concordancia de evento firmado, merchant generation, plan y consentimiento.
- El servicio resuelve el canario histórico a través del RPC SQL
  `pazo_f16_live_service_qa_original_scope` (STABLE/read-only), que exige
  que la campaña aún esté inactiva y fija la cuenta original; usa el lector
  Vault por generación. Sin `worker_admit`/lease, y sin RPC de escritura.
- La respuesta solo contiene banderas/estados y error HTTP tipificado:
  `eventReadable`, `signedEventMatches`, `evidenceComplete`,
  `providerHttpStatus`, `providerErrorName`, `providerStatus`, y
  conteos de transacciones **solo si se leyeron**. Jamás incluye IDs,
  tokens, buyer PII, `debug_id`, cuerpo remoto ni credenciales.
- `AdminPaypalOriginalAudit` aparece en **Integración y seguridad**;
  actualmente está **apagado por feature flag**, requiere MFA y no
  reintenta automáticamente, ni inicia/cancela suscripciones.

## Gate de publicación (requiere autorización posterior)
1. Validar CI, F18 regression, build, análisis de diff, test de origen,
   autorización MFA, fuga de secretos, comportamiento de 404 y
   no-mutation, sin editar el contrato aprobado de compras.
2. Si se aprueba, integrar PR, desplegar **solo** esta función con
   `verify_jwt=true`. Confirmar todos los módulos y JWT postflight.
3. Habilitar explícitamente feature flag del botón; desplegar el cambio UI
   únicamente cuando la función esté disponible y autorizada.
4. El administrador abre PAZO → Panel → PayPal Live →
   Integración y seguridad, verifica un código nuevo del autenticador
   y pulsa **Consultar evidencia una vez**.
5. Interpretar exclusivamente el resultado depurado y registrar en el
   incidente #112. Un 404 jamás es evidencia de cancelación ni de
   ausencia de dinero; `CREATED` jamás concede beneficios.
6. Resolver el evento retenido **solo** mediante un proceso separado,
   aprobado, idempotente y respaldado por evidencia de PayPal; no
   reabrir checkouts/invitaciones hasta `public_supporter_health()=true`.

## Límites y situación actual
No se ha ejecutado una consulta adicional a PayPal con esta ruta.
La función nueva no existe en Supabase hospedado, ni el botón está
liberado en producción. No se han alterado pagos, llaves ni finanzas.
El otro PR #116 (operador con invocador) permanece independiente, pero
esta alternativa no depende de aquella credencial operativa.
