# Cobertura exigida: todas las pantallas excepto Administración

El objetivo final es fotografiar **todas las vistas y estados funcionales**, incluidas pantallas de acceso, onboarding, demo, módulos, modales, errores, vacíos, navegación secundaria, scroll y estados relevantes. No se consideran cubiertos los flujos simplemente porque exista un componente TSX.

**Estado al 30/10/2026:** 270 PNG indexados en `main`: 118 de QA histórico y **152 tomados del cliente publicado** en 38 pantallas/estados distintos × ES/EN × móvil/escritorio. La nueva sesión usó **Supabase sintético**, no sesiones de personas reales; por tanto NO prueba que los datos/funcionalidades hospedadas operen end-to-end. Móvil de alta resolución 1170×2532, escritorio 2880×1800. **No hay cobertura total ni QA visual exhaustivo**. Los mapas vacíos están bloqueados para material promocional.

| Área | Recorridos mínimos | Evidencia |
|---|---|---|
| Acceso | Splash, bienvenida, registro, validación correo, login, recuperar contraseña, términos y privacidad | PARCIAL (bienvenida, registro, login, recuperación y agradecimiento; falta correo confirmado, splash y legales) |
| Demo | Feed, likes, comentarios, guardados, perfil, comunidades, mapa, explorar, mensajería, salida | PARCIAL (feed, pestañas, explorar, mensajes, notificaciones y crear; faltan estados interactivos y salida) |
| Principal autenticado | Inicio/feed con contenido, vacío, error, carga; comunidades, mapa, mi mascota, búsqueda | PARCIAL (navegación, estados) |
| Pasaporte QR | QR, preview público, compartir, descargar, alertas | PARCIAL (QR) |
| Agenda | Lista, nuevo recordatorio, editar, historial, completar, error | PARCIAL (lista vacía, nuevo formulario, pestaña historial; falta registro existente/editar/completar/error) |
| Documentos | Listado, subida, detalle, editar, borrar, error | PARCIAL (listado vacío; faltan subida/detalle/editar/borrar) |
| Alertas | Crear, editar, perdida activa, avistamientos, recuperación, vista pública | PARCIAL (modal de alerta; sin estados activos/revisión/avistamientos/vista pública) |
| Publicaciones | Crear, detalle, comentar, guardar, reportar/ocultar | PARCIAL (formulario de nueva publicación y feed demo; faltan acciones/estados secundarios) |
| Comunidades | Listado, crear, detalle, unirse, editar, estados vacíos | PARCIAL (listado y formulario crear; faltan detalle/unirse/editar y muestras de comunidades reales) |
| Lugares | Mapa, ficha de lugar, búsqueda, check-in, propuesta, cómo llegar | NO APTA PARA VIDEO (mapa vacío en nueva captura sintética y error en captura histórica; faltan lugares, detalles, check-in y rutas visibles) |
| Perfil | Ver/editar, varias mascotas, perfil público, seguidores/seguidos | PARCIAL (perfil propio, editar, configuración; faltan selector/añadir otra, perfil público, seguidores/seguidos) |
| Notificaciones y mensajes | Bandeja, detalle, vacíos, mensajes en desarrollo | PARCIAL (vistas principales capturadas; faltan detalle, paginación, casos con actividad real) |
| Apoyo voluntario | Oferta, insignias, gestión de suscripción sin datos de pago | PENDIENTE |
| Ajustes y cuenta | Idioma, controles de privacidad, eliminación/solicitudes, recuperación | PENDIENTE |
| PWA | Instalación disponible/no disponible, offline, mantenimiento | PENDIENTE |

## Rutas capturadas el 30/10/2026

[Índice por estado](captures/2026-10-30/README.md) · [Manifiesto de sesión](captures/2026-10-30/manifest.json) · [Fallos del capturador](captures/2026-10-30/issues.json).

La colección incluye **38 estados únicos** a cuatro combinaciones de idioma/viewport. Los menús `pet-add-another` y `places-search` no se pudieron capturar; la prueba de auto-captura bloqueó llamadas de escritura de prueba contra producción. Las capturas de `main-map` y `demo-map` muestran superficies vacías por datos sintéticos y no son evidencia válida de Lugares con mapa funcional. La cobertura funcional real permanece pendiente de auditoría manual en el sitio oficial y de fixtures adecuados.

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
