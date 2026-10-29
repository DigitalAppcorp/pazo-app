# Candidato — Administración visual y confiabilidad #161

> Registro histórico del candidato. Publicado después del GO explícito del PO: ver [acta de producción](PRODUCTION_RELEASE_20261029.md) y [mapping instalado](PRODUCTION_RELEASE.json). No reinstalar las migraciones preparadas.

Estado: listo para revisión, sin lanzamiento ni migraciones hospedadas. [Acta de cierre, staging y CI](CLOSURE_20261029.md). Base funcional: `ee10cd98`; integrada la documentación posterior de `main` en `4973c4a1` sin modificar su contenido audiovisual. Las evidencias son sintéticas salvo las consultas expresamente identificadas como baseline de producción.

## Implementado

Resumen y Comportamiento muestran KPIs, segmentos, embudo proporcional, tendencia, movimientos entre pantallas, último paso observado, herramientas de recurrentes y creatividades con denominadores. Los insights usan lenguaje simple; cifras exactas, metodología e informes anteriores quedan en detalles desplegables. Móvil dispone de navegación nativa por todas las secciones. No se modifica `App.tsx`, Auth, los eventos/vocabulario, las reglas comerciales ni las operaciones financieras. #161 añade una exclusión local explícita para los envíos opcionales existentes, sin ampliar recopilación. El nuevo control está en «Mi actividad en los informes».

La lectura de agregados se prepara para una sesión normal de administrador, sin pedir autenticador adicional. No se desinscriben factores ni se cambia el acceso sensible de PayPal. La política del backend sigue exigiendo rol administrador: ocultar el desafío en la interfaz no sustituye la autorización. Dos migraciones preparadas y probadas realizan el cambio de política y añaden la proyección de lectura.

Cada petición tiene vigencia propia, cancelación y comprobación de alcance. La secuencia A → Ads → A se prueba ignorando deliberadamente la cancelación: una respuesta vieja de 1.280 solicitudes no sustituye la nueva de 1.290. Cambio de cuenta, pérdida de permisos y cierre de sesión limpian los datos. Un fallo de red mantiene únicamente datos de la misma consulta y permite reintentar.

## Corrección prioritaria #161

[Auditoría causal y límites](ISSUE161_AUDIT.md). Producción confirmó 44 **solicitudes** etiquetadas, ninguna adquisición atribuida y dos solicitudes anónimas de acceso. El código emite `login_attempt` al enviar el formulario, antes del resultado. No se encontró atribución SQL de esas señales a Meta: no hay identidad o UTM en ese agregado y no se puede reconstruir quién lo originó.

Se corrigieron las etiquetas ES/EN y el vínculo solicitud→cuenta permanece «sin vínculo comprobable». La preferencia guarda solo un booleano local, continúa tras logout, se puede revocar e invalida solicitudes pendientes por vigencia. Los administradores identificados ya estaban excluidos por la elegibilidad del backend; ahora pueden evitar también los envíos anónimos desde su navegador. No se borra historia ni se intenta correlacionarla retroactivamente. Los registros operativos pueden seguir alimentando los informes conforme a sus reglas existentes; el control no promete detener procesamiento servidor.

## Verificación local

| Comprobación | Resultado |
| --- | --- |
| TypeScript y build de producción | PASS |
| ESLint en todos los archivos TypeScript modificados/nuevos | PASS |
| Gobernanza existente | PASS: 776 pruebas Node, además de controles estáticos de hardening, arquitectura, privacidad, PWA y ausencia de emojis nuevos |
| Contrato y validación de la proyección en cliente | PASS: 32 pruebas |
| PostgreSQL 17: baseline comportamiento / inteligencia | PASS: 64 / 69 comprobaciones |
| Permisos, AAL1/AAL2, roles, rollback y preservación de funciones sensibles | PASS: 24 comprobaciones |
| Proyección real, ventanas, segmentos, creatividades, supresión, secuencia y futuro | PASS: 73 comprobaciones |
| Navegador del nuevo panel | PASS: 97 comprobaciones, ES/EN y cinco contextos de 320/390/1440 px |
| Regresión del informe previo de comportamiento | PASS: 152 comprobaciones / 48 casos |
| Regresión del informe previo de inteligencia | PASS: 206 comprobaciones / 36 casos |
| #161: preferencia, concurrencia, GPC, storage y atribución legítima | PASS: 17 pruebas nuevas, más 66 regresiones de módulos modificados |
| #161: SQL causal, roles, universos separados, muestras y retención | PASS: 22 comprobaciones adicionales; todas las fixtures revertidas |
| #161: aplicación/formulario reales → Edge → PG aislado | PASS: 49 comprobaciones, ES390/1440 y EN390; anuncios, Demo, logout/login, revocación y cero conversiones falsas |
| Invariantes frente a la base publicada | PASS: 916 archivos protegidos; controlador nativo de Administración sin cambios fuera de su JSX |
| Contrato histórico de inteligencia | PASS: 535 archivos y 643 controles históricos; delta administrativo excluido explícitamente |

