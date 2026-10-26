## Marketing instalado OFF — postflight 26-oct-2026

PR125 integrado0ee700df, candidato3f050ead14/14checksPASS. SQL dirigido20261026201027/20261026201043, dosEdgev1 y frontendcanónicoREADYdpl_7vsKww6Jh3dwrobN1MiNvDbMohgJ. Colección/reportesOFF,retención0,filas0,Cronnuevo0;privacidad/proveedores/gasto separados. [Postflight y límites reales](PAZO_MARKETING_OFF_POSTFLIGHT_20261026.md), [URLs oficiales verificadas](marketing/traffic-pilot-urls.json). Demo se corrige aparte por indicaciónPO; no modificarla en este encargo. No repetir instalación ni activar colección.

## Actualización del candidato 26-oct-2026

Usar [readiness E2E](PAZO_MARKETING_E2E_READINESS_20261026.md) como estado vigente y el SHA final del nuevo PR. Las dos migraciones de PR91 se preservan byte por byte; manifiesto y guard F17 separan explícitamente fuentes NOT_APPLIED del historial instalado. Intake JWT=true explícito en config. No instalar desde PR91 antiguo ni asumir que este preflight concede GO. Retención sugerida14d, sin aprobar/configurar. Sigue sin proveedor, Cron de marketing o recopilación.

# Medición PAZO — instalación, verificación y reversión preparadas

**CODE ONLY / PR91 / issue96. No ejecutar sin GO específico del PO.** No se concede autorización al leer este documento. Fuente de alcance: [cierre técnico](PAZO_MARKETING_TECHNICAL_COMPLETION_ISSUE96_20261023.md).

## Preflight de instalación OFF

- Confirmar commit exacto de PR91, CI marketing/general/F17/finanzas, diff y hashes financieros. Conservar funciones/DDL precursoras y versiones, sin exportar Auth/Vault/pagadores.
- Auditar dependencias existentes: auth.users, profiles.is_founder, pets, QA/SandboxQA, admin_grants, app_activity_daily y pazo_is_admin. No copiar fixtures de tests a Supabase.
- F17 documenta drift histórico de migraciones: **no db push global, migration repair, reset ni reaplicar SQL financiero**. Tras GO, aplicar solo `20261024020632_pazo_marketing_firstparty_attribution.sql` y `20261024034549_pazo_marketing_retention_health.sql`, en orden, transacciones exactas. Registrar versión API↔archivo/checksum.
- Verificar FORCE RLS y denegación directa de todos los objetos marketing_private a anon/authenticated/service_role. Solo bridges autorizados; reporte solo authenticated+admin. Datos iniciales vacíos, enabled=false/retention_days=0.
- Publicar ambos Edge con source probado y gates false; landing usa verify_jwt=false pero exige prueba antibot en servidor al habilitar. Intake utiliza Auth GET independiente y sesión verificada (verify_jwt=true). No cambiar settings/secrets de F16.
- Frontend conserva COLLECTION/LANDING/ADMIN_REPORT=false. Alta, PayPal y demás secciones siguen funcionando sin backend marketing. Verificar503 desactivado sin enviar tokens de usuarios reales.

## Privacidad/configuración antes de activar

Retención **sin valor por defecto aprobado**:0. La implementación caduca atribuciones por recorded_at y agregados por fecha de Los Ángeles; la ejecución es cada6h. El aviso/plazo aprobado debe contemplar esa granularidad y demora operativa, no prometer un borrado instantáneo. El PO debe elegir explícitamente un plazo de1–90 días si decide recopilar;30 es solo un fixture/recomendación anterior. Revisar backups/PITR, restauración, eliminación por soporte/cuenta y logs Cron/infra antes de publicar aviso ES/EN. Validar que las estadísticas de llegada son señales aproximadas; no tasa de conversión/visitantes únicos.

Borrador ES, no publicado: “Si llegas desde uno de nuestros anuncios, PAZO puede asociar temporalmente identificadores limitados de campaña a tu cuenta para medir el registro confirmado, la primera mascota y una señal de navegación D7. No enviamos conversiones individuales a Meta. Puedes solicitar acceso o eliminación mediante el contacto de privacidad. Para proteger las señales anónimas podemos utilizar Cloudflare Turnstile, que procesa metadatos técnicos de la conexión. El plazo aprobado y el tratamiento de respaldos se indicarán antes de activar.”

