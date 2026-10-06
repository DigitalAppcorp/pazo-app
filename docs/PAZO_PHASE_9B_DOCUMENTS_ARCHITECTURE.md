# PAZO — Arquitectura Técnica 9B: Documentos privados

**Estado:** GATE 7 — ARQUITECTURA TÉCNICA CERRADA
**Producto:** docs/PAZO_PHASE_9B_DOCUMENTS_MASTER.md
**Resultado Gate 5:** MVP REDUCIDO
**Regla:** esta arquitectura prepara Gate 8. No autoriza mutaciones de Supabase.

---

# 1. Objetivo técnico

Persistir documentos privados por mascota con:
- bucket privado;
- aislamiento owner-only en DB y Storage;
- metadata separada del archivo;
- upload recuperable;
- preview/download autenticado;
- edición de metadata;
- eliminación consistente y recuperable;
- cambio de mascota sin estado stale;
- cero exposición mediante URL pública.

# 2. Bucket

Crear bucket dedicado: pet-documents.

Configuración:
- public = false;
- file_size_limit = 10485760 (10 MB);
- MIME permitidos: application/pdf, image/jpeg, image/png, image/webp.

No reutilizar pet-avatars ni post-photos porque ambos son públicos.

# 3. Rutas de Storage

Formato: <owner_id>/<pet_id>/<document_id>.<ext>

Reglas:
- nombres originales nunca forman parte de la ruta;
- no exponer rutas en UI;
- document_id es UUID;
- extensión derivada del MIME permitido;
- upsert=false;
- no reemplazar archivos en MVP.

# 4. Metadata — public.pet_documents

Campos:
- id uuid PK;
- pet_id uuid FK public.pets(id);
- title text;
- category text;
- original_file_name text;
- storage_path text UNIQUE;
- mime_type text;
- size_bytes bigint;
- status text;
- created_at timestamptz;
- updated_at timestamptz.

Categorías: vaccines, medical_history, identification, results, other.
Estados: uploading, active, deleting.
Labels ES/EN pertenecen al frontend.
No guardar URL pública ni signed URL persistente.

# 5. Constraints

- title trim 1..160;
- original_file_name 1..255;
- size_bytes > 0 y <= 10 MB;
- mime_type solo lista permitida;
- category solo lista permitida;
- status solo lista permitida;
- storage_path no vacío y UNIQUE;
- pet_id NOT NULL.

# 6. Ownership DB

Un documento pertenece al owner de pet_id.
RLS owner-only mediante relación con public.pets.owner_id = auth.uid().

Anon: sin acceso.
Authenticated:
- SELECT propio;
- UPDATE directo solo de title/category mediante grants por columna;
- no DELETE directo;
- creación, status y rutas gestionados por RPCs controladas.

Service role: acceso completo.

# 7. Storage RLS

Para storage.objects en bucket pet-documents:
- INSERT authenticated solo si el primer segmento de la ruta es auth.uid();
- SELECT authenticated solo si el primer segmento es auth.uid();
- DELETE authenticated solo si el primer segmento es auth.uid();
- UPDATE no concedido en MVP;
- anon sin permisos.

La metadata agrega aislamiento por mascota. Storage agrega aislamiento por cuenta.

# 8. Upload recuperable

Flujo:
1. cliente valida MIME/tamaño;
2. RPC begin_pet_document_upload;
3. backend autentica, verifica ownership de mascota, genera document_id y storage_path e inserta metadata status=uploading;
4. cliente sube al bucket privado con upsert=false;
5. RPC finalize_pet_document_upload;
6. backend verifica que exista el objeto correcto en storage.objects;
7. cambia status a active;
8. UI recarga desde verdad de servidor.

Si upload falla:
- cliente intenta remover cualquier objeto parcial;
- llama cancel_pet_document_upload;
- cancel solo elimina metadata si el objeto no existe.

# 9. Recuperación de upload interrumpido

Filas uploading no se muestran como documentos activos.
En la siguiente carga del módulo el servicio puede finalizar si el objeto existe o cancelar si no existe.
No requiere cron para MVP.

# 10. Listado

Fuente de verdad visual: pet_documents por pet_id con status=active.
Orden: created_at DESC, id DESC.
Paginación: 20 por página.
Al cambiar mascota se invalida la respuesta anterior y se limpia la lista visible antes de cargar la nueva.

# 11. Preview y descarga

No usar getPublicUrl.
No generar signed URLs para compartir.

Usar supabase.storage.from('pet-documents').download(storage_path) para obtener Blob autenticado.
Preview:
- crear URL.createObjectURL(blob);
- imágenes en renderer de imagen;
- PDF en iframe/object;
- revocar blob URL al cerrar/cambiar.

Descarga:
- blob URL temporal;
- atributo download con nombre original saneado;
- revocar URL después.

# 12. Edición

Cliente puede modificar únicamente title y category.
No puede modificar pet_id, storage_path, mime_type, size_bytes, status ni created_at.
Reemplazar archivo queda fuera del MVP.

# 13. Eliminación consistente

Flujo:
1. RPC begin_delete_pet_document autentica, valida owner, bloquea fila, exige active, cambia a deleting y devuelve storage_path;
2. UI lo retira de activos;
3. cliente hace Storage remove;
4. RPC finalize_delete_pet_document verifica owner, status deleting y ausencia del objeto; después elimina metadata;
5. si Storage falla, RPC cancel_delete_pet_document vuelve a active.

Si el navegador se cierra durante deletion, la fila deleting permanece oculta y el servicio reintenta remove + finalize al siguiente acceso.

# 14. RPCs previstas

