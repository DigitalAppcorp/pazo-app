## Issue96 — medición interna preparada, no recopilación activa (23-oct-2026)

Código OFF en PR91. Atribución privada: UUID Auth obtenido en servidor, cuatro enums UTM, first-touch/confirmación y versión informativa; una por cuenta, exclusión retroactiva QA/fundador/admin y CASCADE de cuenta. Primera mascota y proxy D7 se derivan de datos existentes; panel solo agregados. Staging local72h y supresión de intentos24h sin UUID/click ID/URL/IP; no son visitantes únicos. Retención de cuenta/agregados sigue0, no30 aprobado. La purga se prepara para seguir con colección OFF; no se permite quitar política con filas pendientes. Backups/PITR/logs y aviso ES/EN requieren revisión antes del GO.

**Proveedor propuesto, no activo:** Cloudflare Turnstile Invisible para señales anónimas, con Siteverify servidor; token efímero de un uso, hostname/acción/edad verificados antes de DB. No se persiste ni registra token, secreto, IP, fingerprint, user-agent o payload proveedor en PAZO. El navegador/proveedor podrá procesar metadatos de conexión y protección antibot conforme a sus términos; no afirmar anonimato total. Requiere autorización/configuración/revisión de privacidad antes de cargar el script o usar secreto. No cuenta nueva, SDK, plan ni proveedor activado en esta tarea. Fallo/configuración ausente: señal descartada sin afectar Auth. Ninguna conversión individual a Meta, CAPI, Pixel o PostHog.

Última limpieza guarda solo fecha/política/conteos en singleton privado. Datos de pruebas son sintéticos en PostgreSQL17 local/CI; el Cron es un doble declarado, sin trabajos alojados. Ver [cierre](PAZO_MARKETING_TECHNICAL_COMPLETION_ISSUE96_20261023.md) y [instalación/política/rollback](PAZO_MARKETING_INSTALLATION_RUNBOOK_20261023.md).

## Issue85 — relectura QA y certificado técnico (24-oct-2026, instalado; gate cerrado)

Una revisión autorizada puede conservar UUID de petición, generación/evento originales, diagnóstico/estado/attempts anteriores, status/timestamp reales del proveedor y digest de evidencia mínima. Sigue la retención/hold de su inbox financiero (FK que acompaña la purga lícita del padre), sin payload ni pagador. Ningún recheck borra firma o marca processed: solo retorna a pending con historial y tope original de intentos, tras GET auténtico y cero transacciones. El certificado técnico privado conserva commits/bundles/digest/origen/revisiones/fecha conforme al control financiero existente; solo postgres puede certificar, y no concede MFA ni inicia campaña. No nuevas categorías de terceros, secretos, publicidad o analytics.

## Issue85 — cohorte de QA prebeta excluida (24-oct-2026, aplicada: QA8/reales0)

Clasificación privada durable por UUID Auth, motivo fijo prebeta_20261023 y fecha de clasificación; incluye todas las cuentas anteriores al primer deploy oficial 2026-10-23 22:59 UTC. La elegibilidad exige además created_at posterior/al cutoff inmutable y ausencia de allowlist Sandbox. Sirve para excluir tests de invitaciones, CREATE, métricas, ingresos y promociones sin borrar ledger/recibos ni la cuenta admin/MFA. Tabla FORCE RLS sin grants a clientes/servicio; campos solo agregados en Administración. La etiqueta QA usa FK Auth ON DELETE CASCADE; la admisión financiera guarda además el booleano inmutable real_account_at_admission con la retención de su historial original, para que borrar Auth no libere cupos reales ni convierta QA en real; no añade PII ni analytics. No se borran obligaciones reales por clasificarlas QA. La auditoría original sigue disponible al operador hasta conciliar el contrato.

## Issue85 — auditoría privada del contrato QA original (23-oct-2026)

El diagnóstico admite únicamente nombre de error PayPal enumerado y debug_id hexadecimal acotado, sin texto arbitrario. Esa correlación se conserva solo en soporte privado; la evidencia Git elimina debug_id. Una referencia operacional privada puede incluir los IDs originales mínimos para que el titular consulte su propia cuenta PayPal; sin credenciales ni pagador, sin analytics ni publicación. Con 404 se conserva STOP, sin usar ausencia de recurso como cancelación o ausencia de pagos.

