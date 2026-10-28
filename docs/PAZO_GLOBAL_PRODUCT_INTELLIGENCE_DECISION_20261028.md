# PAZO — Decisión de producto: inteligencia y analítica global de la experiencia

**Fecha:** 28 de octubre de 2026  
**Estado:** **DIRECCIÓN DE PRODUCTO APROBADA POR EL PO; IMPLEMENTACIÓN NO AUTORIZADA**  
**Responsable de la decisión:** Product Owner de PAZO  
**Naturaleza:** decisión duradera para orientar futuras auditorías, propuestas y trabajos de Codex/otros agentes. Este documento no es una orden de programación, migración, recopilación adicional ni publicación.

## 1. Decisión

PAZO debe evolucionar hacia un **sistema global de inteligencia de producto**, capaz de dar cobertura a **todas las pantallas y a las interacciones relevantes** para comprender adquisición, primera experiencia, utilidad, dificultades, participación, recomendaciones y regreso. Debe permitir al PO responder **qué intentaron hacer las personas, qué sucedió realmente, dónde falló la experiencia y qué merece mejorarse**.

La dirección aprobada **no significa registrar cada clic de forma indiscriminada** ni dar por supuesto que toda pulsación equivale a interés. Buscar cobertura integral no es lo mismo que persistir cada evento bruto. La unidad correcta es la **acción con significado y su resultado verificable**.

**Definición operativa:** mapear sistemáticamente las pantallas y controles, decidir por qué vale la pena medir cada interacción, y crear eventos tipados y acotados con significado estable. En controles críticos distinguir, según corresponda, exposición visible, intención/pulsación, intento, resultado confirmado, fallo y recuperación. Los controles que no aporten información accionable pueden agregarse, muestrearse, excluirse o no almacenarse.

## 2. Por qué se adopta

1. **Producto / UX:** diagnosticar puntos de abandono, confusión, errores, reintentos y fricción; no limitarse a saber qué pantalla se abrió.
2. **Activación / adquisición:** comprender el paso desde anuncio reconocido, landing, login/registro, primera mascota, primera utilidad y uso posterior, sin mezclar solicitudes anónimas con personas únicas o cuentas verificadas.
3. **Retención:** identificar qué herramientas se visitan al regresar y cuáles aportan un resultado útil, distinguiendo reapertura de éxito real.
4. **Feed y aprendizaje de intereses:** evaluar si las recomendaciones conducen a resultados deseables; las señales actuales del feed y sus reglas de aprendizaje **se preservan y no se sustituyen**. La analítica global proporciona contexto, no órdenes automáticas para alterar los pesos del ranking.
5. **Fake doors:** conservar y enriquecer el contraste entre exposición real, interés declarado, intención específica y uso posterior cuando la funcionalidad se implemente. «Me interesa» no equivale a uso ni a demanda probada.

## 3. Arquitectura conceptual aprobada

Una **taxonomía coherente de eventos** y un marco compartido de observación deben servir a sistemas distintos, manteniendo límites claros:

- **Analítica de producto y administración:** datos agregados para diagnóstico y decisiones del PO.
- **Algoritmo del feed / personalización:** utiliza únicamente señales autorizadas, validadas, apropiadas y evaluadas por separado. **Nunca** conectarlo directamente al flujo bruto de clics ni cambiar su comportamiento como efecto colateral de la instrumentación.
- **Fake doors / validación de funciones:** conservar las mediciones específicas existentes; evitar dobles conteos y distinguir intención de utilidad confirmada.
- **Calidad técnica / UX:** errores, cargas, reintentos y resultados de tareas críticas, con categorías cerradas y sin contenido libre.

Conservar sistemas existentes y su semántica; reutilizar infraestructura de marketing, elegibilidad, administración, seguridad y limpieza, en lugar de construir colectores paralelos por defecto.

**Ejemplo:** para Agenda, diferenciar abrir la pantalla, comenzar a crear un cuidado, guardar correctamente y fallar; para Demo, diferenciar entrar, explorar áreas permitidas y solicitar registro. Es más útil que medir diez clics sin distinguir el resultado.

## 4. Límites obligatorios (no negociables por inferencia)

