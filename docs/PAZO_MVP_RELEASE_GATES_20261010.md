# PAZO — único carril de cierre del MVP (10 oct 2026)

**Decisión Product Owner:** «no nos compliquemos ... hay que priorizar la salida del MVP». Se congela F14 A3 avanzado; **no** avanzar borrador por borrador en el ejecutor de eliminación. La app aún no tiene usuarios externos validados. Primero salir a una beta pequeña, segura y medible; después invertir según uso.

## Fuente de este candidato de lanzamiento
- Rama **`release/mvp-beta-fast-track-20261010`** creada desde commit **`781069d6`** del PR #37, **antes de sus 132 commits posteriores de A3 avanzado**. Contiene las integraciones de PR #36/#37, Auth, reportes, moderación, UI legal, intake de eliminación, perfil recuperado y MapView funcional. Se verificó que **no tiene el endpoint `supabase/functions/f14-account-deletion/index.ts` ni `src/features/account/deletionExecutionPlan.ts`**; el Mapa no tiene `PLACES_MAP_DEVELOPMENT_ONLY`.
- **A3 avanzada no se pierde:** permanece en PR #37 y PR #38 sin merge; su código NO es dependencia del candidato RC. No cherry-pick SQL `f14_a3_*`, no instalar jobs ni nuevas migraciones.
- Continúan las decisiones de coste: desarrollo y QA en localhost con Supabase actual; **Vercel no se toca** hasta que exista RC aceptado; no servicios pagos nuevos ni borrado de los 6 usuarios de prueba actuales.

## Bajas de cuenta: MVP proporcional y verificable
- Ya funciona en Supabase la solicitud/estado/cancelación; la UI explica que **pedir la baja no equivale a que ya fue ejecutada**. Conservar tal cual, sin otro módulo automático.
- Operación provisional mediante `docs/PAZO_MVP_MANUAL_DELETION_SOP_20261010.md` y cola privada `supabase/queries/f14_beta_deletion_request_queue_READ_ONLY.sql`. Hay **0 solicitudes** en la inspección del 10 oct 2026. El PO autorizó publicar **appdigital.corp@gmail.com** como contacto de privacidad y soporte; se expone solo como enlace `mailto:` en la app. El UUID Auth del operador, sus credenciales y datos de solicitudes se mantienen privados.
- **No habilitar beta pública** hasta comprobar el cierre manual de **una cuenta nueva descartable** de extremo a extremo, la preservación de terceros y la atención real de la cola. Si hay dependencias/claims complejos, bloquear el caso y atenderlo individualmente; no mentir con `completed` ni borrar Auth primero. Una beta interna limitada puede seguir desarrollándose.

## Prioridades desde ahora (estrictamente en este orden)

| Orden | Gate mínimo | Estado y prueba decisiva |
|---|---|---|
| 1 | **Integración MVP limpia** | Rama RC desde commit pre-A3 creada. Comparar #36/#37/main y comprobar código+Mapa+Auth. **Falta:** CI de la rama RC y revisión del diff antes del merge; no tocar main todavía |
| 2 | **Auth end-to-end** | Alta/confirmación por correo real, sesión, recuperación por enlace real y cambio de clave en localhost; reusar QA ya pasada, probar **solo el enlace y cambio completo pendientes** |
| 3 | **Moderación mínima real** | Denuncia y decisión ya probadas; falta verificar retirada real de medios de **un único objeto nuevo descartable** con seguridad del operador y comprobar URL/origen. Si purga automática está apagada, documentar y usar un flujo supervisado verdadero, sin prometer purga CDN |
| 4 | **Privacidad y salida segura** | Atención manual comprobada con cuenta de test separada; políticas/Terms definitivos (operador legal y retención aún pendientes); **contacto público de privacidad ya confirmado y enlazado en ES/EN**. `LEGAL_RELEASE_READY=false` hasta que sean reales |
| 5 | **RC y lanzamiento** | QA móvil mínima de cambios nuevos, inventario/limpieza **autorizada** de datos de prueba, gate de merge revisado por PO; **solo después** decidir Vercel y exposición a público externo |

## Lo que NO haremos ahora
No nuevas insignias premium, mensajería real, diseños cosméticos, cambios de Mapa ya aprobado, más tests de splash/feed/cuidados ya aceptados, A3 de 30 tablas/leases/CDN ni cron/servicios pagados. Los controles de datos y privacidad que sí bloquean beta pública no se omiten: se resuelven de forma focalizada.

## Aceptación y colaboración del PO
Solo pedir al PO **una acción cuando sea indispensable**: probar el correo real de confirmación/recuperación y dar el resultado; confirmar identidad del responsable legal y criterios reales de retención (el correo de privacidad ya está aprobado); y aprobar por separado una prueba destructiva estrictamente de cuenta/archivo descartables o el merge/producción. No pedir otra aprobación general para continuar auditoría/código seguro. No mezclar un «CI PASS» con «beta lanzada».

**Estado actual:** carril de integración y operación manual preparado; lanzamiento aún **NO aprobado** y eliminación definitiva **NO probada**. La versión avanzada A3 permanece en pausa, preservada en GitHub.
