# Issue85 — conciliación original QA y apertura L1

Autorización: issue85 y petición directa del PO. GO financiero L1 existente; MFA sigue obligatorio dentro de PAZO. No se solicita de nuevo producto/Sandbox/QA visual ya aprobada. Rama técnica derivada de F17 67fbf675, PR81 draft main sin cambios.

Preflight alojado: 8 Auth prebeta, 1 elegible, campaña inactive/gate false/L1cap1, canaryrev1/gen1, 1 intent bound abierto, 0 períodos pagados. CREATED firmado retenido en claim1/worker_review_required; worker fresco e infraestructura compatible. No inferir inexistencia de cargos remotos por ledger local vacío. Advisors sin ERROR, mismos avisos #84.

Hallazgo técnico: al iniciar sin elegibles no quedan invitaciones que expiren; el pump actual repone solo por expired_count, por lo que nunca invita a futuros usuarios. Corregir presupuesto inicial duradero de cinco invitaciones, sin cambiar FIFO ni 72h.

Lectura financiera privada: reutilizar el worker/capacidad y Vault de generación original; solo OAuth técnico y GET originales de suscripción/plan/transacciones/evento, con respuesta agregada sin identificadores ni secretos. Sin cancelación ni CREATE en auditoría. Conservar los receipts y el intent original. Las nuevas rutas no autorizan start ni esquivan MFA.

Estados finales y evidencia se completan tras probar/desplegar; L1_ACTIVATED no se afirma mientras permanezcan bloqueos/MFA pendiente.

Auditoría técnica inicial implementada: RPC service-only de scope para canary prebeta bound; dispatcher DB-only usa la capacidad original **de un solo uso** (no Vault reusable en cola); worker valida esa admisión y lee proveedor sin finanzas ni mantenimiento. PG17 real: scope original, real excluido, ACL y rol malicioso denegados PASS; casos offline de cero transacciones, venta existente, respuesta incompleta/duplicada, URL de paginación ajena, binding incorrecto y timestamp ausente. Ningún timestamp se inventa desde create_time.

CLI2.122 escribió telemetría en home read-only y falló antes de crear archivo; se usó su opción estándar DO_NOT_TRACK=1 para generar la migración normalmente, sin cambiar HOME/seguridad. Los primeros tests de subprocess fallaron EPERM del sandbox; se reejecutan con permiso de ejecución/red del entorno, sin pruebas PayPal reales.

## Cohorte y primer lote sin usuarios reales

Migración CLI `20261023235247_pazo_f16_real_cohort_initial_invitation_budget.sql` preparada: etiqueta privada prebeta con cutoff inmutable, exclusión de elegibilidad/verificación/promoción/admisiones y métricas, ingresos admin filtrados sin borrar pagos; notices bloqueados para QA tanto al encolar como al reclamar/entregar. Panel muestra conteos de QA excluidos y reales elegibles cuando el servidor los devuelve.

PostgreSQL17 real PASS: todas las cuentas QA excluidas aunque tengan registros financieros sintéticos válidos; ingresos/compradores reales0; tabla FORCE/ACL; start con cero cuentas reales y cero invitaciones; al llegar ocho cuentas reales se envían solo cinco invitaciones72h, pump repetido no duplica y una expiración repone solo una; etiqueta sobrevive corrección de created_at. El set-up que cierra filas o simula receipts vive exclusivamente en f14_synthetic descartable, no se ejecuta ni se copia al hosted. No confundir prueba backend service-only con MFA del titular.

Auditoría original instalada desde 772a55a3 (CI40042076434 PASS), migración API y worker v6. Diagnóstico posterior desde 3cf85baa (CI40042416680 PASS), worker v7: binding/Vault/OAuth se verifican, pero GET original de suscripción aún no validado; se añade clasificación HTTP acotada para diferenciar respuesta/protocolo sin exponer cuerpo proveedor. Campaña permanece inactive y evento HELD, sin ocultar esa incertidumbre.

La clasificación histórica real de una admisión queda fijada al insertarla (trigger privado e inmutable). Una cuenta real borrada conserva el consumo acumulado; QA borrada nunca se vuelve real por ausencia de Auth. PG17 prueba ambas eliminaciones y el rechazo de alterar esa clasificación. Ninguna eliminación de prueba se ejecuta fuera del laboratorio.

**Bloqueo financiero verificado 24-oct:** con worker v8 / SHA5ad4309e (CI40042708126 PASS), Vault/binding/OAuth originales válidos, el GET de la suscripción devuelve HTTP404 (`providerFailure=http`, fase subscription_get). No equivale a CANCELLED/EXPIRED y no se ha cerrado/reintentado el evento ni se ha aprobado gate/inicio. Se pidió al PO comprobar únicamente el estado de esa solicitud en su PayPal Business Live, sin aprobarla ni compartir credenciales. Continúa el trabajo técnico independiente.

## Recheck explícito y certificado técnico preparados

Tercera migración CLI `20261024000800_pazo_f16_original_qa_recheck_and_hosted_gate_certificate.sql`: audit de revisión que conserva diagnóstico/attempts previos; requeue solo de CREATED firmado y owner QA canary original, bajo batch autenticado/processing ON, nonce y timestamp remoto genuino; no resetea attempts ni marca processed. El worker vuelve a usar el claim/receipt/GET/lifecycle writer original y solo cierra por el closer ya existente después de un segundo GET terminal, sin pagos/inbox/obligaciones pendientes. ACTIVE, 404, pago, timestamp ausente o firma no corroborada mantienen STOP. No hay CANCEL/CREATE del proveedor en esa ruta.

El certificado técnico se guarda solo mediante función privada de postgres, con hashes externos verificados por operador y comprobaciones nativas de legado0/inbox procesado/holds/incidentes0, worker/webhook/origen canónico/switch y política QA. Nonce+revisión, origen y builds registrados. Mantiene campaña inactive/canary: no sustituye GoTrue/TOTP/CAS de Administración. PG17 prueba tanto rechazo por HELD como certificación después de datos resueltos sintéticos, sin arrancar campaña; retries idempotentes y tope3 preservados.

La auditoría ahora corrobora plan y evento originales independientemente del GET de suscripción, para no confundir falta de recurso actual con falta de evidencia firmada histórica. No se ejecutará recheck/close/certificado alojado si esa lectura sigue incompleta.
