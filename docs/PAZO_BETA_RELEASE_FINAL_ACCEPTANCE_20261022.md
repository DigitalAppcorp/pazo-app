# PAZO — cierre de implementación beta y aceptación restante (22-oct-2026 UTC)

## Mandato del PO
Finalizar todos los módulos aprobados de beta y el circuito PayPal Live programado y alojado para que solo reste ingresar privadamente las credenciales desde Administración con MFA y autorizar operaciones reales por separado. No crear nuevos planes/webhooks ni repetir Sandbox aprobado. No inferir beta financiera pública de CI.

## Estado real actualizado: última compilación publicada
- Frontend Vercel Production `dpl_DFkGfivtBoK5CV3jvL4V2yJV2pSW`, SHA `b5547243bfaeb6c17b8bd3929f05468273b9576b`, estado READY y alias `https://pazo-app-t83r.vercel.app`.
- PR78 fusionado a main `b5547243`: asociación accesible de email/contraseña con sus etiquetas de registro e inicio de sesión; no modifica el diseño.
- PR79 fusionado a main `e23fa3179e359b40eb5d7e858ce46ab8546b80a8`: prueba E2E pública en Chromium más estricta, sin cambio en bundle de la app.
- GitHub Actions [39733214540](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39733214540): **7/7 jobs PASS**, navegador real `canonical-chromium-e2e` job `119672810439` **29/29 verificaciones PASS** a 390px móvil y 1440px escritorio.
  - Portada renderizada, sin overflow ni excepciones JS.
  - Registro inspeccionado sin enviar, consentimiento 18+ desmarcado, privacidad disponible.
  - Campo de correo etiquetado en registro; correo y contraseña etiquetados en inicio de sesión.
  - Recuperación de contraseña abre, sin enviar correo de prueba.
  - Callback de aprobación/cancelación con token sintético se sanea; SPA hidrata; no PayPal API de escritura.
  - Service worker network-only registrado en Chromium real sin Cache Storage.
- HTTP externo de home, callbacks, manifest, SW e iconos se conserva 7/7 PASS; validación navegador **no equivale a PWA instalada en teléfono físico**.

## Backend / seguridad financiera
- Supabase migración alojada `20261022052854_pazo_f16_public_benefits_live_only`: los períodos QA Sandbox ya no producen badge/muro público. Filas QA y consentimientos conservados.
- Edge `pazo-admin-paypal-vault` v2 ACTIVE con `verify_jwt=true`; las credenciales reales se reciben únicamente en formulario privado con MFA fresco, no en este repositorio/chat. El guardado puede crear una reserva comercial metadata-only, idempotente, usando la RPC existente sin generar nuevos objetos de PayPal.
- Certificado técnico v3: `docs/evidence/PAZO_F16_TECHNICAL_RELEASE_ATTESTATION_V3_20261022.json`, digest SHA256 verificado en base de datos `03aeb1b37a465a52f0de6bf1963b46d258c5a9ef1848bb46775809bc30fabf9a`. Un único update CAS a `admin_private.pazo_live_release_artifact` pasó un ensayo BEGIN/ROLLBACK y COMMIT controlado mediante `scripts/f16-technical-release-attestation-refresh-v3-20261022.sql`. Readback: frontend SHA nuevo y `artifact_ready=true`. Certificados históricos v1/v2 no fueron eliminados de GitHub.
- Release PayPal Live **OFF**, kill switch ON y cobros Live **0**. No se registró ni autorizó una compra PayPal real.

## Únicos gates que no pueden ejecutarse sin dueño/dispositivo/pago
1. **Validación visual PO y operación autenticada real:** iniciar sesión con la cuenta Admin autorizada en el dominio canónico; confirmar el Centro de control responsive/PayPal sin error de rol y que no haya conflicto de interfaz con la referencia visual aprobada. El E2E público no tiene credenciales de usuario.
2. **PWA física:** instalar PAZO en Android Chrome o iOS Safari; confirmar abrir, cerrar/reabrir, iniciar sesión y navegar en el dispositivo del PO. Chromium desktop emulado no prueba este gate.
3. **Credenciales Live:** el PO verifica código TOTP y guarda Client ID + Secret únicamente en PAZO Admin, nunca en herramientas, GitHub o mensajes. Comprobar readback en el panel; no realizar un segundo POST ante respuesta incierta.
4. **Canary monetario privado de US$2.99:** autorización financiera específica y acción humana en PayPal; luego leer estado autoritativo de venta y webhook firmado, período real, badges, cancelación, reembolsos y rollback sin inferir cobertura por ACTIVE/retorno. Cualquier error observado se corrige antes del GO público.

**Interpretación correcta:** integración, migraciones, CI y frontend técnico están completos; **beta pública con pagos NO es GO** hasta las pruebas autenticadas/de dispositivo y el canary autorizado. La app gratuita está publicada técnicamente pero no hay aceptación final integral del usuario.

## Riesgos/limitaciones
- Advisor Supabase `auth_leaked_password_protection` indica configuración no habilitada y plan actual no puede presumirse compatible; no activar un upgrade facturable sin GO.
- Vercel runtime logs API devolvió 403 en la auditoría previa, por lo que no se declara escaneo de errores limpio.
- No se utilizaron contraseñas, tokens PayPal ni sesiones de usuarios reales para crear este reporte.
