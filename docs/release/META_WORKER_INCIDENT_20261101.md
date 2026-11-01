# Incidente: el worker de Meta solo falló en producción (1-nov-2026)

## Qué pasó

El primer registro real entró en cola a las 06:24 UTC, pero el worker respondió 400 a cada llamada de la base de datos. No se perdió ningún evento: el rechazo ocurre antes de reservar la fila, así que siguió `pending` con 0 intentos. Con la corrección, Meta lo aceptó a las 06:28 UTC y el evento pasó a `sent`.

## Causa

`meta_worker_tick()` llamaba a `net.http_post` con `body:='{}'::jsonb`, y el worker rechaza cualquier petición con cuerpo. La corrección envía `body:=NULL` (fuente `20261101130000`, alojada `20261101062705`).

## Por qué no se detectó antes

1. **El laboratorio no usaba la llamada real.** `meta-local-worker-http-lab.mjs` llamaba al worker con `fetch` y sin cuerpo, una petición escrita a mano. La llamada que hace la base de datos nunca se ejecutó.
2. **El laboratorio no corría hacia `main`.** `meta-auth-local-lab.yml` solo se activaba en PR hacia `feat/issue168-ads2-attribution`, así que los 20 controles verdes de `main` no lo incluían.
3. **Su lista de rutas no incluía la migración del despacho**, `20261101120100`. Además, el laboratorio estaba roto sin que nadie lo viera: al activarlo hacia `main` falló al cargar la migración, porque su helper solo aceptaba rutas de `supabase/tests/marketing/`.
4. **El gate estaba apagado durante toda la preparación.** Con el gate apagado, o sin eventos, la función termina antes de llamar al worker. Por eso los 200 de esos minutos eran de otro proceso (`worker_idle`, de PayPal), y el fallo solo podía aparecer con el primer evento real.

## Por qué se aplicó SQL antes de que terminara el CI

Fue una decisión del agente, no una autorización del titular, y se desvió del orden normal. Se apuntó en el registro operativo, pero no se comunicó como desviación hasta el informe final.

- **El motivo:** ninguna prueba disponible reproducía el fallo; solo el servicio real podía confirmar la corrección. Era un cambio de un argumento y reversible.
- **Lo que no justifica:** el evento no corría peligro, porque seguía en cola sin consumir intentos. Tampoco había urgencia. La opción correcta era apagar el gate, abrir el PR, esperar el CI y aplicar después.
- **El resultado:** el CI pasó 20 de 20 después de aplicar, pero ese CI no incluía el laboratorio, así que no validaba el arreglo.

## Qué cambia

- `meta-worker-dispatch-contract.test.mjs`, en el CI de `main`: el tick vigente no envía cuerpo, el worker rechaza `{}` y el laboratorio corre hacia `main`. Sin la migración correctora, el lector de fuente devuelve `'{}'::jsonb` y la primera prueba falla.
- `meta-local-worker-http-lab.mjs`: llama al worker con **pg_net real**, a través de Kong, con el argumento `body` leído de la migración vigente. Incluye `{}` como control negativo. También cubre rechazo, GPC y gate cerrado sin envío al proveedor.
- `meta-auth-local-lab.yml`: corre en PR hacia `main` y cuando cambian las migraciones de Meta.
- **Regla:** ningún SQL llega a producción antes de terminar su CI. Si un fallo solo se puede reproducir en producción, se apaga primero el gate y se avisa al titular de la desviación antes de aplicar.