Públicas:
- begin_pet_document_upload;
- finalize_pet_document_upload;
- cancel_pet_document_upload;
- begin_delete_pet_document;
- finalize_delete_pet_document;
- cancel_delete_pet_document.

Patrón de seguridad:
- wrappers públicos SECURITY INVOKER;
- lógica privilegiada en schema no expuesto document_private;
- helpers internos SECURITY DEFINER solo porque necesitan escribir columnas protegidas y verificar storage.objects;
- auth check explícito dentro de cada helper;
- SET search_path='';
- referencias schema-qualified;
- document_private con USAGE mínimo para authenticated;
- EXECUTE interno solo para authenticated/service_role;
- PUBLIC/anon sin EXECUTE;
- wrappers públicos authenticated-only.

Objetivo: evitar exponer SECURITY DEFINER directamente por Data API y no introducir nuevos warnings del Security Advisor.

# 15. Frontend

Crear:
- src/services/documentService.ts;
- modal/componente separado de Agenda;
- tipos reales PetDocument.

Integración:
- entrada Documentos privados en vista de mascota;
- no volver a mezclar Documentos dentro de CareModal;
- cargar solo mascota activa;
- count/summary desde server truth;
- loading/error/empty;
- upload busy/progress;
- preview;
- edición metadata;
- confirmación al eliminar.

Retirar del núcleo INITIAL_DOCS y PrivateDoc legacy cuando ya no tengan consumidores.

# 16. Seguridad de nombres y contenido

- conservar nombre original solo como metadata;
- storage_path generado;
- sanitizar nombre al descargar;
- SVG no permitido;
- no ejecutar contenido;
- PDF/imagen tratados como Blob;
- MIME restringido también en bucket.

No añadir antivirus/escaneo en este MVP porque no hay tipos ejecutables ni sharing externo.

# 17. Concurrencia

- doble upload bloqueado en UI; UUID distinto; upsert false;
- doble delete bloqueado por row lock + status;
- cambio rápido de mascota usa load-version/ref;
- una operación iniciada para una mascota nunca inyecta datos en la lista de otra.

# 18. Eliminación futura de mascota

9B no redefine la política global de borrar mascotas.
Antes de eliminación definitiva de mascota en Fase 14 se deben limpiar objetos Storage asociados.
No asumir que ON DELETE CASCADE borra bytes de Storage.

# 19. Migración prevista

Una migración versionada 9B puede incluir:
- tabla pet_documents;
- constraints e índices;
- RLS/grants;
- bucket privado;
- Storage policies;
- RPCs;
- hardening.

Preparar primero. No aplicar hasta autorización explícita del Product Owner.

# 20. Índices

- (pet_id, status, created_at DESC, id DESC);
- UNIQUE storage_path.

# 21. Plan de pruebas backend

Metadata:
- owner SELECT permitido;
- non-owner SELECT vacío;
- spoof pet_id bloqueado;
- anon bloqueado;
- direct status/path update bloqueado.

Storage:
- bucket privado;
- anon download bloqueado;
- owner upload/download/delete permitido;
- otro owner download/delete bloqueado;
- MIME inválido rechazado;
- >10 MB rechazado.

Upload lifecycle:
- begin → upload → finalize = active;
- finalize sin objeto bloqueado;
- cancel sin objeto limpia metadata;
- cancel con objeto existente bloqueado.

Delete lifecycle:
- begin → deleting;
- finalize con objeto existente bloqueado;
- remove → finalize elimina metadata;
- cancel tras fallo vuelve active;
- doble delete bloqueado.

# 22. Plan de prueba visual

- count real;
- empty state;
- subir PDF e imagen;
- rechazar MIME inválido y >10 MB;
- F5;
- aislamiento multi-pet;
- preview PDF/imagen;
- descarga;
- editar title/category;
- eliminar;
- F5 después de eliminar;
- Feed, QR, rescate y perfil público no muestran documentos.

# 23. Definition of Done técnico

9B no se considera completada hasta:
- bucket privado aplicado;
- tabla/RLS/grants aplicados;
- lifecycle RPCs aplicadas;
- owner/non-owner/anon Storage probado;
- upload/recovery probado;
- preview/download autenticados;
- edit persistente;
- delete consistente;
- F5 y multi-pet;
- mocks legacy fuera del núcleo;
- build PASS;
- Advisors revisados;
- prueba visual aprobada;
- merged a main.

# 24. Estado Gate 7

Arquitectura cerrada.
Siguiente etapa: Gate 8 — Implementación, en rama propia.
La migración se prepara y revisa, pero no se aplica a Supabase sin autorización explícita del Product Owner.

---

## Post-apply implementation note

Backend 9B applied with Product Owner authorization.

Applied migrations:
- `20261006090551 private_pet_documents`;
- `20261006090654 fix_private_document_storage_policies`.

During post-apply verification an ambiguity in unqualified Storage policy path references was detected before visual testing. A separate hardening migration qualified references against `storage.objects.name`; policies were re-verified afterwards.

Backend verification passed:
- private bucket configuration;
- metadata RLS;
- column grants;
- public wrappers SECURITY INVOKER;
- internal helpers isolated in `document_private`;
- owner/non-owner visibility;
- direct protected status update blocked;
- arbitrary bucket insert without reservation blocked;
- upload reservation/finalize lifecycle;
- MIME/size/ownership validation;
- cancel reservation;
- delete metadata lifecycle;
- Security Advisor has no new 9B finding.

Full Storage API `remove()` remains part of visual/end-to-end testing because Supabase intentionally blocks direct SQL deletion from `storage.objects`.
