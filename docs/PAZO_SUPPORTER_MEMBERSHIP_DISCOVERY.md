# PAZO — Supporter Membership Discovery

**Estado:** PROPUESTA DE PRODUCTO — NO ACTIVA  
**Tipo:** M — Monetización de apoyo  
**Fecha:** 2026-10-07

## 1. Intención

La membresía no debe sentirse como un cobro para usar PAZO.

Propuesta central:
> El usuario ya obtuvo valor, usa PAZO y entiende el producto. Entonces PAZO puede invitarlo a apoyar voluntariamente el proyecto para ayudar a mantenerlo activo, mejorar infraestructura y sostener herramientas necesarias.

El núcleo útil de PAZO continúa gratuito.

## 2. Problema de la versión anterior

La implementación anterior:
- mostraba el pitch prácticamente en el primer uso;
- decía "$2 al mes" antes de demostrar valor;
- prometía "sin publicidad" sin una política de producto aprobada;
- mezclaba aprobación del checkout en navegador con entitlement real.

Eso queda retirado.

## 3. Principios de la experiencia

- nunca durante onboarding;
- nunca en primera sesión;
- nunca durante un flujo de mascota perdida/rescate;
- nunca bloquear navegación;
- cerrar debe ser fácil;
- no usar culpa, miedo o urgencia artificial;
- explicar en lenguaje simple para qué sirve el apoyo;
- no convertir funciones núcleo ya gratuitas en rehén del pago.

## 4. Elegibilidad propuesta para mostrar el pitch

No implementada todavía.

Un usuario sería elegible cuando cumpla señales de uso real, por ejemplo:
- cuenta con al menos 7 días;
- al menos 3 días activos en los últimos 14;
- al menos 5 acciones significativas;
- acciones distribuidas en 2 o más superficies de PAZO;
- no ser supporter activo;
- no haber rechazado el pitch durante el cooldown.

Acciones significativas candidatas:
- crear publicación;
- comentar;
- Like/Save/Follow;
- crear/completar cuidado;
- usar documentos;
- entrar a una comunidad o publicar;
- abrir/usar Lugares;
- realizar búsquedas reales.

No usar solo "abrir la app" como prueba suficiente de valor.

Cooldown recomendado después de "Quizás más tarde":
- 30 días.

## 5. Precio — solo plan mensual aprobado

La versión anterior usaba **USD 2/mes**.

Con la tarifa pública vigente de PayPal Checkout/recurring en EE. UU. (3.49% + USD 0.49 por transacción), el costo fijo pesa demasiado en un cobro de USD 2.

Aproximación antes de impuestos/otros cargos:
- USD 2.00 → neto aproximado USD 1.44;
- USD 2.99 → neto aproximado USD 2.40;
- USD 3.99 → neto aproximado USD 3.36.

**Decisión definitiva del Product Owner (2026-10-13): USD 2.99 al mes** para la membresía voluntaria de apoyo a PAZO. Precio mensual aprobado; no supone autorización para activar cobros, crear planes PayPal, modificar backend, ni fijar otros términos.

**Decisión adicional del Product Owner (2026-10-13): por ahora SOLO se ofrecerá el plan mensual de USD 2.99.** No crear, mostrar ni configurar una opción anual en el lanzamiento inicial. La eventual incorporación de un plan anual requerirá una decisión explícita posterior del PO; USD 24/año queda como propuesta histórica no aprobada.

Las cifras netas anteriores son estimaciones históricas, no tarifas PayPal verificadas al momento de cobrar; antes de activar pagos, revisar costos y condiciones vigentes.

## 6. Beneficios — cuatro recompensas aprobadas; pendiente implementación

**Nombre comercial APROBADO por Product Owner (2026-10-13): Amigo de PAZO.** Se usará para identificar la membresía de apoyo voluntario de USD 2.99/mes (sin opción anual por ahora). El nombre no aprueba automáticamente ninguna insignia, categoría de fundador, ventaja premium o cambio de `profiles.is_founder`; la implementación visual/entitlement se definirá y validará separadamente.


