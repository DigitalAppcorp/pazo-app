# Publicación preparada — requiere GO final

Este cambio no activa medición, modifica retención ni instala un proveedor. Los colectores de #153 ya estaban publicados: no apagarlos, reinstalarlos ni reiniciar sus fechas. Este candidato cambia representación y acceso a lecturas agregadas e incorpora la exclusión local explícita de envíos del navegador de #161. No amplía el vocabulario ni la recopilación. Esa corrección también requiere el GO de release.

## Antes del lanzamiento

1. Obtener la autorización final del Product Owner para este candidato. Un GO anterior de #147/#153 no autoriza este lanzamiento.
2. Confirmar el SHA aprobado, CI, proyecto Vercel `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI`, equipo `team_02Ax5UcD1OlLzpDBYyNMi6KO` y Supabase `mrybvqdebbgcayuvgkkr`.
3. Volver a consultar, sin mutar, historial de migraciones, funciones objetivo, flags, fechas de inicio y salud/cron de retención. Guardar las definiciones anteriores de las dos funciones agregadas para reversión.
4. Comparar las dos fuentes con los SHA-256 normalizados LF de [PREPARED_MIGRATIONS.json](PREPARED_MIGRATIONS.json). No ejecutar un `db push` global: el SQL fuente de #153 tiene una versión hospedada distinta ya registrada y no debe reinstalarse.

## Orden autorizado únicamente después del GO

1. Aplicar exclusivamente `20261029120000_pazo_analytics_admin_read_access.sql` mediante el mecanismo de migraciones aprobado. La transacción exige encontrar exactamente las guardas esperadas y falla de forma atómica si la definición difiere. Suprime AAL2 solo en dos lectores agregados; mantiene el rol administrador.
2. Aplicar exclusivamente `20261029121000_pazo_admin_visual_summary.sql`. Añade una proyección de solo lectura y privilegios limitados a usuarios autenticados que además sean administradores. No añade tablas, eventos, escrituras, flags ni identidades a la respuesta.
3. Registrar versión hospedada y hashes realmente instalados en el acta de lanzamiento, sin modificar el manifiesto histórico del candidato preparado.
4. Publicar el frontend aprobado mediante el procedimiento habitual. No cambiar aliases ni promover previews de otro SHA.
5. Probar con una sesión real de administrador AAL1: abrir Resumen/Comportamiento, filtrar, consultar el detalle y recuperar un fallo transitorio sin autenticador adicional. Verificar denegación a una cuenta ordinaria y sin sesión; comprobar que PayPal y operaciones sensibles mantienen su MFA. Confirmar que los flags y fechas no cambiaron.

## Reversión preparada

Restaurar el frontend anterior y las definiciones exactas guardadas de los dos lectores (incluida su política AAL2). Revocar/eliminar la función nueva si deja de tener consumidores y registrar una migración compensatoria. No borrar eventos, reiniciar cohortes ni desactivar los colectores ya publicados. Ejecutar nuevamente las pruebas de permisos y salud. Ninguna reversión se ha ejecutado en producción durante la preparación.

## Staging

`npm run test:admin-visual:pg17` reconstruye únicamente el laboratorio desechable, instala las dos migraciones allí y valida el contrato. `npm run preview:admin-visual` abre un staging interactivo de loopback en el puerto 5364. Usa datos sintéticos en PostgreSQL, Auth de QA y una lista cerrada de tres RPC de lectura; no admite escrituras ni credenciales reales. No constituye una sesión real de producción.

El preview Vercel contiene el bundle candidato. El nuevo RPC no se instala en el backend de producción antes del GO. La prueba hospedada usa los activos inmutables del preview y transporte controlado hacia el laboratorio; debe declararse esta limitación al entregar la evidencia.
