# Cobertura exigida: todas las pantallas excepto Administración

El objetivo final es fotografiar **todas las vistas y estados funcionales**, incluidas pantallas de acceso, onboarding, demo, módulos, modales, errores, vacíos, navegación secundaria, scroll y estados relevantes. No se consideran cubiertos los flujos simplemente porque exista un componente TSX.

**Estado al 30/10/2026:** inventario inicial desde `src/App.tsx`, vistas y modales; evidencias del 28/10 organizadas. No se realizó una nueva sesión completa de navegador para certificar los faltantes. No afirmar 100% de cobertura.

| Área | Recorridos mínimos | Evidencia |
|---|---|---|
| Acceso | Splash, bienvenida, registro, validación correo, login, recuperar contraseña, términos y privacidad | PARCIAL (bienvenida ES/EN) |
| Demo | Feed, likes, comentarios, guardados, perfil, comunidades, mapa, explorar, mensajería, salida | PENDIENTE |
| Principal autenticado | Inicio/feed con contenido, vacío, error, carga; comunidades, mapa, mi mascota, búsqueda | PARCIAL (navegación, estados) |
| Pasaporte QR | QR, preview público, compartir, descargar, alertas | PARCIAL (QR) |
| Agenda | Lista, nuevo recordatorio, editar, historial, completar, error | PARCIAL (vista principal) |
| Documentos | Listado, subida, detalle, editar, borrar, error | PENDIENTE |
| Alertas | Crear, editar, perdida activa, avistamientos, recuperación, vista pública | PENDIENTE |
| Publicaciones | Crear, detalle, comentar, guardar, reportar/ocultar | PENDIENTE |
| Comunidades | Listado, crear, detalle, unirse, editar, estados vacíos | PARCIAL (listado) |
| Lugares | Mapa, ficha de lugar, búsqueda, check-in, propuesta, cómo llegar | PARCIAL (mapa base) |
| Perfil | Ver/editar, varias mascotas, perfil público, seguidores/seguidos | PARCIAL (Mi mascota) |
| Notificaciones y mensajes | Bandeja, detalle, vacíos, mensajes en desarrollo | PENDIENTE |
| Apoyo voluntario | Oferta, insignias, gestión de suscripción sin datos de pago | PENDIENTE |
| Ajustes y cuenta | Idioma, controles de privacidad, eliminación/solicitudes, recuperación | PENDIENTE |
| PWA | Instalación disponible/no disponible, offline, mantenimiento | PENDIENTE |

## Contrato de cierre (QA)

- Enumerar todas las rutas, pestañas, botones que abren otra vista, modales, menús, subpáginas, pestañas internas, formularios y estados asincrónicos; no omitir elementos accesibles por scroll.
- Capturar de forma verificable **ES y EN**, mínimo **390×844** para móvil y **1440×900** para escritorio cuando haya diseño distinto; 320/430 si hay diferencia sustancial.
- Capturar la versión **publicada**, registrar fecha, URL, identificador de build y estado de autenticación por recurso. Si se usa una sesión sintética o mock, señalar explícitamente ese origen y no presentarlo como producción funcional.
- **Excluir Administración y toda superficie admin**, sin excepciones, también overlays, menús, rutas y datos de métricas.
- Datos de demostración/sintéticos exclusivamente; nada de nombres, correos, fotos privadas, QR válidos de usuarios, secretos ni datos de pago reales.
- Verificar que imagen no está en blanco, recortada, cubierta por loader o con mapa roto; inspección visual obligatoria, no basta exit code 0.
- Cada recurso debe tener ruta estable, slug, idioma, viewport, estado, origen, SHA, fecha y nota de uso. Captura duplicada o caduca conserva historial, pero no se marca como `current`.
- Actualizar `manifest.json`, `CATALOGO.md` y la matriz de cobertura; enlazar a la versión capturada. La confirmación 'completo' requiere auditoría de cruces código/UI/manual.

## Referencias de rutas principales en código

- `src/components/views/OnboardingView.tsx`: A01 bienvenida, A02 registro, A03 creación mascota, A04 zona e intereses.
- `src/App.tsx`: Inicio/feed, Comunidades, Mapa, Mi mascota, Explorar, perfil público, rescate público, gestión de apoyo, login, recuperación.
- `src/components/modals/`: Crear, publicación, mascota, pasaporte, agenda, documentos, alerta, mensajes, notificaciones, avistamiento.
- `src/components/views/CommunitiesView.tsx` y `CommunityDetailView.tsx`: listado/detalle/crear.
- `src/components/views/MapView.tsx`: Lugares y sus estados.
- `src/features/demo/`: recorrido de visita sin cuenta.