La suite de navegador comprueba red interrumpida, reintento, cohortes protegidas, falta de permisos, pausa, cifras grandes, A → B → A con respuesta tardía y cambio de sesiones. Auth y transporte son dobles controlados; la agregación SQL, componentes React, navegación, tipografía y tratamiento de estados son reales. Esto no demuestra una sesión humana de producción ni un nuevo benchmark de rendimiento.

El lint global también se ejecutó: reporta deuda en archivos publicados ajenos al cambio (por ejemplo `App.tsx` y funciones PayPal). Se corrigió el aviso nuevo de carga sin desactivar reglas: el estado pendiente se deriva de la identidad de la petición. El lint focalizado del candidato pasa; no se presenta el lint global como verde.

## Evidencia visual

[Escritorio](evidence/es-1440-summary.png), [recorridos y creatividades](evidence/es-1440-journeys.png), [móvil](evidence/es-390-summary.png), [cohorte protegida](evidence/es-390-protected.png), [permiso denegado](evidence/es-390-access.png), [inglés](evidence/en-390-summary.png), [exclusión ES](evidence/issue161-es-exclusion.png), [exclusión EN](evidence/issue161-en-exclusion.png).

[Resultados de navegador](evidence/browser.json), [permisos SQL](evidence/access-pg17.json), [proyección SQL](evidence/projection-pg17.json), [invariantes](evidence/contract.json). Ver [revisión de diseño](DESIGN_REVIEW.md) para decisiones y crítica interna.

## Privacidad y exactitud

Se reutilizan sesiones, eventos, atribución y señales existentes. No se devuelven identificadores de usuarios, mascotas, sesiones o direcciones. Se conservan la ventana de retención y cohortes mínimas de diez, con comprobación conservadora de complementos entre ventanas, orígenes, creatividades y recurrentes. Las familias inseguras se suprimen; no se rellenan con ceros. Las consultas no escriben ni cambian flags.

Orgánico no se presenta como medido. Solicitudes de anuncios no son visitantes únicos. Última pantalla no demuestra abandono; recurrente no significa retención D7; tasas por creatividad no prueban causalidad o rentabilidad. Esta cobertura puede dejar gráficos sin cifras con poblaciones pequeñas: es una limitación analítica deliberada.

El recorrido #161 se ejecuta en un origen con apariencia oficial **totalmente interceptado** antes de navegar. Solo el proveedor de challenge, Auth y datos de dominio son dobles; los handlers Edge y el SQL de medición son reales en el laboratorio. [Resultados del recorrido](evidence/issue161-browser.json) y [SQL causal](evidence/issue161-pg17.json).

## Producción y lanzamiento

Baseline leído el 29-oct-2026 a las 09:48 UTC: 135 migraciones; gates de comportamiento/inteligencia activos y saludables; cron de retención #4 exitoso a las 06:17 UTC después del SQL publicado de #153. No se cambiaron flags, fechas de inicio, funciones hospedadas o alias de producción.

El nuevo RPC no existe en producción hasta el GO. Por ello el staging interactivo usa PostgreSQL aislado y Auth de QA; el preview hospedado se verifica con transporte controlado. Las migraciones están [preparadas con hashes](PREPARED_MIGRATIONS.json); su instalación y la publicación final requieren el GO del Product Owner y el [runbook](RELEASE_RUNBOOK.md).

Recomendación: revisar este candidato como conjunto visual y funcional. La comprobación con sesiones reales AAL1 y usuarios ordinarios pertenece al smoke de lanzamiento posterior al GO; no se afirma realizada en producción durante staging.
