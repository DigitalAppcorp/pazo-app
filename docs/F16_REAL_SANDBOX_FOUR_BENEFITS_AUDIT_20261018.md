# PAZO F16 — Auditoría real de cuatro beneficios en Sandbox
**Fecha:** 2026-10-18. **Ámbito:** revisión READ ONLY de código PR #44, RPC/tables hosted y pestaña PAZO local abierta. **No** es cierre E2E visual del Product Owner ni GO Live.

## Estado verificado en hosted Supabase
- Existe **1 período QA Sandbox verificado**, importe **USD 2.99**, inicio 2026-10-18, fin **2026-11-18 10:00 UTC**, sin holds al momento de esta consulta.
- La proyección server-side `supporter_private.f16_sandbox_qa_projection` devuelve `active=true`, `completedCycles=0`. La cuenta con el período pagado tiene **2 mascotas**, y **las 2** devuelven `badge=true,milestone=0` desde `pazo_supporter_public_pet_benefits`. También `pazo_supporter_public_badges_batch` devuelve las 2, ambas con insignia y sin medalla 3/6/12.
- Una consulta hipotética `projection(..., service_end+1 segundo)` da `active=false,completedCycles=1`. No mutó fechas ni almacenó nada.
- **0 fondos guardados** en `f16_sandbox_qa_pet_themes`, **0 permisos** en `wall_consents`, **0 mascotas en el muro público**, **0 publicaciones** entre las 2 mascotas del titular pagado. Estas ausencias indican QA pendiente, no fallo demostrado.
- Las tablas privadas relevantes tienen RLS y FORCE RLS; anon/authenticated no pueden SELECT directos. Las RPC públicas de lectura de beneficios, batch y muro permiten lectura derivada; RPC de cambio de fondo y opt-in/out son autenticadas. El SQL server verifica dueño, periodo, consentimiento y holds; `wall_has_verified_entitlement` no es invocable directamente por roles públicos.
- Las cuatro imágenes oficiales `public/supporter/amigo-pazo-{inicio,3-meses,6-meses,12-meses}.png` existen en la rama.
- No ejecutar nuevas compras ni cancelar antes del ensayo visual de los beneficios.

## Frontend: código integrado, QA visual incompleto
- `useSupporterMembershipStatus.ts` obtiene mascotas propias y consulta `pazo_supporter_public_pet_benefits`; `SupporterAccountManagement.tsx` devuelve `SupporterBenefitsHome` para una membresía comprobada.
- El acceso a estos beneficios y el rendering en `HomeView`, `PublicProfileView`, `GratitudeWallPreview` y `SupporterThemePreviewPanel` está sujeto al **flag de compilación** `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED=true`. Es independiente de `VITE_PAZO_F16_SANDBOX_QA_UI=true`. El valor en `.env.local` y el build Vite ejecutado por el PO no se verificaron; sin flag, el frontend oculta beneficios aunque la cobertura pagada exista.
- `PublicProfileView.tsx` dibuja insignia sobre el avatar y fondo derivado de RPC; `HomeView.tsx` lee la RPC batch y dibuja la **mini-insignia junto al nombre** del autor, **no superpuesta al avatar**, distinta del lugar originalmente aprobado. También en publicaciones del perfil público se sitúa junto al nombre. Revisión UI requerida.
- `SupporterThemePreviewPanel` incluye los 5 fondos + original, y `SupporterThemeSaveControl` escribe mediante `pazo_supporter_set_pet_theme` con post-verificación; **no se ha probado ningún guardado real con la cuenta pagadora**.
- `SupporterWallConsentSettings` permite consentimiento granular y retiro, con relectura; `GratitudeWallLive` consulta `pazo_supporter_public_wall`, `OnboardingView` presenta entrada pública mediante `GratitudeWallPreview`. **No se ha probado un opt-in/out real** ni actualización en visitante anónimo.
- **Problema de navegación identificado:** ruta directa `#/account/supporter` renderiza `<SupporterAccountManagement ... />` en `App.tsx` sin prop `pet`; entonces `SupporterBenefitsHome` deshabilita su botón `Personalizar perfil`. La ruta `Mi mascota` desde `PetView` sí pasa `pet={currentPet}`. Necesita decisión de flujo/selección de mascota para la entrada directa.
- En `SandboxV2AccountPanel`, tras confirmar pago, `paidThrough` se actualiza pero el texto `approval_not_payment` continúa mostrándose. Es un defecto de estados UI separado de la conciliación financiera.
- La pestaña local PAZO accesible en modo lectura mostraba la **cuenta del intento anterior bloqueado**, distinta del titular del período pagado. Para la QA visual hay que iniciar sesión con el **titular real del pago**, sin confundirlo con el correo originalmente propuesto. No almacenar email, IDs personales, sesiones ni payloads en GitHub.

## Estado por beneficio
1. **Insignia:** RPC y fuente real PASS para 2 mascotas; imágenes instaladas y renderizado condicionado a flag. QA visual perfil/publicaciones PENDIENTE. Ubicación mini-insignia del Feed difiere de diseño aprobado.
2. **Cinco fondos:** definición visual, controles y RPC de persistencia ya están programados e instalados. 0 preferencias reales guardadas; prueba de persistencia/propietario/publicación PENDIENTE.
3. **Muro:** permiso individual/retirada y consulta pública conectados a SQL real. 0 permisos y 0 filas públicas; flujo E2E y cuenta visitante PENDIENTES.
4. **Medallas 3/6/12:** lógica server-side y pruebas offline presentes; período actual no suma hito (correcto). Los umbrales requieren probar 3/6/12 con escenarios sintéticos controlados, **sin adelantar registros alojados ni forzar pagos reales**.

## Criterios restantes antes del GO Live
- QA visual real sobre **la cuenta pagadora** con flag local de beneficios activado, Vite reiniciado y página recargada. Abrir `Mi mascota -> Amigo de PAZO` para entrar con `pet` hasta corregir la ruta directa.
- Comprobar insignias en perfiles, publicar una prueba con autorización PO para verificar Feed y cerrar defecto de posición en avatar.
- Guardar y restablecer un fondo, recargar, abrir perfil público y comprobar que otra cuenta no puede modificarlo.
- Dar opt-in a una mascota y confirmar mural público desde sesión visitante; revocar y confirmar retirada.
- Probar cancelación de futuras renovaciones **después** de beneficios, persistencia durante período pagado, expiración, renovaciones, reembolsos/disputas y no elegibilidad de cuenta gratuita. Las cancelaciones/escenarios no se efectuaron en esta auditoría.
- Confirmar que el frontend no promociona períodos verificados indebidamente, corregir mensaje de pago obsoleto y retorno PayPal a Vercel protegido.
- **NO habilitar Live** ni publicar beneficios públicos antes de E2E, revisión visual del PO y gates de producción independientes.

**Resultado:** `F16_QA_VERIFIED_PERIOD_BENEFIT_BACKEND_REAL_UI_FLAG_AND_E2E_PENDING_LIVE_NO_GO`.
