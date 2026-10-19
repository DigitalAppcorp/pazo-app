## Diseño visual aprobado por Product Owner — Responsive escritorio y móvil (18-oct-2026)

PO eligió explícitamente la referencia **«Resumen general»** de PAZO con sidebar izquierda, KPI superiores y mosaico de tarjetas blancas, verde, lima y fondo crema. Esta referencia contenía datos *ilustrativos* (no reales) y módulos de series históricas, mapa geográfico y uptime que **no existen todavía** como fuentes en PAZO; no copiar esos números ni simular ingresos/usuarios/rendimiento o mapa basado en zonas privadas.

**Decisión de arquitectura visual:** actualmente PAZO general conserva deliberadamente un shell móvil de ~430px centrado en desktop. **Solo el Centro de control** se monta con `createPortal(...,document.body)` para escapar a ese marco y usar ancho completo de viewport en escritorio, sin alterar Home/Feed/perfiles. CSS responsive por ancho disponible (no UA/device fingerprint):
- **Móvil (<768px):** cabecera compacta «pazo. · ADMIN», botón Volver, tabs horizontales con scroll, KPI 2 columnas y paneles de contenido apilados con scroll vertical; targets >=44px.
- **Tablet (768–1023px):** tarjetas KPI 4 columnas cuando entren; paneles 2 columnas, tabs accesibles en horizontal.
- **Escritorio (>=1024px):** sidebar fija de 235–255px, cabecera «Resumen general», selector período y mosaico 4 KPIs + bloques de crecimiento de altas 7/30, actividad por módulos, tamaño real PostgreSQL/Storage, estado de apoyo Sandbox, cuentas con más días activos medidos, ranking fake doors, actividad social, eventos de Lugares y moderación. Grilla principal máxima 1500px, responsive mediante CSS `lg:`/`xl:`.
- Mismas 5 rutas administrativas **funcionales** (Resumen/Cuentas/Apoyo/Interés/Supabase) en ambas presentaciones. Al abrir denuncias usa el componente de moderación existente, sin abrir una vista falsa.
- La selección de sección/filtros es la misma React state, no se montan instancias duplicadas y no se vuelve a autenticar al cambiar ancho. El privilegio sigue siendo servidor-only `pazo_is_admin`.
- Tarjetas y formas redondeadas sin contornos; tipografía Quicksand/Nunito y colores PAZO. Nada de emoji/pictogramas.
- Los widgets que en referencia tenían series temporales, gráficos de distribución geográfica, facturación Live, uptime o cifras «en tiempo real» muestran **solo métricas reales del RPC instalado** o sustitutos descriptivos honestos. No hay streaming; «Actualizado» es la hora de la consulta. Registros de actividad empiezan desde que se desplegó el tracking.

Archivos: `src/features/admin/components/AdminDashboard.tsx`, `src/features/moderation/ModerationAccess.tsx` y regresión de diseño `src/features/admin/testing/adminDashboard.test.mjs`. **Sin cambios SQL, billing, entitlements, PayPal Live, main o sistema PWA general**.

**Gate:** `ADMIN_RESPONSIVE_VISUAL_IMPLEMENTED_CODE_CI_PENDING_PO_MOBILE_DESKTOP_ACCEPTANCE`. La captura aprobada orienta arquitectura; resultado renderizado todavía debe revisarlo el PO en Vite (360/390px y navegador desktop ~1280/1440px).

---

# PAZO — Centro de control del administrador, primera integración operativa
**Fecha:** 2026-10-18. **Autorización PO:** «quiero todo … no pares hasta que esté todo terminado, tienes mi autorización».
**Estado:** backend Supabase staging instalado; código en PR #44 DRAFT; CI PASS en commit funcional y QA visual/usuario real todavía pendiente.

## Auditoría previa
- 8 cuentas Auth, 5 mascotas, 4 publicaciones y 1 comentario en el entorno staging en el instante del preflight.
- Una única cuenta tiene `moderation_private.moderator_grants`; se instaló privilegio **separado de administrador** solo para esa cuenta, mediante seed condicionado a que exactamente un moderador exista. Moderadores futuros NO heredarán automáticamente acceso a métricas de personas/pagos.
- Ya existían `module_validation_views`, `module_validation_interests`, `module_validation_intents`, `place_usage_events` y `search_usage_events`.
- Preflight: fake doors existentes registraban 0 vistas, 0 intereses, 0 votos de intención; Lugares 41 eventos, búsqueda 40. Cero eventos observados **no demuestra ausencia de interés real** antes del tracking.
- Finanzas: 1 período pagado de Sandbox por USD 2.99 simulados; 0 movimientos en el libro prospectivo `paypal_payment_entries`. PayPal Live NO es una fuente financiera conciliada para este panel y no debe mostrarse una falsa recaudación real o completa.
- Base PostgreSQL ~17.5MB al preflight; NO equivale a factura, cuota Supabase ni ancho de banda total.

