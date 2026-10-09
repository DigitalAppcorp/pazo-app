# PAZO F14 A3 — Hosted SQL read-only QA (2026-10-09)

**Autorización PO:** pruebas SQL reversibles contra Supabase hospedado. No DDL, DML, Storage delete, Auth delete, migraciones aplicadas, merge o deploy. Se usó BEGIN READ ONLY / REPEATABLE READ y ROLLBACK. Datos alojados son de prueba de prelanzamiento.

## Resultados verificados directamente

| Chequeo | Evidencia |
| --- | --- |
| Preflight | 6 cuentas; 1 post de otra cuenta dentro de comunidad, 6 comentarios cruzados de Feed y 1 documento privado |
| Archivo seguro | La comunidad existente tiene post ajeno y medios no verificados: 1 de 1 bloqueada; 19 objetos en buckets públicos |
| Comentarios JSON legacy | 5 comentarios embebidos en 3 posts, distribuidos entre 3 cuentas |
| Fotografías / archivos | 13 posts Feed con foto, 2 posts de Comunidad con foto, 6 perfiles de mascota con foto y 1 documento con ruta Storage |
| Preflight nuevo | 5 de 6 cuentas necesitan revisión de media/legacy. El conteo por cuenta de fotos en Comunidad suma 3 dependencias, no 3 objetos distintos (una foto puede afectar autor y administrador) |
| Claves foráneas | 5 de 5 FKs peligrosas son CASCADE/RESTRICT como se esperaba; NO se modificaron |
| Rol authenticated sin JWT | auth.uid() null, tablas/RPC A3 ausentes, lectura de comunidades devuelve 0 filas |
| Rol anon sin JWT | SELECT directo a communities fue rechazado con 42501; no se cambiaron grants |
| Instalación de A3 | deletion_jobs, deletion_worker_leases y request_deletion RPC no existen. Migraciones sin aplicar, flag OFF |

## Correcciones que generaron las pruebas

- Borrador de preflight: nuevas cifras legacy_embedded_comments, feed_posts_with_photos, community_posts_with_photos y pet_profiles_with_photos; todas exigen revisión humana y bloquean el borrado automático.
- Borrador de archivo: abortar snapshot si hay comentarios JSON embebidos con autoría sin reconciliar.
- SQL usa CASE para tratar solo arrays en jsonb_array_length, evitando errores con JSON de otras formas. Consulta REAL read-only: 5 comentarios en 3 titulares.
- Parser de deletionFlow, panel A3 (OFF) y pruebas unitarias/estáticas actualizados.
- CI código #38001903371 SUCCESS, JSON seguro #38002029845 SUCCESS. SQL DRAFT no fue compilado con CREATE FUNCTION en el servidor.

## Lo que NO se probó y sigue bloqueante

- Ninguna migración A3 se instaló; no se probó CREATE FUNCTION/DDL del draft, RLS real de esas nuevas tablas, triggers, leases ni FKs propuestas. No confundir SELECT exitosos con SQL DDL validado.
- Falta backend worker real: reautenticación, freeze integral, archivo de contribuciones con pruebas, objetos Storage por API, visibilidad CDN, JWT y Auth final.
- Para probar realmente DDL se necesita un sandbox aislado y autorización de entorno; NO usar apply_migration para probar contra el Supabase hospedado, porque escribiría estado persistente y registros de migraciones.
- Autorizar por separado cambios en base alojada, borrados, merges, despliegues y costos. Gate F14 A3 sigue ABIERTO.
