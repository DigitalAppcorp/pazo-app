# 04 — Dirección artística, observaciones de capturas y contenido

## 1. Distinción fundamental de material visual
Esta auditoría **abrió e inspeccionó directamente** estos fixtures existentes de F18: `growth-390-es.png`, `growth-1440-es.png`, `growth-320-en.png`, `offer-es.png`, `offer-en.png`, `admin-summary-390-es.png`, `admin-summary-1440-es.png` y `admin-controls-320-es.png`. Todos se encuentran en [`docs/review/f18/`](../../review/f18/). **No se abrieron todos los fixtures 768 y 320/390 restantes ni nuevas capturas interactivas.** Los comentarios sobre otras pantallas proceden de código y decisiones documentadas, y quedan como inspecciones estructurales pendientes de validación visual.

## 2. Invitación G «Amigo de PAZO»: preservar la dirección, afinar tipografía
**Evidencia visual:** [móvil ES 390](../../review/f18/growth-390-es.png), [desktop ES 1440](../../review/f18/growth-1440-es.png), [móvil EN 320](../../review/f18/growth-320-en.png). **Evidencia de código:** `SupporterInvitationPrompt.tsx`, `SupporterInvitationPrompt.css`, `SupporterInvitationCoordinator.tsx`.

**Aciertos demostrados en imagen**
- Ilustración de brote sobre una huella transmite crecimiento de comunidad de mascotas sin inventar objetivos ambientales. El significado visual coincide con el producto.
- Fondo bosque profundo y acento lima expresan identidad; el CTA domina visualmente sin anunciar «Paga ahora».
- El precio US$2.99/mes es visible ANTES de ver la oferta, y las salidas «Ahora no» y «No recibir futuras invitaciones» tienen funciones separadas.
- La alineación centrada es pertinente para una invitación emocional. Prohibir títulos centrados por reflejo sería un error de diseño.
- Desktop usa columna centrada estrecha con gran espacio negativo. En una PWA concebida mobile-first **esto no es automáticamente desperdicio**; no expandir sin evidencia de uso de desktop.

**Defectos/ajustes justificados**
- Jerarquía muy comprimida entre tres líneas del título español, actualmente `line-height:1.08`; probar ~1.12–1.16 antes de aprobar. Esta cifra es hipótesis de diseño, no estándar obligatorio.
- Eyebrow 10px, lema de marca 9px, opt-out 11px; visualmente secundarios demasiado delicados. Comprobar lectura con zoom/texto ampliado.
- En fixture 320 EN, la imagen termina tras «Not now, continue in PAZO» y no muestra opt-out. El CSS permite `overflow-y:auto`: **no afirmar que falta el control** sin comprobar scroll y la altura completa; exigir que sea alcanzable por scroll, teclado y lector.
- La marca «AMIGO DE PAZO» sí informa el programa; «CRECEMOS CONTIGO» podría redundar con el heading, pero no debe borrarse por regla estética genérica sin decisión de marca.

**Decisión:** mantener arte/paleta/CTA/composición; medir altura y copy secundaria en 320/390, no sustituir por más tarjetas, rayas, pills ni un hero estándar. El PR #106 contiene cambios limitados de tipografía, no aprobación visual.

## 3. Oferta y consentimiento: buena estructura comercial, exceso cognitivo
**Evidencia visual:** [ES](../../review/f18/offer-es.png) y [EN](../../review/f18/offer-en.png). **Código:** `SupporterOfferB.tsx` + `SupporterLiveCheckoutPanel.tsx`.

**Qué funciona**
- Regla de responsabilidad clara: invitación primero, oferta y contrato después. Precio y cadencia visibles, condiciones desplegables, consentimiento individual antes de continuar y botón deshabilitado hasta aceptar.
- Beneficios reales como agradecimiento en un bloque separado; no confundir membresía con acceso a la PWA gratuita.
- Iconografía de cuatro beneficios ayuda a escanear. Insignia 3D mantiene hilo visual con invitación y programa.

