# PAZO — Laboratorio creativo de video | Ronda exploratoria 01

**Decisión del Product Owner, 28-oct-2026:** experimentar con anuncios tipo televisión (escenas cotidianas), animación de personajes en 3D, contenido de mascotas natural y demostraciones reales. **No hay estilo ganador ni datos para fijar una línea audiovisual.** Los clips de otros creadores proporcionados al agente son referencias de *proceso*; no autorizan copiar personajes, escenas, voces, guiones ni reutilizar metraje ajeno.

**Estado:** `BRIEF_READY / PILOTS_NOT_VALIDATED / NO_PUBLICATION_AUTHORIZED`. El GO actual autoriza construir la **habilidad y el laboratorio de planificación**; **no autoriza ads pagados, compras, nuevos proveedores, publicación automática, uso de cuentas de redes ni cambios de PAZO**.

**Habilidad canónica:** [Video Production OS](https://github.com/DigitalAppcorp/project-brain-os/blob/main/knowledge/video-production/SKILL.md) en Brain OS, junto a [Marketing Brain](https://github.com/DigitalAppcorp/project-brain-os/blob/main/knowledge/marketing/SKILL.md) y [Design Intelligence OS](https://github.com/DigitalAppcorp/project-brain-os/blob/main/knowledge/ui-ux-frontend/SKILL.md).

## 1. Qué queremos aprender

La pregunta inicial **no** es «¿caricaturas o cine?», sino:
- ¿Qué estilo hace que el público de propietarios de mascotas en Los Ángeles se quede a ver una historia de PAZO?
- ¿Qué temas generan compartidos o guardados, más allá de likes?
- ¿Qué contenidos generan una visita con intención real de conocer la app?
- ¿Qué método puede mantener un nivel creativo aceptable sin agotar recursos monetarios ni tiempo?

**Audiencia inicial:** adultos propietarios de mascotas, Los Ángeles, inglés; no presupone que todos viven solos ni que buscan atención social. **Producto:** https://pazo-app.vercel.app/; red social con perfil de mascotas, feed y herramientas disponibles. Los claims del contenido deben comprobarse contra producción al filmar.

**Costo inicial autorizado:** $0 de **nuevas** suscripciones y $0 de anuncios. Tiempo humano, hardware o grabación no son gratis: registrar los recursos consumidos. Los $350 de marketing históricos y cualquier presupuesto de otras campañas **no** son autorización de gasto para esta iniciativa.

## 2. Cuatro tratamientos piloto (hipótesis, NO videos terminados)

### A — Historia cotidiana / comercial «The Little Things»

**18–25 s, 9:16, inglés, escenas reales con teléfono**, sin necesidad de caras sintéticas.

- **0–3 s:** mano humana recoge un juguete gastado; perro real mira con curiosidad. Texto: *“It's never just a toy.”*
- **3–9 s:** tres recuerdos rápidos y cotidianos del mismo perro: espera en la puerta, juego, siesta. Voz humana original si existe permiso.
- **9–14 s:** gesto de querer conservar esos momentos; sin hacer afirmaciones de que PAZO es almacenamiento seguro/infinito.
- **14–20 s:** **captura auténtica** del perfil de esa mascota en PAZO, con datos de demostración autorizados, sin botones ficticios.
- **20–25 s:** *“They deserve their own space. PAZO.”* + URL real.

**Técnica:** mascota real y manos; escenas nocturnas/artificiales solo si hay forma creíble de filmarlas. **Riesgo:** sentimentalismo genérico, tomas sin derechos, calidad de audio y producto mostrado como pantalla inventada. **Gate:** test de 5 s real sin IA humana.

### B — Comedia de personaje 3D «My Publicist»

**15–20 s; animación estilizada original**, sin utilizar personajes de los videos de referencia.

- **0–3 s:** perro animado mira a cámara: *“Where's my publicist?”*
- **3–8 s:** un gato caricaturesco contesta: *“You have a dog park. Calm down.”*
- **8–12 s:** perro: *“I also have a personal brand.”*
- **12–17 s:** remate cómico; corte al **perfil real de PAZO** solo si la licencia/transición y el material son adecuados.
- **17–20 s:** breve marca/CTA; puede excluirse si la historia mejora al terminar antes.

**Técnica:** Blender + rig/modelos originales/licenciados + animación de expresiones, sonido original; prueba de actuación de 3–5 s antes de producción. **Riesgo:** animación rígida, falta de lip-sync, mucho tiempo de render. **Estado actual:** **BLENDER_NOT_VALIDATED**; una fotografía con zoom no cumple esta ruta.

### C — Natural / humor «He Doesn't Pay Rent»

**12–18 s, grabaciones reales de mascota**.

- **0–2 s:** perro ocupa toda la cama. Texto *“Pays no rent.”*
- **2–6 s:** ocupa el sofá. *“Owns every blanket.”*
- **6–10 s:** exige comida y no coopera para una foto. *“Runs this house.”*
- **10–14 s:** *“Of course he needs his own profile.”*
- **14–18 s:** perfil **real** de PAZO y cierre no intrusivo.

**Técnica:** cortes en ritmo, subtítulos/efectos originales sin música ajena no licenciada. **Riesgo:** video de mascota ajena sin cesión o material de stock no permitido en ads. **Gate:** filmación real/asset autorizado, reproducción en móvil sin sonido.

### D — Utilidad real «It's Their Space»

**15–25 s, pantalla real + acción humana sencilla**.

- **0–3 s:** perro se acerca a cámara; texto *“Your pet has a story.”*
- **3–8 s:** grabación real de crear/abrir el perfil de mascota en PAZO (si la cuenta es demostrativa y está autorizada).
- **8–14 s:** vista real de la ficha y una función comprobada (por ejemplo, pasaporte QR gratuito, sin prometer rescate, detección GPS o usos inexistentes).
- **14–20 s:** contraste rápido mascota real / app real.
- **20–25 s:** *“Give them their own space. PAZO.”* y URL.

**Técnica:** captura auténtica de versión oficial, datos saneados, edición con FFmpeg. **Riesgo:** demo que parezca aplicación falsa, detalles personales, discurso puramente comercial. **Gate:** comprobar pantallas contra versión viva y revisar toda la grabación.

## 3. Cómo decidiremos producción y prioridad

1. **Muestreo barato:** una microprueba de 3–5 s de cada ruta técnicamente viable. FFmpeg no prueba animación 3D. **No generar cuatro anuncios completos a ciegas**.
2. **Umbral creativo:** si la toma no presenta actuación, continuidad y narración legibles, no pasar a full render ni gastar créditos.
3. **Derechos:** ningún video de terceros ni voz replicada sin permiso; ningún testimonio o comunidad simulados.
4. **Primera serie:** cuando un microprototipo supere QA, producir una sola pieza corta, revisar con Product Owner, y luego decidir más variantes.
5. **Publicación:** pendiente de autorización individual, con enlaces y cuentas correctas; comprobar políticas actuales de Meta/TikTok/Reels antes de postear.
6. **Aprendizaje:** ver la reacción, comparar con **denominadores reales**, no asumir que un video divertido convierte; ronda siguiente controla gancho, historia/CTA o estilo cuando se pueda.

## 4. Evidencia y métricas, sin fingir precisión

| Pregunta | Fuente | Limitación |
|---|---|---|
| ¿Es entretenido? | Reels/TikTok/Shorts nativos: visualización, retención, finalizaciones, compartidos | Disponibilidad/definiciones varían por plataforma |
| ¿Trae tráfico? | Clic saliente y llegada confirmada al destino | No todos los clics llegan; URLs validadas por infraestructura oficial |
| ¿Genera interés en PAZO? | Administración → Campañas / Comportamiento | El collector #153 entró en producción el 28-oct-2026; no hay atribución individual retroactiva |
| ¿Activa usuarios? | Registro confirmado y primera mascota de cuentas elegibles | QA excluida; atribución solo cuando realmente existe; visita de origen desconocido ≠ orgánica demostrada |
| ¿Cuál es mejor? | Solo comparación entre piezas con condiciones semejantes y muestra suficiente | Primera tanda es exploración, NO A/B causal concluyente |

**No tocar analítica #153** ni crear nuevas campañas UTM por intuición. [Postflight #153](../product-intelligence/PRODUCTION_RELEASE_20261028.md). El archivo [traffic-pilot-urls.json](traffic-pilot-urls.json) es **DRAFT_NOT_PUBLISHED** y no concede autorización a copiar campañas ni gastar.

## 5. Assets / permisos / ruta de producción

- **Material auténtico necesario:** video de mascota propia/licenciada, o filmación controlada (A y C); grabación real de PAZO con perfil/QR y contenido seguro (A, B, C, D).
- **Material de referencia:** los tres clips del usuario muestran técnicas, pero autoría/licencia comercial no comprobadas; no reutilizar en anuncios.
- **Música/voz:** propia o licencia comercial verificable por plataforma. La «música original» de un prototipo previo requiere conservar su proyecto/fuente para afirmar derechos.
- **Herramientas:** FFmpeg disponible en el entorno de trabajo actual; Blender **no detectado en este entorno**, sin prueba 3D. Una demostración de edición con foto/beat ya no debe etiquetarse «anuncio terminado».
- **Evidencia técnica de referencia:** smoke separado de 4 s, MP4 540×960 H.264 + AAC decodificado (`TECHNICAL_SMOKE_PASS`); **no** valida A/B/C/D, derechos nuevos ni calidad comercial. Guardar el archivo de muestra en el artefacto de conversación o carpeta autorizada, no subirlo a producción ni confundirlo con una pieza final.

## 6. Entregables y gates

| Gate | Entrega | Estado hoy |
|---|---|---|
| Skill | Método reutilizable, controles, plantillas, verificación | En implementación documental |
| Brief | Cuatro tratamientos diferentes, público y costes | `BRIEF_READY` |
| Licencias | Lista de assets con derechos comerciales | `PENDING` |
| Técnica A | 3–5 s de grabación cotidiana natural | `NOT_VALIDATED` |
| Técnica B | 3–5 s de personaje original 3D animado | `NOT_VALIDATED` |
| Técnica C | 3–5 s de material real de mascota licenciado | `NOT_VALIDATED` |
| Técnica D | 3–5 s de captura real de la aplicación | `NOT_VALIDATED` |
| Producción final | MP4, edición/audio/subtítulos/QA | `NOT_STARTED` |
| Publicación | Publicación/campaña autorizada | `NOT_AUTHORIZED` |
| Datos | Reproducción, retención, visitas y activación | `INSUFFICIENT_DATA` |

**Próximo paso exacto:** ejecutar primero el test de derechos/activos de A y C y la captura de producto de D; en paralelo hacer un microensayo de personaje 3D en Blender si se habilita su instalación/render. Producir el **primer piloto original que pase gates**, no el más espectacular por definición. No reclamar «Video OS completó anuncios» por haber escrito este plan.

**Regla:** aprender con piezas pequeñas y reales antes de invertir; nunca pagar créditos para compensar una historia sin gancho.
