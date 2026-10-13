# PAZO — ACTIVE HANDOFF | Snapshot operativo 2026-10-13

> **LEER PRIMERO.** Este es el estado operativo, no una cronología. Historial integral anterior preservado en Git en commit `61eb2fd2` (versión previa de este archivo), y alcance visual F13 en `docs/PAZO_F13_VISUAL_CHANGESET_20261012.md`. AI = ejecutor técnico principal; usuario = Product Owner. Seguir reglas de `AGENTS.md` y Project Brain OS canónico v1.4.1 en `DigitalAppcorp/project-brain-os`.

## 1. Estado remoto verificable y fuente de verdad

- Repositorio: `DigitalAppcorp/pazo-app`. Rama de trabajo: `f13/section-titles-20261012`. **HEAD inspeccionado antes de actualizar este snapshot:** `61eb2fd2fbf140719a015d6c7c975eedb3a9df91`; **reconsultar al activar** porque los commits de handoff avanzan HEAD.
- PR **#44 DRAFT**, abierto y sin merge: https://github.com/DigitalAppcorp/pazo-app/pull/44. Base `release/mvp-beta-fast-track-20261010` (`f5f47b8ef10b38d89b4c4abb97320b24df0840a9` cuando se consultó). `main` observado `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`. **No interpretar draft como release.**
- CI del HEAD `61eb2fd2`: **SUCCESS** en run `38476868129` https://github.com/DigitalAppcorp/pazo-app/actions/runs/38476868129. CI del commit de preview `32551f5e`: **SUCCESS** run `38476612061`. Nuevos commits requieren verificación independiente. CI no sustituye aceptación visual real.
- PAZO del PO en Windows PowerShell: clon `$env:USERPROFILE\PAZO-F13-preview`; Vite `http://localhost:5173/`. Estado Git local y sesión actual: **NO OBSERVADOS**. Antes de dar `git pull --ff-only`, pedir `git status --short` y solo hacer pull si está limpio. No `reset --hard` ni copiar secretos. No usar Vercel para QA ni fusionar el PR sin gate.
- El módulo que se está trabajando ahora es **F16 «Amigo de PAZO»**, aún **BACKLOG / prototipos + infraestructura parcial**, sin cobros ni membresías activas. La F13 UX/UI sigue abierta en paralelo; no darla por completada.

## Gate visual F16 — APROBADO por Product Owner (2026-10-13)

El PO inspeccionó el preview local de consentimiento individual por mascota en PAZO y respondió «Sí, está excelente». Se registra aceptación visual de ese flujo únicamente. El copy ES/EN ya estaba aprobado y **no se pide otra aprobación**. La validación no equivale a prueba legal, consentimiento persistido, entitlement ni autorización de pagos. La UI permanece simulada y sin guardar, PR #44 DRAFT, sin merge. La revisión técnica CI del HEAD anterior f5bf5a661fc50fa68b4a2723f7b1ddeac88dd79f fue SUCCESS (run 38478119445); cualquier commit documental posterior requiere CI propia.

**Siguiente gate F16:** documentar/definir el acceso de lectura al muro para usuarios autenticados sin invadir Explorar ni rediseñar A01; después atender retención/legal y procesador con autorización específica. No implementar pagos, API pública, activación de wall consent, ni SQL sin gate separado. La aceptación visual actual no amplía esos permisos.

## 2. Gate histórico ya cerrado: aceptación visual del consentimiento por mascota

**Texto y apariencia del preview: APROBADOS por el PO el 2026-10-13.**