**Qué no funciona del todo**
- En 390px, una única gran tarjeta ocupa gran parte de la vista con insignia, párrafo cálido largo, precio, contrato, checkbox, CTA, nota técnica y bloque de agradecimiento. La primera decisión comercial queda inmersa en lectura excesiva.
- Titular muy cercano a la insignia; copia descriptiva extensa y líneas cortas forman bloque denso; revisar longitud sin perder verdad ni términos.
- Nota debajo de CTA «Solo un pago confirmado y verificado activa tu membresía» parece una justificación de backend. El estado «Estamos verificando tu pago» sí puede ser necesario DESPUÉS del checkout. Eliminarla de pitch no implica eliminar verificación.
- El checkbox es información contractual importante, no decoración que pueda eliminarse para ganar espacio; su nombre y scroll deben seguir legibles.

**Decisión:** optimizar jerarquía semántica y microcopy sin cambiar precio, renovación, consentimiento, beneficios reales ni mecanismo de pago. Probar a 320/390 y 200% zoom sin perder control.

## 4. Administración PayPal: funcional, pero no usar su estética como norma de toda PAZO
**Evidencia:** [Resumen 390 ES](../../review/f18/admin-summary-390-es.png), [Resumen 1440 ES](../../review/f18/admin-summary-1440-es.png), [Controles 320 ES](../../review/f18/admin-controls-320-es.png).

**Aciertos**
- Buen agrupamiento: estado operativo separado de importes registrados, y etiquetas «Pausado/Activo», «Verificado/Requiere revisión». La jerga es razonable porque la audiencia es administradora.
- Layout de indicadores responde a ancho: tarjetas verticales en móvil, cuadrícula en escritorio. No hay razón para exigir que todo el panel quepa en 430px en desktop.
- El estado de incidencia exige revisión; no presenta «abrir pagos» como acción trivial. Esto protege producto y negocio.
- «Fixture MFA» es parte de una captura de prueba y **no acredita ese texto en producción**.

**Deficiencias**
- En 390px, información operativa ocupa varias pantallas de altura. Un administrador que necesita identificar la acción urgente debe recorrer muchas tarjetas con la misma prominencia visual.
- En 320px, los controles de navegación en dos columnas tienen textos largos y saltos de línea; aun legibles, generan carga vertical. Probar agrupación por frecuencia/urgencia y evitar tocar los bloques de seguridad.
- En 1440px, la cuadrícula deja mucha información simultánea sin una jerarquía de «qué requiere mi atención ahora», más allá de estado financiero. Evaluar un resumen priorizado, no simplemente más colores.
- Los dos botones «Actualizar registro Live» y «Actualizar estado» pueden requerir explicación del alcance para prevenir confusión: ¿qué actualiza cada uno? No cambiar lógica al aclarar copy.
- No inferir ingresos, socios o salud financiera reales a partir de números del fixture.

**Decisión:** separar portada ejecutiva, navegación y controles con información de ayuda contextual. Priorizar en mobile lo que exige acción; conservar confirmaciones/MFA/estados de bloqueo.

## 5. Otras familias de vistas: observaciones estructurales, NO visuales completas

### Bienvenida / registro
- Ilustración animada y paleta son activos propios. Contraste de texto sobre oliva debe cumplir; no eliminar la imagen.
- Formularios de pasos están estructurados por tarea y secuencia auténtica («Paso 1 de 3»), no son numeraciones arbitrarias.
- Selector de foto y labels incompletos son fallos de interacción/nombre, no un argumento para rehacer toda la pantalla.

### Inicio, Feed, publicaciones y Comunidades
- Feed prioriza mascotas y acciones sociales. Métrica de calidad: «¿puedo reconocer el autor, el contexto y lo que hace cada CTA sin leer demasiado?».
- Evitar headers sobredimensionados si empujan fuera de vista el primer post.
- «Cerca · Próximamente» está aprobado como experimento: no declararlo fallo solo por ser fake door; verificar que su estado no parezca una función terminada.
- Comunidades: tarjeta y «Unirme» deben ser acciones semánticamente independientes. Aquí la solución profesional es de arquitectura de interacción, no sombreado.