GO PO para conciliar antes de L1. Worker interno puede leer únicamente el contrato bound del canary prebeta original mediante generación/plan inmutables, GET de suscripción/plan/transacciones completas/evento firmado. Respuesta mínima: estado, fechas proveedor, contadores y coincidencias; sin pagador, IDs, URLs ni credenciales. No CREATE/CANCEL/grants en esta auditoría. Capacidad de dispatch aleatoria de un uso (120s), no clave permanente en pg_net. RPC de scope solo service_role; dispatcher solo postgres; sin acceso directo cliente. No retención nueva de payload ni analytics. Evidencia financiera original se conserva sin mutarla; el resultado agregado sirve para decidir conciliación/STOP, no equivale a permiso financiero.

> **SMTP instalado, 22-oct-2026:** Gmail elegido y cuenta confirmada por PO; Supabase entrega correos de Auth/recuperación vía Google SMTP cifrado, con secreto solo en configuración privada Auth. Texto público ES/EN actualizado para Google/Gmail, direcciones y contenido de esos correos; no analytics ni transferencia de datos financieros/mascotas. Un correo de recuperación solo al PO confirmado recibido, sin cambiar contraseña. No se inventa plazo de purga del proveedor. Ver `PAZO_BETA_MAIL_AUTH_PREVIEW_20261022.md`.

> **22-oct, moderación pública:** parche preparado del lector de beneficios aplica visibilidad de perfiles retirados antes de exponer badge/tema/hito o nombre/foto en muro. No nuevos datos, retención o consentimiento; no borra pagos/historial. SQL20261022021500 instalado con ensayo/CI/postflight, sin datos nuevos. Ver `PAZO_PUBLIC_RPC_SECURITY_REVIEW_20261022.md`.

> **Reconciliación legal F16, 22-oct-2026:** privacidad y términos ES/EN describen PayPal, referencias financieras privadas/retención sujeta a obligaciones, períodos pagados verificados y permiso separado revocable del muro. No cambian recolección, plazos, política comercial ni términos Live publicados. Fecha legal solo metadata de publicación autorizada, vacía en previews. Gmail elegido para SMTP Auth pero aún SIN configurar ni envío; no afirmar transferencia nueva al proveedor hasta postflight. Detalle `PAZO_BETA_MAIL_AUTH_PREVIEW_20261022.md`.

> **F16 P4, 22-oct-2026 — instalado, modo OFF:** controles privados de release conservan UID del administrador original, nonce UUID, acción, revisión y fecha, como evidencia de autorización e idempotencia. Siguen la custodia/retención del audit financiero existente; rollback no borra esa historia. El certificado técnico conserva commit/hash de evidencia/builds/origin, sin claves ni datos del pagador. Solo el servidor verifica MFA y consulta originales; ningún cliente puede escribir certificados, selector o auditoría. El estado administrativo devuelve modo y booleanos, sin identidades. No nuevo analytics ni perfilado.

> **F16 preparación administrativa, 21-oct-2026:** RPC de solo lectura revalida admin y proyecta únicamente booleanos de esquema, custodia de claves, validación previa del proveedor, salud reciente del worker y códigos cerrados de pendientes. No lee secretos, identidades, plan/webhook IDs ni datos del pagador; no recoge eventos o datos nuevos ni activa pagos. El cliente descarta respuestas al cambiar la cuenta. Esta lectura no sustituye el gate P4 financiero.

> **F16 scheduler, 21-oct-2026 — preparación local:** cron emitirá como máximo una llamada por minuto al worker privado del mismo proyecto, leyendo la capacidad técnica dentro del servidor. pg_net mantiene temporalmente el header interno en su cola privada no registrada hasta consumirlo; no lleva claves PayPal ni datos del pagador. Respuestas contienen solo códigos/contadores y su retención nativa predeterminada es6h; logs técnicos de nuestro job se limitan7d. No se purga historia financiera ni otros jobs. Extensiones nativas aún no instaladas/validadas.

> **F16 control privado, 21-oct-2026 — solo preparación local:** una capacidad técnica aleatoria se generó dentro de PostgreSQL y quedó cifrada en Vault, con hash privado para autenticar el worker; nunca se devuelve a clientes ni registros operativos. Un singleton privado conserva lease de lote, última salud/diagnóstico y contadores agregados; inbox añade espera de reintento y código cerrado. Ningún payload o pagador se registra. La capacidad se conserva mientras opere el worker y se podrá revocar/rotar; el rollback solo elimina la capacidad propia si no fue usada. Control instalado apagado y endpoint privado v1 desplegado sin activar procesamiento. No hay scheduler activo ni datos financieros Live nuevos.

