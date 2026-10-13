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

## 6. Beneficios — primera recompensa aprobada, adicionales pendientes

**Nombre comercial APROBADO por Product Owner (2026-10-13): Amigo de PAZO.** Se usará para identificar la membresía de apoyo voluntario de USD 2.99/mes (sin opción anual por ahora). El nombre no aprueba automáticamente ninguna insignia, categoría de fundador, ventaja premium o cambio de `profiles.is_founder`; la implementación visual/entitlement se definirá y validará separadamente.


**Primera recompensa APROBADA por Product Owner (2026-10-13): reconocimiento visual «Amigo de PAZO» en dos ubicaciones.**
- **Perfil social de la mascota:** insignia visible junto a la identidad/fotografía, identificable como «Amigo de PAZO»; no confundirla con un nuevo rango «Fundador».
- **Publicaciones de quien tiene una membresía activa verificada:** una insignia pequeña superpuesta a la **fotografía/avatar del autor** de la publicación. Debe ser legible pero discreta y no tapar la cara/foto, el botón del avatar ni otras señales esenciales. Alcance mínimo: tarjetas de publicaciones del Feed; al implementar, revisar también superficies que presentan publicaciones con avatar de autor (perfil social/comunidades) para mantener consistencia, sin asumir que los comentarios quedan autorizados.
- **Quién la obtiene:** el titular de una membresía mensual activa verificada por el backend. PAZO identifica al autor mediante su identidad de cuenta/mascota, sin equiparar pulsar checkout o respuesta del navegador con suscripción pagada. Si la membresía deja de estar activa, ambos distintivos deben desaparecer tras reflejarse el estado verificado. No asignarlos manualmente ni a cuentas de prueba por defecto.
- **Dependencia técnica real:** `PublicProfileView.tsx` ya tiene indicador legado `Fundador` basado en `get_pet_founder_status`; la experiencia de pago se llamará «Amigo de PAZO». `HomeView.tsx` usa `PostCard` con `post.petAvatar` y actualmente `Post` no incluye entitlement del autor: hará falta lectura/autorización backend segura y contrato de datos apropiado, no una señal inventada en el frontend. Separar semántica comercial de `profiles.is_founder` hasta decidir una transición segura.
- **Estado:** requisito de producto autorizado y documentado, **todavía NO implementado** ni conectado a pagos. No activar PayPal ni modificar esquema/servicio sin su gate de seguridad y autorización técnica. El aspecto definitivo de ambas insignias requiere revisión visual del PO.

La propuesta debe recompensar apoyo sin romper el producto gratuito.

Candidatos de bajo riesgo:
- **insignia «Amigo de PAZO» en perfil social + miniinsignia sobre avatar de autor en publicaciones: APROBADA**;
- reconocimiento de miembro temprano adicional (no aprobado);
- acceso anticipado a experimentos opcionales;
- capacidad de votar/priorizar ideas;
- cosméticos de perfil no funcionales.

Evitar por ahora:
- esconder funciones núcleo detrás de pago;
- prioridad en rescate o seguridad;
- beneficios que generen soporte operacional costoso;
- promesa "sin publicidad" hasta definir una política real de ads.

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
- primera recompensa visual: **APROBADA (perfil social + avatar en publicaciones)**; beneficios adicionales (si los hay), pendientes;
- regla exacta de elegibilidad;
- cooldown del pitch;
- dónde puede abrirse manualmente la opción de apoyar.

Hasta entonces:
**pitch OFF.**
