# PAZO — Fase 8 — Lugares, mapa y Check-ins — MVP de producto

**Estado:** GATE 6 — ESPECIFICACIÓN DE PRODUCTO EN CURSO  
**Fecha:** 2026-10-06  
**Decisión de inversión:** MVP REDUCIDO REAL  
**Implementación autorizada:** NO

## 1. Objetivo

Convertir el tab Mapa en una experiencia realmente útil para descubrir lugares pet-friendly y saber, de forma voluntaria y temporal, qué mascotas están presentes.

Ciclo mínimo de valor:

**abrir mapa → descubrir lugar → revisar detalle → decidir ir → hacer check-in voluntario → salir o expirar automáticamente**

El MVP debe ser útil incluso con pocos usuarios. La presencia social mejora el valor, pero no puede ser requisito para que el mapa sirva.

---

## 2. Decisiones aprobadas por Product Owner

### D1 — Visibilidad del check-in
**APROBADA**

- todos pueden ver el número de mascotas presentes;
- la identidad de una mascota solo se muestra cuando su dueño activa explícitamente **Mostrar a mi mascota aquí**;
- por defecto, el check-in NO expone la identidad de la mascota.

### D2 — Duración
**APROBADA**

- check-in por defecto: **2 horas**;
- puede terminarse manualmente antes;
- después de 2 horas se considera expirado automáticamente;
- no existe tracking continuo ni renovación automática silenciosa.

### D3 — Alta de lugares
**APROBADA**

- PAZO publica lugares;
- usuarios autenticados pueden **Sugerir un lugar**;
- sugerencias entran en estado pendiente;
- no aparecen públicamente hasta aprobación;
- no se permite publicación directa libre en MVP.

### D4 — Ubicación del dispositivo
**APROBADA**

- ubicación solo tras acción explícita **Usar mi ubicación**;
- coordenadas del dispositivo se usan de forma efímera;
- PAZO no persiste el GPS exacto del usuario;
- el check-in persiste `place_id`, no la coordenada del dispositivo;
- sin background tracking.

### D5 — Renderer / proveedor de mapa
**APROBADA**

- Mapbox GL JS como renderer/proveedor principal inicial;
- dominio de PAZO desacoplado del proveedor;
- PAZO conserva sus propias coordenadas y entidades de lugar;
- arquitectura preparada para sustituir Mapbox más adelante;
- modelos 3D glTF/GLB propios de PAZO por categoría.

---

## 3. Experiencia principal

### 3.1 Tab Mapa

Al abrir:
- mapa real centrado en una zona inicial útil;
- pins/modelos de lugares disponibles;
- lista/resumen de lugares cercanos o visibles;
- buscador;
- filtros de categoría;
- botón **Usar mi ubicación**;
- no pedir permiso de ubicación automáticamente al cargar.

Si no concede ubicación:
- el mapa sigue funcionando;
- se usa una zona inicial de PAZO;
- búsqueda y navegación manual siguen disponibles.

Si concede ubicación:
- centrar mapa cerca del dispositivo;
- ordenar lugares por cercanía;
- mostrar distancia aproximada;
- no guardar la coordenada.

### 3.2 Categorías iniciales

- parque;
- sendero;
- cafetería/restaurante pet-friendly;
- veterinaria;
- grooming;
- tienda de mascotas.

Cada categoría tiene:
- iconografía propia;
- modelo 3D reutilizable futuro;
- color/estilo coherente con PAZO.

No crear modelos 3D únicos por negocio en MVP.

### 3.3 Detalle de lugar

Mostrar:
- nombre;
- categoría;
- foto;
- dirección;
- zona;
- horario;
- descripción;
- reglas/especies permitidas;
- distancia aproximada cuando exista ubicación efímera;
- número de mascotas presentes;
- listado de mascotas visibles si las hay;
- estado del check-in de la mascota activa;
- CTA para check-in / salir.

No mostrar:
- owner IDs;
- GPS exacto de usuarios;
- historial público de visitas;
- datos privados de cuenta.

---

## 4. Check-in

### 4.1 Unidad
El check-in pertenece a la **mascota activa**.

### 4.2 Regla de presencia
Una mascota solo puede tener **un check-in activo a la vez**.

Si se registra en otro lugar:
- el anterior debe cerrarse atómicamente;
- el nuevo comienza después.

### 4.3 Entrada
Al tocar **Estoy aquí**:
1. PAZO confirma la mascota activa;
2. muestra control:
   - **Mostrar a <mascota> como presente** — OFF por defecto;
3. crea check-in;
4. duración: 2 horas;
5. actualiza presencia.

No se requiere GPS para hacer check-in en MVP. El usuario está declarando presencia voluntariamente en el lugar seleccionado.

### 4.4 Visibilidad
Siempre puede contribuir al contador activo.

Solo aparece la mascota en la lista pública si:
- check-in sigue activo;
- `visible = true`.

