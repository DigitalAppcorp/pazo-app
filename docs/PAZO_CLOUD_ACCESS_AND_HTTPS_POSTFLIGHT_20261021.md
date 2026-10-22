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
El intento de bloquear builds cambiando ese campo a `disabled` fue incorrecto:
el push generó el preview secundario `dpl_CddaWi3Tm1tzkRWW4KnfM8dkgtsa`,
SHA `11d4ee34`, pese al GET del campo. No considerar ese campo evidencia de
Preview OFF. Se restaura a `enabled` y se corrige con la opción oficial
`git.deploymentEnabled=false` en `vercel.json`.
[Documentación Vercel](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled).
No se tocaron productionBranch=main, dominios, producción, protección SSO,
variables o configuración PayPal. El preview involuntario no acredita release
ni aprobación pública y debe retirarse después de validar su identidad.

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

## PR de continuación

[PR67](https://github.com/DigitalAppcorp/pazo-app/pull/67) DRAFT hacia F13,
SHA inicial `11d4ee342555ec41936e1497664ce24b9bde8c7d`: **5/5 GitHub Actions
SUCCESS** (verify + Live gateway PG17 + F14 + P12 + P21).
[CI](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39672633795) y
[lab PG17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39672633821).
Los dos status Vercel SUCCESS adicionales no representan CI financiero ni
aceptación del preview involuntario. No se fusionó el PR.

Se guardó requisito privado `SUPABASE_ACCESS_TOKEN` con destino único
`api.supabase.com`; no se recibió valor ni se autenticó Supabase. El usuario
puede suministrarlo en el campo seguro del entorno; nunca por chat. Guardar el
requisito no introduce el token ni demuestra propagación al runtime.

## Postflight corregido — 20:48 UTC

- Commit `8ad55b048f5fe07352a6c9c151d9bfe38a9f40c5`, PR67: **5/5 GitHub
  Actions SUCCESS**. `git.deploymentEnabled=false` ya está en la rama remota.
  No aparece deployment de ese SHA en ninguno de los dos proyectos inspeccionados;
  el PR ya no muestra status de nuevo build Vercel. No inferir esto del campo
  `createDeployments`, restaurado a su valor original.
- Preview involuntario `dpl_CddaWi3Tm1tzkRWW4KnfM8dkgtsa`: identidad verificada
  por SHA11d4ee34, proyecto secundario, target null y único alias de esta rama.
  Retirado por DELETE HTTP200; GET independiente HTTP404. Ningún deployment
  previo o target de producción fue borrado.
- Principal `pazo-app-t83r`: producción READY en `5163c187eb7c52d85a34e4f32cd89820a4535498`
  (`main`), preview READY en `a218ab3cbc1ac01b7932da3ce5c3c87ee2c86770`
  (F13 antiguo). Ninguno contiene esta entrega. No se cambió dominio ni protección.
- Solo metadata de env revisada, sin leer valores: flag Sandbox QA y beneficios
  restringidos al preview F13; Mapbox solo preview; configuración Supabase y
  telemetría con ámbitos existentes. Esto no valida valores, proveedores ni
  configuración final de release.
- Comprobaciones focalizadas ejecutadas directamente: callbacks2/2 y artefactos
  PWA4/4 PASS. No se repitió QA aceptada de otros módulos.

**Siguiente dependencia externa exacta:** suministrar `SUPABASE_ACCESS_TOKEN`
en el campo privado del entorno con destino api.supabase.com, o conectar una
herramienta oficial Supabase con acceso a este proyecto. El token no se ha
recibido y no debe enviarse por chat. La orden de completar ingeniería sigue
vigente: con acceso, auditar runtime/ACL/versiones antes de aplicar las tres
migraciones ya ensayadas, desplegar cuenta y completar P4. No hay autorización
financiera ejecutada, claves Live nuevas ni beta publicada.
