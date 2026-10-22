# PAZO beta — aislamiento de beneficios públicos Live y Sandbox (22-oct-2026 UTC)

Estado: **DEFECTO ALOJADO CONFIRMADO / PARCHE SQL EN PR75 / NO APLICADO**. Regla superior: mandato del PO para finalizar F16 antes de beta; no otorgar beneficios públicos por Sandbox, `ACTIVE`, retorno, intento ni un período ficticio.

## Evidencia read-only antes del parche

Proyecto Supabase `mrybvqdebbgcayuvgkkr` (sin mostrar identidades ni contenido):

- `supporter_private.f16_sandbox_qa_paid_periods`: 2 filas.
- `supporter_private.pazo_paypal_live_paid_periods`: **0 filas**.
- `public.pazo_supporter_public_wall(48)`: **2 mascotas visibles**.
- `public.pazo_supporter_public_pet_benefits(id)` devolvió `badge=true` para **3 de 5** mascotas.
- `admin_private.pazo_live_release_control.mode='off'`; sin merchant Live ni GO financiero.
- `pg_get_functiondef` confirma que `public.pazo_supporter_public_pet_benefits` (SECURITY DEFINER, `search_path=''`) contiene `v_qa:=supporter_private.f16_sandbox_qa_projection(...)` después de la rama Live. También la consultan el muro público y los badges batch.

**Impacto:** personas externas pueden interpretar como miembros de pago mascotas de un laboratorio Sandbox que nunca abonaron PayPal Live. Esto NO debe certificarse como beneficio Live ni mantenerlo público tras la beta.

## Parche preparado y cobertura

`supabase/drafts/pazo_public_benefits_live_only_REQUIRES_PO_GO.sql`: reemplaza únicamente la función `public.pazo_supporter_public_pet_benefits(uuid)`. Mantiene la visibilidad de perfiles retirados mediante `f14_content_visible`, owner real, `sourceEnvironment='live'`, `active='true'`, períodos distintos, themes Live y hitos 3/6/12. **Elimina completamente la rama QA** de dicha función y, por dependencia, del muro/batch públicos. Al faltar venta Live válida, devuelve `badge=false, theme=null, milestone=0` en lugar de usar Sandbox.

No borra períodos o consentimientos Sandbox existentes, no toca el QR, perfiles, Auth, control financiero, PayPal, Vault, worker, los textos comerciales ni las RPC privadas de QA.

**Evidencia:** CI [GitHub Actions #39725787889](https://github.com/DigitalAppcorp/pazo-app/actions/runs/39725787889) 5/5 jobs SUCCESS incluido laboratorio PostgreSQL 17 `f16-public-benefits-live-only` y salida `F16_PUBLIC_BADGES_LIVE_ONLY_PG17_PASS`. Los casos sintéticos incluyen mascota solo Sandbox, Live caducado, pago válido 3/12 meses y su tema, procedencia falsa Sandbox, metadata insuficiente, mascota moderada, nulos y sin periodos.

## Gate explícito pendiente del PO

1. Aprobación concreta para **aplicar la corrección SQL Live-only al proyecto Supabase**. PR75 DRAFT y SQL en `supabase/drafts/` hasta esa autorización. Versionar migración primero conforme a AGENTS/skills. Ensayar transacción/Rollback antes del COMMIT final; comprobar forma de la función instalada y ACL/RLS.
2. Inspección read-only después: con cero períodos Live reales, **cero badges públicos y cero entradas en muro**; QA period rows siguen 2, consentimientos no borrados. No modificar eventos financieros.
3. Conservar Live `off` y kill-switch `ON`; el éxito de este parche no autoriza un canary ni acceso público financiero.
4. Si cambia la evidencia certificada F16, revisar y renovar el certificado técnico según control P4; no afirmar que el certificado anterior acredita una fuente modificada.

## Historial y otros gates

La experiencia de cuentas con Auth, PWA física y aceptación visual Admin todavía no está certificada por pruebas en dispositivo real. PR74 contiene mejoras independientes de UI/roles/admin y no está merged ni desplegado. No repetir Sandbox aceptado ni inventar autorizaciones.