- **Privacidad y minimización:** no recolectar contenido de publicaciones o mensajes, textos introducidos, contraseñas, datos de pago, información sensible, ubicaciones precisas, URLs completas ni identificadores de clic publicitario sin necesidad y autorización específica. No hacer grabaciones de sesiones ni seguimiento encubierto.
- **Separación de identidades:** prerregistro anónimo/por campaña y sesiones autenticadas son poblaciones diferentes. No unirlas especulativamente ni afirmar usuarios únicos donde solo hay solicitudes. Tráfico sin atribución no debe clasificarse automáticamente como orgánico.
- **Transparencia y control:** revisar el aviso de privacidad ES/EN, preferencias y mecanismos de retirada/supresión antes de ampliar recogida. Mantener protección GPC, exclusiones QA y controles de acceso, muestras mínimas y informes agregados. El alcance de los datos requiere evaluación legal/proporcionalidad; no afirmar cumplimiento por defecto.
- **Retención:** respetar los 14 días actuales para observaciones nuevas salvo una **decisión futura explícita**, con justificación de necesidad, límites y garantías. No prometer D30/D90 desde datos de 14 días ni activar almacenamiento histórico encubierto.
- **Rendimiento y fiabilidad:** medición no bloqueante, carga mínima en el cliente, límites de volumen, deduplicación, colas cortas, sin bucles de reintento y **fallos de analítica nunca impiden utilizar PAZO**. No transformar cada toque en una petición de red independiente.
- **Calidad del dato:** clic ≠ interés; tiempo o exploración ≠ satisfacción; última pantalla ≠ abandono probado; intento ≠ éxito; compartición solicitada ≠ entrega externa. Señalar bajas muestras, cobertura y resultados desconocidos; no afirmar causalidad.
- **Seguridad y consistencia:** permisos mínimos y acceso administrativo, antiabuso, semántica consistente ES/EN, versiones de esquema de eventos, compatibilidad con PWA y pruebas de dispositivos; sin regresiones del feed, Auth, PayPal, Lugares, QR, Agenda o fake doors.

## 5. Qué debe hacer el siguiente agente ANTES de proponer implementación

Primero entregar una **auditoría/inventario de cobertura** de todo PAZO (no ejecutar instrumentación sin orden). Para cada pantalla y control relevante, documentar:

1. **Interacción y objetivo del usuario:** qué intenta conseguir y qué pregunta de producto responde su medición.
2. **Fuente existente:** si ya hay actividad, feed/likes/guardados/seguimiento, fake doors, métricas de administración, marketing o fuente autoritativa de éxito. Evitar duplicar.
3. **Evento propuesto:** nombre estable, momento de emisión, tipo (exposición, intento, éxito, error, reintento), parámetros permitidos y reglas de deduplicación.
4. **Cobertura y limitación:** anónimo/registrado, campaña reconocida/origen desconocido, Demo, ventanas de tiempo, privacidad y tamaño de muestra.
5. **Decisión posible:** qué cambiaría el PO con esa información; clasificar eventos imprescindibles, útiles y prescindibles.
6. **Coste/riesgo y verificación:** frecuencia/volumen, CPU/red, accesibilidad, protección de datos, tests, controles de seguridad, rollback.

Cruzar la auditoría con **Design Intelligence OS** (recorridos, fricción, claridad, accesibilidad, estados) y **Marketing Brain OS** (adquisición, conversión, activación, retención, interpretación). Aplicar criterio crítico: corregir hipótesis débiles aunque vengan del PO o de un agente.

**Prioridades candidatas para estudiar, no autorización de obra:** Demo → intención de registro; embudo login/registro; acciones del feed más allá de pantalla (exposición útil, interacción y resultado); primeras utilidades QR/Agenda; resultados de fake doors; errores/reintentos por tarea.

## 6. Permisos y estado real a preservar

- **Sí está aprobado:** el principio estratégico de cobertura global **selectiva, semántica y protegida** y la exigencia de auditar previamente.
- **No está aprobado por este documento:** modificar código, crear migraciones, cambiar algoritmos, ampliar recopilación, comprar software, gastar en anuncios, hacer merge ni publicar. Los futuros permisos siguen los gates vigentes del producto y las órdenes explícitas del PO.
- **Issue #150 / PR #151:** la analítica inicial de Comportamiento **sí fue publicada y activada** el 28-oct-2026. Ver [cierre de lanzamiento del issue #150](https://github.com/DigitalAppcorp/pazo-app/issues/150#issuecomment-6481866259) y [PR #151](https://github.com/DigitalAppcorp/pazo-app/pull/151). Esa implementación es una **primera capa**, no una captura automática de todos los botones. No repetir su instalación ni confundir este futuro trabajo con un fallo de #150.
- La medición publicada comprende prerregistro limitado a campañas válidas y pantallas autenticadas permitidas; **Demo no está cubierto por esa analítica de recorridos**. Se mantienen y no se sustituyen las mediciones propias de fake doors y del feed. No inferir que likes, follows y comentarios producen todos el mismo ajuste de ranking: verificar implementación vigente antes de modificarla.

## 7. Criterio de éxito futuro

El sistema será útil si el PO puede responder con evidencia, sin depender de reportes manuales de un agente:

- ¿Dónde se interrumpe cada tarea importante y qué error/obstáculo pudo observarse?
- ¿Qué herramientas se exploran y cuáles producen un resultado útil verificable?
- ¿Qué ocurre en Demo y qué porcentaje de intención llega a registro confirmado, con denominadores válidos?
- ¿Qué señales indican buen funcionamiento del feed y qué efectos negativos deben evitarse?
- ¿Qué cambios de producto o diseño son justificables, y qué sigue siendo hipótesis?

**Regla rectora:** *Medir ampliamente para comprender; almacenar selectivamente; mejorar con evidencia; no confundir actividad con valor ni alimentar automáticamente los algoritmos con clics brutos.*