- PO aprobó el copy ES/EN de `docs/PAZO_F16_CONSENT_COPY_BILLING_VERIFICATION_GATE_20261013.md` con «aprobado». No volver a pedir aprobación del contenido ni confundirla con validación visual o aprobación legal/Terms.
- Implementado en `src/features/supporter/components/GratitudeParticipationPreview.tsx` en commit `32551f5e` y documentado en `61eb2fd2`. Ruta en Vite autenticado: **Mi mascota → Menú y Utilidades → Amigo de PAZO → Participar en el muro**.
- Cada mascota real del usuario muestra foto/nombre. Se abre un panel individual con aviso ES/EN ANTES de la acción, que explica: nombre/foto pública/insignia, lectura del muro incluso SIN cuenta, ausencia de nombre personal/email/datos de pago, retirada revocable y límites de copias/capturas de terceros. Acciones **«Autorizar a [mascota] · Simulación»**, **«Ahora no»** y **«Quitar del muro · Simulación»**. Múltiples mascotas independientes, opción inicial desactivada, cerrar/reabrir borra selección.
- **Estado solo React en memoria**: NO hay `supabase`, fetch ni localStorage en el componente, NO se guarda consentimiento, NO hay participantes reales ni permisos de publicación. UI debe seguir etiquetada «Vista previa / Sin guardar cambios». Tests ES/EN, independencia por mascota, rechazo y retirada, remount y vacío: PASS en CI citado.
- **Gate cerrado**: PO confirmó «Sí, está excelente» tras probar el preview local. No reabrir este gate ni habilitar backend a partir de esa aprobación.

## 3. Decisiones F16 ya cerradas (NO reinterpretar)

- **Membresía voluntaria** llamada «Amigo de PAZO», **USD 2.99 mensuales**, NO anual por ahora. El núcleo de seguridad, rescate y social de PAZO sigue gratuito; pitch y checkout aún OFF.
- Cuatro beneficios aprobados: (1) insignia Amigo de PAZO en perfil y miniinsignia en posts, únicamente con entitlement real; (2) cinco estilos cosméticos de perfil (**Clásico PAZO, Naturaleza, Corazones, Cielo estrellado, Aventura**), con preview funcional, adornos suaves y contraste revisado, PO dijo que le encantan; (3) muro público «Gracias, Amigos de PAZO», opt-in por mascota revocable; (4) insignias conmemorativas de **3, 6, 12 meses pagados acumulados** sin jerarquía.
- Muro: **cuadrícula de 2 columnas** con filtros `Todos / Recientes / Más tiempo apoyando`, sin miembros inventados, identidad social **solo mascotas (PET-ONLY)**. Cada card eventual: foto pública, nombre real e insignia confirmada; nunca nombre humano ni @usuario inventado ni historia de pagos expuesta.
- Descubrimiento público desde **Bienvenida A01 → pequeño enlace «Conoce a los Amigos de PAZO»**, incluso sin login. **PO probó y aprobó visualmente** esa ubicación. Se retiró del buscador Explorar por invasiva. Gestión privada simulada desde Mi mascota. El acceso de lectura para quien ya inició sesión **todavía se debe decidir**, sin volver a invadir Explorar.
- **El PO quiere rediseñar toda la bienvenida A01 a futuro, pero expresamente la POSPUSO** para no interrumpir F16. No modificar texto, botones, imagen, navegación ni enlace aprobado hasta reactivar ese rediseño con nuevo gate visual.
- Reglas de consentimiento aprobadas por PO: permiso separado por mascota, inicialmente OFF, visto por visitantes no registrados, retirada reversible cuando el servidor confirme; cancelar renovación mantiene participación solo mientras cobertura pagada real sea vigente; vencimiento, impago/reembolso que invalide período, baja/moderación o titularidad distinta excluyen; reactivación requiere nueva confirmación. Documento: `docs/PAZO_SUPPORTER_WALL_CONSENT_POLICY_PROPOSAL_20261013.md` (título histórico «propuesta», **contenido aprobado como política de producto**, no autorización de pagos).

## 4. Supabase: hechos alojados, permisos y prohibiciones

