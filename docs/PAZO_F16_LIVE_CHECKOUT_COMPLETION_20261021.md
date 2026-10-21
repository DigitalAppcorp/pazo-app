# F16 — Checkout Live, consentimiento y recuperación

P1 integrado por PR54 exclusivamente a F13, merge `c9c01fde`. Ocho migraciones
alojadas y worker Edgev2 instalados; cron saludable con procesamiento financiero
OFF, LiveOFF/killON y cero generaciones comerciales/eventos/períodos/casos Live.
P2 continúa en la rama de recuperación, sin modificar el clon original.

## Primer bloque P2: oferta y constancia (solo local)

`liveOfferRegistry.mjs` fija textos ES/EN prospectivos de US$2.99 mensuales y
cuatro beneficios aprobados. Utiliza el operador ya indicado por el PO en
`legalCopy.ts`: Alvarado Solutions LLC, California; no se afirma comprobación
registral independiente. Precio, renovación, primer período observado,
cancelación directa, cobertura pagada, parciales en revisión y permiso separado
del muro quedan explícitos. No contiene placeholders ni claves privadas.

Versión `pazo-supporter-live.beta20261021-v1`. Cada SHA256 cubre, en UTF8/LF,
versión, idioma, título, etiqueta de aceptación y texto completo:

- ES: `b3b6614d95ea6bb600fe9479ac4be115d39769f1e38a4fc30b7cb4273573dbb1`.
- EN: `eb7f13dc7bb212a83223af0f260d77c5ac66ee993d5e090a3d7e6e7e886484b9`.

Crear el registro no publica una oferta ni atesta revisión jurídica. El gate de
release debe autorizar expresamente esta versión antes de habilitar cobros.
Se conservan las decisiones pendientes de retención por clase del registro P05;
no se inventan firmas, plazos contables ni jobs de purga financiera. El inbox ya
tiene una decisión PO de90d desde conciliación definitiva, con exclusión de
pending/review/holds; no se aplica a consentimientos, pagos, disputas o backups.

Migración local CLI `20261021165838`: dos ofertas FORCE RLS sin lectura directa
de clientes/servicio. CHECK verifica los hashes, normalizando CRLF del transporte.
Triggers prohíben cambiar/borrar/truncar las versiones registradas. FK de cada
intento exige versión/idioma/digest exactos. Otro trigger fija owner, requestKey,
generación, plan, aceptación, fecha inicial, primer claim y binding original,
permitiendo posteriores observaciones de estado merchant.

RPC de acuse service-only, con owner resuelto por el futuro endpoint Auth,
devuelve texto/versión/idioma/fecha del intento exacto. Nunca confirma pago ni
devuelve subID/credenciales. Rollback rechaza eliminar un contrato aceptado;
solo es admisible sin intentos. SQL/Node sintéticos verifican el rechazo de
modificaciones, owner ajeno, hash incorrecto, cambio de idioma, replay de claim,
estado merchant permitido y rollback/reapply vacío. PG25/26 PASS, detenidos;
17 Node de oferta/checkout/worker PASS.

Checkout y worker locales utilizan ese registro para validar aceptación;
`PAZO_F16_LIVE_TERMS_VERSION/DIGEST` dejan de ser configuración manual. Esto
todavía NO está desplegado. Los entrypoints públicos Live permanecen hard-OFF.

## Próximos bloques necesarios, sin pedir claves todavía

- Una intención activa por owner y estado privado durable que determine si
  continúa una aprobación previa, requiere revisión o permite nueva aceptación.
- Recuperación de creación incierta y abandono sin otro requestKey ni cobros
  especulativos; callback firmado puede corroborar el intent original antes de
  vincular una creación huérfana. No usar404 ni inventario incompleto como ausencia.
- Endpoint de cuenta Auth para lectura, reanudar, cancelar renovación y descargar
  constancia. Cancelación/lecturas históricas usan la generación original y
  continúan disponibles cuando se detiene el nuevo checkout.
- UI bilingüe con checkbox desmarcado, una acción bloqueada durante envío,
  retorno HTTPS/PWA al contexto de cuenta y espera de verificación real.
- P3 debe proyectar períodos Live/holds/primer control de disputas a beneficios.
  `owner_id` NO es una FK a Auth: la baja de cuenta necesita preflight explícito
  de cancelación para impedir facturación de una cuenta que ya no puede entrar.
- Readiness, credenciales Admin y GO/canary, HTTPS/PWA y resto P3–P5.

## Protocolo PayPal consultado (lectura de documentación, no llamadas Live)

El [schema vigente1.11](https://developer.paypal.com/api/subscriptions/v1/schema.json)
documenta GET List subscriptions y conserva PayPal-Request-Id72h. El schema1.8
del repositorio GitHub solo muestra POST en esa ruta: no usarlo para afirmar
que GET no existe. Snapshot público1.11 fuera de Git, SHA256
`f8535d303786f248a474df720317928f4b06f6e6a29e90fe0043b9b349251dd9`.
Una lista vacía no certifica ausencia de obligación futura. El GET de detalle y
el vínculo de requestKey/intento/merchant originales siguen siendo necesarios.
