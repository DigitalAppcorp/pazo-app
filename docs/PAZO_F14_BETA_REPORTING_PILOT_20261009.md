# F14 beta reporting integration | 2026-10-09

**Alcance:** Rama revisable basada en PR #36, sin fusionar ni desplegar. Se reutiliza backend F14 hospedado existente; sin SQL, migraciones, cambios de Storage ni activación de purge.

## Contratos existentes observados
- RPCs alojadas: `f14_submit_report` (auth required, cinco objetivos), `f14_is_moderator` (grants privados), `f14_moderation_queue`, `f14_review_report` y `f14_pending_media`.
- Advertencia `rls_disabled` en cuatro tablas del esquema privado. Comprobado: roles `anon`/`authenticated` sin USAGE del esquema ni SELECT/INSERT de esas tablas. Es un hallazgo para seguir revisando, **no acceso directo demostrado**. No habilitar RLS indiscriminadamente.
- `f14_content_visible` consulta estado eliminado sin listar datos privados. No es prueba exhaustiva de todas las rutas HTTP.

## Integración de frontend
- Acciones Denunciar para post y comentario de Feed, perfil de mascota, post y comentario de Comunidad; solo usuarios Auth reales, no demo.
- Se trae componente de reporte ya validado en F14, con feedback de denuncia pendiente y rate-limit.
- Cola de moderación y vista de medios pendientes disponibles solo si RPC servidor confirma moderator; sin controles para borrar Storage.
- Respetar identidad PAZO, cero contornos incluso en foco. Preservar Feed, comentarios, Mapbox, autenticación del PR #36.

## Estado del gate
- **D3-A no terminado:** despublicación de DB no garantiza revocación de URL pública/CDN/Storage. Edge `f14-moderation-purge` continúa fallando cerrado 503.
- **A3/A4 no terminadas:** cuenta/mascota, archivos, retención y políticas públicas. No prometer eliminación completa ni dar beta pública aún.
- CI solo demuestra build/tests. Se requiere QA real de cinco objetivos, moderador/no moderador y prueba de borrado físico separada con autorización específica. No usar datos de usuarios reales para ensayo.
- PR #35 permanece pausado; PR #34 regula alternativa pública de Lugares y exige reconciliación explícita. No fusionar por inercia.

### Refinamiento QA de interfaz

La cola de medios utiliza ahora un diálogo Portal responsivo con cierre Escape y control de foco; antes era `absolute` y podía quedar recortada dentro del perfil. La cola continúa **solo lectura**: no es un camino oculto para borrar Storage/CDN.

El PR está dirigido temporalmente a `main` solo para activar el CI existente, que no se ejecuta en PRs cuyo base sea otra rama. **No está autorizado el merge**; la dependencia PR #36 debe integrarse primero, luego volver a conciliar el diff.

## Aceptación visual PO de denuncias — 2026-10-09

- **Entorno:** Antigravity, frontend local de PR #37 en commit `b184a66`; Supabase hospedado de PAZO. El PO confirmó el SHA, encontró «Denunciar perfil» de mascota ajena y después respondió «listo» a una única ronda de revisión de las **cinco opciones**: Feed post, Feed comment, pet profile, Community post y Community comment, verificando apertura de formulario.
- **Resultado:** UI/visibilidad del formulario por usuario real **PASS reportado por PO**; no se recibieron capturas detalladas de cada variante y NO consta pulsación de «Enviar denuncia», persistencia de denuncia ni recepción/decisión de moderador. No marcar Gate 8 completo.
- **Siguiente gate:** prueba real de creación, deduplicación y cola de moderación con contenido **descartable de otra cuenta de prueba controlada** y cuenta moderadora con grant legítimo, sin enviar reportes sobre usuarios ajenos. Completar negativo: usuario normal no ve/puede invocar cola moderadora. Registrar resultados, sin editar DB, nunca borrar medios reales.
- **Bloqueadores de beta:** D3-A Storage/CDN; A3 cierre/eliminación de cuenta con terceros; A4 retención/privacidad; correo real Auth; integración PR #36/37/34 sin regresión de Mapa y entrega de release.