- Proyecto: `mrybvqdebbgcayuvgkkr`. Migración F16 **YA APLICADA**, NO repetir: `20261013215221_f16_supporter_wall_consents_foundation.sql` / nombre `f16_supporter_wall_consents_foundation`. Última consulta READ ONLY 2026-10-13 confirmó: `supporter_private.wall_consents` **0 filas**, RLS habilitada y FORZADA, `anon` sin RPC status, `wall_has_verified_entitlement(NULL)=false` — **bloqueo de cualquier autorización positiva real**. El esquema privado existe, pero la UI aún no lo usa. No confundir con el antiguo archivo borrador eliminado.
- No existe lista pública de mascotas pagadoras; no se aprobó plan/checkout, webhook de PayPal, ledger real, ni badges reales. Jamás usar `profiles.paypal_subscription_id`, `is_founder` o callback navegador para acreditar pago. Solo cobros verificados server-side y permisos por mascota podrán dar elegibilidad, después de **autorización técnica nueva**. Riesgo conocido de lectura pública de algunos campos legacy de perfiles: revisar antes de cualquier API público.
- Migración comunidades **YA APLICADA**: `20261013025451_community_join_owner_notifications.sql`; no repetir. Notifica al propietario por una nueva adhesión real, excluyendo autoalta del dueño; validación transaccional/RLS pasada; QA visual de segundo actor pendiente cuando corresponda.
- F14 moderación/borrado de cuentas mantiene SOP supervisado y gates separados. No ejecutar pruebas destructivas con cuentas existentes ni marcar baja completada sin operador y verificación.
- Texto de consentimiento ES/EN aprobado **para producto/preview**, todavía faltan revisión legal de términos, **retención de datos**, arquitectura server-side y selección del procesador. PayPal es solo **candidato**; API de suscripciones y eventos verificados no equivalen a cobro confirmado. Comparar tarifas reales para USD 2.99 antes de alta de plan; no crear recursos pagados. Ver `docs/PAZO_F16_CONSENT_COPY_BILLING_VERIFICATION_GATE_20261013.md` y `docs/PAZO_DATA_INVENTORY.md`.

## 5. Otros gates F13 abiertos, sin interferir con F16

- F13 mapa inmersivo **Opción 3**: pantalla del módulo cubierta por Mapbox sin caja, degradados difuminados, búsqueda/filtros flotantes arriba, lugares reales en carrusel horizontal abajo; pines 2D/3D existentes. PO dio feedback positivo y solicitó que **tarjeta únicamente centre el mapa** y **pin/3D abra el panel con animación**. Código y CI previos PASS; la aceptación final en runtime para ese ajuste está pendiente. Ver `docs/PAZO_F13_VISUAL_CHANGESET_20261012.md` y la versión histórica del handoff en `61eb2fd2`. No pedir que el PO rediseñe/apruebe otra vez lo ya elegido.
- Otros diseños F13 aprobados/implementados parciales: navegación Liquid, pestañas perfil, alertas/rescate, Comunidades/avisos y Cuenta y datos bajo engranaje. No reintroducir orbes en Feed ni pastillas decorativas de encabezados rechazadas.
- Regla permanente PAZO: **sin contornos/bordes/focus rings/strokes/shadows que dibujen línea** en superficies y botones; usar cambio de superficie/contraste para foco. Mantener paleta y Quicksand. No prometer estado de sesiones locales no observadas.
- Los detalles de fases F13/F14/F16 y cambios anteriores viven en roadmap y documentos específicos; no copiar toda la cronología al chat.

## 6. Límites de autorización y modo de trabajo

El Product Owner dirige UX/negocio, autoriza gates; ChatGPT audita, programa, versiona, prueba y documenta con herramientas conectadas, sin delegar automáticamente a Gemini/Codex. Una autorización reversible de preview no es permiso para crear planes, activar cobros, desplegar a Vercel, fusionar a RC/main, alterar datos de usuarios, modificar RLS más allá de gate o destruir contenido. Un CI PASS no equivale a aprobación visual. Documentar solo lo verificado. Pushing puede activar CI/integraciones automáticas.

## Activación exacta para el próximo chat

«Activa Project Brain OS v1.4.1 desde `DigitalAppcorp/project-brain-os`. Soy Product Owner de PAZO. Abre el repo `DigitalAppcorp/pazo-app`, rama `f13/section-titles-20261012`, PR #44 DRAFT. Lee `AGENTS.md`, `docs/PAZO_ACTIVE_HANDOFF.md`, roadmap, consentimiento F16 y documentación visual. Audita **HEAD remoto, CI y Supabase en solo lectura**. Continúa **desde el gate visual pendiente del consentimiento individual ES/EN de Amigo de PAZO** en Vite; no repitas lo ya aprobado, no actives cobros ni apliques nuevas migraciones ni toques el rediseño diferido de Bienvenida A01. Implementa tú los ajustes autorizados y mantiene el handoff verificable».