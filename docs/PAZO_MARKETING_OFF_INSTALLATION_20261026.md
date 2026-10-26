# Instalación Marketing OFF — GO del PO, 26-oct-2026

Autorización directa: integrar PR125, instalar exclusivamente las dos migraciones
de marketing, ambas Edge y frontend, colección/reportes OFF y retención0.
No Cron nuevo, Cloudflare, Pixel/CAPI, cuentas reales de prueba, recopilación,
cambios financieros ni db push/repair/reset. Aprobación de privacidad y gasto separadas.

## Contrato de campaña corregido antes de publicar anuncios

El paquete de14/oct proponía `pazo_us_pilot_30d` y códigos de piezas como
`a01_qr_video_en_v1`/`01_qr_video_en_v1`; no eran admitidos por PR91/125.
Ese plan antiguo de30d no es la campaña actual de Tráfico45USD/3d. No se amplía
la captura a texto libre ni se alteran las dos migraciones exactas ya revisadas.

Fuente única actual: [las tres URLs oficiales](marketing/traffic-pilot-urls.json).
Usar las URLs completas para imagen/carrusel/video en Facebook e Instagram;
utm_source=meta es compartido, sin afirmar desglose de plataformas. El panel usa
las etiquetas históricas Profile/QR/Communities; el manifiesto hace explícita la
correspondencia con formatos. No usar macros de Meta ni nombres libres como UTM.

Ejecutar `npm run marketing:validate-urls` antes de copiar los tres destinos.
Para una URL candidata: `npm run marketing:validate-urls -- 'URL'`.
Devuelve diagnóstico explícito y exit1 si campaña/creativo/destino/parámetros son
incompatibles; nunca imprime la URL no validada ni sus valores potencialmente
personales. Es validación offline, sin colección, almacenamiento o proveedor.
El gate de governance ejecuta los contratos de las tres URLs contra parser y
ambos Edge; PG17 comprueba su aceptación en los RPC reales con ROLLBACK.
El cliente mantiene fallo inocuo ante UTMs desconocidas; una URL publicitaria
se considera válida solo después de pasar este gate. No hay anuncios publicados.

## Secuencia y evidencias

1. Revalidar SHA exacto dePR125 y todos sus checks, main y alias Vercel canónico.
2. Auditar Supabase sin escrituras: dependencias, marketing ausente, salud PayPal,
   funciones/ACL y estado Cron; conservar snapshots de definiciones sin datos reales.
3. Merge condicionado al head verificado y CI; comparar tree publicado con candidato.
4. Aplicar transacciones exactas `20261024020632` y `20261024034549` mediante API
   dirigida, registrar versiones generadas/hash. No reparar historia ni replay.
5. Verificar enabled=false,enabled_atNULL,retention_days0,tablasvacías,RLSFORCE y
   ACLsinaccesodirecto. No ejecutar las operaciones de activación de Cron.
6. Desplegar solo ambas Edge, flags false, JWT según config y sin secretos nuevos.
   Verificar fuente instalada y respuestas OFF sin credenciales de usuarios.
7. Publicar frontend del merge exacto en proyecto pazo-app; verificar alias, build,
   colección/landing/adminreport false, PWA, Auth público, mapa y salud financiera.

Rollback: conservar deployment previo `dpl_GeqCir3UT9hyKN8bDygQqiUW6N7F` y fuente
`a8d837994eacaa8c90844c252ffd5131e17fdd4b`. Si falla un control, no abrir gates;
revertir frontend/Edge según runbook sin eliminar tablas/evidencia o tocar PayPal.
Con tablas vacías y sin Cron, no hay datos personales nuevos que purgar.

Estado de aplicación/postflight: en curso; no se afirman operaciones realizadas
hasta anexar sus recibos y resultados reales.
