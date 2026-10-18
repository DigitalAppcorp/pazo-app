# PAZO F16 — Correcciones del PO a la primera revisión visual (2026-10-18)

## Feedback aprobado y fuente de escala
PO corrigió explícitamente la interpretación tipográfica: el error era **tipografía demasiado pequeña**, no títulos demasiado grandes. Código base de PAZO en `HomeView.tsx`: nombre de autor de post `16px`, metadatos `12px`; `PublicProfileView.tsx` emplea `17px` en títulos menores y `16px` en bio. Se elevaron textos subescalados del área Amigo de PAZO, muro, fondos, guardado, hero y tabs para recuperar legibilidad **sin inventar un segundo sistema tipográfico**, conservando jerarquía móvil.

## Cambios codificados, solo rama PR #44 Draft
- `SupporterBenefitsHome.tsx`, `SupporterWallConsentSettings.tsx`, `SupporterThemePreviewPanel.tsx`, `SupporterThemeSaveControl.tsx`, `SupporterProfileThemes.tsx`, `GratitudeWallScene.tsx`: reemplazo de microtipografía 10px->12px, 11px->13px, 12/13px->14px, 14px->16px donde aplica. Revisar visualmente en dispositivo real (evitar que labels 14px desborden).
- `GratitudeWallScene.tsx`: el muro público deja de ser lista de tarjetas altas y muestra **rejilla móvil de dos columnas**, imágenes redondas e insignias ancladas, nombre legible 16px; se ven más mascotas sin tener que desplazarse tanto. Orden `Todos/Recientes/Más tiempo apoyando` conserva criterio real de RPC, sin buscador ni elementos falsos. Cabecera más compacta y área de información más ligera. RPC pública, consentimiento y fuente 48 elementos no cambiaron.
- `HomeView.tsx` y `PublicProfileView.tsx`: mini-insignia oficial de PAZO ahora en esquina inferior derecha del **avatar de la mascota que creó el post**, 20px y absolute; no ocupa columna del nombre ni mueve chip `Sugerencia`. Conservar las insignias grandes/otros niveles de perfil; esta corrección solo afecta post headers. `SupporterBadge.tsx` acepta size=`mini` y carga icono pequeño con eager/sync para evitar retraso adicional por carga lazy. **La verificación de derecho sigue siendo obligatoria**: no prometer aparición instantánea hasta recibir la RPC; nada de badges simulados.
- `HomeView.tsx`: la consulta `pazo_supporter_public_badges_batch` ya no se cancela por cada render disparado por like/save/comment, al usar una firma estable de mascotas visibles en lugar de depender de todo `posts` y `verifiedFeedBadges`. Mantiene refresh revalidado cada minuto y al volver a la pestaña, fail-closed en errores.
- `PublicProfileView.tsx`: los motivos artísticos del perfil PAZO **original** se renderizan solo si el perfil NO tiene fondo personalizado verificado. El fondo de `SupporterProfileBackdrop` ocupa su propia capa sin mezclar huellas/rayos del fondo original.
- `SupporterBenefitsHome.tsx`: la tarjeta de hitos explica que PAZO agradece el apoyo continuado y entrega reconocimientos tras 3, 6 y 12 meses **pagados y verificados**, no tabla de "Pendiente". Las 3 cifras proceden del contrato anterior, no se adelantan fechas/hitos.

## Restricciones y gates
- No se tocaron PayPal Sandbox/Live, funciones Edge, SQL, periodos, grants, contabilidad, ni `main`; ninguna transacción fue iniciada. Sin instalaciones de paquetes.
- Regresión estructural añadida en `f16SupporterProductExperience.test.mjs` para respetar ubicación overlay, firma de consultas, escala base, rejilla, ilustraciones exclusivas y copy de agradecimiento. Las pruebas automáticas aún requieren último CI/PG17 PASS antes del siguiente Vite QA.
- El PO debe comprobar capturas de las 6 correcciones **en Vite local**: tamaño legible, 2+ mascotas por fila en muro, velocidad perceptible de badge (dependiente RPC), chip Sugerencia intacto, arte base oculto en perfil custom y hitos explicativos. No confundir build PASS con aceptación visual.
- Restricción permanente `AGENTS.md`: cero contornos de tarjetas, botones, foco, solo campos de texto justificados; QA mantiene estilos preexistentes.

## CI de código verificado
La última ejecución **funcional** del commit `97a6d5d3b776e05ccf9efe748e7164b48720aa34` concluyó **7/7 SUCCESS**: CI con `tsc -b` + Vite build, pruebas de interfaz y seis laboratorios PostgreSQL F16. La primera ejecución detectó una aserción de copy del muro y la siguiente detectó una llave JSX faltante en `PublicProfileView`; ambas fueron corregidas antes del PASS final. **No reemplaza QA visual** con el PO.

**Gate:** `F16_PO_TYPOGRAPHY_AND_FIVE_VISUAL_CORRECTIONS_CODE_7_OF_7_PASS_VITE_PO_REVIEW_PENDING`.
