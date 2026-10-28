# PAZO — aprendizaje visual histórico F13

Registro documental específico de **PAZO** para Design Intelligence OS v0.6. No modifica pantallas, funcionalidades, estilos, permisos ni servicios. No sustituye AGENTS, el roadmap o las aprobaciones canónicas; no convierte decisiones de 2026 en permisos actuales.

## Fuente y lectura

- [feedback.jsonl](feedback.jsonl): 28 eventos compactos, 37 aspectos, esquema1. Fecha de decisión según documento; cada evento incluye superficie, componente, etapa, feedback resumido, resultado y fuente con SHA/línea.
- [sources.json](sources.json): fuentes inmutables y blobs; base histórica PR #44 HEAD `716ebcc081a1d54ecc4579860bee6f4ced3e47ed`.
- Dos documentos primarios: [changeset F13](../PAZO_F13_VISUAL_CHANGESET_20261012.md), [gate admin](../PAZO_ADMIN_VISUAL_FIDELITY_GATE_20261018.md). Los enlaces de cada evento fijan la versión histórica, aunque estas rutas locales evolucionen.
- [Comentario humano de PR44](https://github.com/DigitalAppcorp/pazo-app/pull/44#issuecomment-6258307113): referencia admin elegida, primera captura rechazada, segunda pasada pendiente. Los otros cinco comentarios son bots y no confieren aceptación visual.

Las fechas12/13/18oct son las declaradas en las fuentes. Algunos commits tienen fecha distinta por zona horaria; no se usó su orden para inventar aprobación. PR44 está actualmente merged; sus documentos describen checkpoints draft históricos. El merge/publicación no transforma sus gates visuales pendientes en PASS.

## Interpretación y límites

`APPROVED`, `REJECTED`, `CORRECTED`, `PARTIAL`, `UNVERIFIED` se refieren **a la etapa y aspecto del evento**, no al producto entero. `REFERENCE` aprobada es dirección elegida; `IMPLEMENTATION` solo se aprueba cuando existe feedback del resultado. `AUTHORIZATION` registra límites históricos sin conceder permisos actuales y aporta peso0. `DOCUMENTED_PO` indica que se leyó el reporte histórico de la decisión, no que se recuperó el chat original.

Capturas1–21 y mockups originales de F13 no recuperados. Las imágenes administrativas referidas en ChatGPT Library son `/Panel de Control PAZO en Tiempo Real (1)(1).png` (variante `(1).png`) y `/image(20261019-014820).png`; no hay herramienta de archivos Library accesible en esta sesión. No se reconstruyeron ni se sustituyeron por capturas F17/F18. `artifact_status=UNAVAILABLE` conserva esta incertidumbre, sin inventar aceptación ni exigir reelegir referencias ya elegidas.

Cobertura selectiva, no auditoría exhaustiva del PR ni de todas las conversaciones. Se incluyen tipografía, espaciado, paleta/contraste pendiente de medición, glass/tarjetas, navegación inferior, Feed, Perfil, comunidades, lugares, administración y modales. No hay mediciones actuales WCAG ni prueba real de PAZO.

Aprendizajes principales:

- Feed: menú de tres puntos validado y Seguir sólido rechazado en la misma revisión; variante transparente documentada como aprobada posteriormente.
- Perfil: Seguir sólido y Opción4 sin portada son decisiones propias; no heredan el rechazo del Feed. Dos renders rechazados por fidelidad y tercera reconstrucción todavía no verificada en la muestra.
- Tipografía: no premiar el aumento general+3px por CI; correcciones locales y métricas sobredimensionadas conservan su contexto.
- Lugares: la congelación del12oct queda sustituida **explícitamente** por Opción3 del13oct. El motor oculta el aspecto sustituido y conserva su historia; esto no autoriza nuevos cambios de mapa hoy.
- Navegación inferior: preservación expresamente fuera del alcance del aviso Cerca; sin captura o aceptación estética original localizada. No inventar una aprobación de diseño del dock ni una prohibición permanente.
- Admin: referencia clara/rica elegida, primera entrega rechazada por escala y composición; segunda pasada con CI sigue `UNVERIFIED`. Los datos del mockup no son datos reales.

## Recuperar y seguir aprendiendo

La utilidad reusable vive en Brain OS, no se instala ni copia dentro de la app. Cargar la rama v0.6 de `knowledge/ui-ux-frontend/SKILL.md` y su `ADAPTIVE_LEARNING.md`; ruta de continuación `feat/design-learning-v06-20261026`, derivada de PR8. No asumir que esté en main o activada globalmente.

```powershell
python -X utf8 -B C:/work/brain-os/knowledge/ui-ux-frontend/scripts/learning.py query --store C:/work/pazo/docs/design-learning/feedback.jsonl --product pazo --screen feed --component follow-button --as-of 2026-10-26
python -X utf8 -B C:/work/brain-os/knowledge/ui-ux-frontend/scripts/learning.py query --store C:/work/pazo/docs/design-learning/feedback.jsonl --product pazo --screen profile --component follow-button --as-of 2026-10-26
python -X utf8 -B C:/work/brain-os/knowledge/ui-ux-frontend/scripts/learning.py audit --store C:/work/pazo/docs/design-learning/feedback.jsonl --product pazo --as-of 2026-10-26
```

Reemplazar rutas y fecha por las reales. Nombres canónicos iniciales de pantallas: `feed`, `profile`, `onboarding`, `messages`, `notifications`, `communities`, `community-detail`, `places`, `admin`, `global`. Componentes relevantes están en el ledger; usar el mismo identificador al registrar/consultar. No recurrir a búsquedas aproximadas que mezclen ámbitos. Patrones generales `*` solo representan identidad documentada de PAZO.

El agente extrae aspectos del feedback habitual del PO y los registra en la etapa correcta, sin formulario nuevo. Antes del siguiente diseño consulta el ledger, contrasta reglas vigentes y conserva el flujo de preview/aprobación. Correcciones de atribución se revierten mediante evento de retractación; nuevas decisiones pueden sustituir aspectos concretos. El historial no reescribe la política general del OS. No se ejecuta un monitor de fondo ni existe aprendizaje si el agente no carga esta habilidad.

No se solicita reaprobación de las decisiones históricas documentadas. Las aceptaciones de implementación ausentes siguen como límite del registro; no hay orden de volver a diseñar o probar esas pantallas.

## Verificación

Ledger cargado por la utilidad real; Feed devuelve transparente, Perfil sólido, otro producto no devuelve decisiones PAZO, y Lugares recupera Opción3 sin congelación activa. Recuperación en procesos nuevos y auditoría de errores recurrentes sin conectar la app. Los pesos son prioridades heurísticas internas, no probabilidades ni entrenamiento neuronal.

La rama de PAZO contiene exclusivamente este directorio documental. Sin cambios de src, estilos, package/dependencias, tests de app, workflows, main o servicios. Utilidad y comprobaciones sintéticas se revisan en el PR separado de Brain OS.

## Índice de decisiones

| ID | Superficie / componente | Etapa | Decisión | Fuente |
| --- | --- | --- | --- | --- |
| f13-identity | * / * | REFERENCE | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L9) |
| f13-type-scale | * / typography | IMPLEMENTATION | UNVERIFIED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L19) |
| f13-feed-selector | feed / filter-selector | IMPLEMENTATION | CORRECTED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L15) |
| f13-profile-metrics | profile / metrics | IMPLEMENTATION | PARTIAL | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L21) |
| f13-feed-orbs | feed / ambient-background | IMPLEMENTATION | REJECTED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L28) |
| f13-heading-labels | * / section-heading | REFERENCE | REJECTED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L14) |
| f13-glass | * / glass-surface | IMPLEMENTATION | UNVERIFIED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L24) |
| f13-species | onboarding / species-selector | IMPLEMENTATION | PARTIAL | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L40) |
| f13-onboarding-privacy | onboarding / privacy-step | REFERENCE | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L45) |
| f13-feed-mixed | feed / post-header | IMPLEMENTATION | PARTIAL | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L64) |
| f13-feed-follow | feed / follow-button | REFERENCE | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L90) |
| f13-profile-reference | profile / layout | REFERENCE | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L71) |
| f13-profile-follow | profile / follow-button | REFERENCE | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L71) |
| f13-profile-first-rejected | profile / layout | IMPLEMENTATION | REJECTED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L86) |
| f13-profile-second-rejected | profile / layout | IMPLEMENTATION | REJECTED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L97) |
| f13-profile-third | profile / layout | IMPLEMENTATION | UNVERIFIED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L98) |
| f13-messaging | messages / coming-soon-modal | REFERENCE | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L106) |
| f13-notifications | notifications / modal | REFERENCE | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L115) |
| f13-nearby | feed / nearby-notice | REFERENCE | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L126) |
| f13-bottom-nav | global / bottom-navigation | AUTHORIZATION | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L124) |
| f13-bottom-nav-render | global / bottom-navigation | IMPLEMENTATION | UNVERIFIED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L124) |
| f13-communities-empty | communities / empty-state | REFERENCE | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L133) |
| f13-community-detail | community-detail / hero | REFERENCE | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L141) |
| f13-places-freeze | places / layout | AUTHORIZATION | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L10) |
| f13-places-option3 | places / layout | REFERENCE | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_F13_VISUAL_CHANGESET_20261012.md#L164) |
| f13-admin-reference | admin / dashboard | REFERENCE | APPROVED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_ADMIN_VISUAL_FIDELITY_GATE_20261018.md#L7) |
| f13-admin-first-rejected | admin / dashboard | IMPLEMENTATION | REJECTED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_ADMIN_VISUAL_FIDELITY_GATE_20261018.md#L17) |
| f13-admin-second | admin / dashboard | IMPLEMENTATION | UNVERIFIED | [registro](https://github.com/DigitalAppcorp/pazo-app/blob/716ebcc081a1d54ecc4579860bee6f4ced3e47ed/docs/PAZO_ADMIN_VISUAL_FIDELITY_GATE_20261018.md#L27) |
