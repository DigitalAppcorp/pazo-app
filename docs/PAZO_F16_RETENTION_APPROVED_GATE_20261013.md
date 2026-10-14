# PAZO F16 — Retención del inbox de webhooks: gate PO aprobado

**Decisión registrada:** Product Owner aprobó la opción A: conservar identificadores de eventos durante **90 días contados desde su conciliación definitiva**. No eliminar automáticamente eventos pendientes, disputados, en revisión o bajo retención especial.

**Alcance limitado:** no se han aprobado períodos de retención para pagos, reembolsos, reversos ni intentos de suscripción; estos requieren revisión legal y un gate independiente. La decisión no autoriza cron, limpieza automática, SQL alojado, secretos, deploy ni cambio de URL de PayPal.

**Implementación exigida:** protección por defecto, marca de cierre inequívoca, pruebas reales de elegibilidad en PostgreSQL descartable y modo de vista previa sin DELETE; el mecanismo de ejecución se diseñará solo después de tener un ledger de pagos y reversos idempotente. No confundir 90 días desde el evento con 90 días desde la **conciliación definitiva**.

**Fuente:** aprobación explícita del PO a opción A en conversación. Documento de alternativas previo: `docs/PAZO_F16_PAYMENT_DATA_RETENTION_DECISION_20261013.md`, cuya sección de opciones ahora debe interpretarse según esta resolución posterior.