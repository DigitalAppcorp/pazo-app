# PAZO — Cost Guardrails

**Estado:** ACTIVO  
**Owner:** Product Owner  
**Fecha:** 2026-10-07

## Objetivo

Evitar que PAZO genere gasto inesperado durante validación temprana y Beta.

## Regla obligatoria

Ningún agente puede:
- subir un plan;
- crear un recurso facturable;
- habilitar add-ons pagados;
- aumentar un spend cap;
- activar auto-scaling con costo;
- contratar una herramienta recurrente;
- crear infraestructura cuyo costo pueda crecer por uso;

sin autorización explícita del Product Owner.

La autorización debe ser específica para el proveedor/recurso. Una autorización previa de código o de Supabase no autoriza gastos futuros.

## Antes de pedir autorización

El agente debe indicar:
1. proveedor;
2. función que se necesita;
3. alternativa gratuita o por qué no basta;
4. costo conocido o naturaleza variable del costo;
5. qué evento/uso puede aumentar la factura;
6. cómo se limitará o alertará el gasto.

## Política por defecto

- Preferir Free/Hobby/dev tiers mientras cumplan la necesidad.
- No subir de plan solo para silenciar un Advisor si existen mitigaciones razonables.
- Preferir límites duros o alertas antes que capacidad ilimitada.
- No habilitar session replay, logging excesivo o telemetría de alta cardinalidad por defecto.
- No almacenar datos duplicados en varios proveedores sin una razón de producto/operación.
- Revisar costos antes de Beta pública y después de cualquier salto significativo de usuarios.

## Estado conocido

### Supabase
- Proyecto PAZO: Free.
- Leaked Password Protection requiere un tier superior; se mantiene pendiente y no justifica por sí sola un upgrade.
- RLS, Auth rate limits y hardening de DB cubren parte del riesgo sin gasto adicional.
- Database baseline observado: ~17 MB.
- Storage baseline observado: ~26 MB.
- Free tier: mantener dumps/off-site manuales; runbook en docs/PAZO_BACKUP_RESTORE_RUNBOOK.md.

### PostHog
- Proyecto conectado y verificado.
- Ajustes de privacidad aplicados 2026-10-07:
  - IP anonymization ON;
  - autocapture OFF;
  - session replay OFF;
  - heatmaps OFF;
  - automatic console capture OFF;
  - automatic performance capture OFF;
  - timezone America/Los_Angeles.
- Live ingestion todavía pendiente: el proyecto reporta 0 eventos ingeridos.
- No crear alertas hasta existir un destino explícito aprobado (Slack/webhook/etc.).

### Vercel
- Conector responde, pero actualmente devuelve 0 teams y 0 proyectos.
- No crear un proyecto Vercel nuevo a ciegas.
- Proyecto/plan/env/spend controls siguen pendientes hasta conectar la cuenta/proyecto correcto.

### Mapbox
- Token público ya forma parte del producto.
- Código usa VITE_MAPBOX_ACCESS_TOKEN; no hay token hardcoded.
- Mapbox no ofrece hard spending cap.
- Pendiente: token dedicado para PAZO, URL restrictions y usage notifications por email.
- No aumentar límites o contratar un plan sin aprobación.

### PayPal
- No genera costo de infraestructura mientras la membresía esté desactivada.
- Fee por transacción debe considerarse en el precio de Supporter.
- No reactivar cobros hasta verificar webhook real y cerrar precio/beneficios.

## Gate previo a Beta pública

Antes de Beta pública:
- verificar plan y controles de gasto de Vercel;
- verificar usage/budget alerts de Mapbox;
- verificar PostHog y su volumen de ingestión;
- confirmar Supabase tier y consumo;
- documentar un presupuesto mensual máximo aprobado por el PO;
- confirmar que no existen upgrades automáticos no autorizados.
