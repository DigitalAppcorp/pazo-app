# PAZO F16 — Consentimiento ES/EN y contrato de verificación de membresía

**Estado:** COPY DE CONSENTIMIENTO ES/EN APROBADO por Product Owner (2026-10-13). Solo está integrado en preview UI sin persistencia; pendientes términos legales definitivos, retención y autorización de pagos.  
**Ámbito:** `Amigo de PAZO` voluntario, USD 2.99/mes (sin plan anual); muro «Gracias, Amigos de PAZO».  
**Precondición verificada:** la base privada `supporter_private.wall_consents` está instalada en Supabase bajo migración `20261013215221`, con RLS forzada, sin registros y con `wall_has_verified_entitlement() = false`.  
**Fuera de alcance:** pago real, PayPal/Stripe configurado, prueba con personas existentes, aplicación de SQL, UI persistente, publicación en el muro, insignias activas, rediseño de bienvenida A01, merge, Vercel.

## A. Texto propuesto para permiso individual por mascota

Los textos fueron **aprobados por el Product Owner como copy de producto**. Su uso como aviso legal final y en consentimientos persistidos **todavía requiere revisión de privacidad/retención y autorización separada**. La versión `wall_consent_v1` del esquema NO equivale a que el texto aquí propuesto esté aprobado/servido al usuario; el backend seguirá bloqueando autorización positiva hasta cerrar ambas piezas.

### Español — pantalla «Participar en el muro»

**Encabezado:** Tus mascotas, tu decisión.  
**Descripción general:** «Gracias, Amigos de PAZO» reconoce a las mascotas de quienes apoyan voluntariamente la aplicación. Apoyar a PAZO no incluye automáticamente a tus mascotas en el muro.

**Aviso de consentimiento individual (nombre obtenido del perfil de la mascota REAL):**

> Si autorizas a **{nombre_mascota}**, su nombre, fotografía pública e insignia «Amigo de PAZO» podrán aparecer en el muro «Gracias, Amigos de PAZO». Cualquier persona podrá ver el muro, incluso sin iniciar sesión. No mostraremos tu nombre personal, correo electrónico ni datos de pago. Puedes retirar este permiso cuando quieras desde «Mi mascota → Amigo de PAZO». Retiraremos a tu mascota de los resultados de PAZO al confirmar el cambio, aunque no podemos eliminar capturas o copias realizadas por terceros.

**Botón afirmativo por mascota:** «Autorizar a {nombre_mascota}».  
**Botón alternativo:** «Ahora no».  
**Estado inicial:** «No participa».  
**Estado durante escritura:** «Confirmando permiso…».  
**Tras confirmación real:** «Participa en el muro».  
**Acción para retirar (sin fricción adicional):** «Quitar del muro».  
**Durante retirada:** «Retirando del muro…».  
**Tras confirmación:** «Ya no aparece en el muro».  
**Si el servidor falla:** «No pudimos guardar el cambio. Vuelve a intentarlo». No mostrar éxito ni cambiar el estado persistido.  
**Sin membresía activa verificada:** «Necesitas una membresía Amigo de PAZO vigente para mostrar mascotas en el muro. Tu selección no se guardará».  
**Cobertura terminada:** «La membresía ya no está vigente. La mascota no aparece en el muro. Si vuelves a apoyar, deberás autorizarla nuevamente».  
**Cuenta con membresía cancelada pero plazo pagado vigente:** «La renovación está cancelada. La participación puede continuar hasta el fin del período pagado y confirmado».  
**Sin mascotas:** «Agrega una mascota para poder elegir si participará».

### English — “Join the gratitude wall”

**Heading:** Your pets, your choice.  
**Introduction:** “Thank you, PAZO Friends” celebrates pets whose families voluntarily support the app. Supporting PAZO never adds your pets to the wall automatically.

**Individual consent notice (using the REAL pet name):**

> If you authorize **{pet_name}**, their name, public photo, and “PAZO Friend” badge may appear on the “Thank you, PAZO Friends” wall. Anyone can view this wall, including visitors who are not signed in. We will not show your personal name, email address, or payment details. You can withdraw this permission at any time from “My pet → PAZO Friend.” We will remove your pet from PAZO’s wall results once the change is confirmed, but we cannot remove screenshots or copies made by other people.

**Affirmative button:** “Allow {pet_name} on the wall.”  
**Alternative:** “Not now.”  
**Initial:** “Not participating.”  
**Saving:** “Confirming permission…”  
**Success:** “Appears on the gratitude wall.”  
**Remove:** “Remove from the wall.”  
**Removing:** “Removing from the wall…”  
**Revoked:** “No longer appears on the wall.”  
**Server error:** “We couldn’t save that change. Please try again.”  
**No verified coverage:** “An active PAZO Friend membership is required to display pets on the wall. Your selection will not be saved.”  
**Expired:** “Your membership is no longer active. Your pet is not shown. If you support PAZO again, you’ll need to authorize your pet again.”  
**Cancelled renewal, paid-through still valid:** “Renewal is canceled. Participation may continue until the end of your confirmed paid period.”  
**No pets:** “Add a pet before choosing whether they will participate.”

### Reglas de UX y privacidad