Draft EN, unpublished: “If you arrive from one of our ads, PAZO may temporarily associate limited campaign identifiers with your account to measure verified registration, your first pet and a D7 navigation signal. We do not send individual conversions to Meta. You may request access or deletion through our privacy contact. Anonymous signals may be protected by Cloudflare Turnstile, which processes technical connection metadata. The approved retention period and backup handling will be specified before collection is enabled.”

Tras GO del proveedor, configurar un widget **Invisible**, hostname exacto pazo-app.vercel.app y acción pazo_marketing_landing; pre-clearance desactivado. Verificar CSP para script/frame/connect del dominio exacto challenges.cloudflare.com, sin relajar la política global. Clave pública en VITE_PAZO_MARKETING_TURNSTILE_SITE_KEY; secreto solo Edge PAZO_MARKETING_TURNSTILE_SECRET mediante gestión privada. No enviarlo por chat/Git/cliente. El cliente no muestra un reto interactivo o casilla; si requiere interacción o falla, descarta señal y continúa Auth.

Siteverify se llama solo a challenges.cloudflare.com: timeout5s, sin remoteip, sin logs/tokens persistidos; exige respuesta auténtica, hostname/action y fecha≤5min. El proveedor aplica token de un uso. Origin y topes DB no sustituyen ese control. Configurar también protección/cuotas del hosting frente a volumen de solicitudes; una prueba válida no garantiza inmunidad a fraude humano o DDoS. No habilitar la señal anónima si ese análisis/GO está pendiente.

## Calendario de borrado, con recopilación OFF

1. Después del GO de política, configurar retention_days/policy_version como operador privado, **todavía enabled=false**. No usar30 por copiar un test. No ejecutar desde rol cliente.
2. Confirmar extensión pg_cron y permisos instalados con GO. Ejecutar operación separada `supabase/operations/marketing-retention-cron-activation.sql`. Nunca forma parte de db push; valida política y llama instalador privado idempotente.
3. Nombre único pazo-marketing-retention-v1, cada6h (`17 */6 * * *`, UTC), comando solo `SELECT public.pazo_marketing_prune_all_v1();`, dueño/base actuales. Si existe distinto/inactivo, investigar: el código no lo reemplaza silenciosamente.
4. Observar **al menos dos ejecuciones periódicas reales** exitosas y los conteos/horas mediante `supabase/queries/marketing-retention-postflight_READ_ONLY.sql`. Una llamada manual o el doble de CI no demuestra operación periódica real.
5. Probar en entorno aislado caducidad y fallo atómico; en hosted comprobar solo metadatos/filas autorizadas. Restringir acceso/retención de cron.job_run_details, logs del proveedor y respaldo. No volcar return_message potencialmente sensible a GitHub.
6. Solo con nueva autorización de recopilación revisar avisos, política, último run real y heartbeat recientes≤7h, command/owner/origin/source, y habilitar mediante release separado los gates necesarios. No modificar las pruebas para ocultar una activación no autorizada. El trigger/RPC rechaza salud inválida; ninguna función prepara y activa simultáneamente.

## Postflight y rollback

Con GO futuro: verificar actor admin/no admin, proyección solo agregada7/30/90, señal anónima sin prueba/replay rechazada antes de DB, Auth no confirmado rechazado, QA/admin/fundador0, una atribución por cuenta y borrado Auth/solicitud. No hacer pruebas sobre usuarios reales ni inventar métricas. Comparar contra source/bundle probado, contador de errores, ejecución Cron y experiencia móvil/escritorio ES/EN; separar prueba técnica de aprobación del PO.

Si hay fallo, apagar SQL collection gate y gates cliente/Edge; conservar el borrado autorizado y capacidades de soporte. Retención stale/último run fallido bloquea intakes y muestra paused. Revertir frontend/Edge a source conocido con gates OFF; no revertir F16 ni borrar tablas/identidades para silenciar un guard.

La operación `marketing-retention-cron-removal.sql` es independiente e idempotente, requiere GO y rechaza si quedan datos o colección activa. No parar eliminación mientras queden filas con obligación de caducar. Backup/PITR puede reintroducir filas: al restaurar mantener OFF, aplicar controles/limpieza aprobados y verificar antes de abrir. No se promete borrado instantáneo de copias ni retención no aprobada.
