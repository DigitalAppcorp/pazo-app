# PAZO F16 — reconciliación P28 vs ruta de lanzamiento (REVIEW ONLY)
Fecha: 2026-10-15. Rama f13/section-titles-20261012; PR #44 DRAFT.

## Hechos
- P28 es una ruta para **revisión administrativa de eventos PayPal Sandbox históricos**; NO produce pago acreditado, período contractual ni beneficios.
- P28 NO-GO técnico por frontera criptográfica/verificación alojada y gestión de claves, aunque prototipos offline Ed25519 y HMAC han pasado CI.
- P21 worker alojado permanece OFF. La auditoría P28 alojada instalada solo registra solicitudes; lector histórico NO instalado.
- Según F16-P25 y handoff, la **facturación prospectiva** necesita: P06 consentimiento ES/EN publicado y aceptado, referencia Sale verificada por Merchant GET, períodos contractuales comprobados, refunds/disputas y ledger idempotente. Estas obligaciones siguen pendientes con independencia de P28.
- No hay justificación comprobada de que la revisión P28 histórica sea requisito de la primera compra prospectiva con nueva cuenta descartable y cutoff P21 futuro. Tampoco está aprobado omitir P28 de la DoD de F16.

## Separación de dependencias
Ruta histórica P28: huella/auditoría -> lector administrativo limitado -> eventual revisión de 8 eventos QA anteriores; NO reconocer como pagos.
Ruta prospectiva P06/P21-P27: aceptación real -> buyer/test autorizado -> provider Sale GET autenticado -> conciliación de reversos/disputas -> ledger idempotente/cobertura -> beneficios solo con evidencia.
La segunda ruta no debe reusar los 8 históricos ni el mecanismo P28 como sustituto de pruebas de cobro.

## Gate propuesto al PO
**Decisión pendiente**: ¿P28 es obligación para lanzamiento de membresía prospectiva o puede permanecer deshabilitado como revisión administrativa posterior?
- Si se difiere: solo cambiar prioridad en planificación con GO explícito del PO; NO marcar F16 completada ni abrir pagos.
- Si es imprescindible: mantener NO-GO hasta tener verificación SQL independiente y gestión real de claves/rotación aprobada.

## Trabajos seguros mientras se decide
1. Actualizar inventario de gates de P06 (copy, consentimiento durable, retención).
2. Reconciliar P26 evidencia merchant y refunds/disputas, sin API real ni nuevas compras.
3. Preparar matríz de pruebas para pagos prospectivos y ledger con datos sintéticos.
4. Mantener worker OFF, PR DRAFT, RPC histórica ausente, PayPal/beneficios desactivados.

No hay DDL, secretos, endpoint, checkout, pagos ni consumidores nuevos autorizados por este documento.
