# PAZO — Direcciones visuales para primera invitación a Amigo de PAZO
**Fecha:** 24-oct-2026 · **Estado:** `DESIGN_OPTIONS_PRESENTED / PO_SELECTION_PENDING / NO_UI_COMMITTED`.
**Documento rector de UX y lógica:** [Amigo de PAZO Live público: invitaciones inteligentes](PAZO_SUPPORTER_PUBLIC_LIVE_INVITATIONS_UX_20261024.md).

## Invariantes de todas las opciones
- Primera invitación a pantalla completa **una sola vez por cuenta/campaña**, disparada tras uso significativo, en momento no crítico, sin solicitud a PayPal obligatoria antes de mostrar.
- No es pantalla de cobro: CTA principal **«Conocer Amigo de PAZO»** abre misma oferta de `Mi mascota`; no crea suscripción, no acepta condiciones ni concede beneficios. La pantalla de oferta sí muestra términos exactos antes de un checkout voluntario.
- Precio **US$2.99 al mes**, renovación explícita y que PAZO básico sigue siendo gratis. Dos salidas: **X** accesible y **«Ahora no, seguir usando PAZO»**, ambas no equivalen a opt-out irrevocable.
- Persistir primera impresión de manera autoritativa; tras 14 días, solo una segunda notificación in-app; nunca otra pantalla. Opt-out expreso si el usuario así lo pide.
- Respeta sistema PAZO: verde `#204E4A`, blanco/crema `#F5F5ED`, acento `#E1E53F`, tarjetas suaves SIN CONTORNOS decorativos, tipografía jerarquizada, mínimo de texto y sin dark patterns.
- Sin contenido falso de mascotas. Animación opcional mínima, accesibilidad `prefers-reduced-motion`, safe area móvil, teclado, voz, cierre claro; lectura ES/EN.
- No duplicar el gran bloque de condiciones y consentimiento en el primer contacto: pertenecen a la oferta / checkout.

## A — Medalla PAZO protagonista (fuerte continuidad de marca)
**Composición móvil:** fondo crema, close X discreto arriba derecha; insignia/medalla 3D oficial ocupando centro alto; título `Gracias por ser parte de PAZO`; subtítulo `Tu apoyo nos ayuda a seguir creando un mejor espacio para ti y tu mascota`; precio US$2.99/mes en un pequeño chip; botón principal verde `Conocer Amigo de PAZO` y `Ahora no`. Vista previa de 4 beneficios con pictogramas pequeños solo si entran cómodamente, evitar densidad.

**Ventajas:** aspiracional, consistente con oferta ya creada, arte reconocible, menor carga cognitiva. **Riesgo:** parecer una venta inmediatamente después de dar las gracias; texto debe priorizar voluntariedad. **Ideal:** primer contacto de invitación ligera para comunidad joven.

## B — Mascota como protagonista (personalización emocional real)
**Composición:** la foto REAL de una mascota del usuario, o avatar verificable, pequeña dentro de marco suave o hero con capas; texto `Qué bueno verte de nuevo por PAZO`; breve agradecimiento del uso; el mismo US$2.99/mes y CTA, con salida clara. Nunca fotos genéricas no reconocidas; si múltiples mascotas, no prometer que la membresía aplica solo a esa mascota.

**Ventajas:** relevante para usuarios que han creado QR o publicaciones, conexión emocional. **Riesgos:** falta foto, foto de mascota perdida/emergencia, privacidad y rechazo a comercializar vínculo con mascota. **Regla:** sin fotos si hay alerta de pérdida/estado delicado; fallback a arte institucional. **Ideal:** personalización cuidadosa, tras decidir si compensa complejidad.

## C — Carta de agradecimiento (menos comercial)
**Composición:** una nota amistosa desde PAZO con micro-ilustración oficial, saludo `Nos alegra que estés aquí`; párrafo corto tipo carta de comunidad; `Si quieres, puedes apoyarnos con US$2.99 al mes. PAZO seguirá siendo gratis`; CTA y salida. Mayor aire tipográfico y sin mosaico de beneficios en primera invitación.

**Ventajas:** auténtico, menos sensación de anuncio, coherente con apoyo voluntario. **Riesgo:** se puede interpretar solo como agradecimiento sin comprender los beneficios, por lo cual CTA debe decir `Conocer Amigo de PAZO` y precio visible. **Ideal:** estrategia de membresía-solidaridad.

## D — Beneficios concretos al primer vistazo (propuesta de valor)
**Composición:** título `Tu apoyo, un PAZO todavía mejor`; medalla moderada; cuadrícula con 4 iconos `Insignia`, `5 fondos`, `Muro opt-in`, `Medallas`; precio US$2.99/mes; botón grande y salir. Evitar mostrar un beneficio como derecho ya activo si aún no está verificado.

**Ventajas:** claridad económica y tangibilidad. **Riesgo:** densidad en teléfonos pequeños y percepción de paywall; texto `PAZO básico siempre gratis` obligatorio. **Ideal:** variante si el PO prioriza claridad sobre emoción.

## Matriz de decisión

| Opción | Atención visual | Calidez | Claridad de beneficios | Complejidad técnica | Riesgo principal |
|---|---|---|---|---|---|
| A | Alta | Alta | Media | Baja/Media | Parece anuncio directo |
| B | Muy alta | Alta | Media | Alta | Foto/datos del usuario |
| C | Media/Alta | Muy alta | Baja/Media | Baja | CTA menos evidente |
| D | Alta | Media | Muy alta | Media | Saturación móvil |

**Recomendación del consultor, pendiente de GO:** **A** (medalla PAZO) con tono emocional de **C**, cuatro beneficios resumidos en la oferta real, no en la invitación. Mantener el primer contacto breve, amable y con una salida no escondida.

## Gate antes de programar
El Product Owner elige **A, B, C, D o combinación explícita** y aprueba copy ES/EN. Elaborar mockup móvil a escala real y estados pequeño/grande, revisión de espaciados sin contornos, animación reducida y transiciones. No confundir propuesta visual con interfaz productiva. No tocar PayPal, SQL, main ni producción por documentar estas alternativas.