> **F16 lifecycle, 21-oct-2026 — preparación local:** el intento Live podrá conservar status PayPal, instante de status, última observación y fecha del fallo firmado. No cambian cobertura ni consentimiento y siguen la retención financiera del intento con sus holds. La búsqueda privada de refund reutiliza vínculo/fecha de venta ya registrados; no guarda otra copia del payload ni datos del pagador. Campos instalados en 20261021142517 tras CI y postflight, sin nuevos datos Live.

> **F16 lease atómico, 21-oct-2026 — solo preparación:** inbox añade el UUID privado del intento completado para resolver respuestas inciertas sin duplicar pagos. Se conserva con la misma retención/hold de inbox financiera, sin exposición a clientes; no contiene JWT. La lectura de contexto devuelve al servidor fechas/versión/digest del consentimiento original, referencias de activación, último período y holds. Snapshots PayPal normalizados permanecen en memoria, sin pagador, PII ni cuerpo bruto. No se han recogido datos Live nuevos.

> **F16 firmado, 21-oct-2026 — preparación P1, sin ingesta alojada:** la recepción autenticada por postback PayPal prepara una tabla privada FORCE RLS con SHA-256 de los bytes firmados, ID de webhook, referencias opacas de evento/suscripción/sujeto y fechas mínimas del evento y de la activación. No conserva cuerpo original, pagador, Merchant ID, saldos ni credenciales. Dos RPC service-only vinculan la evidencia al owner/intento/generación y limitan su lectura a una reclamación vigente. Los metadatos siguen el hold de la inbox: ninguna purga automática mientras estén pendientes, en revisión o sujetos a obligación financiera. Nuevos datos reales siguen sin recogerse; migración local y pruebas PG17, sin activar webhook ni cobros. Ver `PAZO_F16_SIGNED_SALE_RECONCILER_20261021.md`.
> **F16 Sandbox read-only 2026-10-18 — Inventario general comercial v14:** `audit_retry_inventory` consulta temporalmente por GET todas las suscripciones de la cuenta Business Sandbox, sin filtros de plan o estado, además del inventario filtrado anterior. Esas respuestas pueden incluir datos de terceros y deben permanecer exclusivamente en la memoria del servidor durante la inspección; solo se devuelven al owner QA categorías fijas y estado del ID exacto, sin IDs, email, payload, URLs ni credenciales. No se guarda ni comparte el inventario ni se usa para telemetría. JWT y owner allowlist obligatorios. No se generaron cargos ni se activó worker. `docs/F16_V2_UNFILTERED_MERCHANT_RECONCILIATION_20261018.md`.

> **F16 Sandbox 2026-10-18 — Diagnóstico de identidad CREATED desplegado con aprobación PO:** RPC `f16_qa_v2_read_created_webhook_candidate` instalada para solo `service_role`, denegando `anon` y `authenticated`; Edge QA v13 JWT ON exige propietario Auth verificado + allowlist, obtiene evento PayPal Sandbox por GET y devuelve solamente categoría cerrada de coincidencia, sin IDs del proveedor, datos del pagador, credenciales ni payload a frontend. No se añadieron campos persistentes; 1 webhook VERIFIED CREATED sigue `pending`. No se generan pagos, grants ni beneficios. La lectura del evento en PayPal todavía requiere clic explícito en la UI QA. PayPal Live intacto.

> **F16 2026-10-18 — Nueva conciliación de referencia CREATED preparada, SIN instalación:** RPC privada de solo lectura ofrecerá exclusivamente al servicio una referencia `provider_event_id` previamente verificada y asociada temporalmente al intento V2 autorizado; en servidor Sandbox se hará GET del evento y se compararán `resource.id`, `custom_id` y plan con la cuenta owner-bound. El cuerpo PayPal puede incluir datos sensibles, pero se descarta inmediatamente y solo se devuelve categoría cerrada sin PII, correo, credenciales, ID proveedor ni URL. No se añaden campos persistentes ni analítica, no se permite lectura directa anónima/autenticada, no se hace grant/ledger/entitlement. Instalación/Edge habilitados solo con revisión y aprobación PO separada. Informe `docs/F16_V2_CREATED_WEBHOOK_RECONCILIATION_20261018.md`.

