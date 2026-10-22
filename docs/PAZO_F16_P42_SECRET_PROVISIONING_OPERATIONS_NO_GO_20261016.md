# PAZO F16-P42 — preflight y procedimiento de provisión de clave real (NO-GO)

**2026-10-16.** A petición de continuar el proyecto se avanzó únicamente en
comprobaciones de seguridad y preparación; `ok go` no ejecutó ninguna
provisión de secreto real, concesión de EXECUTE ni activación financiera.
F16 NO-GO; P28 histórico diferido; PR #44 DRAFT.

## Estado verificado

En Supabase `mrybvqdebbgcayuvgkkr`, mediante consulta read-only:
- P42 claves **0**, gate **OFF**, cutoff `NULL`.
- P40 vínculos **0**, P21 worker **OFF**, ledger **0**.
- RPC P42 instalada, propietario `postgres`, SECURITY DEFINER,
  `search_path` explícitamente vacío. `service_role` sin EXECUTE,
  SELECT de claves ni UPDATE de gate; RLS FORCE.
- `pgcrypto` instalado bajo esquema `extensions`.

Preflight `supabase/queries/f16_p42_provisioning_structural_preflight_READ_ONLY.sql`
es reproducible y falla cerrado si detecta drift de objetos/roles, clave
presente, gate encendido, saldo financiero, permisos añadidos, ausencia de
RLS o cambio de configuración de RPC. **No contiene ni solicita secretos**.
El check de configuración acepta exclusivamente las representaciones PG
`search_path=` y `search_path=""` del search_path vacío.
La CI corre el mismo preflight en PostgreSQL desechable después de
instalar el esquema P42 de laboratorio.

## Propuesta de procedimiento futuro, SIN autorización para ejecutarlo

1. **Prerequisitos de privacidad:** resolver el borrado, legal holds,
   backups y auditoría de datos vinculados P40/P41, validar legalmente
   el criterio activo + tres años después del cierre.
2. **Custodia de secretos:** decidir un custodio del secreto para la
   Edge Function verificada con capacidad de provisionar/rotar
   variables cifradas **sin escribirlas en GitHub, logs o chat**.
   El conector Supabase disponible actualmente no proporciona una
   operación de gestión de secretos de Edge; no sustituirla por
   pegado de credenciales en SQL, commits o respuestas.
3. **Decisión PO separada:** autorizar de forma específica la
   generación y custodia de una clave aleatoria independiente de al
   menos 32 bytes para **Sandbox exclusivamente**. No reutilizar
   JWT, PayPal OAuth, otras claves o key material de pruebas.
4. **Etapa de preparación (con permiso distinto):** crear versión
   `P42_V1` con `enabled=false`, inicio prospectivo y ventana de
   validez; almacenar material solo en almacenes privados de runtime
   y PostgreSQL administrativo. Nunca exponer bytes a service_role
   por SELECT ni introducirlos en notas, herramientas de chat o CI.
   Rotación debe soportar coexistencia transitoria de dos versiones.
5. **Verificación sin escrituras:** repetir el preflight read-only
   cuando corresponda; si ya hay una clave preparada el presente
   preflight de estado **vacío** fallará intencionalmente, por lo que
   se requiere un preflight distinto para estado aprovisionado pero
   inactivo antes de un lanzamiento.
6. **Activación posterior (GO adicional):** validar el receptor de
   webhook PayPal firmado, retención y consentimiento, reconciliación
   con merchant, pruebas operativas; sólo entonces considerar
   `GRANT EXECUTE` controlado, gate prospectivo, deploy Edge y
   pruebas de compras. No activar de forma simultánea sin gates.
7. **Emergencia:** primero gate `enabled=false` y revocar acceso del
   escritor; después desactivar la versión comprometida, revisar
   firmas/reintentos e investigar. No emitir períodos, pagos,
   descuentos o beneficios por el solo hecho de tener una clave.
8. **Rotación:** versión nueva apagada, cutoff posterior al instante
   del nuevo despliegue verificado; verificar firma/identidad; desactivar
   vieja versión tras TTL de 120 segundos + margen operacional
   y preservar trazabilidad sin secreto; dos versiones nunca habilitan
   el procesamiento financiero por sí mismas.

## Gate vigente

**No aprovisionar clave real ni modificar hosted P42.** Para avanzar
hay que resolver el canal privado de entrega/custodia, obtener
autorización PO de claves separada de la autorización previa de
estructura, y cerrar los requisitos legales de retención para
cualquier ingesta real.

La firma HMAC interna NO es un comprobante de PayPal y nunca basta
para registrar un cobro o `paidThrough`.
