# PR #104 — correcciones para nueva auditoría

Alcance: [último comentario de revisión, 25 de octubre de 2026](https://github.com/DigitalAppcorp/pazo-app/pull/104#issuecomment-6394513523). Misma rama y PR; sin cambios de producción, merge, despliegue, migración alojada, activación, secretos o pagos reales. La migración F18 sigue **NOT_APPLIED**. La evidencia SQL/browser usa exclusivamente PostgreSQL 17 desechable y datos sintéticos.

## P0 — incidencias preservadas

Se adoptó la alternativa temporal que permite la revisión: retirar `resolve_incidents` por completo del contrato público. El panel muestra las incidencias para revisión; no ofrece una operación que las cierre. La lista permitida del Edge y del RPC de servicio contiene solo las cuatro acciones de pausa/apertura/promoción. El SQL ya no actualiza `gradual_incident.resolved_at`.

`supabase/tests/f18/review-regressions.sql` crea dos incidencias distintas sin resolver; rechaza la operación retirada, su repetición y un actor sin permisos. Compara antes/después todas las filas de incidencias, inbox, recibos firmados, períodos, holds y cortesías; no cambia revisión ni auditoría ante un rechazo. Las incidencias mantienen bloqueada la apertura. `edge.test.mjs` verifica que la operación retirada nunca alcanza el adaptador de servicio, aun con un administrador autenticado y confirmación antigua.

La revisión individual de evidencia permanece pendiente para cualquier incidencia real. No se añadió otro mecanismo de cierre ni una excepción al bloqueo financiero.

## P0 — checkout público independiente de historia canaria

La consulta alojada **solo lectura** de esta ejecución encontró que `gradual_original_checkout_begin` ya incluye `mode='canary'`. Por tanto, no se afirma que el defecto descrito haya sido reproducido en la versión alojada actual. El riesgo de depender de una variante histórica se elimina en la migración F18 aún no instalada: `pazo_f16_live_service_checkout_begin` contiene ahora su propio límite de admisión; solo aplica el rechazo canario cuando el modo es `canary`.

Se conservan el rol de servicio, locks de control y por propietario, merchant/generación, consentimiento publicado, intento original, una sola intención abierta y cobertura pagada. El claim de proveedor, su recuperación y el kernel `pazo_live_intent_begin` permanecen originales.

La regresión modifica **dentro de una transacción local con ROLLBACK** la función histórica para retirar su condición de modo. Primero demuestra el rechazo erróneo de esa variante con un canario anterior reclamado; después admite dos compradores públicos nuevos mediante el límite F18. Comprueba idempotencia del propietario, intento abierto único, generación, consentimiento, permisos y rechazo canario cuando el modo cambia realmente a `canary`. No llama a PayPal.

## P1 — controles por estado y riesgo

El estado administrativo diferencia `checkoutsRequested` de `checkoutsEnabled`: una parada de seguridad puede bloquear cobros efectivos y conservar la necesidad de pausar la solicitud. El servidor comparte el mismo cálculo de bloqueo para presentar la apertura y para ejecutarla: certificado de generación, salud financiera y merchant original validado. Snapshots incompletos o contradictorios no habilitan controles.

La UI presenta solo Pausar o Abrir compras, y solo Pausar o Reanudar invitaciones. La apertura financiera tiene explicación y superficie de riesgo propias; no aparece como acción disponible si falta un prerrequisito. Las cuatro acciones mantienen MFA reciente en servidor, confirmación literal, nonce, auditoría y CAS. Una transición redundante se rechaza; una repetición del nonce correcto conserva su respuesta idempotente. Al terminar se borra la confirmación y se relee el servidor, incluso tras un fallo.

Las pruebas unitarias cubren combinaciones independientes, parada de seguridad y snapshots inválidos. El navegador realiza los cuatro cambios contra RPCs reales del laboratorio, prueba certificado/salud bloqueados y una apertura con revisión obsoleta cambiada por otro administrador. Verifica que falla, no abre cobros y exige nueva lectura/confirmación. Ninguna pausa promocional cambia la pausa financiera.

## P2 — métricas responsivas ES/EN

El resumen usa una columna en pantallas pequeñas, dos desde 560 px y tres en escritorio; los valores mantienen las palabras completas y ajustan su tipografía. La regresión recorre 320, 390, 768 y 1440 px en español e inglés. Comprueba los rectángulos de cada palabra, overflow de tarjetas/documento y ausencia de bordes/contornos visibles. Las capturas de resumen y controles de las ocho combinaciones están en la [galería](review/f18/index.html).

## Reproducción y límites

Ejecutar `npm run verify:prepreview`, `npm run test:f18`, `npm run test:gradual` y `npm run test:f18:pg17`; después `npm run test:f18:browser` con el Vite sintético y Playwright indicados en el [gate](PAZO_F18_PRODUCTION_GATE_20261025.md). El runner SQL incluye automáticamente `review-regressions.sql` después de los gates financieros y antes de la concurrencia. Los workflows existentes ejecutan esos mismos límites en el HEAD del PR.

El [manifiesto](review/f18/SOURCE_MANIFEST.json) se regeneró con bytes Git LF. Cambian el hash SQL y la clausura del Edge administrativo; las clausuras de checkout y worker permanecen iguales. Se debe revisar el manifiesto del nuevo commit antes de cualquier instalación futura. La aprobación visual final y los gates de producción siguen pendientes según el runbook; estas pruebas no certifican pagos Live reales.

| Evidencia local final | Resultado |
|---|---|
| `verify:prepreview` | PASS: governance/guards, 1,195 pruebas financieras sintéticas, TypeScript/Vite y cuatro checks dist/PWA |
| `test:f18` / `test:gradual` | 12 / 68 PASS |
| PostgreSQL 17 | 70 comprobaciones SQL previas + 26 nuevas de revisión; cuatro escenarios concurrentes PASS; ROLLBACK del ensayo y de cada regresión |
| Navegador | 260 comprobaciones PASS; 16 capturas administrativas ES/EN, además de invitación G y oferta |
| Historial | Siete pruebas de integridad/archivo PASS |

SQL SHA-256 revisado: `3dd5fc629bcecb1cfe8bf9ec075576ff5a44fafd984a9566cba87ff5369e9796` (antes `8acf95130be3d44d4ebeec952ddbce9c1d4b77bc30e4cb25cc41efc321b47443`). Clausura del Edge administrativo: `4bdf195ab7e39b7f1f426d1348474d5196d04fcbf63aa508657758a27d34a59e`.
