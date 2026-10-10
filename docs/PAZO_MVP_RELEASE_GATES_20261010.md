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
| 2 | **Auth — QA previamente aceptada** | **PASS del PO:** registro + sesión + mascota + Feed (2026-10-08); recuperación por enlace y formulario de nueva contraseña (2026-10-10). No repetir ni reabrir como bloqueo sin regresión demostrada. Código Auth devuelto al baseline aprobado `781069d6`. |
| 3 | **Moderación mínima real** | Denuncia y decisión ya probadas; falta verificar retirada real de medios de **un único objeto nuevo descartable** con seguridad del operador y comprobar URL/origen. Si purga automática está apagada, documentar y usar un flujo supervisado verdadero, sin prometer purga CDN |
| 4 | **Privacidad y salida segura** | Atención manual comprobada con cuenta de test separada; políticas/Terms definitivos (**operador identificado por PO: Alvarado Solutions LLC**; jurisdicción/domicilio legal de contacto, criterios de conservación y proceso real de baja aún pendientes); **contacto público de privacidad confirmado en ES/EN**. `LEGAL_RELEASE_READY=false` hasta que sean reales |
| 5 | **RC y lanzamiento** | QA móvil mínima de cambios nuevos, inventario/limpieza **autorizada** de datos de prueba, gate de merge revisado por PO; **solo después** decidir Vercel y exposición a público externo |

## Lo que NO haremos ahora
No nuevas insignias premium, mensajería real, diseños cosméticos, cambios de Mapa ya aprobado, más tests de splash/feed/cuidados ya aceptados, A3 de 30 tablas/leases/CDN ni cron/servicios pagados. Los controles de datos y privacidad que sí bloquean beta pública no se omiten: se resuelven de forma focalizada.

## Aceptación y colaboración del PO
Solo pedir al PO **una acción cuando sea indispensable**: confirmar jurisdicción/datos legales complementarios de Alvarado Solutions LLC y criterios reales de retención (operador y correo de privacidad ya aprobados); y aprobar por separado una prueba destructiva estrictamente de cuenta/archivo descartables o el merge/producción. No pedir otra aprobación general para continuar auditoría/código seguro. No mezclar un «CI PASS» con «beta lanzada».

**Estado actual:** carril de integración y operación manual preparado; lanzamiento aún **NO aprobado** y eliminación definitiva **NO probada**. La versión avanzada A3 permanece en pausa, preservada en GitHub.

## Corrección de QA Auth — evidencia aceptada, NO RETEST (2026-10-10)

- **Evidencia anterior documentada del PO:** `LOCAL AUTH PASS` (2026-10-08) para registro, creación de mascota, Feed y persistencia tras recarga; **«listo, funcionó»** (2026-10-10) para enlace de recuperación y formulario de nueva contraseña. El PO reiteró que ya había hecho la prueba. Se reconoce como **QA aceptada**; no solicitarla de nuevo.
- El cambio reciente que añadía `emailRedirectTo` y un helper nuevo a `signUp` no estaba motivado por una regresión observada y reabría QA sin necesidad. **Revertido** en esta rama: `AuthContext.tsx`, `signupFlow.ts` y `signupFlow.test.mjs` restaurados desde el baseline de código `781069d6`. La recuperación conserva su lógica que ya fue aprobada. No volver a introducir un cambio en Auth por especulación.
- **Siguiente P0 efectivo:** revisar integración/RC y bloqueos de salida de privacidad (responsable legal, política/retención) y procedimiento manual de baja; usar evidencias de moderación existentes y verificar solo lagunas concretas, no repetir módulos probados.
- Contacto público `appdigital.corp@gmail.com` y **Alvarado Solutions LLC como operador** confirmados por PO; `LEGAL_RELEASE_READY=false` por datos legales complementarios, retención y baja real pendientes, no por Auth. Sin Vercel, `main`, Supabase write ni eliminación de cuentas.

## Identificación del operador del servicio — decisión PO (2026-10-10)

**Operador declarado por el Product Owner:** **Alvarado Solutions LLC**, empresa que el PO indica está registrada. Se incorporó una única constante en `src/features/legal/legalCopy.ts` y la atribución en Privacidad/Términos ES y EN; se añadió prueba anti-regresión. **El PO confirmó California como estado de registro**, sin comprobación independiente en el registro oficial. No inventar domicilio, agente registrado ni datos no aportados; no confundir la cuenta de soporte con la entidad responsable. El correo público autorizado sigue siendo `appdigital.corp@gmail.com`.

**Gate legal restante:** confirmar información legal de contacto exigible, fecha efectiva, retención real y operación de solicitudes de baja; revisión final del texto. `LEGAL_RELEASE_READY=false` hasta entonces. Auth y módulos funcionales ya aprobados NO se reensayan. No tocar Vercel, Supabase ni `main`.
