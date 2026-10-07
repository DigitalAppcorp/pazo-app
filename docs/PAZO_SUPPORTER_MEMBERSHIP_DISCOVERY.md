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

## 5. Precio — recomendación provisional

La versión anterior usaba **USD 2/mes**.

Con la tarifa pública vigente de PayPal Checkout/recurring en EE. UU. (3.49% + USD 0.49 por transacción), el costo fijo pesa demasiado en un cobro de USD 2.

Aproximación antes de impuestos/otros cargos:
- USD 2.00 → neto aproximado USD 1.44;
- USD 2.99 → neto aproximado USD 2.40;
- USD 3.99 → neto aproximado USD 3.36.

Recomendación inicial para validar:
- **USD 2.99/mes**, y
- considerar **USD 24/año** como opción de mejor eficiencia de fees.

Esto NO está aprobado todavía.

## 6. Beneficios — recomendación provisional

La propuesta debe recompensar apoyo sin romper el producto gratuito.

Candidatos de bajo riesgo:
- insignia visual de Supporter/Fundador;
- reconocimiento de miembro temprano;
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
- precio: 2.00 vs 2.99 vs otro;
- anual sí/no;
- nombre: Supporter / Fundador / Círculo de Fundadores / otro;
- beneficios incluidos;
- regla exacta de elegibilidad;
- cooldown del pitch;
- dónde puede abrirse manualmente la opción de apoyar.

Hasta entonces:
**pitch OFF.**
