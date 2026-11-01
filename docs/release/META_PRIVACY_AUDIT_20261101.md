# Auditoría de privacidad: Meta CAPI (1-nov-2026)

Revisión técnica hecha por un agente. **No es asesoría jurídica ni declara conformidad.** Las normas citadas se resumen para orientar la decisión del titular; no se comprobaron con especialistas.

## Comprobado técnicamente

| Requisito | Evidencia |
|---|---|
| Canal único | Sin `VITE_PAZO_META_PIXEL_ENABLED` en producción; prueba de navegador sin tráfico a Meta |
| Consentimiento expreso | Casilla vacía; solo para cuenta nueva con atribución aceptada |
| Rechazo | Real: cuenta de las 08:06 UTC sin decisión, evento ni llamadas a funciones de Meta |
| GPC | Real en Brave, según el titular: cuenta de las 08:17 UTC sin atribución ni evento, con `withdrawn` y una sola llamada a `pazo-meta-consent` |
| Retirada | Real: decisión `withdrawn` y datos de coincidencia borrados. Lo ya enviado no se puede deshacer, y la política lo dice |
| Datos enviados | Evento, ID aleatorio, fecha, `action_source`, URL canónica, SHA-256 del correo y User-Agent |
| Gate cerrado | Sin oferta de consentimiento ni envío; laboratorio con pg_net real |
| Conservación | Cola y coincidencias caen en cascada con la atribución, que se purga a los 14 días; la decisión dura hasta eliminar la cuenta. Lectura de código, sin purga observada sobre un evento Meta |

**Límite de la evidencia de GPC:** la retirada manual y GPC guardan el mismo `gpc_at_last_request=true`, así que esa columna no prueba por sí sola la señal. Lo distingue la ausencia de atribución y de pantalla, junto con lo que informó el titular. No se capturó tráfico de Brave.

## Diferencias detectadas

- La política no nombra `action_source`, campo técnico con valor fijo `website`.
- La política no usa los términos «vender» ni «compartir» de la ley de California. Describe la transferencia a Meta con consentimiento previo, pero no ofrece el enlace «Do Not Sell or Share». Si la ley aplica a PAZO, hay que decidir si hace falta.
- Sin `_fbc` ni `fbclid`, Meta solo puede cruzar por correo con hash y User-Agent. Es una decisión de privacidad que puede reducir la atribución de anuncios.

## Decisión jurídica que corresponde al titular

Ningún agente puede resolver estas preguntas:

1. **¿Aplica la ley de privacidad de California (CCPA/CPRA) a PAZO?** Depende de hechos del negocio: ingresos brutos anuales por encima del umbral actualizado, datos de 100 000 o más consumidores u hogares, o 50 % de ingresos por vender o compartir datos. Fuentes secundarias citan US$26 625 000 para 2026; no se confirmó en fuente oficial.
2. **Si aplica:** revisar con especialista el aviso, la clasificación de «compartir» y el enlace de exclusión.
3. **Si no aplica, o si se llega a personas de otros lugares:** decidir si basta el consentimiento expreso actual o se limita la segmentación geográfica de la campaña a Estados Unidos.
4. **Condiciones de Meta:** las Business Tools Terms hacen que el anunciante declare tener base legal para lo que envía y prohíben datos de menores de 13 años y datos sensibles. El titular es quien hace esa declaración.

**Conclusión:** no se encontró una exigencia que obligue a una aprobación jurídica previa, pero eso no equivale a que no exista. El titular activó Meta antes bajo su responsabilidad («no, la b»), y esa decisión debe mantenerse o cambiarse de forma expresa antes de gastar en anuncios.
