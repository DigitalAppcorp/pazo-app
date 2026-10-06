# PAZO — Sub-Ruta Maestra 9B: Documentos privados

**Estado:** COMPLETADA — GATES 6–8 CERRADOS  
**Tipo:** U — utilidad individual  
**Resultado Gate 5:** MVP REDUCIDO  
**Documento padre:** `docs/PAZO_MVP_MODULE_PRIORITY.md`

---

# 1. Decisión de inversión

9B pasa a **MVP REDUCIDO**.

Razones:
- entrega valor a un usuario aislado;
- no depende de masa crítica;
- complementa el cuidado de cada mascota;
- no requiere moderación social;
- el coste principal es privacidad + Storage;
- compartir archivos externamente no es necesario para probar ni entregar el valor principal.

Por tanto:
- se construye primero almacenamiento privado real;
- compartir mediante enlaces externos queda fuera de este MVP;
- no se crea fake door.

---

# 2. Problema que resuelve

El dueño necesita guardar en PAZO documentos importantes de cada mascota y recuperarlos rápidamente sin mezclarlos con archivos públicos.

Casos principales:
- cartilla o comprobante de vacunación;
- historial o informe veterinario;
- identificación / microchip;
- resultados o estudios;
- otros documentos relevantes.

---

# 3. Resultado prometido

PAZO debe permitir responder:

- ¿qué documentos tengo guardados de esta mascota?;
- ¿puedo abrirlos cuando los necesito?;
- ¿puedo descargarlos?;
- ¿puedo organizarlos por categoría?;
- ¿puedo eliminarlos de forma segura?;
- ¿siguen estando ahí después de cerrar o recargar la app?

---

# 4. Alcance MVP

## Incluye
- documentos pertenecen a una sola mascota;
- privacidad owner-only;
- upload real;
- metadata persistente;
- listado por mascota;
- preview dentro de PAZO cuando el navegador soporte el tipo;
- descarga;
- editar título/categoría;
- eliminar;
- estados loading/error/empty;
- persistencia F5;
- cambio seguro entre mascotas.

## Tipos de archivo MVP
- PDF;
- JPEG;
- PNG;
- WEBP.

No aceptar formatos no soportados silenciosamente.

## Tamaño MVP
- máximo 10 MB por archivo.

El límite debe existir tanto en UX como en Storage.

---

# 5. Categorías MVP

- vacunas;
- historial veterinario;
- identificación;
- resultados / estudios;
- otros.

La categoría organiza; no cambia permisos ni hace inferencias médicas.

---

# 6. Campos visibles

Al añadir un documento:

- archivo — obligatorio;
- título — opcional; por defecto usa el nombre del archivo;
- categoría — obligatoria, con valor por defecto `otros`.

En listado:
- título;
- categoría;
- tipo de archivo;
- tamaño;
- fecha de subida.

No mostrar rutas internas de Storage.

---

# 7. Flujos

## Subir
Documentos → Añadir documento → seleccionar archivo → validar → título/categoría → Guardar → aparece en lista.

## Abrir
Tocar documento → preview autenticado dentro de PAZO cuando sea posible.

Si el navegador no puede previsualizar:
- ofrecer descarga;
- no fallar silenciosamente.

## Descargar
Documento → Descargar → obtiene el archivo privado con autorización válida.

## Editar metadata
Documento → Editar → título/categoría → Guardar.

No reemplazar el archivo físico mediante este flujo.

## Eliminar
Documento → Eliminar → confirmación → archivo y metadata dejan de estar disponibles.

No dejar objetos huérfanos de forma intencional.

---

# 8. Privacidad

Reglas de producto:

- documentos nunca son públicos;
- no aparecen en Feed, perfil público, QR, Explore ni rescate;
- solo el propietario autenticado de la mascota puede listarlos, abrirlos, descargarlos, editarlos o eliminarlos;
- cambiar de mascota cambia inmediatamente el conjunto visible;
- una mascota ajena nunca puede revelar metadata ni archivos.

---

# 9. Compartir

**Fuera de alcance del MVP reducido.**

No incluir:
- botón Compartir funcional;
- URL pública;
- signed URL para terceros;
- link sin login;
- expiración configurable;
- permisos por destinatario.

Motivo:
un enlace temporal sigue dando acceso externo a información privada y requiere reglas adicionales de expiración/revocación/UX.

Se puede reevaluar como 9B.2 después de validar uso real de Documentos.

---

# 10. Fuera de alcance

- OCR;
- extracción automática de texto;
- clasificación automática;
- diagnóstico o interpretación médica;
- IA médica;
- vincular documentos automáticamente a cuidados;
- versiones del mismo archivo;
- carpetas personalizadas;
- compartir con veterinarias;
- links externos;
- email/SMS;
- sincronización con proveedores médicos;
- HEIC preview/conversión automática;
- escáner de cámara especializado.

---

# 11. Errores y estados

## Upload inválido
Informar:
- tipo no permitido;
- archivo demasiado grande.

## Fallo de red
- no fingir éxito;
- conservar la lista anterior;
- permitir reintentar.

## Fallo al abrir
- mostrar error;
- ofrecer descarga si aplica.

## Fallo parcial al eliminar
La implementación debe resolver consistencia archivo/metadata en Gate 7; el producto no debe mostrar un documento eliminado si todavía es accesible.

---

# 12. Múltiples mascotas

- documentos están aislados por `pet_id`;
- al cambiar mascota se limpia estado stale;
- no mostrar por un instante documentos de la mascota anterior;
- F5 conserva datos de la mascota activa correcta.

---

# 13. Métricas post-lanzamiento

Medir sin inspeccionar contenido:

- cuentas con al menos un documento;
- mascotas con al menos un documento;
- uploads exitosos;
- uploads fallidos por tipo/tamaño;
- previews;
- descargas;
- eliminaciones;
- retorno al módulo Documentos.

No registrar nombres de archivo, títulos ni contenido en analytics si no es necesario.

---

# 14. Definition of Done de producto

9B MVP está definido cuando:
- tipos de archivo cerrados;
- tamaño máximo cerrado;
- categorías cerradas;
- campos cerrados;
- upload/listado/preview/descarga/edición/eliminación definidos;
- privacidad owner-only definida;
- múltiples mascotas definido;
- compartir explícitamente fuera del MVP;
- errores/estados definidos;
- métricas post-lanzamiento definidas.

---

# 15. Auditoría previa real

Estado encontrado antes de Gate 6:

- `PrivateDoc` todavía existe como tipo legado;
- `INITIAL_DOCS` contiene dos documentos mock;
- `CareModal` ya no muestra Documentos;
- no existe tabla pública específica de documentos;
- no existe RPC específica de documentos;
- Supabase Storage solo tiene `pet-avatars` y `post-photos`;
- ambos buckets actuales son públicos y no deben reutilizarse;
- no existe bucket privado específico para 9B.

La documentación actual de Supabase confirma que buckets privados someten descargas a autorización/RLS y que límites de tamaño/MIME pueden configurarse a nivel de bucket.

---

# 16. Estado final

Gate 6 fue aprobado por el Product Owner y Gate 8 fue completado.

Cierre:
- backend privado aplicado;
- build aprobado;
- seguridad/RLS/Storage verificados;
- prueba visual/end-to-end aprobada;
- PR #14 fusionado a `main`;
- merge commit: `6f833b779ef1a62d7321bc50dbab8c220f92a1d3`.

Compartir externamente sigue fuera del MVP y debe tratarse como una futura decisión separada.

**Fase 9B — COMPLETADA.**
