# PAZO F16-P19 — CORS REAL PASS, siguiente gate autenticado

**2026-10-15.** El Product Owner confirmó «listo» tras indicación de configurar `PAZO_F16_APP_ORIGIN`. No se solicitó ni obtuvo token de sesión, secreto, usuario o datos de PayPal.

## Evidencia servidor (no simulada)

Se relanzó el job GitHub Actions [CI #38783752404](https://github.com/DigitalAppcorp/pazo-app/actions/runs/38783752404), job de verificación **116595831601**, que solo emite `OPTIONS` con origen HTTPS autorizado. Resultado del stdout:

```json
{"phase":"CORS_VERIFIED","environment":"sandbox","readOnly":true,"paidThrough":null,"mayCancel":false,"mayCreateSubscription":false,"mayGrantBenefits":false,"mayRecordPayment":false,"reason":"verified_owner_session_not_supplied"}
```

Este estado solo se alcanza si preflight devuelve HTTP 204 con origen permitido exacto y métodos/headers esperados. El re-run concluyó **SUCCESS**; los otros jobs PostgreSQL también SUCCESS. El origen es `https://pazo-app-t83r-dbm658bgd-digitalapp.vercel.app` — temporal de QA, no canónico de producción. La Edge `f16-paypal-supporter-account` está ACTIVE v5 con `verify_jwt=true`.

## Límites de la prueba

CORS verificado NO equivale a JWT válido, `getUser`, lectura de cuenta autorizada, PayPal GET, cobro, cancelación, oferta publicada, consentimiento entregado, paidThrough ni beneficios. El código no fue modificado, no hubo deploy manual ni nuevos previews para este diagnóstico. Ninguna suscripción histórica se canceló; todavía hay 8 eventos históricos pendientes y 0 ventas ledger en la última consulta alojada.

## Siguiente paso seguro

Desde el preview de QA en la sesión auténtica del dueño: abrir `#/account/supporter` o `Mi mascota → Menú y Utilidades → Gestionar Amigo de PAZO`, verificar si `list` muestra «Sin suscripción» o una vinculada. Si falla, revisar código/estado HTTP sin pegar JWT, cabeceras Authorization, claves service_role, nombres/correos de cuentas ni IDs PayPal. `status` toca PayPal con GET y debe revisarse después; `cancel` es mutación explícita y exige voluntad inequívoca del titular sobre la suscripción concreta, nunca como prueba automatizada de CORS. El usuario no debe crear una nueva suscripción para probar esto.

## Política

PAZO core gratuito. Amigo opcional USD 2.99/mes todavía no disponible para nuevas compras, sin beneficios. PR #44 DRAFT, previews automáticos permitidos, ninguna promoción Live/producción o merge autorizada.
