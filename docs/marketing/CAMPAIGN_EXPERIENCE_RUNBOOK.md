# Demo y acceso por anuncio — runbook (preparado, apagado)

**Autorización:** el PO pidió el 1-nov-2026 preparar esta medición. Activarla necesita un GO aparte. Nada de esto está instalado ni publicado.

## Qué cambia

Hoy los contadores anónimos (bienvenida, acceso, pantallas de Demo, registro sin campaña) no dicen de qué anuncio vino la solicitud. Con esto, cada contador puede llevar además el anuncio validado de ese navegador. El panel separa **Ads** de **Sin campaña**.

## Qué no cambia

Sin identificador, sesión, recorrido ni vínculo con cuentas. GPC, exclusión local, Turnstile, aviso de una sola señal por página y retención de 14 días siguen iguales. Solo se aceptan creatividades del catálogo cerrado. «Sin campaña» no significa orgánico: incluye tráfico directo, compartido y anuncios sin etiqueta.

## Límites honestos

- Sigue siendo un conteo por pantalla, no por persona: no se puede decir «esta persona vio X y se fue».
- Un navegador conserva el anuncio hasta 72 h (estado ya existente), así que una visita posterior dentro de ese plazo cuenta para ese anuncio.
- Grupos con menos de 10 solicitudes, o cuyo complemento tenga menos de 10, no se muestran.

## Orden de activación (no alterar)

1. **PO:** GO y decisión sobre revisión jurídica del aviso.
2. **Aviso:** `CAMPAIGN_EXPERIENCE_NOTICE_RELEASED=true` en `legalCopy.ts`, actualizar fecha de privacidad y desplegar, con la recogida aún apagada.
3. **SQL:** aplicar solo `20261102120000_pazo_campaign_experience` con `apply_migration`, nunca `db push`. Verificar que `campaign_experience_enabled` quede en `false` y que los demás gates no cambien.
4. **Edge:** `INTELLIGENCE_CAMPAIGN_EXPERIENCE_RELEASED=true` en `pazo-marketing-landing/index.ts` y desplegar. Sigue sin aceptar nada hasta el paso 6.
5. **Frontend:** `VITE_PAZO_CAMPAIGN_EXPERIENCE_ENABLED=true` en Vercel y desplegar. Durante este tramo las señales devuelven `not_accepted` y se pierden sin afectar a nadie.
6. **Gate:** como un único `UPDATE` auditado, `campaign_experience_enabled=true`, `campaign_experience_started_at=now()`, `campaign_experience_notice_version='pazo-campaign-experience-notice-v1'`.
7. **Verificación:** una llegada real con UTM entra a Demo; Comportamiento → Sin cuenta muestra Ads tras alcanzar 10 solicitudes. El informe excluye el día de activación, así que los datos aparecen desde el día siguiente.

## Reversión

Poner `campaign_experience_enabled=false` detiene la recogida al instante; los contadores existentes siguen funcionando. La tabla se purga sola en 14 días.

# Motivos de fallo, última pantalla de Demo y origen — preparado, apagado

**Autorización:** el PO eligió estas tres mejoras el 1-nov-2026 para implementarlas apagadas. Activarlas necesita un GO aparte.

- **Por qué falla el registro:** categoría cerrada del motivo. Nunca el correo, la contraseña ni el texto del error. Supabase puede ocultar un correo ya registrado por seguridad, así que ese motivo puede quedar por debajo de la realidad.
- **Última pantalla en Demo:** al salir o al pasar la pestaña a segundo plano. Cambiar de app momentáneamente también cuenta, y puede faltar si el navegador cierra antes de enviarlo. Mantener un token listo requiere ejecutar Turnstile al entrar en Demo y cada 4 minutos de uso.
- **Origen sin anuncio:** visitas sin sesión, una por pestaña, reducidas a buscador, red social, directa, app instalada u otro. La dirección se descarta en el navegador. Muchas apps no informan el origen, así que «directa» incluye lo desconocido. **No llena el grupo Orgánico de cuentas:** no existe vínculo con ninguna cuenta.

Orden: igual que arriba, con `EXPERIENCE_DETAILS_NOTICE_RELEASED`, migración `20261102130000_pazo_experience_details` (después de `20261102120000`), `INTELLIGENCE_EXPERIENCE_DETAILS_RELEASED`, `VITE_PAZO_EXPERIENCE_DETAILS_ENABLED` y gate `experience_details_enabled=true`, `experience_details_started_at=now()`, `experience_details_notice_version='pazo-experience-details-notice-v1'`. Reversión: `experience_details_enabled=false`.
