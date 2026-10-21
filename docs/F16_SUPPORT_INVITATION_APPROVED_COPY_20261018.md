# PAZO F16 — Invitación Amigo de PAZO: copy definitivo aprobado
**Fecha:** 2026-10-18. **Product Owner:** aprobó exactamente el texto tras varias iteraciones y dio «ok go» para integrarlo. Esta decisión es de comunicación y jerarquía visual, no de beneficios financieros.

## Copy en la invitación (ES — aprobado literal)
**Ayuda a que PAZO siga creciendo**

> PAZO está dando sus primeros pasos y aún tenemos mucho por construir. Con tu apoyo podemos seguir cuidando este pequeño mundo, mejorándolo y creando nuevas experiencias para ti, tu mascota y toda nuestra comunidad.

**US$2.99 al mes**

**Quiero apoyar a PAZO** (acción de checkout, con indicación explícita de PayPal y consentimiento previo)

*PAZO seguirá siendo gratis para todos.*

**Como agradecimiento** (encabezado de los cuatro reconocimientos).

La meta es invitar a contribuir al crecimiento de PAZO; los beneficios son una forma de agradecimiento, no el motivo principal de la suscripción. La invitación no debe usar lenguaje de necesidad de dinero, presión al pago, o copiar palabras de una explicación del PO como «mantener el proyecto vivo». La redacción ya se aprobó: **no reescribir sin nuevo GO**.

## Medallas (copy cálido ya aprobado previamente)
Título: **Tu apoyo merece reconocimiento**.

> PAZO agradece el tiempo que llevas apoyando nuestra comunidad. Con el paso del tiempo, tu mascota recibe nuevos reconocimientos que reflejan ese apoyo.

El frontend no debe exigir visualmente «meses pagados y verificados». **Los requisitos financieros de 3/6/12 ciclos completados, acreditados y no revertidos siguen siendo obligatorios en Supabase**; no confundir corrección de copy con excepción comercial.

## Implementación en el PR #44 DRAFT
- `src/features/supporter/components/SupporterOfferB.tsx`: hero móvil con título + texto exacto + precio; colaboración voluntaria y método de pago antes de la sección secundaria `Como agradecimiento`; filas con los mismos cuatro beneficios y sin chevrons de venta; tamaño tipográfico legible alineado a PAZO.
- `src/features/supporter/components/SandboxCheckoutQaPanel.tsx`: CTA principal `Quiero apoyar a PAZO`; texto secundario `Continuar con PayPal`; se conservan casilla de consentimiento, texto de renovación, precio, términos V2 y protección contra dos checkout. El CTA `retry` sigue distinguiendo reintentos gestionados.
- `src/features/supporter/components/SupporterAccountManagement.tsx`: nota `PAZO seguirá siendo gratis para todos.` legible tras la CTA; «Ahora no» permanece voluntario, después de sección de agradecimiento.
- `src/features/supporter/components/SupporterBenefitsHome.tsx`: copy cálido de medallas.
- `src/features/supporter/testing/f16SupporterProductExperience.test.mjs`: aserciones de texto español exacto, orden de bloques, consentimiento y no alteración de términos.

**Seguridad:** no se modificó `sandboxBenefitsOfferV2.mjs`, `offer.exactCopy`, términos contractuales, digest, Supabase, Edge, cancelación, cobros, flags, `main` ni PayPal Live. Texto promocional ≠ texto contractual; las condiciones V2 siguen disponibles y explícitas. No activar Live ni publicar cambios hasta aprobación visual del PO y scope/gates.

**Gate:** `F16_SUPPORT_INVITATION_COPY_IMPLEMENTED_BRANCH_VISUAL_PO_REVIEW_PENDING`.

## Validación técnica final
Código funcional `b651ea427cb3bfadfbcb4b281a921ae351ef29eb`: GitHub Actions **7/7 SUCCESS**, CI (compilación, pruebas y contrato de copy) + seis laboratorios PostgreSQL. Una prueba obsoleta que exigía el eslogan anterior fue corregida; no se cambió el copy aprobado. Ningún cambio de cobro, elegibilidad, PayPal, Supabase ni entorno Live. La prueba **visual en Vite local** y la aprobación del resultado renderizado por el PO siguen pendientes.

**Gate actualizado:** `F16_SUPPORT_INVITATION_COPY_CODE_7_OF_7_PASS_VISUAL_REVIEW_PENDING`.