**Primera recompensa APROBADA por Product Owner (2026-10-13): reconocimiento visual «Amigo de PAZO» en dos ubicaciones.**
- **Perfil social de la mascota:** insignia visible junto a la identidad/fotografía, identificable como «Amigo de PAZO»; no confundirla con un nuevo rango «Fundador».
- **Publicaciones de quien tiene una membresía activa verificada:** una insignia pequeña superpuesta a la **fotografía/avatar del autor** de la publicación. Debe ser legible pero discreta y no tapar la cara/foto, el botón del avatar ni otras señales esenciales. Alcance mínimo: tarjetas de publicaciones del Feed; al implementar, revisar también superficies que presentan publicaciones con avatar de autor (perfil social/comunidades) para mantener consistencia, sin asumir que los comentarios quedan autorizados.
- **Quién la obtiene:** el titular de una membresía mensual activa verificada por el backend. PAZO identifica al autor mediante su identidad de cuenta/mascota, sin equiparar pulsar checkout o respuesta del navegador con suscripción pagada. Si la membresía deja de estar activa, ambos distintivos deben desaparecer tras reflejarse el estado verificado. No asignarlos manualmente ni a cuentas de prueba por defecto.
- **Dependencia técnica real:** `PublicProfileView.tsx` ya tiene indicador legado `Fundador` basado en `get_pet_founder_status`; la experiencia de pago se llamará «Amigo de PAZO». `HomeView.tsx` usa `PostCard` con `post.petAvatar` y actualmente `Post` no incluye entitlement del autor: hará falta lectura/autorización backend segura y contrato de datos apropiado, no una señal inventada en el frontend. Separar semántica comercial de `profiles.is_founder` hasta decidir una transición segura.
- **Estado:** requisito de producto autorizado y documentado, **todavía NO implementado** ni conectado a pagos. No activar PayPal ni modificar esquema/servicio sin su gate de seguridad y autorización técnica. El aspecto definitivo de ambas insignias requiere revisión visual del PO.

**Paquete inicial de CUATRO recompensas APROBADO por el Product Owner (2026-10-13)**. Su intención es agradecer a quienes sostienen PAZO sin crear rangos de superioridad, privilegios funcionales ni paywall.

1. **Insignia «Amigo de PAZO»:** visible en el perfil social de la mascota y, en versión pequeña, superpuesta al avatar/foto del autor de publicaciones. Solo si existe entitlement activo y verificado por backend; ver detalles anteriores.
2. **Personalización especial del perfil:** un conjunto pequeño de estilos puramente cosméticos (fondos suaves, huellas o acentos de color); sin alteración del Feed, alcance, seguridad ni funcionalidades gratuitas. Las variantes específicas se someterán a aprobación visual.
3. **Muro «Gracias, Amigos de PAZO»:** reconocimiento de mascotas de quienes apoyan, exclusivamente con consentimiento explícito de inclusión (opt-in), retiro voluntario y sin publicar la condición de pagador por defecto. Pendiente definir ubicación y UX de consentimiento, así como su política de visibilidad al finalizar suscripción.
4. **Insignia que evoluciona con la constancia:** adornos conmemorativos al alcanzar **3, 6 y 12 meses de apoyo acumulado**; su objetivo es expresar agradecimiento, no jerarquía. Los meses deberán derivarse de historial verificado server-side, no de antigüedad de cuenta, un checkout ni una fecha inferida. Antes de implementarlo quedan pendientes reglas para pagos parciales, reembolsos, pausas, restauración y conservación de hitos tras baja.

**Estado:** estas cuatro recompensas están aprobadas como requisitos de producto, pero no implementadas aún. Su diseño, privacidad, esquema y lectura segura de entitlement necesitan gate técnico/visual independiente y autorización antes de modificar Supabase. No activar cobros. Las ideas de votaciones y acceso anticipado quedan fuera del paquete inicial.

La propuesta debe recompensar apoyo sin romper el producto gratuito.

Otras ideas consideradas para el futuro (NO aprobadas para el paquete inicial): votaciones sobre funciones y acceso anticipado a experimentos.

Evitar por ahora:
- esconder funciones núcleo detrás de pago;
- prioridad en rescate o seguridad;
- beneficios que generen soporte operacional costoso;
- promesa "sin publicidad" hasta definir una política real de ads.

### Dirección visual de insignias aprobada (PO 2026-10-13)

Se eligió el **concepto original** del tablero visual inicial (medallas de huella con banda azul «Amigo de PAZO»), descartando las alternativas posteriores. Se revisaron cuatro niveles y se entregaron PNG en la conversación:
- Inicio: oro con corazón rojo y banda azul;
- 3 meses: bronce con detalle verde, banda azul;
- 6 meses: plata con estrella, banda azul;
- 12 meses: oro, corona y laureles con detalle verde y banda azul.

