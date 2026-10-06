# PAZO — Hoja Maestra de Desarrollo

**Documento canónico del proyecto.**  
**Última actualización:** 2026-10-05  
**Estado general:** núcleo social y sistema de rescate estable hasta Fase 6. Fase 7 es la siguiente.

---

## 0. Cómo usar esta hoja

Antes de modificar código, base de datos o arquitectura de PAZO:

1. Leer este archivo completo.
2. Identificar la fase marcada como **SIGUIENTE**.
3. No saltar a otra fase salvo aprobación explícita del Product Owner.
4. No implementar decisiones de producto marcadas como **DECISIÓN PENDIENTE**.
5. Una fase debe terminar y quedar fusionada a `main` antes de comenzar la siguiente, salvo que se documente una excepción.
6. Después de cada merge, actualizar este archivo.

La finalidad es evitar reconstruir contexto en cada sesión, reducir tokens y evitar decisiones contradictorias.

---

# 1. Roles de trabajo

## Product Owner
- Brandon.
- Define prioridades, reglas funcionales y acepta/rechaza comportamiento visual.
- Hace pruebas visuales y de producto cuando se solicitan.
- Autoriza explícitamente cualquier mutación importante en Supabase.

## Implementación
ChatGPT trabaja directamente sobre GitHub y Supabase:
- frontend React/TypeScript;
- arquitectura;
- Supabase/PostgreSQL;
- migraciones;
- RLS;
- RPCs;
- Storage;
- seguridad;
- pruebas;
- PRs y merge.

No pedir al Product Owner que copie código entre herramientas salvo que sea estrictamente necesario para una prueba local.

---

# 2. Flujo obligatorio por fase

Cada fase nueva sigue este orden:

1. **Auditoría de estado real**
   - GitHub `main`;
   - Supabase real cuando aplique;
   - no asumir que un mock es funcional.

2. **Definir alcance**
   - qué entra;
   - qué NO entra;
   - decisiones de producto pendientes.

3. **Crear rama**
   - una rama por fase.

4. **Implementar sin tocar producción antes de tiempo**
   - frontend;
   - backend versionado;
   - migraciones preparadas.

5. **Preflight**
   - build;
   - diff;
   - permisos;
   - RLS;
   - concurrencia;
   - integridad.

6. **Autorización explícita**
   - antes de aplicar una migración o mutación sensible en Supabase.

7. **Pruebas**
   - SQL con `ROLLBACK` cuando aplique;
   - build;
   - prueba visual real del Product Owner.

8. **Merge**
   - PR fuera de borrador;
   - merge a `main`;
   - verificar `main`;
   - actualizar esta hoja maestra.

---

# 3. Reglas técnicas permanentes

Estas reglas no deben romperse sin una decisión explícita de arquitectura.

- La identidad social pertenece a la **mascota**, no directamente al usuario.
- Una cuenta puede tener múltiples mascotas.
- Las mascotas del mismo dueño:
  - ven sus publicaciones entre sí;
  - no necesitan seguirse;
  - no pueden crear relación Follow entre ellas.
- Follow, Like, Save, Comment y recomendaciones se ejecutan en contexto de la mascota activa.
- `interactions` es fuente de verdad para estados activos de Like/Save.
- `posts.likes` es contador derivado administrado por backend; el cliente no lo escribe.
- Los datos privados de mascota deben permanecer separados de datos públicos.
- Ningún cliente debe poder actuar usando una mascota que no pertenece al usuario autenticado.
- Todo objeto nuevo expuesto por Data API requiere grants mínimos + RLS.
- Funciones `SECURITY DEFINER` solo cuando sean realmente necesarias, con superficie de ejecución explícitamente restringida.
- Nunca exponer `service_role` ni secretos en frontend.
- No considerar un módulo “terminado” mientras siga dependiendo de `mockData` para su funcionalidad principal.
- Toda persistencia debe sobrevivir recarga `F5`.
- Operaciones optimistas deben soportar rollback y cambio rápido de mascota.
- Las pruebas de seguridad no sustituyen las pruebas visuales, y viceversa.
- Durante una fase de rediseño visual, la funcionalidad existente debe mantenerse intacta salvo aprobación explícita del Product Owner.
- Cambios puramente estéticos no deben introducir nuevas dependencias de backend, alterar contratos de datos ni modificar reglas de negocio.
- Módulos opcionales/sociales de alto coste deben pasar un gate de validación de producto antes de su implementación completa; usar `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`.

---

# 4. Estado real actual

