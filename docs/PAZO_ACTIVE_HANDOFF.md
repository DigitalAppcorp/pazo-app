# PAZO — HANDOFF VIGENTE | 2026-10-10

**Usar este snapshot como fuente principal.** Las notas históricas anteriores se conservan en Git (versión previa de este archivo, commit `083515358f5577a88cb069b254d11217b217323d`). No confundir evidencia histórica con estado actual.

## Activación del próximo chat
Activa Project Brain OS desde `DigitalAppcorp/project-brain-os`. El Product Owner dirige PAZO y ChatGPT ejecuta/audita técnicamente. Lee `AGENTS.md`, este handoff, `docs/PAZO_MASTER_ROADMAP.md` y `docs/PAZO_MVP_RELEASE_GATES_20261010.md`. **Verifica el HEAD remoto, CI y los bloqueos reales antes de actuar. No reinicies la planificación ni repitas pruebas de módulos ya aprobados.**

## Rama y evidencias verificadas
- Repo: `DigitalAppcorp/pazo-app`; rama RC `release/mvp-beta-fast-track-20261010`. HEAD antes de este handoff: `083515358f5577a88cb069b254d11217b217323d`. `main`: `ae7e63f46bd0150457df9ebb5c73da0aa2edbf90`. Diferencia observada: ahead=185, behind=0, 102 archivos. Tras publicar este handoff, comprobar nuevo HEAD y CI.
- **CI #626 SUCCESS**, `https://github.com/DigitalAppcorp/pazo-app/actions/runs/38067802802`: npm ci, gobernanza, build. Lint es no bloqueante (`continue-on-error: true`); no confundir CI con aceptación visual/runtime.
- PR #35–#38 siguen draft, excepto #34 Lugares abierta/no draft. Evitar merge global de A3/PRs no reconciliados. `main` y despliegue público NO están aprobados; no tocar Vercel manualmente. Los pushes pueden activar previews automáticos de Vercel.
- Local Windows/Codex: working tree y sesiones **desconocidos** desde esta conexión. No asumir commits locales ni credenciales.

## Confirmado por Product Owner
- MVP fast-track, sin reactivar ejecutor de bajas A3 avanzado, features premium, pagos o trabajos cosméticos. PO aceptó pruebas locales de Auth/signup/sesión/mascota/Feed/recuperación, además de Comunidades, Cuidados y Lugares en sus alcances previamente probados. **No repetir QA completa salvo regresión concreta.**
- Operador legal: **Alvarado Solutions LLC**, registrada en **California** según PO. Contacto de soporte/privacidad `appdigital.corp@gmail.com`. No inventar domicilio ni plazos de conservación. Diseño: cero contornos en UI, foco/contraste sin aros.
- Moderador DB autorizado para la cuenta de soporte; asignación ya ejecutada/verificada (no volver a solicitarla). Acceso final de UI moderadora aún no certificado en este bloque.

## Código / privacidad
- `src/features/legal/legalCopy.ts` y `legalCopy.test.mjs` ES/EN **guardados y CI #626 PASS**: GPS solo voluntario y efímero para mapa; check-ins sí persistentes; rescate/avistamientos con contacto; Supabase/Mapbox y PostHog condicional; texto Do Not Track, cambios de política; opción de baja sujeta a habilitación. Inventario `docs/PAZO_DATA_INVENTORY.md` actualizado y matriz `docs/PAZO_MVP_RETENTION_MATRIX_DRAFT_20261010.md` creada.
- **`LEGAL_RELEASE_READY=false`**: borradores, NO políticas definitivas. Falta revisar afirmaciones efectivas sobre retención/terceros/proveedores, fecha efectiva real y cumplimiento proporcional California; no prometer borrado automático, CDN ni backups. El formulario de solicitud de baja en compilaciones públicas sigue OFF por defecto.
- Moderación actual con 1 operador DB, cola/reportes; Edge media purge code-gated OFF y su prueba real de retirada de archivos aún no fue demostrada. No desplegar ni activar purga a ciegas.

## Supabase alojado y Codex — NO INTERFERIR
SELECT-only verificada 2026-10-10 en proyecto `mrybvqdebbgcayuvgkkr`: **7 Auth** (6 originales + 1 QA `appdigital.corp+pazo-baja-qa@gmail.com` ya confirmada), **1 moderador**, **1 mascota existente**, **1 archivo Storage existente**, **0 solicitudes de eliminación**. La QA tiene **0 mascotas, 0 archivos y 0 solicitudes**.
- **El PO ya autorizó crear/eliminar únicamente esa QA y sus datos propios.** Codex creó y confirmó la QA, pero se detuvo por límite de uso; no completó onboarding ni baja. No crear octava cuenta.
- Tarea **reservada exclusivamente a Codex en Windows**: `docs/PAZO_CODEX_PENDING_QA_20261010.md`. Reanudar desde cuenta existente, no desde registro. Usar UI real para solicitud, preflight READ_ONLY, transiciones SQL ADMIN_ONLY únicamente bajo controles, limpieza propia con Storage/Auth Admin oficial, preservar seis UUID originales + moderador. Nunca SQL directo para borrar Auth/Storage; nunca ejecutar transición `completed` antes de validar eliminación real. Codex **no se reanuda automáticamente**; PO debe abrirlo y darle lectura del archivo.
- **No alterar cuentas, mascotas, Storage ni solicitudes mientras Codex tiene esta prueba reservada.** El test E2E de eliminación sigue PENDIENTE; beta pública BLOQUEADA por esa prueba y el cierre legal.

## ÚNICO SIGUIENTE CARRIL INDEPENDIENTE
Revisar **cierre legal/operativo del RC**, trabajando en código y docs ES/EN solo si hay diferencia concreta frente al producto: retención real y proveedores, política/terms, fecha efectiva al publicar, procedimiento de respuesta, etc. Mantener `LEGAL_RELEASE_READY=false` hasta comprobar requisitos. Auditar CI después de cambios; no nuevos módulos, re-test repetitivo, A3, Vercel, merge ni costes. Cuando Codex entregue PASS/FAIL, integrar solo ese resultado y preparar gate de salida/decisión PO.

**Regla de lectura:** este snapshot > banners históricos del roadmap. Fuentes: `docs/PAZO_MVP_RELEASE_GATES_20261010.md`, `docs/PAZO_MVP_MANUAL_DELETION_SOP_20261010.md`, `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md`, `docs/PAZO_CODEX_PENDING_QA_20261010.md`. El texto anterior completo se recupera mediante el historial Git de este archivo.

## Avance independiente posterior (2026-10-10)
- Auditoría documental legal/operativa publicada en `docs/PAZO_MVP_LEGAL_CLOSURE_AUDIT_20261010.md` (commit `8471a504`). Contiene evidencias, brechas y orden de cierre; no modifica código ni datos. `LEGAL_RELEASE_READY=false`.
- HEAD de partida auditado `e497c794`; CI #626 solo se certifica para SHA previo; no se ha confirmado CI del HEAD posterior a este cambio documental. Los estados de Vercel indican límite de builds; NO intervenir. 
- Próximo paso permitido: reconciliación comprobable de términos, retención y proveedores; esperar resultado de Codex únicamente para gate de baja. Todas las exclusiones y decisiones previas siguen vigentes.