El PO confirmó «listo, ya quedó». **Los PNG NO están aún en el repositorio**, ni la UI conectada a membresías. No sustituir los assets elegidos por recreaciones aproximadas; confirmar que los archivos exactos se han incorporado antes de programar. Accesibilidad y legibilidad de miniinsignia pendiente en Vite. Siguiente trabajo de producto: decidir temas cosméticos de perfil, a partir de las cinco opciones del primer tablero (Clásico PAZO, Naturaleza, Corazones, Cielo estrellado, Aventura); todavía NO aprobadas como conjunto.

### Fondos cosméticos — diseño aprobado y navegación directa para vista previa (PO 2026-10-13)

El Product Owner aprobó los **cinco estilos del concepto visual original**: Clásico PAZO, Naturaleza, Corazones, Cielo estrellado y Aventura. Inicialmente se implementó una vista previa detrás de una URL especial. El PO señaló que era una UX incorrecta y aprobó **«Mi mascota → Menú y Utilidades → Personalizar perfil»** como navegación normal. Ahora hay una pantalla/panel de preview con datos públicos reales de la mascota activa, cinco fondos + Original; sin URLs secretas, sin acceso por el perfil de otras mascotas, y mensaje visible de **«En desarrollo»**. Los fondos se generan como ornamentos vectoriales locales; no son fotos ni contenido social inventado. No hay almacenamiento, consulta de pago, insignia falsificada, asignación de tema a perfiles ajenos ni cambios de Supabase. **Todavía NO equivale a una personalización funcional para suscriptores.** Requiere prueba y aprobación visual antes de integrarse con entitlement y preferencias seguras.

### Refinamiento visual aprobado: flotación y contraste (PO 2026-10-13)

El PO eligió **flotación vertical suave + deriva lateral/rotación mínima (opción B)** sobre los cinco fondos, sin mover imagen, nombre, controles ni bio. Se añade movimiento decorativo asincrónico ligero y se respeta `prefers-reduced-motion`. El tema «Cielo estrellado» usa tipografía marfil y una superficie azul oscuro continua para garantizar legibilidad donde antes se mezclaban textos verde oscuro sobre azul; temas luminosos conservan los colores actuales. El preview sigue sin posibilidad de guardar ni entitlement.

**Gate de aceptación visual cerrado (PO 2026-10-13):** tras probar los fondos, el usuario declaró «Diseño aceptado, me encanta». Quedan aceptados el conjunto de cinco temas, la navegación normal de `Mi mascota`, la flotación opción B y los ajustes de contraste del commit `2bd00920`. No reabrir el aspecto de este preview sin solicitud expresa; no implica que existan preferencias persistidas ni que el programa de apoyo esté activo. **Siguiente diseño**: muro público voluntario «Gracias, Amigos de PAZO», sujeto a consentimiento explícito revocable, privacidad y aprobación visual independiente.

### Muro de agradecimiento — decisiones visuales aprobadas y corrección de identidad (PO 2026-10-13)

**Opción visual 2 («Tarjetas en cuadrícula») APROBADA** para la pantalla dedicada «Gracias, Amigos de PAZO», a partir de seis propuestas mostradas al PO. Diseño compacto, cálido, sin jerarquía visual entre mascotas. La pantalla contempla **Todos / Recientes / Más tiempo apoyando**. El PO corrigió explícitamente la propuesta inicial: **las personas usuarias NO tienen nombre de perfil, solo sus mascotas**. Cada tarjeta se limita a foto pública de la mascota, **nombre de la mascota**, insignia «Amigo de PAZO» acreditada, y, en el futuro y solo si realmente se guarda, detalles cosméticos opcionales. **No incluir `@usuario`, handles imaginados, nombre humano, email ni claves de cuenta**. No asumir que las mascotas tienen @handle; ningún alias visible si no existe como dato real autorizado. Se permite entrar al perfil social real solo cuando ese flujo sea confirmado.

La presencia en el muro exige **opt-in explícito y revocable, por mascota**; sin publicación automática por apoyar o adquirir una suscripción. Requiere verificar entitlement de la cuenta en backend, seleccionar mascota(s) autorizada(s), consulta pública minimizada, retiro y un estado vacío verídico, no usuarios simulados en producción. «Más tiempo apoyando» significa solo un ordenamiento informativo futuro con historial verificado; **no es un ranking de valor**, ni autorización para mostrar historiales de pago. **Pendientes de definición funcional y aprobación:** entrada exacta a pantalla, detalle de consentimiento y cancelación, período/tiempo acumulado y desempate, ordenamiento real, política de pérdida de elegibilidad, interacción de tarjetas, y regla de retirada/privacidad. Esta aprobación **no autoriza programar backend, activar PayPal ni instalar membresías**; F16 sigue BACKLOG.