## Base real disponible

Actualmente el núcleo persistente usa, entre otras:

- `profiles`
- `pets`
- `pet_private_details`
- `pet_private_metrics`
- `posts`
- `post_comments`
- `interactions`
- `follows`
- `pet_places`

## Módulos reales

- Supabase Auth.
- Onboarding y creación de primera mascota.
- Crear mascotas adicionales.
- Editar mascota.
- Datos públicos/privados de mascota.
- Varias mascotas por cuenta.
- Cambio de mascota activa.
- Feed.
- Posts con/sin foto.
- Feed de mascotas propias + seguidas + recomendadas.
- Cold start de recomendaciones.
- Like / Unlike.
- Save / Unsave.
- Comentarios.
- Perfil público.
- Follow / Unfollow.
- Seguridad RLS/grants/RPC/Storage del núcleo.
- Persistencia de scroll entre pestañas.
- Protección contra follows entre mascotas del mismo dueño.

## Módulos todavía mock, parciales o de demostración

- Comunidades.
- Eventos.
- Mapa real.
- Check-ins.
- Agenda de cuidados.
- Documentos privados.
- Mensajería 1 a 1.
- Centro general de notificaciones.
- Crear lugar.
- Crear comunidad.
- QR/rescate real en `main`.
- Alertas de mascota perdida reales en `main`.

---

# 5. Fases terminadas

## Fase 0 — Fundación
**Estado: COMPLETADA**

- React + TypeScript + Vite.
- Tailwind.
- React Router instalado.
- Supabase conectado.
- arquitectura base.

## Fase 1 — Perfil público y Follow
**Estado: COMPLETADA**

- perfil público real;
- navegación desde Feed;
- Follow/Unfollow persistente;
- ownership corregido.

## Fase 2 — Interacciones del Feed
**Estado: COMPLETADA**

### 2.1 Like / Save
- persistencia;
- reload;
- deduplicación;
- contadores backend;
- rollback;
- concurrencia.

### 2.2 Comentarios
- tabla real;
- carga;
- creación;
- contador;
- ownership;
- persistencia.

## Fase 3 — Registro, edición y privacidad de mascota
**Estado: COMPLETADA**

- create_pet_profile;
- datos privados separados;
- edición;
- intereses privados;
- avatar;
- métricas privadas.

## Fase 4 — Seguridad y estabilización
**Estado: COMPLETADA**

- RLS/grants endurecidos;
- posts normalizados;
- profiles protegidos;
- follows asegurados;
- interactions privados;
- Storage endurecido;
- repositorio limpiado;
- Security Advisor sin alertas SQL/RLS relevantes.

**Pendiente global de configuración:** activar Leaked Password Protection en Supabase Auth.

## Fase 5 — Múltiples mascotas
**Estado: COMPLETADA**

- cargar todas las mascotas owned;
- recordar mascota activa;
- cambiar contexto;
- Feed independiente por mascota activa;
- cold start;
- posts de mascotas hermanas visibles;
- interacciones aisladas por mascota;
- AddPet;
- scroll por pestaña;
- mismas-owner Follow oculto y bloqueado en backend.

---

# 6. Nueva Ruta Maestra — MVP social útil

## Fase 6 — Pasaporte QR, mascota perdida y avistamientos
**Estado: COMPLETADA**

### Objetivo
Convertir el sistema de rescate que hoy es visual en una utilidad real.

### Alcance
- token público revocable por mascota;
- QR realmente escaneable;
- página pública accesible sin login;
- ficha pública limitada a datos seguros;
- activar alerta de mascota perdida;
- resolver alerta;
- avistamiento público;
- notificación privada al dueño;
- persistencia;
- RLS y rate limiting básico;
- descargar/compartir QR.

### No entra todavía
- push notification del sistema operativo;
- ubicación GPS automática de quien reporta;
- mapa comunitario de alertas;
- SMS;
- email transaccional;
- red de rescates externos.

### Estado técnico final
- PR #6 implementado y validado;
- backend 6A, 6B y 6C aplicado en Supabase PAZO;
- QR real y token revocable por mascota;
- alerta perdida persistente y resoluble;
- avistamientos públicos con nombre/teléfono privados para el dueño;
- notificaciones reales y detalle accionable;
- recordatorio empático persistente de mascota perdida;
- acceso directo al avistamiento nuevo desde el recordatorio;
- notificaciones nuevas/vistas diferenciadas;
- Feed con paginación por desplazamiento en bloques de 10;
- Notificaciones con paginación por desplazamiento en bloques de 10;
- badge de no leídas calculado sin descargar todas las filas;
- recomendaciones paginadas sin solapamiento;
- RLS/ownership/privacidad validados;
- builds locales aprobados;
- prueba visual/end-to-end aprobada por Product Owner;
- datos visuales de prueba limpiados de Supabase;
- Pancho quedó con `is_lost=false` y sin ubicación de prueba;
- Advisors revisados; sin problemas nuevos introducidos por 6C.

