# #150 — privacidad, seguridad y publicación preparada

Estado: candidato de implementación. **Sin permiso de publicación ni recolección nueva.** Issue150 y comentario6479704793 autorizan desarrollo, laboratorio y staging. No reutilizar GO147 para esta mejora.

## Datos mínimos y derechos

Sesión observada autenticada: UUID aleatorio efímero en memoria, propietario interno auth.uid, inicio/última recepción del servidor y secuencia. Sin cookie de navegación, fingerprint, URL, IP guardada, parámetros, texto ni identificadores de dispositivo. Un reload puede iniciar otra sesión técnica; no se presenta como visitante único o primera visita histórica. Sesión máxima4h, caducidad tras30min sin eventos,12 sesiones/cuenta/24h,110 eventos de navegación/sesión y10 resultados del servidor. Cola cliente8; un reintento idéntico, timeout5s y aborto por vigencia de Auth. Tokens permanecen en memoria y se fijan al actor original; refresh mantiene la sesión técnica, logout/login reinician incluso A→B→A.

Pantallas gruesas: Inicio, Mi mascota, QR, Agenda, Comunidades, Lugares, Explorar y primera mascota. Estados de carga/error/reintento: Inicio y Agenda, no duración. Excluidos documentos, mensajes, alertas de pérdida, perfil público ajeno y creación de posts. No se capturan pantallas de pago/soporte. Care viene del INSERT confirmado; rollback no cuenta y fallo/lock métrico no impide guardar. Primera compartición QR deriva del resultado existente; no se fabrica repetición histórica o entrega externa. QA/admin/founder/demo excluidos por backend, nunca por un booleano cliente.

Prerregistro: únicamente campaña/creatividad existentes aceptadas por allowlist; botón registro, apertura del formulario, solicitud aceptada y error genérico. Contadores anónimos diarios, sin sesión anónima ni enlace a cuentas. Reutiliza origen exacto, límites de body, Turnstile con hostname/action y digest single-use existente. Gate Edge y gate DB independientes OFF; presupuesto3000 por creatividad/paso/día. No ampliar a referrers arbitrarios ni visitas únicas. Sin campaña válida: NOT_MEASURED; alternativa segura es probar el recorrido y observar contadores separados, nunca crear una identidad para forzar atribución. No se puede excluir retroactivamente una cuenta en un contador realmente anónimo; el laboratorio intercepta toda escritura alojada y no aporta tráfico QA a producción.

Retención de navegación: ancla inmutable started_at de cada sesión; las visitas no renuevan filas antiguas. Consultas excluyen todo dato fuera de14d. Cron/purga existente elimina sesiones y eventos por cascada, además de contadores anónimos en días Los Angeles; no se crea un nuevo scheduler. La eliminación física se ejecuta normalmente cada6h, puede retrasarse ante fallos y backups/logs tienen ciclos propios. No se promete borrado instantáneo ni retención física absolutamente exacta durante una caída; colección fail-closed con salud de retención inválida. Sin histórico anónimo permanente de30/90d oculto.

Retirada nueva desde privacidad con sesión autenticada: borra registros activos y conserva solo preferencia mínima de exclusión hasta eliminar Auth. Reutiliza también retirada marketing existente; ambos caminos serializan contra writers y vuelven a verificar elegibilidad tras lock. Borrado Auth cascada; sin acceso de terceros a eventos. Acceso/corrección/supresión mantienen contacto oficial real de privacidad, sin prometer automatización no existente. GPC verdadero detiene el cliente nuevo de navegación/prerregistro; no cambia fuentes anteriores ni su política.

## Seguridad

Cuatro tablas privadas FORCE RLS y cero grants de datos a anon/authenticated/service_role. RPC de navegación ligada a auth.uid con enums/tipos cerrados; no acepta owner, timestamps cliente, resultados de cuidado ni texto libre. RPC anónima solo service_role detrás del Edge desafiado. RPC de informes exige admin_grants vigente y JWT aal2; reutiliza el componente MFA existente con propósito de consulta, sin modificar el flujo financiero. Informes agregados, máximo12 rutas/errores; muestra mínima10 y supresión de complementos pequeños. Sin listado de personas, secuencias crudas o exportación CSV. Timeout de informe5s y de lock métrico100ms.

Los totales de interacción no son personas. Sin evidencia fiable se usa unknown, no organic. Solo atribución backend vigente = paid_attributed. Fuente vencida queda desconocida. D1/D7 requieren ventanas terminadas; ausencia de continuación no es abandono confirmado. Hipótesis no equivalen a causalidad, motivación, ROI ni cifras de Meta.

## Revisión de proporcionalidad

Fuentes oficiales consultadas28-oct-2026: [California DOJ/CCPA](https://www.oag.ca.gov/privacy/ccpa), [CalPrivacy/CPPA y reglamentos vigentes](https://cppa.ca.gov/regulations/), [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [funciones/privilegios](https://supabase.com/docs/guides/database/functions). La aplicabilidad empresarial de CCPA depende de hechos/umbrales que esta tarea no acredita; no se declara cumplimiento jurídico certificado. Se preparan divulgación ES/EN, minimización, finalidad, retención, retirada y permisos verificables antes de cualquier GO. No se añade proveedor, publicidad conductual externa, venta/compartición de datos, Pixel/CAPI/GA/PostHog ni coste de branch Supabase.

## Runbook posterior al GO único (NO ejecutar ahora)

1. Verificar SHA/CI final, evidencia visual, main y producción sin deriva. Comparar las133 versiones/hashes del preflight y guardar referencia de reversión del producto147 (`4ce38450`, dpl_GRzYRttARoYb6QaKX6fEuvWo2p4p). Si terceros avanzaron, reconciliar antes de aplicar.
2. Preparar aviso final ES/EN: sustituir rótulo de ampliación preparada por estado/fecha reales sin inventar vigencia. Versionado `pazo-behavior-notice-v1`; comprobar retiro y contacto. Revalidar retención/Cron, QA y alcance aprobado.
3. Instalar **solo** `20261028210000_pazo_behavior_observation.sql` por apply_migration tras comprobar SHA256 del manifiesto. OFF por defecto. Registrar versión real asignada y mapear aditivamente; no renombrar historia, db push general, repair ni DROP.
4. Con SQL aún OFF, publicar frontend y Edge autorizados/CI exactos. Habilitar literales cliente/Edge solo bajo el GO, revisar que preview no reemplaza variables de producción. Verificar aviso y controles antes de activar DB.
5. Activación independiente: behavior_enabled=true, behavior_started_at=clock_timestamp(), behavior_notice_version=versión publicada. NO reiniciar utility_started_at, marketing previo ni retención. Comprobar rechazos anon/no admin/QA, agregados sin cohortes artificiales, logs y estado público.
6. Reversión: behavior_enabled=false inmediatamente; restaurar frontend/Edge de147, conservar SQL privado, supresión y purga. La utilidad/atribución anteriores continúan. No tocar pagos/invitaciones/Auth ni activar ofertas. No reabrir142/147.

Staging puede probar assets remotos con backend PG17 aislado e identidad/challenge controlados. Eso no certifica una instalación Supabase alojada nueva ni login MFA humano. No crear un branch facturable por conveniencia. El informe final separará explícitamente esas pruebas.