### Pantallas de preview aprobadas para desarrollar (PO 2026-10-13)

**Entrada pública**: desde pantalla de Explorar/búsqueda global, con un enlace visible «Gracias, Amigos de PAZO» a vista dedicada en cuadrícula; filtros Todos / Recientes / Más tiempo apoyando, inicialmente sin participantes. **Entrada privada**: desde Mi mascota → Menú y Utilidades → Amigo de PAZO, con un panel de selección por mascota, sin pedir nombres humanos ni aliases. El PO autorizó ambos recorridos. El prototipo usa únicamente elementos de diseño vacíos en el muro público y las mascotas ya cargadas de la propia cuenta en gestión privada; **selecciones exclusivamente visuales, sin escritura**. La UI anuncia explícitamente que **ni hay consentimiento real ni publicaciones**. Aún se requieren backend de entitlement/opt-in por mascota y autorización separada antes de activar guardar/publicar. Probar visualmente con PO.

### Ajuste de acceso discreto en Explorar (feedback PO 2026-10-13)

El primer acceso visual al muro en Explorar se consideró «muy invasivo»: tarjeta promocional salmón de ancho completo con icono grande y dos líneas. Se reemplaza por **enlace secundario compacto a la derecha** «Amigos de PAZO · En desarrollo», pequeño y sin relleno llamativo; solo cuando la búsqueda está vacía. Abre exactamente la misma pantalla y no cambia su cuadrícula aprobada. El PO debe validar el nuevo acceso en Vite. No reintroducir una tarjeta grande ni confundir este ajuste de discoverability con la aprobación del muro.

### Acceso público desde bienvenida — concepto visual aprobado (PO 2026-10-13)

El PO rechazó el elemento promocional en Explorar y propuso **Bienvenida A01**, la primera vista de PAZO para quienes todavía no tienen cuenta. Aprobó el concepto de un **enlace pequeño bajo «Su mundo, más cerca»**, sin tarjeta, banner ni CTA competidor de «Comenzar» o «Ya tengo una cuenta». El enlace «Conoce a los Amigos de PAZO» (EN «Meet the PAZO Friends») abre el muro de cuadrícula en modo vista previa sin iniciar sesión. El regreso vuelve a A01; en pantallas bajas solo el contenido central puede hacer scroll para conservar acciones al pie. Se eliminó por completo el acceso al muro desde Explorar. La selección privada simulada permanece bajo Mi mascota. **Validación visual Vite APROBADA (PO 2026-10-13):** «listo, quedo perfecto». No volver a modificar el enlace secundario ni su ubicación A01 sin petición del PO. **Pendiente:** punto de lectura pública para sesiones ya autenticadas, participación/consentimiento real por mascota, reglas backend de elegibilidad y retirada. No equivale a membresía lanzada. Sin consentimientos almacenados, entitlement real, Supabase ni PayPal.

### Contrato funcional de consentimiento — PROPUESTA, NO APROBADA (2026-10-13)

Se preparó el documento [`docs/PAZO_SUPPORTER_WALL_CONSENT_POLICY_PROPOSAL_20261013.md`](PAZO_SUPPORTER_WALL_CONSENT_POLICY_PROPOSAL_20261013.md) tras aprobación del PO para continuar definiendo reglas. **No es autorización para modificar backend ni aceptación de términos**. Propone: opt-in individual seguro por mascota, lectura pública mínima incluso para visitantes sin sesión, elegibilidad derivada de pago server-side vigente, revocación efectiva, despublicación ante pérdida de cobertura o borrado, sin reaparición automática al reactivar, orden neutral Todos/Recientes/antigüedad y tratamiento explícito de reembolsos/errores. Requiere revisión PO y más adelante gate técnico/privacidad/retención. El estado actual de previews no cambia.

### Política de participación APROBADA; diseño técnico en revisión (PO 2026-10-13)

El PO confirmó «si aprobado» a las reglas expuestas en `docs/PAZO_SUPPORTER_WALL_CONSENT_POLICY_PROPOSAL_20261013.md`: consentimiento individual y revocable, exclusión tras cancelar y finalizar período válido, reautorización después de reactivar, tratamiento de bajas y filtros verificables. **Gate de producto superado, gate técnico/billing aún NO autorizado.** Preflight alojado sin mutaciones corroboró propiedad por `pets.owner_id` y la existencia de `profiles.paypal_subscription_id` legado con lectura pública amplia — no es fuente de entitlement; requerirá revisión de privacidad. Preparado [plan técnico READ ONLY](PAZO_SUPPORTER_WALL_BACKEND_DESIGN_PREFLIGHT_20261013.md), sin crear/aplicar SQL. Entrada A01 del muro continúa aprobada y no debe rediseñarse.

