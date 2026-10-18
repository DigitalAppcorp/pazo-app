## Estado postflight autorizado — 2026-10-18

GO del PO recibido para instalar **únicamente** `20261018193000_f16_sandbox_fresh_owner_qa_admission.sql`, que fue aplicada y verificada en Supabase como `f16_sandbox_fresh_owner_qa_admission`. Acceso a ambas RPC exclusivamente por `service_role`, exigencia P06 eliminada, allowlist/Auth/expiración y límite idempotente preservados, pruebas PG17 + CI PASS.

El correo indicado por PO **ya existe como Auth confirmado** y no coincide con el Auth ligado al V2 huérfano; tiene 0 P06/V2/retry, sin allowlist. No se creó usuario nuevo, ni se habilitó aún su acceso QA: PO debe confirmar que desea utilizar esta cuenta previamente existente durante **48 horas**, sin eliminarla ni cambiarle la contraseña. No poner correo ni identificador personal en repositorios. Estado SQL: 1 QA owner enabled, 1 V2 original, 0 retries/grants/payments/periodos y 1 `CREATED` pending.

---

# PAZO F16 — Segunda cuenta QA descartable (preparación, no alta)

**Fecha:** 2026-10-18. **Autorización PO:** avanzar con una cuenta PAZO Auth de prueba independiente para verificar el primer checkout PayPal Sandbox desde cero. La autorización presente permite preparación de código/pruebas; NO es un GO separado para instalar nueva migración ni crear/autorizar un Auth user sin conocer su identidad.

## Hallazgo alojado y corrección preparada

- Estado de Supabase, **read-only**: `f16_sandbox_qa_owners` tiene 1 owner habilitado; hay 1 intento V2 original, 0 reintentos/grants/pagos/periodos, el `CREATED` huérfano sigue `pending`.
- `public.f16_qa_v2_owner_can_checkout(uuid)` exige **una fila P06 histórica** (`paypal_p06_checkout_attempts` v1) además de allowlist/Auth. La función `f16_qa_v2_begin_checkout` aplica la misma exigencia. **La cuenta QA nueva quedaría bloqueada por ambas funciones** incluso si se agregara a `f16_sandbox_qa_owners`.
- Preparación: `supabase/migrations/20261018193000_f16_sandbox_fresh_owner_qa_admission.sql` reemplaza únicamente dichas funciones para conservar Auth real, allowlist `enabled`, expiración, terms bilingües y consentimiento, idempotencia y **un único primer V2 por owner** sin crear P06 histórica ficticia. Mantiene RPC `EXECUTE` solo en `service_role`; elimina **solo** el requisito de prueba antigua P06. No crea usuarios, ni añade entradas en allowlist, ni crea un PayPal POST.
- Prueba PostgreSQL aislada `scripts/f16-v2-fresh-owner-disposable-lab.sql`: dueño antiguo preservado, dueño nuevo habilitado sin P06 abre un intento y reenvío de la misma clave es idempotente; segunda clave para ese nuevo owner se rechaza; usuario Auth no habilitado se rechaza; 0 registros financieros. CI `.github/workflows/f16-v2-fresh-owner-disposable-lab.yml`.
- **No modificar** la solicitud V2 original ni intentar habilitar reintentos para ese owner con permisos del nuevo. El antiguo error 404 permanece en revisión PayPal.

## Gates por ejecutar

1. **PO GO separado:** aprobar aplicar únicamente `20261018193000_f16_sandbox_fresh_owner_qa_admission.sql` a Supabase Sandbox QA; preflight DDL y exact ACL, postflight 1 original V2 y 0 reintentos/grants/pagos/periodos. Si el PO no aprueba, todo permanece en PR #44 y el nuevo owner aún no puede abrir Checkout.
2. **Cuenta Auth descartable:** se necesita una identidad PAZO nueva registrada por el flujo Auth normal, con correo bajo control del PO o de un operador QA (nunca inventar email/SSN). Sin emitir contraseñas al chat. No reutilizar el owner original, los seis Auth mantenidos ni el moderador. El bot no creó cuenta Auth; requiere registro real.
3. **PO GO para activar dueño QA específico:** con el UUID Auth verificado y consentimiento, el DBA podrá insertar solo esa cuenta en `supporter_private.f16_sandbox_qa_owners`, `status='enabled'`, `test_purpose='f16_four_benefits_sandbox'`, caducidad de prueba corta (p.ej. 24–48h) con guardia de no duplicidad. La credencial no se comparte con la app web; no habilitar lista a todos los usuarios.
4. **Una compra Sandbox autorizada por PO** solo después de un nuevo consentimiento V2: primero flujo exitoso para comprobar creación, aprobación, venta COMPLETED real en Sandbox, verificación del ledger, cancelación y ausencia de cobros posteriores. **No abandonar el primer checkout de esta única cuenta si el objetivo es terminar compra**: el SQL conserva la regla de un intento inicial por owner; el caso de abandono ya está reproducido por el owner antiguo y en test sintético. Una nueva simulación real de abandono requeriría otro owner o una solución de reintento con evidencia de proveedor.
5. **Limpieza**: deshabilitar autorización QA y seguir SOP de eliminación Auth sin perder registros firmados, consentimientos y auditoría financiera. No borrar filas protegidas/held ni alterar balances.

**NO se ha instalado la migración ni creado o activado la segunda cuenta.** Esto no activa Live, beneficios, main ni producción.

**Gate:** `F16_SECOND_DISPOSABLE_QA_AUTH_PREPARED_NEEDS_MIGRATION_PO_GO_AND_NEW_AUTH_ACCOUNT`.