## Funcionalidad implementada
1. **Resumen:** cuentas Auth, mascotas, nuevas altas a 7/30 días, cuentas sin mascota, publicaciones, comentarios y comunidades. Usuarios únicos con actividad explícitamente registrada hoy/últimos 7 y 30 días y desglose por secciones. La actividad se mide **solo desde la instalación**, nunca se backfillea desde comportamientos no registrados.
2. **Cuentas y mascotas:** lista paginada de usuarios Auth (correo solo visible al administrador), fecha de registro, mascotas/nombres/especies, días con actividad medida en los últimos 30, período Sandbox y señales de checkout sin período acreditado.
3. **Apoyo:** período(s) acreditado(s), total bruto verificado **solo en Sandbox**, cuenta(s) con período y cobertura Sandbox, casos retenidos y posibles checkouts inconclusos. Señal «intento sin período» ≠ abandono confirmado (el usuario pudo salir sin que PayPal registrara una transacción). Live revenue queda **no disponible**, no se mezcla Sandbox con Live.
4. **Interés y prioridades:** todas las 11 fake doors actuales de Comunidades (5) y Lugares (6) como catálogo fijo canónico, ranking por personas únicas interesadas y tasa entre viewers reales; confianza «insuficiente» si menos de 30 viewers, «orientativo» entre 30–99, «razonable» a partir de 100. Debajo, quién vio y quién votó, con correo solo a administrador, opción y canal interno; máximo 40 por consulta. Se pueden votar preferencias opcionales **usar / crear u organizar / explorar aportes** en todas las fake doors tras pulsar «Me interesa». Una cuenta cuenta una sola vez por módulo; opción se puede cambiar sin duplicar la demanda.
5. **Supabase:** bytes de PostgreSQL por `pg_database_size`, número y tamaño estimado de objetos Storage. **No son** cifras de egress, límites de proyecto, suscripción, factura oficial ni facturación por uso; esos campos quedan sin fuente y se declaran no disponibles en vez de inventar valores.
6. **Moderación:** denuncias y medios pendientes ya existentes, intactos; entrada «Centro de control» aparece solo si `f14_is_moderator` y, separadamente, `pazo_is_admin` son true.

## Backend, autorización y minimización
- Migración alojada en Supabase: **versión real `20261018234721`**, nombre `pazo_admin_observability_dashboard_20261018`. Ruta de GitHub alineada: `supabase/migrations/20261018234721_pazo_admin_observability_dashboard_20261018.sql`.
- `admin_private.admin_grants` y `admin_private.app_activity_daily`: no SELECT/INSERT/UPDATE/DELETE para `anon` ni `authenticated`, FORCE RLS. RPCs SECURITY DEFINER con `auth.uid()` obligatorio y gate explícito de grant. `pazo_admin_overview/users/experiments/audience/voters` solo mediante RPC y sin credenciales de servicio en cliente. Son READ ONLY; únicamente `pazo_track_activity` inserta categoría cerrada de pantalla en agregado diario.
- Actividad `user_id`, `activity_day`, `module_key` limitado a categorías `feed/explore/places/communities/profile/care/documents/notifications/supporter`. Una fila por usuario/día/módulo; deduplicación idempotente con PK y sessionStorage, ninguna IP, latitud, hora de pulsación exacta, contenido, búsqueda ni identificador de dispositivo.
- Fake doors usan las tablas originales existentes y RLS por propietario. Votar es opcional y explícito.
- Seguridad postflight en Supabase: una cuenta admin insertada por la migración, tablas privadas sin lectura directa del cliente, `anon` sin EXECUTE en RPCs sensibles; prueba negativa para UID ajeno y prueba positiva usando contexto de test del administrador (sin exponer correos ni IDs a herramienta).
- **Privacidad pendiente de publicación:** revisar/actualizar la política pública antes de beta, aprobar retención de actividad diaria, límites de soporte para consultas de correos y procedimiento de borrado de actividad. No habilitar autocapture ni proveedores externos sin GO adicional.

## QA pendiente y límites reales
- GitHub CI + PG Labs aprobado para construcción y reglas estructurales, pero QA visual en Vite bajo cuenta administradora **todavía no completado**.
- El usuario no verá una supuesta historia diaria previa al día de instalación de `pazo_track_activity`: DAU/WAU/MAU de nuevo tracking comienzan desde cero.
- PayPal Live, cifras oficiales de consumo API/egress y conciliación total de ingresos **no tienen fuentes comprobadas**. Agregarlas requiere credenciales/API de servicio o proveedor y un alcance financiero/operativo seguro, NO se simulan.
- No hubo cambios a planes, PayPal Live, cobros, entitlement, contabilidad ni `main`; PR #44 sigue DRAFT.
- Antes de beta: verificación visual, validación de política de privacidad/retención, accesibilidad responsive y gestión de permisos cuando haya más de un administrador.

**Gate:** `ADMIN_CONTROL_CENTER_BACKEND_INSTALLED_CODE_CI_PASS_PO_VISUAL_PRIVACY_REVIEW_PENDING`.