### Base de consentimientos privados — aplicada tras gate PO (2026-10-13)

El PO autorizó primero preparar SQL y pruebas, y después autorizó avanzar con la instalación de **solo los consentimientos privados**. Se aplicó al proyecto Supabase con versión `20261013215221`, fuente canónica `supabase/migrations/20261013215221_f16_supporter_wall_consents_foundation.sql`. La base añade `supporter_private.wall_consents` + RPC autenticadas de consentimiento por mascota; **0 filas tras la instalación**, RLS forzada y sin acceso directo ni consulta pública. La función de comprobación de membresía **devuelve false** y bloquea toda autorización positiva hasta recibir otro gate PO de pagos verificables y texto final de consentimiento. Validación: CI `38473628996` SUCCESS y catálogos Supabase READ ONLY PASS. `Mi mascota` sigue con selección simulada (no utiliza aún la RPC); `is_founder`/`paypal_subscription_id` nunca son fuente de pago. No hay PayPal, cobros, lista pública, insignias activadas, merge ni Vercel.

### Propuesta ES/EN de consentimiento y arquitectura de verificación de pagos (2026-10-13)

Documento [`docs/PAZO_F16_CONSENT_COPY_BILLING_VERIFICATION_GATE_20261013.md`](PAZO_F16_CONSENT_COPY_BILLING_VERIFICATION_GATE_20261013.md) creado por continuación del PO. **PROPUESTA, NO APROBACIÓN FINAL DE COPY NI PAGOS.** Resuelve redacción por mascota, lectura pública sin cuenta, ausencia de datos humanos, retirada, errores, reautorización tras expiración y estados bilingües. Contrato de billing propuesto: webhook auténtico, cobro completo verificado, ledger `paid_through`, refund/reversal, idempotencia y exclusión pública si no está cubierto. PayPal es candidato a evaluar con condiciones comerciales vigentes y la tarifa fija es sustancial con USD 2.99. No crear plan/checkout, no cambiar Supabase, no modificar UI aprobada ni sustituir stub false. Esperar gate específico PO.

### Copy de consentimiento ES/EN APROBADO e implementado visualmente (2026-10-13)

El PO respondió **«aprobado»** al texto propuesto de permiso individual. `GratitudeParticipationPreview.tsx` muestra antes de simular la autorización el aviso completo con nombre real de cada mascota, público incluso sin sesión, sin datos humanos ni de pago, límites de copias externas y revocación. Los botones de confirmación/retirada llevan «Simulación / Preview» y no cambian base de datos ni entitlement. Se conservaron A01, Explorar y módulos de mascotas; CI `38476612061` SUCCESS. **Pendiente:** aprobación visual del nuevo flujo en Vite, retención/Privacy/Terms, elección del proveedor de pagos y habilitación independiente del backend.

## 7. Entitlement

Fuente de verdad:
- backend;
- PayPal webhook verificado;
- estado real de la suscripción consultado server-to-server;
- `profiles.is_founder` / entitlement equivalente nunca se concede solo por callback del navegador.

Estados de PayPal:
- ACTIVE → supporter activo;
- CANCELLED/SUSPENDED/EXPIRED → no activo;
- payment failure → resolver según estado real de la suscripción en PayPal.

## 8. Métricas mínimas futuras

Antes de activar:
- eligible_user;
- pitch_shown;
- pitch_dismissed;
- checkout_started;
- subscription_activated;
- subscription_cancelled;
- supporter_30d_retained.

No almacenar PII de pago en analytics de PAZO.

## 9. Decisiones pendientes

Product Owner debe cerrar antes de reactivar:
- precio mensual: **APROBADO USD 2.99/mes (PO 2026-10-13)**;
- periodicidad: **APROBADO solo mensual, sin plan anual por ahora (PO 2026-10-13)**;
- nombre comercial: **APROBADO — Amigo de PAZO (PO 2026-10-13)**;
- beneficios: **CUATRO APROBADOS** (doble insignia, personalización cosmética, muro opt-in e insignia conmemorativa a 3/6/12 meses acumulados); detalles de diseño, historial verificable y consentimiento pendientes;
- regla exacta de elegibilidad;
- cooldown del pitch;
- dónde puede abrirse manualmente la opción de apoyar.

Hasta entonces:
**pitch OFF.**
