# PAZO F16 — FAST TRACK de cobros reales con CUATRO beneficios (MVP)
**Fecha:** 2026-10-17. **Autorización de producto:** PO: «va entonces hagamos eso lo mas antes posible», después de precisar que **se conservan los cuatro beneficios**. **No** es una autorización para habilitar cobros Live, cambiar credenciales, desplegar, fijar precio nuevo, procesar dinero o modificar hosted. **PR #44 DRAFT**, rama `f13/section-titles-20261012`.

## Objetivo comercial inalterado
Solo **US$2.99 mensuales**, suscripción voluntaria **Amigo de PAZO**, sin plan anual y sin quitar funciones gratuitas.

**Entrega exigible al cobrar:**
1. Insignia Amigo de PAZO en perfil social y junto al avatar en publicaciones, desde entitlement server-side.
2. Cinco fondos cosméticos aprobados: Clásico, Naturaleza, Corazones, Cielo estrellado y Aventura. Guardado persistente por mascota propia, visualización pública solo con cobertura verificada y posibilidad de restablecer al diseño normal.
3. Muro público «Gracias, Amigos de PAZO»: mascota visible **solo con permiso individual explícito y vigente del propietario** Y entitlement verificado; retirar permiso cuando quiera, incluso después de cancelar.
4. Medallas 3/6/12 por **períodos mensuales distintos completados/pagados y no revertidos**, sin sumar failed/pending/duplicados/refunds/disputas ni futuras mensualidades.

**No reemplazar estas recompensas con un mero botón de donación** sin una decisión posterior y explícita del PO.

## Diagnóstico real: no confundir QA con Live
- `supabase/functions/f16-paypal-supporter/index.ts` es **Sandbox QA exclusivamente**, con `QA_CHECKOUT_RELEASE_APPROVED=false`, allowlist de cuenta y plan Sandbox inmovilizado. **No** copiar/renombrar esta función y sustituir solo `sandbox` por `live`.
- `f16-paypal-supporter-account` es también cuenta Sandbox; estado/cancelación respaldados por GET/POST PayPal Sandbox. UI `SupporterAccountManagement.tsx` presume `paidThrough:null`, no beneficio real.
- Hosted `supporter_private.paypal_payment_entries` permite solo `entry_state = 'uncredited'|'blocked_reversal'`, y no almacena inicio/fin de cada servicio facturado. No puede calcular automáticamente períodos pagados solo de una venta.
- Hosted `supporter_private.wall_has_verified_entitlement(owner)` sigue siendo `SELECT false`; no habilitar manualmente, ni publicar un muro falso. RPC reales de opt-in/opt-out por mascota ya existen y exigen Auth/ownership; el opt-in además exige entitlement.
- Venta QA P44 y eventos existentes no acreditan períodos contractuales reales; el texto QA aceptado expresamente excluye recompensas. No convertirlos retroactivamente ni repetir compra.
- PayPal para Live exige app/plan y webhook **Live** verificados para el merchant del PO, captura de términos y cancelación online. La mera aprobación de suscripción o status `ACTIVE` nunca da entitlement.

## Código nuevo de este fast track, aún NO activado
- `src/features/supporter/components/SupporterWallConsentSettings.tsx`: pantalla real de permiso individual, GET auth server, lectura `pazo_wall_my_consents`, opt-in `pazo_wall_consent_enable`, opt-out `pazo_wall_consent_disable`, lectura posterior de confirmación, fallos cerrados. Solo muestra mascotas propias; no registra consentimiento en frontend. El backend actualmente bloquea habilitar nuevos permisos por falta de períodos pagados.
- Integración en `SupporterAccountManagement.tsx` **solo** con el interruptor `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED === 'true'` (apagado por defecto). No activar con dinero inexistente. Retirada de consentimiento sigue independiente de entitlement en RPC.
- `supabase/functions/f16-paypal-webhook/pazoSupporterBenefitsV1.mjs`: proyección solo servidor que exige propietario autenticado, ledger/merchant y ciclo conciliados. Aplica badge perfil/post, cinco temas, muro bajo opt-in, hitos 3/6/12 de períodos distintos, conserva período pagado si PayPal ya canceló, no extiende fechas por `ACTIVE`. No recibe evidencia del navegador, no realiza writes y **todavía no está conectada a datos alojados**.
- `src/features/supporter/testing/f16MvpServerBenefits.test.mjs`: casos negativos de owner, período, refunds/disputas, duplicados, cancelación y vencimiento.
- Se identificó en Biblioteca el arte escogido `Insignias brillantes Amigo de PAZO.png` (con 4 emblemas). **No está en el repo**, pero se extrajeron cuatro PNG transparentes del original SIN recrearlos; se entregarán al operador para integrarlos como assets cuando cierre UI. No substituirlo por iconos inventados.

