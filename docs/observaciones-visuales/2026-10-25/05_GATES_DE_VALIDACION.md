# 05 — Gates, pruebas de aceptación y plan para recomposición controlada

> **Documento de criterio, no orden de ejecución.** No activar pagos, pruebas en producción con efectos secundarios, creación de cuentas/contenidos ni modificaciones hasta autorización independiente.

## Gate A — línea base y evidencias
- Fijar referencia `main@a01b5686`, documento DIR de cada vista, visualización ES/EN, usuario/rol, presencia de datos/empty states, historial de decisiones.
- Comparar baseline con PR #106 **solo cuando haya un entorno aislado autorizado**. La rama R1 no es producción. No deducir lo que muestra el dispositivo a partir de un commit.
- Verificar que `git diff --name-only` del informe contenga **únicamente** `docs/observaciones-visuales/2026-10-25/`. No abrir PR de fixes mezclado con este informe.
- Identificar el mínimo de representaciones de cada pantalla: vacía, con datos, cargando, error, sin permiso, recuperación y acción completada cuando proceda.

## Gate B — matriz visual y responsive
| Viewport | Orientación/caso | Obligatorio |
| --- | --- | --- |
| 320×568 | pequeño iPhone / EN con texto largo | Sin controles esenciales irrecuperables ni overflow lateral |
| 360×800 | Android pequeño | Barra inferior/tarjetas/menús sin colisiones |
| 390×844 | móvil medio, ES | Títulos, CTA y formularios completos o scroll evidente |
| 430×932 | móvil grande | Layout centrado, densidad y espacio, estados |
| 768×1024 | tablet | marco app sin falsas expansiones; admin sí adaptativo |
| 1440×900 | desktop | PWA mobile-first intencional, admin desktop no forzado a 430px |
| Zoom 200% / texto ampliado | móvil y desktop | Texto refluye, sin pérdida de información/función |
| Reduced motion | PWA principal y G | Ningún texto/CTA oculto o dependiente de animación |
| Sin mapa / red lenta | Lugares | Estado y alternativa funcional explicable |
| Datos largos / ES-EN | Todos los módulos | No truncar nombres de controles/estado críticos |

**Capturar** el mismo contenido/estado/zoom/idioma antes y después, no dos diseños en estados diferentes. Etiquetar y archivar screenshot con SHA, navegador, fecha, estado y viewport. Respetar el control de PII: usar fixtures sintéticos sin datos reales.

## Gate C — accesibilidad verificable, por tarea
1. Navegar solo con **Tab, Shift+Tab, Enter, Space, Escape y flechas** donde el patrón las exija. Para cada overlay: foco al abrir, no fuga a fondo, retorno al cerrar, sin pérdida de contexto. Si no se reproduce, `NOT_TESTED`.
2. Inspeccionar **nombre, rol, valor y etiqueta computados** de todos los inputs, selects, comentarios, menús, foto, formularios de alerta y pago. No basta con que haya un `<label>` cerca.
3. **Contraste**: texto normal ≥4.5:1, grande ≥3:1; esencial no textual ≥3:1 cuando 1.4.11 aplica. Informar HTML/CSS/estado/captura y excepciones, no una puntuación agregada inventada.
4. **Targets**: 2.5.8 ≥24×24 CSS px o excepción por separación/norma. Usar hitbox real, no solo tamaño del icono. Objetivo interno preferido 44×44 para CTAs principales táctiles cuando encaje.
5. **Estados anunciables**: carga, errores, validación, votos de interés, guardado de cuidados, alerta pérdida, confirmación de pago y soporte. Probar con tecnologías asistivas representativas. Evitar `aria-live` ruidoso.
6. Mantener «cero contornos decorativos» sin dejar foco imperceptible. Indicador por relleno/color/subrayado/sombra conforme al contraste y sin confundirlo con hover/selección.
7. Comprobar scroll y viewport de modales en 320px, especialmente con teclado virtual y safe-area.