### 4.5 Salida
- CTA **Salir del lugar**;
- termina el check-in inmediatamente;
- desaparece del contador/listado.

### 4.6 Expiración
Un check-in se considera activo solo cuando:
- `ended_at IS NULL`;
- `expires_at > now()`.

No requiere job para que la seguridad sea correcta. Un job de limpieza puede añadirse después como mantenimiento.

---

## 5. Sugerir lugar

Formulario mínimo:
- nombre;
- categoría;
- dirección;
- zona opcional;
- nota opcional: por qué es pet-friendly.

No publicar directamente.

Estado:
- pending;
- approved;
- rejected.

El usuario puede recibir confirmación de envío, pero no necesita panel de historial de sugerencias en este MVP.

La aprobación inicial puede hacerse operativamente fuera de un panel admin dedicado.

---

## 6. Modelos 3D y lenguaje visual

PAZO debe preparar desde el inicio una biblioteca de assets por categoría:

```
park.glb
trail.glb
restaurant.glb
veterinarian.glb
grooming.glb
pet-store.glb
```

Principio:
- muchos lugares reutilizan el mismo modelo;
- el modelo representa la categoría, no el edificio real;
- evita costo de crear un asset por negocio;
- permite que el mapa tenga identidad propia.

### Futuro B2B
La arquitectura debe permitir más adelante:
- skin/color propio de un negocio;
- logo;
- variante de modelo;
- estado profesional/verificado;
- promoción patrocinada claramente etiquetada.

Nada de esto entra en el MVP.

---

## 7. Búsqueda y filtros

### Buscar
Buscar por:
- nombre;
- zona;
- dirección.

### Filtros
Iniciales:
- todos;
- parques;
- senderos;
- comida/café;
- veterinarias;
- grooming;
- tiendas.

No añadir ranking complejo ni recomendador algorítmico en MVP.

---

## 8. Datos y verdad de producto

No usar:
- `INITIAL_PLACES`;
- `active_check_ins` manual como fuente de verdad;
- fake counts;
- fake pets present.

El frontend debe consumir datos reales de Supabase.

Los 2 lugares seed existentes se consideran demo/no verificados hasta decidir si se reemplazan por lugares reales.

---

## 9. Extensiones en validación

Después de que el núcleo funcione, se pueden mostrar fake doors contextuales para:
- reviews/calificaciones;
- favoritos/listas;
- fotos de usuarios;
- rutas/caminatas;
- eventos en lugares;
- historial personal de visitas;
- publicar lugar directamente;
- promociones/ofertas de negocios.

No activar todos automáticamente.

Solo medir una extensión si su resultado cambiará una decisión de inversión.

---

## 10. Fuera del MVP

- background GPS;
- compartir ubicación en tiempo real;
- historial público de movimientos;
- mapa de mascotas moviéndose en vivo;
- rutas/navigation turn-by-turn;
- reviews completas;
- ratings;
- favoritos;
- reservas;
- pagos;
- promociones;
- ads;
- negocios administrando su propio perfil;
- modelos 3D personalizados por negocio;
- geofencing;
- detección automática de llegada;
- check-in automático;
- moderación/admin panel complejo;
- crowdsourcing directo sin aprobación.

---

## 11. Métricas post-lanzamiento

Núcleo:
- usuarios que abren Mapa;
- usuarios que usan ubicación;
- lugares abiertos;
- búsquedas;
- filtros usados;
- check-ins creados;
- check-ins visibles vs privados;
- check-outs manuales;
- check-ins expirados;
- usuarios que vuelven a Mapa;
- sugerencias enviadas.

No usar `interactions` del Feed para estas métricas.

Cuando haga falta experimentación se reutiliza la infraestructura `module_validation_*`.

---

## 12. Estados vacíos / errores

Debe existir comportamiento explícito para:
- sin permiso de ubicación;
- ubicación no disponible;
- Mapbox no carga;
- sin lugares en viewport;
- búsqueda sin resultados;
- lugar archivado/no disponible;
- error de check-in;
- mascota activa inexistente;
- sugerencia fallida.

El mapa no debe quedar como pantalla en blanco.

---

## 13. Accesibilidad y mobile

- el mapa no puede ser la única forma de acceder a lugares;
- debe existir lista accesible;
- acciones principales deben poder usarse sin gestos complejos;
- modelos 3D son decorativos/informativos, no la única codificación de categoría;
- cada lugar conserva nombre + categoría textual;
- experiencia priorizada para móvil/PWA.

---

## 14. Definition of Done — Gate 6

Gate 6 queda cerrado cuando Product Owner apruebe:

- ciclo de valor;
- categorías;
- detalle;
- check-in y privacidad;
- duración;
- sugerencias;
- ubicación efímera;
- Mapbox;
- modelos 3D por categoría;
- búsqueda/filtros;
- métricas;
- límites del MVP.

Después:
**Gate 7 — arquitectura técnica exacta + migración preparada.**