## Camino crítico: cuatro tareas, sin expandir el alcance de F16
### A. Período de servicio server-side verificable — BLOQUEANTE
Instalar solo un modelo privado mínimo de períodos pagados (venta PayPal regular COMPLETED del merchant y cuenta correctos, correlación Auth/intent, oferta/consentimiento, inicio/fin de período y estado de reversals), **antes** de dar beneficios. Reusar verificadores, inbox, store y contratos P05/P06/P22/P24/P29/P32 ya probados. La nueva proyección debe LEER ese dato verificado; no generar `paidThrough` en navegador ni calcular +30 días; no conceder por P42 sin llave, QA o click.
**Evitar trabajo innecesario:** esto puede desarrollarse como servicio mínimo separado, sin exigir acabar cada experimento histórico de P42, pero necesita revisión de RLS, idempotencia y efectos monetarios propios. No borrar ni relajar gates históricos para saltar control.

### B. Cuatro recompensas visibles y persistentes
- Usar lectura pública únicamente del atributo de insignia derivado por servidor; no confundir con `profiles.is_founder`.
- Guardar tema por mascota tras autorización server-side, prohibir cambiar otro perfil, y volver a tema normal si coverage caduca. Mantener UI original PO aprobada.
- Muro público: publicar solo `consent + entitlement`, sincronizar retiros inmediatamente; nunca exponer nombre/ID personal, correo ni montos. Conectar UI ya implementada.
- Hitos: 3/6/12 **ciclos independientes liquidados**; período devuelto no cuenta; sin prometer hitos cuando el ciclo no sea acreditable. Integrar PNG exactos elegidos.
No publicar badges/cosméticos/muro con datos falsos ni estado de compra inferido.

### C. Checkout/cancelación Live separada, copy aprobada ES/EN
Reusar orquestación Auth/owner + intent + aceptación durable e idempotente, pero configurar app/plan Live separadamente con autoridad privada del merchant. Verificar precio, moneda, ciclo, cliente PayPal, destinatario, recibo y URL de retorno. Mostrar casilla sin preselección y entrega real de acuse retenible. La cuenta debe ofrecer cancelación online inmediata y verificable (sin cancelar necesariamente período pagado), acceso tras salir del checkout, reintentos seguros. Preparar avisos anuales y cambios de precio y decisión de retención/tributación conforme a California.

### D. Único go/no-go Live final
Solo después de PASS integral Sandbox de caso pagado, renovación/cancelación, rechazo pago fallido, refund/disputa y comprobación de cuatro beneficios, revisión de copia comercial/legal y configuración Live independiente. Ejecutar una única transacción Live supervisada por PO con costo real conocido y consentimiento; confirmar merchant receipt/cancel/beneficios y poder deshabilitar la ruta de compra. Luego habilitar público con GO explícito.
**No habilitar PayPal Live en este gate de desarrollo**. No merge/deploy sin revisión del PO.

## No reabrir
- P43, P43B, P42-WRITE: intentos ya consumidos. NO relanzarlos.
- `P42-EDGE-GET-20261017-01`: READ ONLY autorizado en gate previo; estado local pendiente del operador. Este fast track **no necesita** esperar a esa prueba para construir los cuatro beneficios. No escribir secrets por el GO antiguo.
- P44 QA no se compra de nuevo, no se transforma en período acreditado.
- No migraciones hosted, emisión nueva de claves/Live, créditos, checkout ni beneficios reales bajo el GO de programación.

**Estado resumido:** código de primer slice + proyección server-only en PR DRAFT; cuatro beneficios aún NO conectados a pagos reales. La próxima intervención técnica debe ser **A + B**, no otra auditoría P42, antes de pasar a C. Cerrado solo cuando se compruebe con evidencia de merchant real y QA visual del PO.