### Definition of Done
- escanear QR desde otro dispositivo abre la mascota correcta;
- funciona sin login;
- no expone owner_id, pet_id privado, teléfono, domicilio ni información privada;
- una alerta persiste tras F5;
- un avistamiento crea registro real;
- el dueño recibe notificación real;
- resolver alerta persiste;
- RLS/advisors aprobados;
- build y prueba visual aprobados.

---

## Fase 7 — Comunidades
**Estado: SIGUIENTE — VALIDACIÓN DE PRODUCTO**

**Sub-ruta canónica:** `docs/PAZO_PHASE_7_COMMUNITIES_MASTER.md`  
**Marco de validación:** `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`

Hoy `ExploreView` usa comunidades mock.

### Pregunta de Fase 7
Antes de convertir Comunidades en un módulo persistente:

**¿Comunidades merece entrar al MVP ahora?**

### Decisiones ya confirmadas si se construye
- cualquier usuario puede crear comunidades;
- no se requiere membresía paga para crear una comunidad;
- el creador se convierte en propietario/administrador inicial;
- una futura membresía puede desbloquear herramientas adicionales aún no definidas;
- la administración básica no debe quedar bloqueada por pago.

### Estado actual
No diseñar todavía roles, permisos, schema, Feed de comunidad o eventos.

Primero completar el gate de producto:
- auditar el fake door / botón "Me interesa";
- medir interés real;
- distinguir engagement de adquisición;
- evaluar masa crítica;
- comparar coste/valor con módulos de utilidad;
- decidir BUILD NOW / MVP REDUCIDO / EXPERIMENTO ACTIVO / POSPUESTO.

Si Comunidades se pospone, Fase 7 no debe bloquear el resto del MVP: se registra el disparador de reevaluación y se continúa con la siguiente prioridad aprobada.

---

## Fase 8 — Lugares, mapa y Check-ins
**Estado: PLANIFICADA**

Existe `pet_places`, pero `MapView` todavía es placeholder.

### Objetivo
Hacer funcional el descubrimiento local.

### Alcance
- consumir `pet_places` reales;
- listado y detalle;
- categorías;
- búsqueda;
- mapa real;
- check-in temporal por mascota;
- contador activo;
- privacidad de ubicación;
- creación/sugerencia de lugares según decisión de producto.

### DECISIÓN PENDIENTE
Elegir proveedor/cartografía y reglas de ubicación:
- Mapbox / Google Maps / alternativa;
- GPS exacto vs ubicación aproximada;
- quién puede agregar lugares.

No activar ubicación precisa sin decisión explícita.

---

## Fase 9 — Cuidados y documentos privados
**Estado: PLANIFICADA**

`CareModal` y documentos siguen siendo locales/mock.

### Objetivo
Crear el espacio privado de salud/cuidados operativos de cada mascota.

### Alcance
- care_items reales por mascota;
- crear/editar/completar;
- historial;
- recordatorios;
- documentos privados;
- Storage privado;
- vacunas, veterinaria, medicamentos, alimentación, higiene;
- aislamiento total entre propietarios.

### No entra
- diagnóstico médico;
- telemedicina;
- recomendaciones clínicas automáticas.

---

## Fase 10 — Mensajería 1 a 1
**Estado: PLANIFICADA**

`MessagesModal` usa conversaciones mock.

### Objetivo
Mensajería persistente entre cuentas/mascotas.

### Alcance
- conversaciones;
- participantes;
- solicitudes;
- aceptar/rechazar;
- mensajes;
- unread;
- timestamps;
- RLS;
- Realtime después de persistencia estable;
- bloqueo básico de abuso.

### Regla
No almacenar mensajes como estado local como fuente de verdad.

---

## Fase 11 — Sistema general de notificaciones
**Estado: PLANIFICADA**

Fase 6 introduce la primera notificación real de rescate. Esta fase generaliza el sistema.

### Alcance
- Follow;
- comentarios;
- mensajes;
- comunidades;
- cuidados;
- rescate;
- unread;
- marcar leída;
- deep links internos;
- preferencias.

