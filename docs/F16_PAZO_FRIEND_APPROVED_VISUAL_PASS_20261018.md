# PAZO F16 — Visual pass aprobado: Amigo de PAZO
**Fecha:** 2026-10-18. **PO:** aprobó expresamente las 3 propuestas visuales (inicio de beneficios, personalizar perfil y muro). Implementación realizada únicamente en `f13/section-titles-20261012` / PR #44 DRAFT; aún **sin aprobación visual del código renderizado por el PO**, sin merge ni Live.

## Contrato visual preservado
- Identidad actual: verde PAZO `#204E4A`, amarillo `#E1E53F`, crema `#FAF8F5`, superficies suaves, tipografía y trazos internos de iconos; **cero contornos** de controles (incluyendo foco), contraste por fondos, sombras suaves de elevación, móvil primero, scroll horizontal claro para fondos.
- **Pantalla principal miembro:** hero `Ya eres Amigo de PAZO` y badge autenticado (no estado de PayPal `ACTIVE` sin período); cuatro acciones visibles: insignia, cinco fondos, muro, medallas; estado de hitos completados 3/6/12 derivado del servidor; tarjeta `Mi membresía`. Herramientas de prueba QA están en un acordeón de segundo nivel, no en el inicio.
- **Personalizar perfil:** encabezado limpio, acción `Volver a beneficios`, tarjeta que muestra foto/nombre/especie/raza/bio reales de mascota, fondos sobre el perfil con preview en tiempo real, selector 6 opciones (Original + 5 aprobadas) en scroll horizontal, botón principal `Guardar cambios` y selección `Elegir fondo original`. La escritura original `pazo_supporter_set_pet_theme` mantiene comprobaciones previas owner/entitlement y postflight; no hay escritura al seleccionar un fondo.
- **Muro de agradecimiento:** encabezado humano `Ellos también son parte de PAZO`, tarjetas por mascota real con foto/nombre/estado, consentimiento explícito en confirmación detallada `Sí, autorizar` o `Ahora no`, `Retirar del muro` y acceso **read-only al muro público real** mediante `GratitudeWallLive`. RPC `pazo_wall_consent_enable` y `...disable`, relectura `pazo_wall_my_consents` y `verified===allow` permanecen inalteradas. No opt-in automático ni inscripción por el mero pago.
- No introducir imágenes de muestra de mascota como datos reales en las vistas de producción.
- Cuenta gratuita conserva oferta por 2.99 USD y cuenta pagada abre administración/beneficios mediante proyección server-side existente.

## Alcance de código modificado
- `src/features/supporter/components/SupporterBenefitsHome.tsx`
- `src/features/supporter/components/SupporterThemePreviewPanel.tsx`
- `src/features/supporter/components/SupporterProfileThemes.tsx` (selector visual, sin cambiar IDs ni fondos)
- `src/features/supporter/components/SupporterThemeSaveControl.tsx` (solo presentación/copy)
- `src/features/supporter/components/SupporterWallConsentSettings.tsx` (solo presentación y acceso a muro público)
- `src/features/supporter/testing/f16SupporterProductExperience.test.mjs` (nuevas aserciones de estructura y no reintroducción de contornos)

## Limitaciones verificadas
- **La fecha de cobertura no se escribió en el hero:** el contrato actual de lectura de estado `useSupporterMembershipStatus` devuelve `kind,milestone`, no `paidThrough`. No se debe hardcodear `18/11/2026`, leer registros de otra cuenta ni inventar fecha en UI. El período real se presenta hoy en `Mi membresía`/Sandbox y requiere gate posterior si el PO exige visualización también en el hero.
- `Mi membresía` sigue utilizando la pantalla operativa Sandbox V2 existente dentro de detalles; solo se movió detrás del acordeón `Herramientas de prueba Sandbox`. No se alteró la cancelación y no se probó esa acción.
- `GratitudeWallLive` solo lee la RPC pública y, si no hay mascotas participantes, presenta el estado vacío real. QA E2E de consentimiento/retirada sigue pendiente.
- El "Visual PASS" se refiere solo al **diseño textual previamente aprobado**. No hay aprobación del PO para el resultado en Vite, y el diseño exacto debe revisarse con capturas. El compilador y pruebas de workflow no sustituyen esa revisión.
- Ninguna migración, Edge deploy, credencial PayPal, período pagado, renovación, Live, `main` ni PR merge fue modificado por este visual pass.

**Siguiente paso:** tras CI PASS, PO actualiza su clon local (revisar `git status --short`, `git pull --ff-only` si limpio), reinicia Vite QA y valida el hero, scroll de fondos, guardado, opt-in/out y muro público. Nunca cobrar de nuevo solo para validar el diseño.

**Gate:** `F16_APPROVED_VISUAL_PASS_BRANCH_CODE_CI_PENDING_OWNER_SCREENSHOTS_REQUIRED_LIVE_OFF`.