## Gate D — pruebas por journey, con prioridad
| Journey / casos | Riesgo | Resultado esperado | Evidencia que falta |
| --- | --- | --- | --- |
| J01 Bienvenida → registro → confirmar correo → mascota | S3 | Texto legible, foto teclado, labels, estado de cuenta inequívoco | Capturas 3 tamaños; lector; retorno |
| J02 Iniciar sesión → errores → recuperación | S3 | Errores anunciados, foco y traducción | Teclado/AT |
| J03 Feed → abrir comentarios → escribir → enviar | S2 | Label, feedback, no pérdida de texto, optimista reversible | Runtime seguro |
| J04 Comunidades → detalle vs Unirme | S3 | Unirme y navegación no se disparan juntos | Tab/Enter/Space |
| J05 Crear comunidad → añadir portada → guardar | S3 | Foto teclado, form accesible, validaciones y recuperación | QA aislado |
| J06 Crear post → foto → ubicación opt-in | S3 | Consentimiento ubicación/no foto falsa, guardado confiable | QA aislado |
| J07 Lugares → categoría → tarjeta → pin → detalle | S3 | Mapa estándar, foco/scroll, tarjeta no hace check-in por accidente | Dispositivo/mapa real |
| J08 Lugares → cómo llegar | S2 | Abre mapa predeterminado con destino correcto | iOS/Android |
| J09 Mi mascota → editar datos/foto → guardar | S3 | Labels/picker y estado persistido | QA aislado |
| J10 Cuidados → guardar → completar / recordarme | S3 | Acción sobre todo el campo si así fue aprobada, estado inmediato y próximo recordatorio | QA aislado |
| J11 Documentos → seleccionar → subir → abrir/eliminar | S3 | CTA de archivo teclado, error recuperable, no pérdida por UI | QA aislado |
| J12 Perdida → revisión → activar → compartir → avistamiento | S3 | Precisión, urgencia, privacidad y estado de confirmación | Solo ambiente autorizado |
| J13 QR público → reportar avistamiento | S3 | Funciona sin login, etiqueta campos, bilingüe y privacidad | QA/URLs sintéticas |
| J14 Invitación G → «Ahora no» / opt-out | S2 | Sin cobro, no reaparición indebida, accesibilidad scroll | Fixture seguro |
| J15 Invitación → conocer oferta | S2 | Transición correcta, precio/contrato claros | Navegador sin pagar |
| J16 Contrato/consentimiento PayPal | S3 | No habilitar checkout sin consentimiento, estados robustos, no ejecutar cobros en auditoría | Inspección QA/documental |
| J17 Regreso de PayPal → pendiente/éxito/cancelado | S3 | Mensajes acordes a estado verdadero, sin duplicar compras | Simulación autorizada, no live real |
| J18 Muro de agradecimiento → consentir/revocar | S3 | Solo aparece mascota autorizada + cuenta elegible | QA privado |
| J19 Panel admin móvil → detectar incidencia | S2 | Estado prioritario localizable, navegación clara y MFA conservada | 320/390 con fixture |
| J20 Panel admin desktop → finanzas Live/Sandbox | S3 | Separación de datos y semántica de «Actualizar» inequívoca | Fixture controlado |
| J21 Soporte → mensaje → admin reply | S2 | Historia y privacidad correctas, notas internas jamás públicas | QA sintético |
| J22 Moderación y mantenimiento | S3 | Roles, confirmación, foco, bloqueos y emergencia accesibles | Solo QA autorizado |

## Gate E — revisión de contenido y fronteras
- Por cada frase visible: ¿**quién** la lee, **qué** necesita hacer y **por qué aquí**? No convertir objetivos del PO ni lógica RPC/PayPal/Storage en marketing.
- Distinguir contenido técnico necesario **en administración** de jerga innecesaria **en producto público**.
- No ocultar renovación, precio, consentimiento ni estados de riesgo para embellecer.
- No inventar comunidad, testimonios, métricas, fotos de establecimientos o beneficios por ausencia de datos.
- Cada «Próximamente»/fake door debe identificar honestamente el estado y ofrecer salida; no crear promesa de funcionalidad actual.
- Revisar todo en ES/EN, no solo los headings.

## Gate F — verificación de no regresión y aceptación del Product Owner
| Paso | Prueba | Quién decide |
| --- | --- | --- |
| F1 | Baseline y lista de invariantes por pantalla | Diseño + PO |
| F2 | Cambio puntual sobre rama nueva sin DB ni funcionalidad adicional | Ejecutor autorizado |
| F3 | CI/build/tests unitarios PASS con logs enlazados | Ingeniería |
| F4 | Pantallas antes/después con iguales viewport/datos, EN/ES | Evaluador independiente |
| F5 | Tab/lector de pantalla/contraste y data integrity | Accesibilidad + QA |
| F6 | Diferencias aprobadas, resultados de pruebas y riesgos | PO |
| F7 | Merge/producción explícitamente autorizados como gate posterior | PO |

## Riesgos de la recomposición que no se deben subestimar
- **Eliminar el margin global cambia TODAS las vistas** con `h1-h6, p, label`; puede mejorar unas y ampliar espacios en otras. No marcar R1 PASS solo porque el CSS parece razonable.
- **No cambiar la escala @theme global junto al margen global** antes de medir cada pantalla: dos grandes fuentes de variación no permiten aislar causa.
- **No sustituir UI funcional por una imagen que «se ve mejor»** si no respeta estados, teclado, permisos, rendimiento y contenido real.
- **No confundir una prueba sintética de checkout con venta real.** La auditoría no ejecuta pagos ni activa beneficio.
- **No convertir todas las pantallas en un mismo template**: onboarding, mapa, Feed, emergencia y administración deben compartir identidad, no necesariamente composición.

## Criterio de cierre de esta auditoría
Aprobación documental = expedientes y fuentes revisables, **no** certificación integral UI. La auditoría de cada pantalla quedará completamente cerrada solo al adjuntar pruebas **renderizadas y de interacción** por fila del [inventario](02_INVENTARIO_DE_PANTALLAS.md), asociadas al SHA de código, con fallos S3 corregidos y revisados en un PR separado. Las filas sin visualización permanecen **NOT_TESTED**.

**Prohibición operativa:** este gate no concede permiso para mutar código, PR #106, SQL, PayPal, Vercel ni `main`.
