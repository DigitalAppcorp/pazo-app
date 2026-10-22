# F16 — Pruebas PayPal Sandbox para cuentas PAZO autenticadas en Vite local

**Fecha:** 2026-10-18 · **PO:** aprobó simplificar permisos QA de cuentas, conservando consentimiento e integridad financiera.

## Implementado y desplegado

- **Migración SQL instalada:** `f16_local_sandbox_automatic_qa_admission` (fuente `supabase/migrations/20261018201000_f16_local_sandbox_automatic_qa_admission.sql`). Función `public.f16_qa_v2_auto_admit_local_sandbox_owner(uuid)` con SECURITY DEFINER y EXECUTE **solo service_role** (anon=false, authenticated=false). Requiere usuario Supabase Auth con email confirmado y no anónimo; crea la fila **privada** QA `enabled`, `expires_at='infinity'`, sin alta manual y solo si ese usuario no existe en esa lista. Las filas históricas, caducadas o explícitamente `disabled` se preservan intactas. La revocación manual administrativa sigue bloqueando.
- **Edge instalada:** `f16-paypal-supporter-v2-qa` **v15 ACTIVE**, `verify_jwt=true`, 19 archivos. Solo en `http://localhost:5173` o `http://127.0.0.1:5173`, y con el entorno de servidor `PAZO_F16_PAYPAL_ENV='sandbox'` y plan fijo, un usuario Auth válido puede leer la oferta sin QA allowlist. **La primera inserción automática QA ocurre únicamente al enviar `action:'begin'` con consentimiento afirmativo y estructura válida**; la función lee owner directamente del JWT validado en servidor y llama al RPC restringido. Después, las verificaciones de consentimiento bilingüe/terms SHA, oferta de 2.99 USD, 1 único intento inicial por owner, claim irreversible antes de PayPal POST, plan+custom_id verificados y rechazo de duplicados permanecen iguales. El `retry_begin` sigue requiriendo evidencia privada y no se habilitan grants.
- **La ventana del preview Vercel NO autoriza nuevos usuarios automáticamente**; conservó la allowlist previa. CORS/Origin no constituyen una prueba criptográfica del origen del solicitante: la seguridad financiera depende del Sandbox, del token Auth validado, de la restricción de la función de servidor y de los controles transaccionales, no del encabezado Origin por sí solo. PayPal Live y `main` no se modifican.
- **Dinero:** Sandbox utiliza fondos simulados de PayPal. `CREATED`/`APPROVAL_PENDING` no acreditan pagos ni beneficios; la verificación del primer ciclo permanece separada. No se reactiva worker financiero ni se modifica el evento pendiente V2 del usuario original.
- **Pruebas:** GitHub Actions: CI y seis laboratorios PostgreSQL 17 **7/7 SUCCESS** en commit `e11dd4c266049bd21b7669101173f13332fa7406`, nuevo laboratorio `f16-local-sandbox-auto-qa-admission-lab.sql` verifica confirmados/anónimos/deshabilitados, antigua cuenta intacta, función server-only, idempotencia de inscripción y 0 DML financiero. Test `f16LocalSandboxAutoAdmission.test.mjs` verifica el guard de Auth+Origin+consent+plan.

## Postflight inmediatamente después de la migración (sin compra)

`qa_owners=1`, `original_v2=1`, `retry_attempts=0`, `retry_grants=0`, `payment_entries=0`, `paid_periods=0`, `original_created_pending=1`. Ninguna cuenta nueva se registró ni fue autorizada durante el despliegue. La cuenta indicada por PO existía previamente en Auth con correo confirmado y sin V2 ni P06; no guardamos su correo ni UUID en GitHub.

## Próxima acción de prueba

1. Sin borrar cuentas ni ejecutar SQL, en Antigravity carpeta `C:\Users\osori\PAZO-F13-preview`, estando en rama `f13/section-titles-20261012` con cambios locales limpios, ejecutar `git pull --ff-only` (si hay cambios locales, no descartar; revisar).
2. Comprobar `.env.local` local `VITE_PAZO_F16_SANDBOX_QA_UI=true`; iniciar/recargar Vite `http://localhost:5173`; iniciar sesión con el Auth previamente indicado por PO. Entrar a membresía de prueba; la oferta puede verse sin autorización administrativa.
3. La primera suscripción QA requiere aceptación explícita de términos y clic voluntario del comprador; **no automatizar PayPal POST ni aprobación**. Si se desea probar compra completa, no abandonar primero esta cuenta: un intento inicial por usuario sigue siendo de una sola vez por protección contra duplicados. Una aprobación PayPal Sandbox por comprador y su comprobación de venta/cancelación requieren pasos separados.
4. **No asumir que esta solución arregló el 404 de la cuenta original**. El webhook firmado original permanece pendiente y no autoriza un retry grant.
5. Al terminar QA, cerrar el acceso Sandbox de nuevo para lanzamientos de producción; las filas QA se consideran prueba y se gestionarán por SOP sin purgar consentimientos/eventos financieros.

**Gate:** `F16_LOCAL_SANDBOX_ANY_CONFIRMED_AUTH_AUTO_QA_V15_DEPLOYED_ORIGINAL_ORPHAN_ISOLATED`.
