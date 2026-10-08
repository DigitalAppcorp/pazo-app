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
- Live ingestion local: PASS.
- Error tracking + grouping: PASS.
- Vercel Preview ingestion: PASS.
- Eventos PAZO usan `$geoip_disable=true`; sin ciudad/lat/long en eventos verificados.
- Production env ya preparado, pendiente únicamente de un deployment nuevo de Production.
- No crear alertas hasta existir un destino explícito aprobado (Slack/webhook/etc.).

### Vercel
- Proyecto de PAZO identificado: `pazo-app-t83r`.
- Production alias: `pazo-app-t83r.vercel.app`.
- PR #33 fue mergeado; variables públicas de PostHog + Supabase publishable key quedaron creadas para Production.
- Cuenta Free alcanzó el límite diario de deployments vía API (>100/24h), por lo que el nuevo deployment de Production quedó temporalmente bloqueado por Vercel.
- No subir a Pro para resolver ese límite.
- Team/billing scope del conector devuelve 403; spend/billing audit sigue pendiente.

### Mapbox
- Rollout público PAUSADO por decisión del Product Owner.
- Mapa real se mantiene únicamente en desarrollo local mientras se valida demanda.
- Builds publicados no montan Mapbox y no requieren VITE_MAPBOX_ACCESS_TOKEN.
- Producción usa el fake door genérico `places_map` para medir interés.
- No comprar Vercel Pro, Mapbox add-ons ni aumentar límites para habilitar el mapa durante el experimento.
- Si la demanda justifica reactivarlo, revisar nuevamente token dedicado, URL restrictions, usage notifications y costo antes del rollout.

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
