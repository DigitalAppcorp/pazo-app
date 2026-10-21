# PAZO F16 MVP — Insignias y comprobaciones Live (2026-10-17)

**Prioridad PO:** cobrar US$2.99/mes con LOS CUATRO beneficios aprobados, sin eliminar las funciones gratuitas ni exigir la finalización histórica de P42. Este gate es **desarrollo y pruebas aisladas**, NO aprobación para Live, migraciones hospedadas ni pagos.

## Trabajo versionado en PR #44 DRAFT

1. `src/features/supporter/components/SupporterBadge.tsx`: insignia **original** de PAZO con cuatro rutas fijas (inicio, 3, 6, 12). Nunca deriva entitlement del navegador; necesita `active` probado por RPC. Un PNG ausente no sustituye el arte por una medalla falsa.
2. `PublicProfileView.tsx`: muestra insignia verificada al lado del retrato y en las publicaciones públicas de esa mascota; consulta `pazo_supporter_public_pet_benefits`. Fundador sigue siendo otro reconocimiento.
3. `HomeView.tsx`: combina hasta 48 IDs de mascotas por RPC `pazo_supporter_public_badges_batch` y muestra insignia en los encabezados del Feed. Se vacían reclamos del caché y se vuelve a verificar como máximo a los 60 segundos y al volver a la pestaña; si la consulta falla no se muestran insignias antiguas.
4. `supabase/drafts/f16_mvp_four_benefits_backend_DISPOSABLE_ONLY.sql`: agrega la lectura pública acotada de insignias; **no se instala** en la base de PAZO. `supabase/tests/supporter/f16-mvp-four-benefits-pg17-synthetic.sql` verifica autor pagado y gratuito, 48 como máximo, IDs nulos inválidos, disputa y consentimientos en PG17 descartable. Sin nuevas ACL a secretos.
5. `scripts/f16-stage-approved-supporter-badges.ps1`: instalador local desde el paquete ZIP generado de las cuatro insignias originales, valida SHA256 del archivo ZIP y de cada PNG y luego coloca los cuatro en `public/supporter`. **Los PNG todavía no están en el repositorio**, así que la UI permanece detrás del flag `VITE_PAZO_F16_SUPPORTER_BENEFITS_ENABLED` **OFF**. Para Codex: descarga el ZIP oficial adjunto en conversación y ejecútalo en una copia limpia Windows, inspecciona las cuatro insignias en QA visual, registra commit con solo los PNG. No reemplazar por imágenes inventadas ni activar flag si no están las cuatro.
6. `supabase/functions/f16-paypal-webhook/pazoPaypalLiveSaleEvidenceReader.mjs` + test `f16MvpPaypalLiveSaleEvidenceReader.test.mjs`: servicio **OFF** que consume solo una lectura de evento PayPal ya autenticado/claim con lease, y realiza hasta 3 GET HTTPS **del merchant Live**: Sale, Subscription y Plan. Verifica event binding, propietario/intent, consentimiento original, precio 2.99 USD, estado completed, cantidad 1, plan mensual validado, modalidad Live. Nunca calcula `paidThrough`, nunca acredita pago, nunca cobra, nunca concede beneficios, nunca emite credenciales.
7. `pazoPaypalLivePlanContract.mjs`: valida modalidad REGULAR mensual perpetua sin trial, plan variable, otros impuestos o cargos de alta.

**Nota importante:** estas evidencias están protegidas por las verificaciones y procedimientos existentes (webhook/P05/P06/owner/claim); **aún NO existe** el servicio real que vincule un pago Live a un período de servicio y lo entregue a las nuevas tablas privadas. El lector candidate no demuestra automáticamente merchant identity, cobertura de refunds/disputas ni fechas contractuales. Mantener FAIL CLOSED.

## Importación de insignias — solo máquina local de Codex

Paquete exacto: `pazo-supporter-insignias-4.zip`, SHA256
`281503c0638d1d9e3ea752263f9e2a72be5a584f172af73d17358a6c970182b5`.

Comando PowerShell desde la raíz del checkout, reemplazando únicamente la ruta del ZIP descargado:

```powershell
.\scripts\f16-stage-approved-supporter-badges.ps1 -ArchivePath "C:\RUTA\pazo-supporter-insignias-4.zip"
```

Después validar originales, compilar y subir los cuatro PNG a `public/supporter/` a la **misma rama** PR #44. No poner nombres, tokens, otros archivos del ordenador en el commit. El ZIP ya viene con las versiones de inicio, 3, 6, 12 meses, generadas por recorte del recurso original de Biblioteca, no por generación creativa.

## Criterios reales pendientes antes de cobrar

- [ ] Cuatro PNG del PO subidos, verificados visualmente en perfil/Feed/muro y con CI PASS
- [ ] Migración privada versionada del modelo de períodos con fuente merchant y reversals, aprobada/instalada en Supabase alojado; no ejecutar el `DISPOSABLE_ONLY` en hosted
- [ ] Reconciliación Live realmente autenticada: webhook, Sale/Subscription/Plan GET, owner/intent, términos ES/EN, período mensual acordado y verificado, reintegros/disputas
- [ ] Checkout Live, cancelación web y comprobante desde el mismo merchant, sin credenciales en frontend, confirmación de Webhook ID Live
- [ ] E2E Sandbox del nuevo camino completo (pago, 4 beneficios, cancelación, vencimiento, fallos y refunds), QA del PO; posterior autorización expresa de la primera operación Live supervisada

NUNCA considerar `BILLING.SUBSCRIPTION.ACTIVATED` una venta pagada, ni acceso a fondos como prueba de pago.

## Estado

No se llamó a PayPal Live, no se publicó preview nuevo, no se modificó Supabase alojado, no hay pagos reales ni beneficios desbloqueados. PR #44 DRAFT. P42/P21 permanecen OFF. **Fast-track continúa**, sin retroceder a más experimentos P42.

Últimas evidencias CI/PG de código `a268ca29dcd965f1d30c8be52fe23e6e8d404bf0`: CI `39039494841` SUCCESS y PG Lab `39039494756` SUCCESS; actualización de refresco Feed `9b5646cf23caa345dc398011412aaa1b3cd35eb9`: CI `39039567220` SUCCESS y PG Lab `39039567262` SUCCESS. Tests extra del límite del batch introducidos después en `8ec7d4c95903cdcf3e59265e218083a3a6f11c63`, verificar último HEAD y CI de documentación/handoff por separado.
