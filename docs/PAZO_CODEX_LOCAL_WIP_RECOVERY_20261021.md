# Recuperación del trabajo local de Codex — 21-oct-2026

**Fuente:** archivo `pazo-codex-recuperacion.zip` adjunto por el Product Owner a ChatGPT después de agotarse los créditos Codex. Contiene cuatro entradas. Archivo privado del PO; este informe NO incluye secretos ni URL de acceso al ZIP.

**Worktree local original (NO TOCAR con reset/clean):**
`C:\Users\osori\Downloads\Nuevo pazo app\pazo-live-reconciler`,
rama `f16/live-signed-sale-reconciler-20261021`, HEAD `23d65fdbe0035e193eb00cfb5d50fa3aea74983e`.
Cambios locales observados al recuperar:
- M `docs/PAZO_F16_LIVE_CHECKOUT_COMPLETION_20261021.md`
- M `scripts/f16-live-gateway-disposable-lab.sql`
- M `scripts/f16-live-immutable-offer-disposable-lab.sql`
- D `supabase/migrations/20261021164222_pazo_f16_live_immutable_bilingual_offer.sql`
- NUEVO `scripts/f16-live-owner-slot-disposable-lab.sql`
- NUEVO `supabase/migrations/20261021165838_pazo_f16_live_immutable_bilingual_offer.sql`
- NUEVO `supabase/migrations/20261021170408_pazo_f16_live_owner_checkout_slot.sql`

**Hashes SHA-256 de las entradas ZIP recuperadas:**
- `cambios.patch`: `3e4fcc021b2af074f967748b828a85ab97144d8f6d8719e0b55011e0257b66c8`
- `20261021165838_pazo_f16_live_immutable_bilingual_offer.sql`: `c01495a3b98804909c48e4f2e851dbaae4ea85431df99292ad222ba8b4acd7c4`
- `20261021170408_pazo_f16_live_owner_checkout_slot.sql`: `9edc12bdfa15ced4f9be142d339bd25ef71b722b1eac51cd9c64117d020c7bd7`
- `f16-live-owner-slot-disposable-lab.sql`: `eee06b3c62c622bf567ea814bfad6dafa73d14b685f662d697986e25b0bd5536`

**Hallazgos:**
1. La migración de oferta bilingüe `20261021165838` YA FIGURA APLICADA en Supabase; GitHub PR #55 tenía la fuente antigua bajo `20261021164222`. Codex corrige el nombre para que coincida con historia real. **Nunca aplicar esa oferta por segunda vez.**
2. La nueva migración del propietario es sustancial: una intención Live abierta por propietario, guardas de doble click/concurrencia, `provider_request_origin` inmutable, recuperación con lease, cierre del abandono no reclamado y binding firmado atómico del evento CREATED. Tiene guardas de hash de funciones existentes y pruebas PG17 desechables. **AÚN NO APLICADA; no inventar equivalencia con PR #56.**
3. PR #56 (otro agente) añade una RPC de slot y trigger alternativos que solapan la migración Codex. PR #56 queda HOLD / NO MERGE: debe descartarse o reconciliarse, no instalar dos controles de dueño incompatibles.
4. PR #58 adapta el checkout JS al nuevo claim con `p_origin` original; depende de instalar migración Codex tras revisar y ejecutar su laboratorio, y debe probarse contra sus RPCs. No activar cargos.
5. PR #57 ya fusionado en F13 y migración `pazo_f16_live_verified_benefit_projection` aplicada: lecturas account/pet consultan primero períodos Live verificados; 0 períodos reales a la fecha, kill-switch ON.
6. PR #55 de Codex sigue DRAFT; lo demás de Codex ya integrado en PR #54. Mantener `main` sin cambios.

**Orden de continuación:** recuperar/persistir la totalidad de los cambios locales, ejecutar `f16-live-owner-slot-disposable-lab.sql` con PostgreSQL17 aislado y cierre de laboratorio, revisar hashes contra catálogo alojado, migrar solo lo que falte, enlazar adapters de `claim_with_origin`, completar lectura/recuperación original PayPal, oferta UI, retorno HTTPS/PWA, beneficios, cancelación, privacidad y control de release. No dar GO Beta/PayPal Live por CI sintético. El PO solo ingresará claves en Admin y autorizará canary real al final del desarrollo.

**Regla de seguridad:** ninguna operación local destructiva. No admitir dos suscripciones por requestKeys diferentes tras respuesta incierta; no suponer que un PayPal 404, retorno o suscripción ACTIVE demuestra ausencia/pago. Las credenciales solo en Admin MFA+Vault; saldo PayPal no es requisito.
