# Issue85 — conciliación original QA y apertura L1

Autorización: issue85 y petición directa del PO. GO financiero L1 existente; MFA sigue obligatorio dentro de PAZO. No se solicita de nuevo producto/Sandbox/QA visual ya aprobada. Rama técnica derivada de F17 67fbf675, PR81 draft main sin cambios.

Preflight alojado: 8 Auth prebeta, 1 elegible, campaña inactive/gate false/L1cap1, canaryrev1/gen1, 1 intent bound abierto, 0 períodos pagados. CREATED firmado retenido en claim1/worker_review_required; worker fresco e infraestructura compatible. No inferir inexistencia de cargos remotos por ledger local vacío. Advisors sin ERROR, mismos avisos #84.

Hallazgo técnico: al iniciar sin elegibles no quedan invitaciones que expiren; el pump actual repone solo por expired_count, por lo que nunca invita a futuros usuarios. Corregir presupuesto inicial duradero de cinco invitaciones, sin cambiar FIFO ni 72h.

Lectura financiera privada: reutilizar el worker/capacidad y Vault de generación original; solo OAuth técnico y GET originales de suscripción/plan/transacciones/evento, con respuesta agregada sin identificadores ni secretos. Sin cancelación ni CREATE en auditoría. Conservar los receipts y el intent original. Las nuevas rutas no autorizan start ni esquivan MFA.

Estados finales y evidencia se completan tras probar/desplegar; L1_ACTIVATED no se afirma mientras permanezcan bloqueos/MFA pendiente.

Auditoría técnica inicial implementada: RPC service-only de scope para canary prebeta bound; dispatcher DB-only usa la capacidad original **de un solo uso** (no Vault reusable en cola); worker valida esa admisión y lee proveedor sin finanzas ni mantenimiento. PG17 real: scope original, real excluido, ACL y rol malicioso denegados PASS; casos offline de cero transacciones, venta existente, respuesta incompleta/duplicada, URL de paginación ajena, binding incorrecto y timestamp ausente. Ningún timestamp se inventa desde create_time.

CLI2.122 escribió telemetría en home read-only y falló antes de crear archivo; se usó su opción estándar DO_NOT_TRACK=1 para generar la migración normalmente, sin cambiar HOME/seguridad. Los primeros tests de subprocess fallaron EPERM del sandbox; se reejecutan con permiso de ejecución/red del entorno, sin pruebas PayPal reales.
