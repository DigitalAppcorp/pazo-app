# PAZO — Ensayo E2E de baja QA (COMPLETADO)

**Estado:** PASS, completado el 2026-10-10 en el único proyecto autorizado. No queda una ejecución pendiente ni se debe crear otra cuenta QA.

**Alcance aprobado:** eliminar una sola cuenta descartable preexistente y exclusivamente sus datos propios. Preservar las seis cuentas originales, el moderador original, su mascota y su objeto de Storage, y todos los datos de terceros. No merge, push, deploy, Vercel, A3 ni otros cambios funcionales.

## Resultado observado

- Cuenta descartable ya confirmada antes de iniciar. Se inició sesión en la app local y se completó onboarding mínimo con una mascota y su avatar de prueba.
- La solicitud de baja se creó desde la UI real de PAZO y se verificó en estado `requested`.
- El preflight de solo lectura confirmó propiedad QA de una mascota y un objeto `pet-avatars`, sin posts, cuidados, documentos, comunidades, interacciones, moderación, check-ins ni referencias de terceros.
- Se ejecutó `supabase/queries/f14_qa_begin_processing_ADMIN_ONLY.sql` en SQL Editor administrativo. Resultado: una sola solicitud pasó a `processing`; Auth y Storage no se borraron en esa transición.
- El avatar QA se retiró en Storage seleccionando el archivo exacto bajo la carpeta del propietario QA. Se retiró también la carpeta vacía residual creada en Storage. Después se borró la única fila de mascota QA en Table Editor, tras comprobar las FK restrictivas/no-action y sus dependencias en cero; solo se eliminaron en cascada sus propias filas de enlace público y detalle privado.
- La cuenta QA se eliminó desde Supabase Auth Admin oficial. No se ejecutó SQL directo contra `auth.users` ni `storage.objects`.
- Tras comparar identidades privadas con la evidencia capturada antes del ensayo, se verificó coincidencia exacta de los seis UUID originales, del grant del moderador, de la mascota original y del objeto Storage original. Sus conteos volvieron a 6 Auth, 1 moderador, 1 mascota y 1 objeto Storage.
- Se ejecutó el bloque de `supabase/queries/f14_qa_complete_verified_ADMIN_ONLY.sql`, con UUID QA sustituido solo en el editor privado de Supabase. Verificación final: la solicitud QA quedó `completed` con `processed_at`; cero solicitudes abiertas; cuenta, perfil, mascota y referencias Storage QA ausentes. Auth=6; contenido comunitario=0.

Los UUID y huellas comparativas permitidos están en evidencia local privada fuera del repositorio. No incluirlos en Git, commits, PRs ni informes públicos. No se copiaron perfiles, contraseñas, tokens ni contenido de cuentas originales.

## Alcance de la prueba

La baja de la identidad y de los objetos de base de datos/Storage fue verificada. No se certificó la purga de CDN, cachés externas ni respaldos; no afirmar que esos sistemas hayan sido purgados. Este ensayo único no activa una purga automática ni cambia `LEGAL_RELEASE_READY`.

## Cierre

La prueba reservada a Codex está terminada. No reanudar este procedimiento, no recrear la QA y detener esta línea de trabajo. El PO y los demás responsables continúan las tareas restantes por separado.
