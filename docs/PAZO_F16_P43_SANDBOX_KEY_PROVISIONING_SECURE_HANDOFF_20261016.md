# PAZO F16-P43 — provisión de clave Sandbox: handoff seguro para ejecución con gestor de secretos

**16-oct-2026.** El Product Owner autorizó expresamente generar y provisionar
una clave aleatoria REAL **exclusivamente para Sandbox** en PostgreSQL
y en el almacén privado de secretos de Supabase Edge, manteniendo
writer/worker/checkout/ledger/beneficios APAGADOS. El consentimiento
es para la provisión, NO para usar la clave ni registrar usuarios.

## Resultado del intento en Chat

La integración Supabase conectada no incluye acción para configurar/listar
de forma segura secretos de Edge Functions. Se verificó que Supabase admite
secretos por Dashboard o CLI:
https://supabase.com/docs/guides/functions/secrets

**NO se generó, insertó ni reveló una clave real.**
No ejecutar una provisión parcial DB-solo; haría imposible demostrar
correspondencia posterior sin extraer el secreto.

## Operación pendiente: requiere canal seguro real

El ejecutor autorizado en una sesión privada de Work / equipo con
credenciales debe:

1. Auditar proyecto ID `mrybvqdebbgcayuvgkkr` y comprobar:
   P42 `signing_keys` vacío, `writer_gate.enabled=false`,
   P21 OFF, P40 sin vínculos, ledger 0; RPC P42 sin EXECUTE
   para service_role/anon/authenticated. Abort si no coincide.
2. Confirmar acceso tanto al gestor de secretos Edge como a una sesión
   administrativa PostgreSQL segura. Si solo tiene acceso a uno,
   **detenerse antes de generar cualquier clave**.
3. En memoria privada de proceso, crear 32 bytes aleatorios mediante CSPRNG.
   Representarlos en HEX de 64 caracteres, sin imprimir, copiar a chat,
   screenshot, logs, código, historial de comandos, CI ni archivos
   persistentes. **No usar valores sintéticos de pruebas.**
4. Configurar secreto Edge específico
   `PAZO_F16_P42_SANDBOX_HMAC_KEY_HEX` sin exponerlo en arguments/logs.
   No desplegar Edge ni cambiar `receiver.mjs`.
5. En la misma operación controlada, insertar administrativamente la
   **misma clave decodificada** en
   `supporter_private.p42_activation_signing_keys` con
   `key_id='P42_V1'`, `enabled=false`,
   `not_before` futuro y `not_after` según el plan aprobado.
   **NO pegar bytes en Supabase SQL Editor**, cuyo historial puede
   conservar la consulta; utilizar un cliente TLS con parámetros
   enlazados, cifrado en tránsito y logging de parámetros deshabilitado.
   Si la operación DB falla, retirar inmediatamente el secreto Edge.
6. No introducir `service_role` o secretos en el frontend ni
   usar un RPC que devuelva bytes de clave. Confirmar únicamente
   atributos no sensibles: existe un key ID, `enabled=false`,
   gate OFF, ningún EXECUTE, ninguna nueva P40, ledger 0.
7. Destruir buffers y archivos transitorios donde la plataforma lo
   permita; retirar material de sesiones y limpiar archivos temporales.
   Registrar solo resultado/verificación, hora, key ID y operador
   autorizado, **nunca el valor del secreto ni hash divulgado**.
8. Una vez concluido, realizar postflight READ-ONLY y documentar
   migración/operación, permisos y revisión sin activar nada.

**Nota:** Los secretos Edge son del entorno del proyecto. NO compartir
clave con PayPal Live ni reutilizar para otro módulo. La clave interna
no equivale a una firma PayPal ni prueba de un ciclo financiero.

## Gates posteriores (NO aprobados)

- Validar operacionalmente almacenamiento/rotación, riesgo de acceso
  administrador y política de backups; cierre jurídico P40/P41.
- Autorizar en turno independiente `GRANT EXECUTE`, writer gate,
  integración de receptor firmado y despliegue Edge.
- Autorizar independiente comprador Sandbox nuevo/worker PayPal;
  reconciliación Merchant Sale/refunds/disputes y ledger seguro.
- Live permanece NO-GO y P28 histórico DIFERIDO.

**Estado al crear este handoff:** no existe clave real creada en este chat,
no se ha hecho ningún cambio alojado por P43.
