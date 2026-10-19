# PAZO — Administración de PayPal · módulo de configuración
Fecha: 2026-10-19. Autorización del Product Owner confirmada.

## Alcance de la entrega
- Sección responsive **Configuración · PayPal** en `AdminDashboard.tsx`, con `AdminPayPalSettings.tsx`.
- Formularios separados Sandbox y Live. Permiten guardar credenciales, borradores de precio (centavos USD), ID plan, ID webhook y URL de origen pública HTTPS, ver validación OAuth y auditoría.
- SQL `20261019195500_pazo_admin_paypal_gateway_settings.sql` instalado en Supabase proyecto `mrybvqdebbgcayuvgkkr`.
- Tabla privada de configuración y auditoría `admin_private`, **sin SELECT directo para authenticated/anon**. RPC admin-only comprobando `admin_private.admin_grants`; RPC de lectura sin secretos.
- Credentials se cifran en Supabase Vault: IDs internos en tabla privada, nunca se devuelven a navegador tras guardarse, no se registran en logs de auditoría. Las operaciones autorizadas por admin permiten guardar reemplazos; respuesta sólo boolean.
- Edge Function `pazo-admin-paypal-validate`, `verify_jwt=true`, OAuth client_credentials para comprobar las credenciales guardadas. Valida identidad de usuario con GoTrue y admin grant en RPC service_role. No crea planes, suscripciones, ventas ni beneficios.
- `vercel.json` sirve `index.html` para `/paypal/return` y `/paypal/cancel`; `App.tsx` normaliza esas rutas a `#/account/supporter` y elimina parámetros sensibles. El dominio final deberá configurarse explícitamente; no se inventó URL pública.
- Borradores y credenciales están separados para Sandbox vs Live y actualizados con auditoría acotada. Las claves Live **no se usan** para pagos mientras no haya activación segura.

## Límites explícitos — NO declarar Live listo
La aplicación actual aún utiliza un checkout Sandbox anterior con credenciales/plan fijos. Los borradores del nuevo panel no reemplazan automáticamente esa integración: guardar precio, plan o credenciales **no cambia cobros existentes**. Esto es intencional para preservar el checkout F16 bajo investigación. La ruta de producción y su cambio con un clic todavía requieren conectar el nuevo control plane a un único gateway server-side versionado, probar webhooks Live, comprobar cobertura financiera y gestionar cambios de precio en el proveedor. No debe prometerse que Live se active únicamente con pegar claves HASTA pasar este gate.

`admin_private.paypal_gateway_runtime` se instala bloqueada con check `active_environment='sandbox'` y `live_checkout_enabled=false`. El botón «Activar Live» es disabled/aria-disabled. La administración sí permite **preparar** y verificar el entorno Live sin activarlo. Ninguna credencial, grant, ni webhook se modificó en el proveedor.
La UI de administración es configurable pero no un atajo para habilitar dinero real.

## Gate de validación
1. CI y laboratorios deben terminar PASS en la rama del PR #44.
2. Supabase comprobar ACL: anon no puede leer configuración; authenticated no puede llamar servicio secreto; solo service_role puede leer Vault mediante RPC y confirmar validación.
3. Navegación en celular/desktop: sección visible; lectura sin secrets; guardar borrador, guardar claves y validar OAuth con una cuenta admin autorizada. No introducir claves reales en esta conversación ni capturas.
4. Live: verificar dominio estable HTTPS, plan real, webhook, precio, renovación/cancelación, moneda, reconciliación sale/paid period antes de conectar y habilitar checkout.
5. Último pago Sandbox: hubo evento `PAYMENT.SALE.COMPLETED` más reciente que el último período acreditado; resolver conciliación antes de Live.
6. No merge #44 ni main/Live sin aprobación explícita del Product Owner para esos pasos.

## 19-oct — Paso intermedio de conexión Sandbox (branch-only)
- Preparado en PR #44 un diagnóstico **de solo lectura** de la pasarela F16 existente, accesible al administrador desde `Configuración · PayPal`. El servicio comprueba la identidad GoTrue y el grant administrativo antes de intentar OAuth con los **secretos Edge ya instalados**; no copia ni devuelve secretos.
- El nuevo panel distingue explícitamente el almacenamiento Vault nuevo (vacío) de los secretos Legacy existentes. `Comprobar Sandbox en uso` permite constatar si la pasarela actual aún autentica sin crear suscripciones ni pagos.
- **Estado al redactar:** código/test staged en la rama; el endpoint alojado NO debe asumirse actualizado hasta despliegue versionado + autorización PO. Una prueba OAuth exitosa solo verifica acceso al merchant Sandbox, no webhooks, renovaciones, historial o conciliación.
- Los borradores y credenciales Vault todavía NO gobiernan checkout; conectar cambio de origen activo exige mecanismo explícito de activación Sandbox con validación de plan, propietario merchant, webhook, enlaces de vuelta, cancelación y rollback. Live sigue OFF por control DB/UI. No reemplazar por accidente los secretos que protegen suscripciones previas.
- Siguiente gate: CI de rama y aprobación PO para desplegar **solo** el nuevo diagnóstico read-only; después validar OAuth existente desde panel. Luego diseñar/aplicar el conmutador de credenciales **Sandbox-only**, no Live.

## Postflight comprobado: función administrativa v3 (19-oct-2026)
Con autorización PO se desplegó SOLO `pazo-admin-paypal-validate` v3, con `verify_jwt=true`. Sus dos archivos coinciden con el código del PR #44 en `0cd43561a89ada50072b434d90f43dd1c5cd3024`; CI y seis PostgreSQL labs 7/7 SUCCESS. Almacenamiento Vault y checkout Legacy no se cambiaron. El diagnóstico `inspect_active_sandbox` solo consulta OAuth de PayPal con secretos Edge ya existentes, tras comprobación GoTrue/admin; no inicia cobro ni devuelve tokens. Estado de runtime DB: sandbox activo, Live desactivado. Pendiente: prueba en navegador autenticado desde el panel admin, sin introducir credenciales ni realizar nuevos pagos. No confundir despliegue de diagnóstico con conmutador Sandbox completo.