### Segunda etapa
- Push Web/PWA una vez estable la bandeja persistente.

---

## Fase 12 — Explore/Search unificado
**Estado: PLANIFICADA**

### Objetivo
Que “Explorar” encuentre contenido real, no solo tarjetas mock.

### Alcance
- mascotas;
- comunidades;
- lugares;
- eventos si ya existen;
- búsqueda;
- filtros;
- paginación;
- recomendación contextual;
- navegación a perfiles reales.

---

## Fase 13 — Rediseño visual y sistema de interfaz
**Estado: PLANIFICADA**

### Objetivo
Elevar la calidad visual de PAZO sin alterar las funcionalidades ya aprobadas.

Esta fase permite rediseñar pantallas completas o componentes individuales manteniendo intactos sus contratos funcionales.

### Alcance
- auditoría visual completa de todas las pantallas;
- jerarquía visual;
- tipografía;
- espaciado;
- grid;
- márgenes;
- botones;
- inputs;
- tarjetas;
- contenedores;
- modales;
- navegación;
- header;
- tabs;
- estados seleccionados;
- estados vacíos;
- loaders;
- errores;
- feedback visual;
- iconografía;
- sombras;
- bordes;
- radios;
- densidad visual;
- responsive móvil/escritorio;
- microinteracciones y animaciones;
- consistencia entre módulos;
- creación o consolidación de design tokens;
- componentes UI reutilizables cuando reduzcan inconsistencias.

### Regla principal
**Rediseño visual ≠ cambio funcional.**

Durante esta fase:
- no cambiar reglas de negocio;
- no cambiar ownership ni RLS;
- no cambiar contratos de Supabase;
- no cambiar qué hace un botón;
- no eliminar funciones existentes;
- no introducir nuevas funcionalidades sin aprobación explícita;
- no modificar flujos UX funcionales solo porque “se verían mejor”.

Si una propuesta visual requiere cambiar comportamiento, navegación, información mostrada o estructura funcional, debe registrarse como **DECISIÓN PENDIENTE** y aprobarse por separado.

### Método de trabajo
El rediseño debe hacerse por bloques y no como cambio masivo ciego:

1. definir sistema visual base;
2. aprobar componentes principales;
3. rediseñar navegación y layout global;
4. rediseñar Feed;
5. perfiles;
6. Explore;
7. mapa/lugares;
8. cuidados;
9. mensajería;
10. modales y flujos secundarios;
11. estados vacíos/error/loading;
12. revisión responsive y accesibilidad.

Cada bloque se prueba antes de continuar para evitar propagar una dirección visual incorrecta a toda la app.

### Pendientes visuales heredados de Fase 6
- animación de un perrito en estado de alerta al activar/buscar una mascota perdida;
- títulos visuales personalizados para cada tipo de alerta/notificación;
- revisar la presentación final de etiquetas, encabezados y jerarquía visual del sistema de rescate.

Estos puntos son exclusivamente estéticos y no bloquean la funcionalidad de rescate.

### Definition of Done
- todas las pantallas incluidas en Beta siguen una misma línea gráfica;
- no quedan estilos claramente pertenecientes a prototipos anteriores;
- botones, inputs, cards y contenedores tienen reglas consistentes;
- mobile y desktop mantienen buena jerarquía;
- funcionalidades existentes siguen pasando las mismas pruebas;
- no aparecen regresiones de Feed, navegación, formularios o modales;
- Product Owner aprueba visualmente la interfaz final.

---

## Fase 14 — Confianza, moderación y privacidad
**Estado: OBLIGATORIA ANTES DE BETA PÚBLICA**

### Alcance
- reportar contenido;
- reportar perfil;
- bloquear usuario/mascota;
- ocultar contenido;
- moderación;
- eliminación/cierre de cuenta;
- borrado de mascota;
- manejo de contenido eliminado;
- límites básicos contra spam;
- revisión final de datos públicos vs privados;
- política de archivos;
- auditoría de RLS completa.

---

## Fase 15 — PWA, rendimiento y preparación de Beta
**Estado: PLANIFICADA**

### Alcance
- manifest;
- instalación;
- iconos;
- service worker según necesidad;
- estados offline seguros;
- lazy loading/code splitting;
- reducir bundle;
- imágenes;
- accesibilidad;
- errores y estados vacíos;
- responsive;
- performance;
- activar Leaked Password Protection;
- revisión de env/secrets;
- backups;
- logging/error monitoring;
- pruebas de producción.