> **F16 Sandbox QA temporario — 2026-10-17:** Cuenta PAZO existente seleccionada por PO habilitada en allowlist privada con expiración, sin PII en repo. Contrato Sandbox V2 bilingüe publicado por US$2.99 mensuales *simulados*. Sin nuevos cobros, venta o período al registrar esta nota. Solo merchant GET verificado + propietario/intento V2 acreditan período en tabla privada; devoluciones crean holds; muro exige opt-in revocable independiente. No usar Sandbox en Live ni publicar datos del comprador. Revocar QA al lanzamiento MVP y respetar la retención necesaria para auditoría.

> **F16 QA RPCs de beneficios 2026-10-17:** estado de acceso a mascota (badge, tema, hito) se calcula únicamente de períodos QA privados y de owner con autorización temporal `enabled`; publicación del muro exige consentimiento individual revocable, sin owner ni datos de pago expuestos. Migración `20261017161221_f16_sandbox_qa_verified_benefits_reads`, ensayo con ROLLBACK y postflight cero datos reales en UI. No usar fuera de QA ni activar con eventos `ACTIVE` sin venta `COMPLETED`. Retención/limpieza de datos de cuenta descartable requiere revisión antes de poblar.

> **F16 Sandbox QA V2 alojado (2026-10-17):** PO autorizó instalación de cuatro tablas privadas vacías para allowlist de cuenta descartable, período/venta PayPal Sandbox, holds y fondos; esquema RLS FORCE + sin grants a clientes, servicio ni público. Ver `20261017160619_f16_sandbox_benefits_v2_private_qa_staging.sql`. Ninguna identidad, evento, pago ni compra nueva se añadió en esa instalación. Oferta en ESP/ENG v2 de cuatro recompensas está **no publicada**, checkout OFF y Live OFF. El primer ingreso real de identificadores necesitará owner descartable, limitación temporal, verificación PayPal Sandbox y ciclo de borrado/retención, sin datos completos de pagador ni filtraciones de webhook. No convertir esta tabla en tracking comercial.

> **F16-P42 (2026-10-16; infraestructura interna inactiva instalada):** con autorización específica del PO se instalaron las tablas privadas de P42, actualmente sin material de firma, y una compuerta apagada. La RPC asociada existe, pero los roles cliente y de servicio no pueden ejecutarla. No hay nuevas vinculaciones de personas y permanece pendiente la revisión de conservación y eliminación P40-P41 antes de registrar datos reales. `docs/PAZO_F16_P42_HOSTED_INERT_INSTALL_POSTFLIGHT_20261016.md`.

> **F16-P42 (2026-10-16; propuesta de seguridad, no desplegada):** PO autorizó únicamente **preparar** la infraestructura privada de claves HMAC y RPC P42, desactivadas y sin claves reales. Nunca enviar secretos al navegador, logs, analítica o documentación; no instalar ni registrar nuevas vinculaciones de usuarios sin un GO separado y cierre de retención/backup P40/P41. `docs/PAZO_F16_P42_HOSTED_DISABLED_KEYS_ROTATION_PROPOSAL_20261016.md`.

> **F16-P40 (2026-10-15):** con autorización separada del PO se instaló solamente la **tabla privada vacía** de vínculo PayPal evento/suscripción/UID; 0 filas, sin ingesta ni acceso directo de los roles de aplicación. Retención PO provisional activa+3 años tras fin contractual permanece pendiente de revisión legal, lifecycle y eliminación de backups **antes de registrar datos reales**. No hay RPC P39 ni pagos habilitados. `docs/PAZO_F16_P40_HOSTED_EMPTY_SCHEMA_POSTFLIGHT_20261015.md`.

> **F16-P41 (2026-10-15):** PO aprueba provisionalmente finalidad y retención de la referencia privada PayPal (suscripción activa más tres años calendario desde terminación efectiva, salvo suspensión justificada por disputas/reembolsos/ley). No es política legal definitiva ni autoriza tratamiento alojado hasta resolver borrado, backups, excepciones y revisión de privacidad. Ninguna eliminación automática, UI pública o nueva instalación. `docs/PAZO_F16_P40_PRIVATE_BINDING_STORAGE_RETENTION_REVIEW_20261015.md`.