- **Opt-in separado por mascota**; botón afirmativo y aviso contextual específico, nunca casilla preseleccionada o permiso global. Mostrar el aviso completo y no solo un título.
- No confundir `selected[]` del prototipo con autorización real; hasta activar backend, la pantalla mantiene etiqueta «Vista previa / Preview» y **no muestra mensajes de permiso guardado**.
- Si una mascota carece de foto pública, una representación genérica es admisible; no renderizar imagen privada ni fuente ajena. No se publican `@usuario` o nombres humanos.
- Si hay varias mascotas, cada autorización tendrá registro independiente. Cambiar de propietario, pérdida de cobertura, revocación, baja/moderación deben excluirla del muro aunque su registro anterior exista.
- Revocar no necesita membresía y no debe exigir confirmaciones innecesarias; éxito solo tras confirmación del servidor.
- El derecho a ver el muro públicamente **no** supone que visitantes puedan leer/editar consentimientos. No prometemos eliminar capturas externas o purgar instantáneamente backups.
- No recopilar más PII por esta función; texto legal definitivo y retención de registros siguen pendientes de revisión antes del lanzamiento.

## B. Contrato técnico propuesto de membresía, SIN habilitar pagos

### Autoridad

1. El proveedor **aún no está aprobado definitivamente**. PayPal es un candidato histórico; estudiar comisiones, elegibilidad del producto y alternativas antes de elegir.
2. Crear un intento de suscripción solo desde usuario autenticado y contexto del servidor que ate de forma segura `auth.uid()` a la orden externa. Nunca confiar en `user_id` enviado libremente por el navegador.
3. Para pagos recurrentes de PayPal REST Subscriptions, verificar autenticidad del webhook con su esquema de firma/Webhook ID y **reconciliar el estado actual y pagos cobrados** mediante la API del proveedor. Eventos relevantes incluyen `PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.REFUNDED`, `PAYMENT.SALE.REVERSED`, `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.EXPIRED`, `BILLING.SUBSCRIPTION.SUSPENDED`, `BILLING.SUBSCRIPTION.PAYMENT.FAILED`.
4. Nunca conceder beneficios con solo `ACTIVATED`, URL de éxito, `profiles.paypal_subscription_id`, `profiles.is_founder` ni un botón de pago. Exigir **cobertura pagada confirmada** por proveedor, moneda/importe/plan correctos y atribución segura al dueño.
5. Guardar en esquema privado una representación mínima e idempotente del pago acreditado y período `paid_through` comprobado; no guardar tarjeta, CVV, credentials ni datos de facturación en la UI/public roster.
6. El estado de cancelación de renovación y el derecho efectivo a cobertura son **dos dimensiones distintas**: conservar acceso hasta `paid_through` solo cuando el proveedor y el ledger prueben ese período. Un `CANCELLED` no garantiza por sí solo vigencia hasta la próxima factura.
7. Cobros duplicados/webhooks fuera de orden, fallidos, disputados, reembolsados o reversados no deben extender períodos ficticios; reconciliación idempotente y auditoría de errores sanitizada, con principio *fail closed* ante incertidumbre.
8. `supporter_private.wall_has_verified_entitlement()` se mantiene **false** hasta migración y pruebas específicamente autorizadas. Ninguna membresía es visible públicamente hasta que `entitlement vigente AND consentimiento individual AND ownership vigente AND moderación` se satisfagan en consulta server-side.
9. Contabilización de insignias 3/6/12 meses solo con períodos efectivamente pagados y no revertidos; política de meses parciales/condiciones de reembolso por aprobar. No derivar de la antigüedad de cuenta.
10. Cancelación, acceso a recibos y retiro de consentimiento deben tener recorridos separados, accesibles y sin dark patterns. Ninguna característica gratuita principal de PAZO se bloqueará.

**Esquema de funcionamiento sujeto a autorización:**

`Proveedor de cobros → webhook HTTPS verificado → conciliación servidor → ledger privado de cobertura → entitlement vigente → consentimiento por mascota → listado público minimizado`.

### Referencias oficiales revisadas (2026-10-13)

- PayPal Subscriptions Webhooks: https://developer.paypal.com/subscriptions/webhooks/
- PayPal webhook security: https://developer.paypal.com/api/rest/webhooks/rest/
- PayPal Subscriptions REST API: https://developer.paypal.com/api/subscriptions/v1
- PayPal merchant fees US (actualizado 2026-10-01): https://www.paypal.com/us/business/paypal-business-fees

**Alerta económica:** PayPal publica para **PayPal Checkout doméstico estándar** `3.49% + $0.49 USD` por operación en EE. UU. Es una referencia, **no una cotización confirmada para la implementación concreta de Subscriptions, ni para todos los métodos de pago o merchants**. Con una membresía de $2.99 importa comparar el cargo fijo, condiciones de cuenta, tarifas de pagos recurrentes, devoluciones y pagos internacionales. No crear ningún producto/plan pago sin autorización PO y revisión de condiciones vigentes. Productos opcionales de facturación pueden tener cargos mensuales; no contratar.

### Gate pendiente (solicitar al PO)

- **G1 Texto:** aprobar/corregir aviso ES/EN y nombres de acciones; después podrá diseñarse su estado real en Vite sin cambiar A01.
- **G2 Proveedor:** elegir explícitamente PayPal/otra pasarela después de contrastar elegibilidad, comisiones, cancelación y pruebas sandbox; definir la cuenta empresarial receptora.
- **G3 Legal/privacidad:** política de retención de consentimientos, Privacy Policy/Terms y reconciliación del SOP de baja.
- **G4 Implementación:** autorización separada antes de crear plan/producto en PayPal, claves, Edge Functions/webhooks, SQL de entitlements o activar cobros.
- **G5 Navegación:** fijar acceso público al muro para usuarios que ya iniciaron sesión sin reintroducir el enlace intrusivo en Explorar ni alterar la bienvenida aprobada.

**Estado final de este documento:** copy bilingüe aprobado e integrado en vista previa no persistente, commit `32551f5e`, CI `38476612061` SUCCESS. El PO todavía no validó visualmente la nueva interacción en Vite y no autorizó pagos ni consentimiento real. Contrato de billing permanece propuesta. PR #44 DRAFT; F16 no publicada.