### Definition of Done
La aplicación puede entregarse a usuarios beta sin depender de mocks en el núcleo seleccionado para lanzamiento.

---

# 7. Gate — MVP/Beta

No llamar “MVP listo” hasta que:

- Fases 6 a 15 definidas como requeridas para Beta estén completadas o explícitamente descartadas por Product Owner;
- no existan mocks visibles en funcionalidades incluidas en Beta;
- RLS esté auditado;
- build de producción pase;
- flujo nuevo usuario → mascota → Feed → social → recuperación de cuenta funcione;
- manejo de errores básico exista;
- privacidad esté revisada;
- pruebas reales en móvil estén aprobadas.

---

# 8. Expansión posterior al MVP

Estas funciones pertenecen al concepto original de PAZO, pero no deben entrar automáticamente en una fase sin especificación funcional.

## Fase 16 — Monetización base
**Estado: BACKLOG**

- membresías;
- beneficios;
- PayPal o pasarela definitiva;
- estados de suscripción;
- entitlement backend;
- restaurar compras;
- cancelación;
- fundador/premium.

Antes de implementar, decidir producto y precios.

## Fase 17 — Parejas / Matches de mascotas
**Estado: BACKLOG**

Idea original:
- descubrir perfiles;
- match;
- pago/membresía para funciones premium.

### DECISIONES PENDIENTES
- propósito exacto del match;
- seguridad;
- filtros;
- consentimiento;
- qué parte es paga.

## Fase 18 — Adopciones
**Estado: BACKLOG**

- organizaciones/perfiles autorizados;
- animales disponibles;
- filtros;
- solicitudes;
- estados;
- moderación y verificación.

## Fase 19 — Servicios para mascotas
**Estado: BACKLOG**

- paseadores;
- grooming;
- veterinarias;
- perfiles de negocio;
- panel profesional;
- disponibilidad/citas;
- reseñas;
- verificación.

Debe dividirse en subfases antes de programar.

## Fase 20 — Tiendas / negocios / publicidad
**Estado: BACKLOG**

- tiendas;
- catálogo;
- negocio local;
- anuncios/promoted content;
- herramientas comerciales.

No mezclar e-commerce completo con el MVP social sin decisión explícita.

---

# 9. Deuda conocida / limpieza

No convertir esta lista en una fase automáticamente; resolver cuando corresponda.

- `README.md` sigue siendo el README genérico de Vite.
- `src/data/mockData.ts` todavía alimenta módulos incompletos.
- existe `CreateModal - copia.tsx`, probable archivo duplicado a retirar después de verificar uso.
- `INITIAL_PETS` sigue sirviendo como fallback inicial en memoria; revisar cuando se termine la eliminación de mocks.
- MapView es placeholder.
- comunidades son mock.
- Care/Docs son mock/local.
- Messages son mock/local.
- algunos flujos del menú Crear anuncian “próximamente”.
- bundle ya ha mostrado warning de chunk >500 kB; atender en Fase 15.
- Leaked Password Protection pendiente en Supabase Auth.
- Fase 6 cerrada; PR #6 fusionado al completar esta actualización.

---

# 10. Regla de estado de fases

Usar únicamente:

- **COMPLETADA** — merged en main + backend aplicado + pruebas aprobadas.
- **EN CURSO** — se está implementando.
- **SIGUIENTE** — primera fase autorizada para comenzar.
- **PLANIFICADA** — definida pero no autorizada todavía.
- **PAUSADA** — trabajo existente, detenido conscientemente.
- **BACKLOG** — idea futura que requiere definición.
- **DECISIÓN PENDIENTE** — prohibido inventar comportamiento.

---

# 11. Próximo paso exacto

1. auditar y localizar la implementación existente del fake door / "Me interesa";
2. confirmar qué eventos persiste y dónde;
3. no duplicar tracking si la implementación de Gemini ya sirve;
4. normalizar métricas según `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`;
5. mantener Comunidades como **EXPERIMENTO ACTIVO** mientras no exista evidencia suficiente;
6. evaluar por separado si Comunidades genera engagement interno y si puede generar adquisición externa;
7. cuando haya datos suficientes, decidir:
   - BUILD NOW;
   - MVP REDUCIDO;
   - EXPERIMENTO ACTIVO;
   - POSPUESTO.
8. solo si se aprueba construir, abrir diseño detallado de roles/permisos/schema;
9. si se pospone, definir disparador de reevaluación y continuar con la siguiente prioridad del MVP.