### Perfiles privados/públicos
- El perfil social y el propio tienen tareas diferentes: visibilidad/seguimiento frente a herramientas privadas y cuidados. No homogeneizar ambas vistas por estilo.
- La foto, insignia, seguidores, bio y señal «Perdido» requieren niveles de prioridad distintos. No inventar perfil de prueba para llenar espacio.
- Etiquetas de edición y picker de mascotas deben ser accesibles con un diseño compacto.

### Mapa, lugares y rutas
- Mantener **mapa estándar full-bleed**, tarjetas flotantes y movimiento suave aprobado; el criterio de calidad es si el usuario encuentra un lugar y abre «Cómo llegar» sin fricción.
- Evitar mapas ornamentales o listas separadas que destruyan contexto espacial. Fotos reales solo si son del sitio o claramente etiquetadas como representativas.
- Superposiciones, contraste de chips y colisiones con atribución legal Mapbox deben probarse sobre mapa cargado, no desde CSS aislado.

### Cuidados, documentos, QR, alertas y avistamientos
- Priorizar comprensión/acciones sin error; un botón bonito pero incomprensible no mejora el cuidado de una mascota.
- «Mascota perdida» eleva prioridad y requiere estados específicos; no convertirlo en diseño promocional.
- Campos de cuidado y documentos contienen datos privados: no sacrificar claridad o recuperación por ganar densidad vertical.

### Notificaciones, mensajería, búsqueda y soporte
- Revisar el estado real de funcionalidades antes de pulir textos de «próximamente»; no prometer mensajería disponible si solo existe placeholder.
- Búsqueda necesita «sin resultados» y recuperación comprensibles, no solo spinner.
- Soporte diferencia mensajes públicos de notas administrativas; conservarlo.

## 6. Principios que NO deben convertirse en prohibiciones universales
- Centrar un heading es válido en invitación, aviso hero o empty state. Alineación izquierda suele favorecer formularios/listados, pero se decide según lectura.
- Un eyebrow es útil cuando clasifica («AMIGO DE PAZO», tipo de estado), no cuando solo duplica índice de Figma/brief.
- Un marcador de paso («Paso 1 de 3») es genuinamente útil si corresponde al flujo real.
- Las tarjetas existen cuando agrupan una entidad, resultado o control; no agregar otra por simetría.
- «Cero contornos» no exige borrar señales de teclado; indicadores por relleno/sombra/subrayado deben ser claramente perceptibles.
- Copiar estilo de otro producto sin contexto es inferior a preservar el carácter de PAZO.

## 7. Registro de las capturas vistas
| Fixture | Viewport/momento | Qué avala | Qué NO avala |
| --- | --- | --- | --- |
| `growth-390-es.png` | móvil ES 390 | jerarquía, color, copy visible | scroll/teclado/comportamiento real |
| `growth-320-en.png` | móvil EN 320 | expansión lingüística y parte visible | visibilidad total del opt-out tras scroll |
| `growth-1440-es.png` | desktop ES 1440 | estructura estrecha intencional | atractivo/eficacia real en escritorio |
| `offer-es.png`, `offer-en.png` | mobile ES/EN | carga informativa de consentimiento/copy | cobro PayPal ni activación de beneficios |
| `admin-summary-390-es.png` | admin QA móvil | densidad/scroll y agrupación | cifras de usuarios reales |
| `admin-summary-1440-es.png` | admin QA desktop | estructura de datos | capacidad real de seguimiento de usuario |
| `admin-controls-320-es.png` | admin QA 320 | compresión/controles y estados | autorización de acción, MFA productivo |

**Toda afirmación de una captura se limita a su estado y fecha/versiones del repositorio; esta carpeta no incluye imágenes nuevas ni cambios a fuentes visuales.**
