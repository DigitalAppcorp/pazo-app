# PAZO F16-P42 — autorización criptográfica de vinculación de activación

**Fecha:** 2026-10-16. **Estado:** implementado SOLAMENTE en PG17 desechable y
código Node/Edge OFFLINE, no importado por `receiver.mjs`, sin secreto alojado,
sin RPC instalada, sin cobros, sin worker, sin credenciales PayPal reales.
PR #44 DRAFT, F16 NO-GO, P28 histórico diferido.

## Problema resuelto en diseño de laboratorio

P39 aceptaba `p_server_origin='postback_verified_sandbox_activation'`.
Una constante enviada por cualquier servicio con `service_role` no permite
comprobar si el servicio verificó realmente la firma de PayPal. Por eso **P39
no debe instalarse tal cual en hosted**.

## P42: frontera de confianza en laboratorio

- En el backend, el código del receptor primero verifica el postback de
  PayPal por el mecanismo existente, luego registra la referencia en el
  inbox, y solo tras ambos pasos un adaptador aislado genera un HMAC SHA-256.
- La autorización HMAC se vincula a la tupla exacta
  `eventId|subscriptionId|issuedAt|nonce` y a la versión de clave.
  La vida temporal es **120 segundos**.
- PostgreSQL verifica el MAC con una clave privada **de la tabla protegida**,
  sin exponerla a `service_role`, anon ni authenticated. La extensión
  pgcrypto se resuelve en su esquema ya instalado; no se cambia su ubicación.
- Exige evento ACTIVATED en inbox verificado, **posterior al cutoff** de la
  versión de clave y suscripción BOUND del propietario preciso. La tabla
  P40 existente evita reasignar el mismo evento a otra suscripción.
- Repetir una prueba exactamente igual dentro de la ventana es
  idempotente; claves revocadas, tokens expirados, firmas modificadas,
  evento que no sea activación e historial previo al cutoff fallan.
- Las pruebas sintéticas de composición comprueban que una firma inválida
  de PayPal no produce registro ni autorización HMAC; un error del escritor
  produce 503/reintento incluso si el inbox ya contenía el evento.

## Limitaciones y gates NO resueltos

La firma HMAC certifica solo que quien llama conoce el secreto interno;
**no sustituye la firma de PayPal** ni acredita un cobro. Se necesita evitar
que cualquier ruta distinta del receptor firmado pueda acceder a la clave.

La tabla P42 de claves, versión LAB_V1 y el secreto sintético son
EXCLUSIVOS de PostgreSQL descartable; no deben migrarse ni copiarse a
Supabase. Para producción se requiere:
1. Diseño de generación, almacenamiento y rotación de una clave de servicio
   independiente, con política de acceso e inventario de secretos, aprobados
   explícitamente por PO. Sin revelar ni copiar secretos reales al chat.
2. Auditoría de grants, propiedad SECURITY DEFINER y filtrado de SQL
   (incluida exposición de funciones a través de API).
3. Revisión legal/contable de retención de los vínculos, borrado, backups,
   hold financiero y eliminación de cuenta antes de habilitar ingreso real.
4. Versionar migración de writer específicamente aprobada, realizar PG17
   y preflight hosted, luego PO GO **independiente** para aplicación.
5. PO GO separado para cablear/desplegar el receptor, cambiar webhook,
   activar worker y realizar nuevo checkout PayPal Sandbox.
6. Verificar venta, refunds, disputes, ciclo contractual y ledger idempotente
   antes de otorgar cualquier beneficio.

**Importante:** la P40 alojada actualmente tiene cero filas y no hay writer
ni secreto nuevo instalado por P42. No se modificó el procesamiento financiero.
