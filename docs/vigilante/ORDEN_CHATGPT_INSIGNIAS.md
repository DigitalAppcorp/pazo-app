# Orden para ChatGPT — estilo de las insignias Oficial y Fundador

Fecha: 3 de noviembre de 2026. Autoriza: el PO (dueño de PAZO).
Contexto completo: `docs/vigilante/VIGILANTE_ROADMAP_20261103.md`, paso 2.

## Qué se pide

Proponer el estilo visual de dos insignias nuevas de PAZO y entregarlas al PO para su aprobación. **Solo diseño; no programar ni modificar la app.**

1. **Oficial**: solo para la cuenta oficial "PAZO", que publica las alertas del Vigilante en el feed.
2. **Fundador**: para la cuenta personal del PO. Ya existe en el perfil público como una pastilla lima con huella y la palabra "Fundador" (`src/components/views/PublicProfileView.tsx`); hay que decidir si se conserva, se ajusta o se rediseña, porque ahora también aparecerá en el feed y en los comentarios.

Además, proponer **la imagen de perfil de la cuenta oficial**. El PO duda entre usar el logo de PAZO u otra opción; presentar alternativas con pros y contras.

## Restricciones

- Mantener la identidad de PAZO: verde/lima, crema, tipografía Quicksand, ilustraciones propias, cero contornos decorativos.
- Deben convivir y distinguirse a simple vista de la insignia ya aprobada **Amigo de PAZO** (archivos `amigo-pazo-inicio.png`, `amigo-pazo-3-meses.png`, `amigo-pazo-6-meses.png`, `amigo-pazo-12-meses.png`, componente `src/features/supporter/components/SupporterBadge.tsx`).
- Tamaños en uso: mini 20 px (feed y comentarios), pequeño 32 px y grande 66 px (perfil). Deben leerse en 20 px.
- La insignia la asigna solo el servidor. Su forma y posición deben impedir que alguien la imite subiendo una foto de perfil con una insignia dibujada (por ejemplo, que se coloque fuera del círculo de la foto o junto al nombre).
- Accesible: no depender solo del color; cada insignia lleva etiqueta "Oficial / Official" y "Fundador / Founder".
- Sin emojis (regla de la interfaz de PAZO).

## Entregables

1. Dos o tres propuestas por insignia, con una recomendada.
2. Archivos fuente en SVG (o PNG a 2x y 3x si el arte no es vectorial), para cada tamaño.
3. Reglas de uso: dónde aparece cada una, posición respecto a la foto y al nombre, y qué pasa si una cuenta tiene varias (por ejemplo, Fundador y Amigo de PAZO).
4. Propuestas de imagen de perfil para la cuenta oficial.
5. Textos ES/EN de las etiquetas.

## Entrega y guardado

Entregar al PO para su aprobación. Tras la aprobación, el PO pasa los archivos a Claude o Codex, que los guardan en GitHub (repositorio `DigitalAppcorp/pazo-app`, carpeta propuesta `docs/vigilante/insignias/`) para que queden en la nube como referencia. La integración en la app es un paso posterior y requiere una orden aparte.
