# PAZO — postflight de acceso y HTTPS, 21-oct-2026

**Lectura comprobada: 20:30 UTC. Dictamen global: NO-GO.**
Este postflight reemplaza el diagnóstico anterior de bloqueo total de red.
No cambia el estado de aplicación de SQL, despliegue o release financiero.

## Continuación: Vercel conectado desde el celular

El propietario completó login oficial de dispositivo. Vercel CLI confirma sesión,
REST lee ambos proyectos PAZO. El descubrimiento OAuth y supabase.com responden200;
se considera superado el bloqueo de red documentado abajo, sin atribuir su
resolución a una publicación de entorno que esta herramienta no ejecutó.

Los dos proyectos conectados al repo tenían `createDeployments=enabled`.
Se actualizaron a `disabled`, con GET independiente confirmado en ambos,
para respetar el gate pre-Preview y permitir push/CI sin más despliegues.
No se tocaron productionBranch=main, aliases, dominios, targets, protección SSO,
variables o configuración PayPal. No hubo deployment.

Supabase CLI2.121 genera enlace oficial, pero exige introducir un código del
navegador. El intento se canceló sin credencial nueva: no se pidió al usuario
que enviara ese código por chat. Falta una vía segura de autenticación Supabase.

## GitHub accesible y PR pendientes revisados

GraphQL y REST autenticados ya responden. PR44 mantiene F13 en
`669efafdb5678cae40c5137d7bddc9403c2ab8a3`. PR66 permanece abierto, DRAFT,
SHA `d1d34fa230c0928748141adf1f02adb186a99568`; tiene base temporal
`release/mvp-beta-fast-track-20261010`, y su descripción ordena integrarlo
solamente a F13. No se fusionó ni se cambió esa base durante este postflight.

- [PR66](https://github.com/DigitalAppcorp/pazo-app/pull/66): **12/12 check-runs
  GitHub Actions SUCCESS**. Ejemplos: [CI](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39662719451)
  y [laboratorio Live PG17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39662719263).
  El status separado `Vercel – pazo-app` es FAILURE por cuota gratuita de
  despliegues; el comentario oficial indica más de 100 y reintentar en 24h.
- [PR44](https://github.com/DigitalAppcorp/pazo-app/pull/44): los jobs mostrados
  son SUCCESS, pero Vercel tiene FAILURE por cuota. No implica un frontend actual
  desplegado. Los comentarios visuales históricos tampoco aceptan automáticamente
  el dashboard actual.
- PR55/56/58/59 siguen abiertos y superados según handoff; no se fusionaron.
  PR34–38 también figuran abiertos, de fases anteriores; no se incorporaron a
  esta rama por el mero hecho de existir.

No hay push: sigue faltando verificar Preview OFF/cuota con acceso al proyecto.
El incremento `a0857b96` permanece local, separado del CI remoto de PR66.

## GET públicos reales del dominio aprobado

Destino: `https://pazo-app-t83r.vercel.app`, sin cookies ni sesión de usuario.

| Ruta | Resultado |
| --- | --- |
| `/` | HTTP200, HTML de PAZO; no redirección SSO en esta petición |
| `/paypal/return` | HTTP404 |
| `/paypal/cancel` | HTTP404 |
| `/manifest.webmanifest` | HTTP404 |
| `/sw.js` | HTTP404 |

El HTML servido referencia `index-BjMi1Kyk.js`, `index-Bd4FSvac.css` y no
declara manifest. El checkout local sí tiene rewrites de callbacks en
`vercel.json` y los archivos PWA; este dominio todavía no los sirve.
No se atribuye SHA al deployment solo por el HTML; eso exige metadata Vercel.
No es HTTPS_E2E_PASS, PWA instalada, aceptación visual ni validación de Auth.

## Supabase y autenticación de proveedores

Con configuración pública ya presente en el cliente, GET a
`/auth/v1/settings` del proyecto `mrybvqdebbgcayuvgkkr` devuelve HTTP200.
GET a las rutas Edge `pazo-paypal-live-account` y `pazo-admin-paypal-vault`
devuelve respectivamente HTTP405 y HTTP400. Esto solo demuestra conectividad y
ruteo; no prueba versiones, ACL, MFA o éxito de una operación autenticada.
No se invocaron POST/RPC ni se escribieron datos.

`api.supabase.com/v1/projects` sin credenciales devuelve401;
`api.vercel.com/v9/projects` sin credenciales devuelve403. Esta sesión sigue
sin autenticación administrativa de ambos servicios ni conectores disponibles.

Se preparó Vercel CLI65.0.0 fuera del checkout, con telemetría desactivada para
el intento de login y directorio de configuración separado. El descubrimiento
OAuth exige `vercel.com/.well-known/openid-configuration`, cuyo túnel de proxy
sigue devolviendo403. No se obtuvo código de autorización ni sesión nueva;
no hay enlace de login válido que entregar todavía. No se pidió ningún token
por chat.

## Acción mínima de entorno pendiente

El borrador de red añade **`vercel.com` y `supabase.com`**, conservando todos los
dominios previos. Guardado confirmado por la herramienta, `requires_publish=true`.
El propietario debe revisar/guardar en ajustes y publicar **el entorno de
desarrollo**, para aplicar la configuración. Guardar este borrador no lo aplica
al runtime, no habilita credenciales y no publica PAZO.

Después: reintentar autorización oficial de proveedores desde navegador del
celular, auditar proyecto/Preview OFF, source alojado/versiones y gates P4.
No pedir claves PayPal antes de cerrar la ingeniería. Las tres migraciones y
la Edge de cuenta siguen sin aplicar/desplegar. P4, HTTPS E2E, canary y GO siguen
BLOCKED como en el [informe de continuación](PAZO_CODEX_BETA_CONTINUATION_20261021.md).
