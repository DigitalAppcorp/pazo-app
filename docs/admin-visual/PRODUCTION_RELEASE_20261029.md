# Publicado — Administración visual y corrección #161

El Product Owner autorizó «sube todo a produccion» el 29-oct-2026. Se completó el lanzamiento del candidato integrado, sin ampliar recopilación, reiniciar cohortes o borrar historia.

## Versiones y despliegue

- [PR #162](https://github.com/DigitalAppcorp/pazo-app/pull/162) merged mediante squash con HEAD esperado `a901c4a154e7e7de71f798407f51206862769fe4`.
- Commit publicado: `16b705d65e8de54afa2c1600a24e2bb23802b99a`. Su árbol de runtime es idéntico al candidato aprobado. CI de ese commit y el smoke HTTPS/PWA de `main` pasaron.
- Vercel `dpl_BJ3xLUNFJf6HQJiQ5XydywM9pcHj`: READY, target **production**, proyecto/equipo originales. [PAZO](https://pazo-app.vercel.app) apunta al despliegue nuevo, confirmado mediante la API de aliases.
- Las dos migraciones se aplicaron individualmente mediante `apply_migration`, después de verificar hashes LF y guardar definiciones anteriores. No se ejecutó `db push` global. Hay 137 migraciones, frente a 135 antes del lanzamiento.

| Fuente preparada | Versión hospedada instalada |
| --- | --- |
| `20261029120000_pazo_analytics_admin_read_access.sql` | `20261029125959` |
| `20261029121000_pazo_admin_visual_summary.sql` | `20261029130004` |

El [registro de producción](PRODUCTION_RELEASE.json) conserva hashes, mapping y comprobaciones. El manifiesto PREPARED se mantiene como evidencia histórica del candidato, no como estado actual de instalación.

## Comprobaciones posteriores

- **51 comprobaciones Chromium reales** contra el sitio canónico, ES/EN, móvil390 y escritorio1440: render, límites de viewport, formularios accesibles sin envío, consentimiento inicial, recuperación de contraseña, retorno/cancelación sin pago y service worker sin caché de datos. [Resultados](evidence/production/canonical-result.json).
- **Seis chunks JavaScript publicados** verificados, incluidos los módulos cargados bajo demanda: contienen el reporte nuevo y la preferencia de exclusión. Una primera sonda buscaba todo en el entry; se corrigió la sonda para recorrer los imports, sin modificar producto.
- **Tres lectores HTTP reales sin sesión** rechazados con HTTP401/SQLSTATE42501, usando únicamente la clave pública compilada sin registrarla. Esto confirma también la disponibilidad de las rutas nuevas en PostgREST. [Resultados](evidence/production/http-postflight.json).
- **Tres lectores SQL con contexto AAL1 de un administrador existente** permitidos: visual, comportamiento e inteligencia. Los mismos lectores rechazaron un contexto de una cuenta existente sin grant. El acceso anónimo a la función nueva fue denegado. Las comprobaciones de contexto usaron transacciones con rollback, sin crear usuarios o sesiones.
- La respuesta **real** de producción pasó el parser TypeScript del cliente. Se mantiene el estado de muestra insuficiente y totales protegidos; no se sustituyen por usuarios o ceros inventados. La cobertura del resumen ejecutivo comienza con #150 el 28-oct y no equivale al total histórico de solicitudes de campaña desde el 26-oct.
- Los cuatro flags y sus fechas originales son idénticos al preflight; retención14d y salud de comportamiento/inteligencia siguen activas. Cron #4 había terminado correctamente a las12:17UTC. No se modificó su programación.
- Fingerprint de definiciones/ACL de las funciones ajenas a los tres lectores en los esquemas inspeccionados: `2e7273db552abdb4ba31defeba5205ed` antes y después. MFA sensible y funciones PayPal no se cambiaron. No se ejecutaron pagos, invitaciones o formularios de registro en producción.

El asesor de seguridad se consultó después del cambio. Advierte sobre lectores `SECURITY DEFINER` ejecutables por `authenticated`: es intencional para consultar agregados privados y exige dentro del cuerpo un grant administrativo confiable. La denegación a cuentas sin grant y a anónimos se comprobó. Persisten avisos ajenos al alcance sobre otras funciones/tablas y protección de contraseñas; no se presenta el asesor global como libre de advertencias ni se cambiaron políticas ajenas para silenciarlas.

## Uso y límites

El dashboard visual y la lectura agregada sin autenticador adicional ya están publicados. La autenticación y el grant de Administración siguen siendo obligatorios; las operaciones sensibles conservan MFA.

Para excluir el navegador del operador: **Administración → Mi actividad en los informes → Excluir señales de este navegador**. La preferencia es explícita, permanece tras logout y debe activarse en el origen/navegador de producción. No se activa para todos los visitantes al desplegar ni se importa desde staging. No borra registros anteriores o datos operativos.

No había una sesión humana de administrador abierta entre las superficies disponibles. Por ello no se afirma haber realizado un login humano real ni activado la preferencia en un navegador ajeno: el backend se comprobó mediante contextos SQL reales y la interfaz/flujo mediante las pruebas aisladas y del bundle. No se solicitaron ni utilizaron credenciales del PO.

La ausencia de vínculo individual entre solicitud publicitaria y cuenta continúa explícita. Se preservan los agregados anónimos anteriores, incluidas las señales de acceso, sin restar supuestas personas o atribuirlas a Meta.

## Reversión disponible

Despliegue anterior conservado: `dpl_6XNVw4afbDtim71jUPHjp76xDfiM`. Se guardaron las dos definiciones previas en el backup local ignorado `artifacts/admin-visual/release/rollback-before.sql`. Una reversión restauraría frontend y lectores anteriores mediante migración compensatoria registrada; no borraría eventos ni apagaría los colectores publicados. No se ejecutó reversión porque las verificaciones pasaron.
