# PR2 — primer uso contextual y claridad (issue142)

## Implementación y alcance

Sugerencia inline opcional únicamente tras persistir la primera mascota propia. «Ver pasaporte QR», «Abrir Agenda» y «Explorar PAZO» usan las herramientas existentes; cualquier opción descarta la sugerencia. El bootstrap de una cuenta con mascotas no la vuelve a mostrar. No añade almacenamiento persistente, tutorial obligatorio, ofertas ni eventos de alerta. Identidad de cuenta/mascota controla su visibilidad y se limpia al reiniciar la sesión.

La intención QR procede exclusivamente del recibo aceptado por el Edge de atribución vigente, ligado a cuenta y plazo; se consume una vez. Intención desconocida, código no aprobado, fallo, campaña social/perfil o sesión anterior producen orientación neutra. Se valida una generación de solicitud además de identidad/payload, incluido A → B → A con payload idéntico. La allowlist actual no contiene campañas de cuidados: no se inventa ninguna; la orientación neutra ofrece Agenda directamente.

Copy ES/EN en herramientas reales: quien recibe el QR/enlace puede ver la ficha pública; no hay GPS ni rescate garantizado. Agenda muestra recordatorios dentro de PAZO, sin prometer push. Alerta solo si existe pérdida, sin prometer difusión externa/rescate. El vacío de Inicio conserva publicación/comunidades y permite ir a Mi mascota. Sin posts ficticios. La invitación existente espera a que se descarte la sugerencia; elegibilidad y condiciones comerciales no cambian.

## Design Intelligence OS — decisión y autoauditoría

Fuente canónica v0.6.0, blob `f6580194f3908d56a5002f7210c045432a8e8c01`, contrastada con checkout de Project Brain OS. Se aplicaron razonamiento, frontera de audiencia, contenido, integridad de cambio, memoria y gates visuales. El problema es llegar a una utilidad mientras el feed sigue pendiente; por eso la sugerencia vive en Inicio y no captura navegación/foco como un modal de bienvenida. Se conserva dock, paleta verde/lima, superficies redondeadas, tipografía y jerarquía existentes. No hay contornos decorativos ni rediseño general.

Cambios visibles acotados: sugerencia, copy explicativo, alternativa honesta en vacío y cierre táctil de QR/Agenda de44px. Encabezados conservan columnas simétricas/centrado. Los modales existentes reciben nombre accesible, foco inicial, circuito Tab/ShiftTab, Escape y restauración del activador; etiquetas de cuidados quedan asociadas a campos reales. Objetivo de accesibilidad WCAG2.2AA, sin declarar certificación de toda la aplicación.

Revisión visual directa de capturas ES320 primer uso, ES390 QR y EN390 Agenda: texto legible, acciones visibles, sin solapamiento con dock ni desbordamiento horizontal; QR público y límites de Agenda explícitos. Matriz automatizada completa ES/EN320/390/430 con capturas de primer uso/QR/cuidados. Transporte aislado bloquea recursos externos, incluidas fuentes remotas: estas capturas comprueban también fallback tipográfico; no sustituyen prueba física de lector de pantalla o de compartir en cada sistema operativo.

**Conformidad técnica interna: PASS para el alcance. Aceptación estética final: pendiente del PO en el único paquete final; no inferida del CI.** No hay hallazgos que requieran ampliar diseño o tocar funciones comerciales.

## Evidencias y límites

- 13 pruebas de primer uso/intención: ES/EN, QR/neutro, acciones reales, invitado/existente, identidad, intención aceptada frente a URL, fallo/logout y respuestas antiguas A → B y A → B → A.
- 6 recorridos de navegador ES/EN320/390/430: Auth/transporte interceptados hacia PostgreSQL17 desechable real con RLS. Primer perfil persistido, intención QR aceptada por SQL del mecanismo actual, opción Explorar/QR/Agenda, no repetición tras reload, teclado/labels, descarga pese a caída de métricas y cuidado realmente persistido/trigger. Sin escrituras alojadas ni compras. Web Share se simula; no se afirma entrega externa.
- 527 pruebas de cierre heredado, gobernanza, TypeScript y build PASS. Nuevo helper/prompt/foco sin diagnósticos ESLint. Gates CI del SHA publicado complementan los resultados locales.
- [Resultados](evidence/issue142/contextual-browser.json). Capturas representativas en esta misma carpeta;18 capturas por ejecución completas en artifacts CI. [Contrato de aceptación](PAZO_ISSUE142_ACCEPTANCE.md).

Reversión: revertir este PR restaura la experiencia previa sin migraciones. PR1B conserva gate OFF independiente; su SQL no se activa por integrar esta interfaz. Publicación final reservada al PO.

