# PAZO — Auditoría crítica de la primera tanda audiovisual
**29-oct-2026 · Decisión del Product Owner · Estado: `DIVERSITY_NOT_DEMONSTRATED / CREATIVE_REVIEW_FAILED`**

## Qué se solicitó y qué se entregó

**Solicitud vigente del PO:** distintos formatos de publicidad para investigar sin sesgo prematuro: spot cotidiano con actuación, humor natural de mascota, demostración real de producto y animación de personajes (idealmente 3D). Los estilos no se eligen por preferencias del PO o del agente, sino tras evidencia de audiencia y negocio suficiente.

**Resultado real:** cuatro MP4 exportados; sin embargo **tres o cuatro comparten la misma gramática audiovisual** —clips de animales de stock, texto en pantalla, música instrumental sintética y tarjeta final verde con logo—. Hubo cambios de frases y metraje, **no cuatro métodos de producción**. Se prometió calidad publicitaria/cinematográfica sin demostrarla. Un MP4 que decodifica no es prueba creativa.

| Pieza renderizada | Método realmente visto | Diferencia genuina | Lo que NO demuestra | Estado conservador |
|---|---|---|---|---|
| #01 The Little Things | Tres clips distintos de stock, frases sobrepuestas, tarjeta final | Tono emotivo | Spot con una historia continua, actuación/continuidad cinematográfica | `TECHNICAL_RENDER_VERIFIED; CREATIVE_REVISE` |
| #02 He Doesn't Pay Rent | Tres clips de perros, textos de humor, música y mismo cierre | Copy humorístico | Chiste visual basado en acciones verificables (pagar renta, sofá/cama, etc.) | `TECHNICAL_RENDER_VERIFIED; CREATIVE_REVISE` |
| #03 Their Own Space | Perro real y **pantallas estáticas auténticas** de PAZO, rótulos, mismo cierre | Aparición real de interfaz | Interacción o recorrido de producto **en movimiento**, completado y probado | `TECHNICAL_RENDER_VERIFIED; CREATIVE_REVISE` |
| #04 The Pet CEO | Tres clips de perros, tarjetas de supuesto diálogo, mismo cierre | Frases dispuestas como intercambio | Animación 3D, actuación de personajes, sincronía de voz o conversación **hablada** | `TECHNICAL_RENDER_VERIFIED; CREATIVE_REVISE` |

**Veredicto conjunto:** `BATCH_EXPERIMENT_READY=NO`; `DIVERSITY_NOT_DEMONSTRATED=YES`. Un consumidor podría percibirlos como variaciones de un mismo anuncio. Por ello, **no** son evidencia válida para contestar "qué estilo de producción audiovisual gana" aunque se publiquen. Si alguna pieza se publicó ya, conservar sus datos por pieza y fecha, pero **no adjudicar causalidad al estilo**.

**La aprobación subjetiva del PO para #01 fue feedback de presentación, no prueba de éxito.** La desaprobación posterior de la tanda es feedback crítico de producto; no modifica automáticamente tasas de retención ni sustituye señales de audiencia.

## Causas que deben quedar explícitas

1. Se reutilizó una plantilla de FFmpeg de corte a intervalos similares + overlay con pequeñas variaciones de texto + música sintética + tarjeta de marca.
2. Se eligieron clips disponibles aunque su **acción no construía el guion** (el copy narró lo que no ocurría en cámara).
3. Se sustituyó unilateralmente el formato de comedia animada por perros reales y texto, sin demostrar capacidad 3D ni volver a revisar la intención original.
4. La demo presentó capturas estáticas verificables, pero no una secuencia de uso o acción completada, por lo que la etiqueta **demostración** exageró la evidencia.
5. La revisión posterior comprobó montaje/decodificación, imágenes de contacto y coherencia de marca, pero **no detuvo** una tanda repetitiva ante ausencia de diversidad y calidad narrativa.
6. Las afirmaciones al usuario fueron más ambiciosas que la evidencia técnica y visual. La habilidad escrita era un proceso, **no** talento audiovisual automáticamente adquirido o un motor 3D ya validado.

## Nueva regla de autoridad

Aplicar [Creative Evidence Gate de Video Production OS](https://github.com/DigitalAppcorp/project-brain-os/blob/fix/video-os-creative-qa-v0-2-20261029/knowledge/video-production/CREATIVE_EVIDENCE_GATE.md) cuando esté integrado en `main`. No considerar las piezas #01–#04 una tanda de cuatro formatos. No publicar más variantes de la misma plantilla por defecto ni contratar servicios para compensar una historia mal construida.

Antes de producir otra tanda, demostrar **una** pieza con medio y gramática audiovisual efectivamente diferentes:
- **Spot actuado cotidiano:** escena continua real con persona/mascota, acción, conflicto/resolución, iluminación y sonido creíbles; no collage de stock;
- **UGC humor auténtico:** acción visual que crea el chiste sin depender solo del rótulo, sonido espontáneo y momento de reacción;
- **Demo auténtica:** grabación de pantalla con recorrido real, una tarea completada, datos saneados, sin inventar UI;
- **3D real:** rig, personaje, movimiento corporal/actuación y sonido en una secuencia original verificable; si Blender o recursos faltan, conservar `NOT_VALIDATED` y no reemplazarlo silenciosamente.

**Cada ruta requiere:** escena de 3–5 s de su elemento de más riesgo, revisión humana viendo el archivo y audio, derechos/fuentes, prueba creativa real, y solo entonces spot final. Un cambio de rótulo no cuenta como cambio de ruta. La revisión visual es previa a cualquier recomendación de publicar, la audiencia decide eficacia **después** de publicar con aprobación.

## Medición: datos disponibles versus opiniones

No se dispone en esta auditoría de datos consolidados de retención, finalización o adquisición para los cuatro anuncios. No afirmar ganador, fracaso con la audiencia, causalidad ni "todos fallaron en redes" sin registros. El desempeño creativo **puede** fallar en QA antes de exponerse a usuarios; eso es distinto de desempeño real del anuncio. El Product Owner decidirá qué piezas vale la pena publicar.

PAZO conserva el seguimiento interno #153. Para atribución externa por video, utilizar solo URLs/eventos efectivamente configurados, sin inferir trayectorias de visitantes anónimos.

## Estado y alcance

- **No** se cambió código de la app, pagos, algoritmos o producción por esta auditoría.
- Sin nuevos gastos, nuevas publicaciones ni campañas.
- Los MP4 existentes se conservan como prototipos/taller, pero **no** se etiquetan como cuatro estilos validados.
- Esta corrección de los documentos/gates **no garantiza** una mejora automática de calidad artística. La demostración requerida sigue pendiente.

**Criterio de salida:** una pieza verdaderamente distinta logra `CREATIVE_PASS` independiente del `TECHNICAL_RENDER_VERIFIED`, con materiales y derechos comprobados. Luego se puede considerar una nueva colección. No producir números para cumplir una cuota.