> **F16-P40 (2026-10-15, no publicado ni desplegado):** PO aprobó **solo el propósito y categoría** de un vínculo privado entre evento PayPal, suscripción y UID interno para conciliación, sin datos del pagador ni payload original. Retención, supresión de copias, límites de acceso y DDL hosted requieren revisión y GO separados. Borrador protegido por RLS/ACL sin writer; no utilizar el dato en analítica, publicidad ni perfiles públicos. Ver `docs/PAZO_F16_P40_PRIVATE_BINDING_STORAGE_RETENTION_REVIEW_20261015.md`.

> **ESTADO DE RELEASE VIGENTE — 2026-10-10:** `LEGAL_RELEASE_READY=true` en código significa que el texto bilingüe está preparado para revisión, no aprobación legal ni salida pública. La fecha efectiva permanece `null` hasta publicación. El readiness técnico actual está en `docs/PAZO_MVP_TECHNICAL_RELEASE_READINESS.md`; beta pública NO-GO hasta sus gates de privacidad, Preview/PWA y operación.

# PAZO — Privacy & Data Governance

Comprobación Live administrativa (20-oct-2026): claves aportadas por el PO solo
para una petición HTTPS con JWT/admin/MFA reciente; OAuth y GET PayPal, sin
persistencia de claves en navegador/Vault/Edge y sin logs, analítica o respuesta
de credenciales/tokens. Solo se conserva Webhook ID y auditoría administrativa
de configuración en tablas ya privadas. No hay datos de pagador, suscripciones,
eventos financieros ni beneficios nuevos. No implica política legal de retención
nueva ni habilitación de captura financiera. Véase
`PAZO_F16_LIVE_RESOURCE_INSPECTION_20261020.md`.

**Estado:** ACTIVO / BETA GATE  
**Producto objetivo:** 18+  
**Propósito:** definir qué puede recopilar, mostrar, registrar o enviar PAZO antes de Beta pública.

> Este documento es una política técnica/producto interna, no asesoría legal. Privacy Policy y Terms públicos deben revisarse antes de Beta.

## 1. Principio

PAZO recopila solo los datos necesarios para una función aprobada.

No usar:
- “por si acaso”;
- “quizá sirva para analytics”;
- “la herramienta lo captura automáticamente”

como razón suficiente para recolectar datos.

## 2. Clasificación

### Público por intención del usuario
Ejemplos:
- nombre de mascota;
- foto pública;
- bio pública;
- contenido social publicado;
- perfil público de rescate limitado.

Debe quedar claro qué será público antes de publicar.

### Privado de cuenta
Ejemplos:
- email de autenticación;
- estados internos de cuenta;
- preferencias privadas.

No exponer a otros usuarios.

### Privado sensible
Ejemplos:
- documentos de mascota;
- contactos/reportes de avistamiento;
- ubicación precisa;
- datos de pago/entitlement;
- futuros mensajes privados.

Reglas:
- acceso mínimo;
- RLS/ownership;
- no analytics;
- no logs de contenido;
- no session replay sobre estas superficies.

### Operacional/telemetría
Solo eventos mínimos para:
- estabilidad;
- seguridad;
- uso agregado;
- validación de producto.

No incluir contenido del usuario.

## 3. Tracking

### Permitido por defecto
- eventos explícitos de producto;
- UUID interno;
- session id aleatorio;
- tipo de evento;
- booleanos/categorías cerradas;
- release/environment;
- errores sanitizados.

### Prohibido por defecto
- email;
- teléfono;
- nombre real;
- texto de posts/comentarios;
- mensajes;
- texto de búsqueda;
- contenido de documentos;
- filename privado;
- ubicación precisa/GPS;
- tokens;
- cookies/identificadores de terceros no necesarios;
- datos de tarjeta;
- session replay;
- autocapture indiscriminado.

Cualquier excepción requiere:
1. razón;
2. minimización;
3. retención;
4. proveedor;
5. revisión de privacidad;
6. autorización del PO.

## 4. PostHog

Configuración inicial:
- ingestión manual únicamente;
- sin autocapture;
- sin session replay;
- sin heatmaps que capturen contenido;
- sin formularios capturados automáticamente.

Si se habilita una de esas funciones:
- debe existir revisión de superficies privadas;
- masking;
- lista de exclusión;
- actualización de Privacy Policy;
- aprobación explícita del Product Owner.

## 5. Edad / menores

PAZO está diseñado como servicio 18+.

