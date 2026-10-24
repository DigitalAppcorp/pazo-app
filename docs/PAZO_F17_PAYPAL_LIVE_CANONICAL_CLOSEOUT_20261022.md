# PAZO F17 — Cierre técnico del dominio PayPal Live (22-oct-2026)

## Por qué falló la prueba del usuario
La cuenta normal no era elegible en `canary`; el navegador recibía OPTIONS 403 por el origen nuevo `pazo-app.vercel.app` en las funciones Live. Adicionalmente, cinco funciones financieras SQL y un CHECK fijo referían el sitio antiguo, y `profiles.onboarding_completed` nunca se marcaba true después de crear una mascota.

## Corrección aplicada sin cargos
1. Se actualizaron CORS de origen exacto y respuestas diagnósticas, no se admitieron orígenes arbitrarios de `.vercel.app`. Se rehízo el Live admin UI para separar precio, origen de retorno, webhook y MFA.
2. `scripts/f16-public-pwa-http-gate.mjs` ahora certifica las rutas HTTPS en el dominio oficial; 7/7 PASS observadas.
3. `supabase/migrations/20261022220000_pazo_live_canonical_origin_guarded.sql`: ROLLBACK PASS, luego COMMIT PASS; 5 funciones y CHECK del artefacto repinados, settings/artefacto/evidencia/auditoría en una transacción. No se cambió ninguna Vault UUID, precio, plan, webhook, modo, revisión o caja.
4. Edge administración: versiones nuevas bootstrap7/inspect5/vault3, JWT obligatorio y MFA preservado, actualmente rechazando rotación de credenciales mientras Live esté activo.
5. `supabase/migrations/20261022222000_pazo_f17_pet_onboarding_integrity.sql`: ROLLBACK/COMMIT PASS; 4 perfiles con mascotas reales confirmados, perfil sin mascota pendiente; A03 futura completa onboarding. RLS original preservado.

## Postflight de integridad
Modo `canary` revisión 1; active generation 1, precio $2.99, origin `https://pazo-app.vercel.app`, artifact_ready TRUE, worker enabled/processing+heartbeat TRUE, original owner admitted TRUE; período pagado Live0 e intents0. Códigos del PR #81 con CI y seguridad SUCCESS, sin merge. No crear ni repetir ventas de forma automática.

## Aún pendiente: primera venta Live y operador
La aprobación en PayPal solo puede realizarla el usuario con sus propias credenciales y consentimiento. El primer ciclo canary tiene que ejecutarse usando la cuenta que creó la generación original; una cuenta normal está correctamente excluida hasta verificar venta, período, beneficios, cancelación, webhook firmado y reconciliación contable. Después, el PO puede autorizar la promoción controlada a `public` desde Admin Live, con MFA fresco y revision CAS.

## Separaciones importantes
- `return_origin`: dominio adonde PayPal devuelve al navegador; puede cambiar con migración/certificación de la ruta.
- Webhook Live: URL de Edge en Supabase; no es una redirección de Vercel y **no necesita cambiar solo por mover el dominio**.
- Precio/plan: PayPal Subscription Plan es el titular del importe; no se cambia un plan activo editando un número de la UI. Rotar plan/credenciales/webhook exige una nueva generación verificada, preservación histórica, MFA y control de cambios; esto continúa fuera del primer canary.
