# PAZO — F14 A2: reconciliación de alcance y cierre

**Checkpoint:** 2026-10-09 UTC. **Estado general:** `EN CURSO`; PR #35 `DRAFT`, ninguna fusión con `main`. Este documento solo registra evidencia, no sustituye una aprobación pendiente ni autoriza A3/A4.

## Contrato de producto aprobado que gobierna A2

- F14 Gate 5/6/7: moderación humana mínima para denuncias de Feed post/comentario, perfil de mascota y Comunidad post/comentario. Privacidad D1: contenido público legítimo permanece visible anónimamente; moderado/retirado debe restringirse en API.
- D3-A (CERRADA): además de despublicar, verificar eliminación en origen activo y Storage cuando proceda; distinguir origen, URL pública/CDN/navegador, backups y proveedores. **No reducir silenciosamente a moderación manual.**
- D3-B: matriz operativa aprobada de diseño (30 días para determinadas eliminaciones activas; 90/180 días para reportes según resolución, etc.), pero implementación pertenece A4 y requiere prueba; no se permite prometer cumplimiento en producción ni iniciar A4 aquí.

## Matriz Gate 8: evidencia real, sin extrapolaciones

| Requisito de A2 | Estado | Evidencia / restricción |
|---|---|---|
| Denunciar por sesión Auth y límites de rol | PARCIAL VALIDADO | Preview real `spam` de Feed, cierre `dismiss`; SQL/RPC permisos simulados y QA de navegador dos cuentas 6/6 PASS; matriz de todos los cinco objetivos con sesión real no completada |
| Cola de moderación y autoridad independiente | VALIDADO EN CASOS PROBADOS | Cuenta moderadora real y denegación de cuenta normal en Preview; no equivale a todas las combinaciones de API o prueba HTTP sin UI |
| Despublicar contenido y registrar decisión | VALIDADO EN CASO SIN MEDIO | PO retiró post de prueba de texto, SQL para lectura anon/auth confirmó exclusión; otras clases/medios requieren verificación si forman parte del DoD |
| Clasificación de medios de publicaciones | SQL VALIDADO | Migración `20261009010551`: caso sin foto no genera tarea; perfiles y casos con foto conservadores |
| Revisión visual de medios | **PO VISUAL PASS** | Captura 2026-10-09 de Preview `a650dd8`: mensajes de revisión, estado vacío, botón de refresco y ausencia de botón destructor. No se probó ejecutar refresco ni listar casos reales |
| Auth real 2 cuentas y Storage sintético | PASS GATES AISLADOS | QA Auth normal/moderadora 6/6 PASS; prueba Storage de un píxel subida/localizada/eliminada y ausencia confirmada, sin medios de moderación |
| Protección de rutas retenidas `held` | SQL VALIDADO | `20261009040957`, `20261009054411` y `20261009055801`: RLS para inserción, update, delete y copia de origen; `service_role` fuera de RLS y HTTP concurrente no probado |
| Confirmación de purga | PROTEGIDA, NO IMPLEMENTADA | `20261009055955` deshabilita RPC antigua; `20261009061213` bloquea `media_status='purged'` no certificado. Edge `f14-moderation-purge` HTTP 503 |
| Eliminación física de medio moderado, exclusividad y origen exacto | **BLOQUEANTE** | No existe borrado condicional activo / garantía de exclusión entre DB, Storage HTTP y operaciones privilegiadas; no eliminar fotos reales para simular PASS |
| CDN, URL pública y caché del navegador | **BLOQUEANTE** | Ocultar fila API no revoca URL pública; no se certificó invalidez de CDN/cliente. Purga manual CDN depende del plan; no autorizar cargos |
| Retención D3-B y terceros | PENDIENTE A4 | Metas documentadas, configuración real de proveedores y rotación/restauración sin verificar; no iniciar implementación A4 dentro de A2 |
| Code + CI | PASS para SHA visual | GitHub Actions `37892849139` SUCCESS en `a650dd8`; Preview Vercel `dpl_6iFoQUQ9QVYi8JBzR2FDWKtmmnRE` READY mismo SHA. Los commits documentales posteriores requieren su propio check |
| Release | NO AUTORIZADO | PR #35 es DRAFT; `main`, Vercel Production y F14 A3/A4 intactos |

## Siguiente gate real de ingeniería

1. Preservar el estado **fail-closed**: contenido moderado retirado de API, archivos en revisión manual; Edge 503; ningún estado `purged` sin verificación.
2. Diseñar y demostrar mecanismo serializado para escritores con privilegios (`service_role`) y operaciones Storage en vuelo, con enlace inmutable `claim_id + bucket/path + object_id/version + report_id`. Si la API disponible no permite una comprobación y eliminación condicionada al objeto actual, **no habilitar borrado automático**. Cualquier experimento debe ser aislado, sin medios de usuarios ni registros ajenos.
3. Conservar la separación de evidencias: CI PASS ≠ Preview visual PASS ≠ prueba de medio retirado/CDN ≠ retención. No solicitar repetición de pantallas ya aprobadas.
4. Si el Product Owner desea pasar a beta con revisión manual sin eliminación física probada, necesita **modificar expresamente D3-A** y revisar el riesgo de URLs públicas. El alcance actual ya fue aprobado, por lo que no asumir ese cambio ni marcar A2 como completado.
5. No iniciar A3/A4, `main` merge, Vercel Production, nuevos proveedores/pagos, ni borrar contenido real hasta sus gates.

**Principio:** preferir un gate abierto verificable a un PASS engañoso que pueda destruir contenido o exponer datos.


### Actualización: selector de versión exacta por API, QA pendiente

La referencia vigente del cliente Storage documenta `remove([{path,versionId}])` para versión exacta tanto actual como archivada. Esto abre una alternativa a borrado por ruta, **pero no prueba por sí solo atomicidad, operaciones HTTP en vuelo ni CDN**. La suite pura `exactVersionPreflight.test.mjs` está incorporada a CI; un test de UI Preview con archivo artificial `F14VersionProbe` está versionado, todavía sin evidencia visual ni ejecución autenticada del PO. El elemento de eliminación física/CDN sigue bloqueante hasta validar versión real y exclusión de escritores privilegiados.