Política inicial:
- no pedir ID ni documento de identidad por defecto;
- no recolectar fecha de nacimiento completa si no es necesaria;
- mantener age attestation 18+;
- no diseñar marketing/UX dirigido a niños;
- si PAZO obtiene conocimiento concreto de que una cuenta pertenece a un menor, debe existir procedimiento de restricción/cierre y eliminación según corresponda antes de Beta pública;
- cualquier sistema futuro de age assurance debe recopilar/retener el mínimo posible.

No asumir que “18+” en Terms resuelve por sí solo todos los escenarios regulatorios.

## 6. User-generated content

Antes de Beta pública debe existir:
- reportar contenido;
- reportar perfil;
- bloqueo;
- ocultar contenido;
- moderación;
- proceso para contenido ilegal/abusivo;
- procedimiento para reclamaciones de copyright/IP;
- eliminación de contenido/cuenta;
- manejo de contenido derivado después de borrar cuenta.

## 7. Pagos

PAZO no almacena:
- número de tarjeta;
- CVV;
- credenciales PayPal.

Fuente de verdad:
- proveedor de pagos + backend verificado.

Antes de reactivar Supporter:
- precio/periodicidad claros;
- beneficio claro;
- cancelación clara;
- entitlement server-side;
- Privacy Policy/Terms reflejan el proveedor;
- no dark patterns;
- no paywall sobre seguridad/rescate.

## 8. Ubicación

- ubicación exacta solo cuando una función concreta la necesita;
- preferir uso efímero;
- no persistir GPS exacto por defecto;
- ubicación social visible debe ser explícita;
- logs/analytics no reciben coordenadas exactas.

## 9. Documentos

- bucket privado;
- URLs firmadas temporales;
- owner-only;
- no indexar contenido;
- no enviar metadatos privados a analytics;
- no session replay en modal/flujo de documentos.

## 10. Logs y errores

Los logs no deben ser una segunda base de datos de PII.

Errores:
- redactar email;
- JWT/tokens;
- query params sensibles;
- no adjuntar estado completo del usuario;
- no serializar payloads de formularios.

## 11. Retención

Antes de Beta debe existir una matriz de retención para:
- cuenta;
- contenido;
- documentos;
- rescue sightings;
- logs;
- analytics;
- backups.

No prometer borrado “instantáneo” hasta conocer el comportamiento real de backups/proveedores.

## 12. Transparencia antes de Beta

Requisitos de lanzamiento:
- Privacy Policy visible;
- Terms of Use visibles;
- effective date;
- categorías de datos recopilados;
- categorías de proveedores/terceros;
- propósito;
- proceso de acceso/corrección/eliminación cuando aplique;
- cambios materiales;
- edad mínima;
- pagos/cancelación si Supporter está activo;
- contacto de privacidad.

California CalOPPA exige una privacy policy visible para operadores comerciales que recopilan información personalmente identificable de consumidores de California. CCPA/CPRA applicability debe evaluarse por sus criterios vigentes; no asumir aplicabilidad o exención solo por tamaño.

## 13. Beta Gate

No abrir Beta pública hasta que:
- F14 cierre moderación/privacy;
- Privacy Policy y Terms existan y reflejen el producto real;
- account deletion exista;
- UGC reporting/blocking exista;
- data inventory y retention matrix estén documentados;
- tracking audit PASS;
- providers list actualizada;
- payment wording PASS si Supporter está activo;
- proceso de minor/underage report esté definido;
- legal review sea obtenida si el PO decide que el riesgo/alcance lo amerita.

## 14. Referencias regulatorias a revisar al lanzamiento

- FTC COPPA Rule / FAQs;
- FTC guidance vigente sobre age verification;
- California Online Privacy Protection Act (CalOPPA);
- CCPA/CPRA y regulaciones de California vigentes.

Revisar fuentes oficiales en la fecha de lanzamiento; no congelar requisitos legales en documentación antigua.

## Contacto público de privacidad y soporte — decisión PO 2026-10-10

El PO autorizó **appdigital.corp@gmail.com** para recibir consultas de privacidad y soporte de PAZO. Es una dirección **deliberadamente pública**, enlazada mediante `mailto:` en la vista de privacidad/Terms y en la solicitud de baja (ES/EN). Esta autorización **no** convierte el email en identidad legal del responsable, **no** concede permisos de Supabase, y no permite publicar su UUID Auth, credenciales ni metadatos de solicitudes. Los mensajes que envíen usuarios a ese buzón pueden contener información personal: tratarlos como datos privados de soporte, acceso mínimo, sin analítica ni copias en issues públicos, con política de retención pendiente de fijar antes de Beta externa.

La recepción de un email o una solicitud en la app **no equivale a eliminación completada**. Mantener `LEGAL_RELEASE_READY=false` hasta validar responsable legal, retención, tratamiento de terceros y operación manual de baja con cuenta descartable. No enviar email desde el navegador automáticamente: el enlace abre el cliente de correo del usuario.

## Entidad operadora — decisión PO (2026-10-10)

El Product Owner identifica **Alvarado Solutions LLC** como la empresa registrada bajo la cual opera PAZO. Se permite atribuir públicamente al operador de PAZO este nombre en **borradores** de Privacidad y Términos en español e inglés. El PO confirmó **California** como estado de registro; no consta revisión independiente del registro público ni domicilio registral proporcionado. No inventar dirección, agente registrado ni otros datos de identificación. El canal público autorizado es `appdigital.corp@gmail.com`. **La entidad legal y el buzón son conceptos distintos**, no implican permisos extra para cuentas Auth ni una certificación del proceso de bajas. `LEGAL_RELEASE_READY` permanece falso hasta validar tratamientos, retención y procedimiento real de eliminación para la beta pública.


## Preferencias y gestión Live — preparación Codex 21-oct-2026

Tres migraciones locales, no aplicadas: recuperación de vínculos originales,
preferencias cosméticas y agregados admin. La recuperación usa únicamente la
misma intención/generación/consentimiento y sus columnas de lease ya existentes;
no hace inventario de otros compradores, no guarda cuerpo PayPal, no registra
tokens y no modifica períodos financieros. La constancia descargada contiene
solo oferta original y fecha de aceptación, sin ID PayPal, owner o request key.

`supporter_private.pazo_live_pet_themes` conserva únicamente mascota, propietario
al elegir, enum de fondo y fecha de actualización. Se separa de Sandbox, se
oculta al perder cobertura o cambiar propietario y se elimina al quitar la
preferencia o borrar mascota/cuenta (FK CASCADE). No cambia la retención del
ledger. Muro requiere el opt-in separado ya existente y permite revocarlo tras
expirar o recibir un hold. No habilita telemetría nueva.

El resumen financiero es una RPC autenticada que revalida `pazo_is_admin()` y
solo devuelve conteos/importes agregados de evidencia PAZO, sin identidad de
comprador o proveedor. No es saldo, ingresos netos ni estado de cuenta PayPal.


## Gate F17 — retención decidida y controles preparados, no alojados

PO eligió90 días después de resolver soporte. Migraciones versionadas preparan
limpieza diaria de mensaje/respuesta/nota, sin reiniciar plazo por edición;
reabrir retira fecha de resolución y baja confirmada elimina por FK. No afirmar
instalación: postflight confirmó tablas nuevas ausentes. Privacidad ES/EN está
reconciliada para este incremento y solo se publicará con su backend aprobado.

El envío usa RPC con identidad confirmada y nonce; ningún usuario puede insertar
una nota/respuesta de administrador, leer casos ajenos o recuperar notas por la
proyección propia. Límite3/h serializado. UI cancela respuestas antiguas y limpia
campos privados ante cambio de cuenta. Sin emails/analytics/replay nuevos.

Las cortesías solo crean metadata de acceso/auditoría por destinatario; no venta,
mes pagado, ledger o métrica financiera. El muro conserva opt-in separado,
visibilidad por moderación y propietario actual. Preferencias e historial se
sujetan a baja de destinatario; mantenimiento registra metadata privilegiada y
huellas, sin copiar anuncios como texto libre en auditoría.

La migración de mantenimiento prepara hook REST y RLS restrictiva para datos,
Storage protegido y canales privados aplicables; exige autorización para
instalación y deja modoOFF. Auth, cancelación/conciliación y objetos públicos ya
emitidos mantienen las excepciones descritas en el informe F17. No se afirma
apagar Realtime globalmente ni revocar cachés/URLs firmadas ya entregadas.
Recuperación administrativa compila aparte de App, valida rol en servidor y no
persiste su sesión. No usar fuente/CI como prueba de una sesión real alojada.

El banner PWA solo guarda localmente la fecha de descarte7 días, sin identidad ni
tracking. Fuente de verdad actual: `PAZO_F17_BETA_CLOSURE_GATE_20261022.md` y
matriz F17 al inicio de `PAZO_DATA_INVENTORY.md`.
