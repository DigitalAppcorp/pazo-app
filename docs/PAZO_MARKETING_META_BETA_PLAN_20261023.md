# PAZO — Plan de adquisición Meta Ads / beta local
Fecha: 2026-10-23 | Estado: **PROPUESTA, NO GO DE GASTO** | Límite de evaluación: **US$350 en total** | Marketing Brain OS: `DigitalAppcorp/project-brain-os/knowledge/marketing`

## Propósito
Conseguir **usuarios humanos reales, 18+, ubicados en una zona de Los Ángeles**, que confirmen su cuenta, creen una mascota, realicen una primera acción útil y regresen a PAZO. No optimizar por seguidores, impresiones, clics, instalaciones nativas ni compras de PayPal. La app es PWA gratuita. Suscripciones Amigo de PAZO y cualquier campaña de pagos quedan excluidas. Los datos de QA, personal, moderadores/fundadores y pruebas sintéticas se excluyen de evaluación de adquisición.

## Tesis
La utilidad independiente de una red ya poblada (identidad/perfil de mascota, QR, cuidados) debe ser el gancho de adquisición inicial; el valor de comunidad, lugares y publicaciones se demuestra una vez dentro. Evitar asegurar comunidad numerosa donde aún no exista. Probar 3 ángulos: **perfil digital**, **QR gratuito**, **comunidad local en construcción**.

## Segmentación de piloto
- Territorio base propuesto: núcleo **Downey y alrededores, dentro de Los Ángeles**, no todo Estados Unidos; configurar un único radio local **orientativo** 8–12 millas, ajustado tras comprobar opciones/alcance de Ads Manager. No tratar geotargeting como prueba de residencia exacta.
- Audiencia: mayores de 18, géneros inclusivos, personas con afinidad por mascotas; no restringir por atributos sensibles. No asumir que intereses detallados están disponibles o que superan a una audiencia amplia geográfica.
- Idioma creativo: español e inglés; no duplicar ad sets al principio. Variar el copy de cada concepto en ambos idiomas, pero mantener **máximo 3 anuncios activos** a la vez debido al tamaño del presupuesto. Analizar después por idioma si hay volumen.
- Destino: **URL canónica de PAZO comprobada en gate**; hash/rutas de autenticación y UTMs solo tras QA. No usar objetivo de instalaciones de tienda (no hay app nativa publicada).

## Estructura propuesta de Meta Ads
- Una campaña de objetivo de **conversión web** (seleccionar Leads/Website o el objetivo que permita optimizar el evento confirmado en la cuenta real; contrastar UI vigente) y un conjunto de anuncios local.
- Objetivo de optimización preferido: **cuenta confirmada / CompleteRegistration** verificada y consentida. Si no existe señal fiable: **NO lanzar** como conversión; un piloto de Landing Page Views sería un experimento diferente, con GO explícito y sin llamarlo adquisición.
- Ubicaciones: Facebook/Instagram Feed, Reels y Stories según formatos disponibles; verificar desglose real y políticas. Sin retargeting, audiencias subidas ni lookalikes al inicio.
- Medición doble: gastos/click-through de Ads Manager vs registros y activaciones únicos first-party de PAZO; discrepancias documentadas. La atribución de plataforma no implica causalidad.

## Presupuesto — máximo $350 (todos los importes USD)
| Tramo | Condición | Límite | Ejecución recomendada |
| --- | --- | ---: | --- |
| Etapa A — descubrimiento | Solo tras resolver checklist de lanzamiento y GO del PO | $120 | 6 días con presupuesto total/lifetime $120 o configuración equivalente verificada; 3 creatividades simultáneas, un solo ad set |
| Etapa B — iteración | Solo si etapa A tiene señal de usuarios activados y tracking válido; nuevo GO del PO | $180 | 9 días, $180 máximo total, con las 1–2 creatividades mejor sustentadas y una variante controlada |
| Reserva condicional | Solo tras revisar cohortes/coste y GO específico | $50 | No reservar en Ads Manager; liberar opcionalmente para el mejor ángulo |
| **Techo absoluto** | Ningún gasto adicional autorizado por este documento | **$350** | **No asignar automáticamente** |

$300 de los $350 son presupuesto *potencial*, no gasto ejecutado ni promesa de consumo. Preferir presupuesto de duración total/lifetime cuando la interfaz lo permita para limitar gasto; vigilar cargos, impuestos/ajustes y fecha de corte. Si el proveedor no soporta techo exacto, aplicar un límite de cuenta verificable y margen de seguridad antes del GO. Nunca activar segunda etapa por rutina.

## Creatividades / briefs
1. **Perfil digital:** video vertical 9:16 (12–20s, orientativo) que enseñe pantalla real: apertura → crear mascota → perfil → publicar. Hook ES: «Tu mascota merece tener su propio espacio». EN: «Your pet deserves a profile of their own». CTA «Crea su perfil gratis / Create a free pet profile».
2. **QR / utilidad:** demo auténtica de QR de mascota, sin exponer códigos reales/PII. Hook ES: «Su identidad digital, siempre a mano». EN: «Your pet's digital profile, one scan away». CTA «Descubre el QR gratis / Explore the free QR». Nunca prometer recuperación garantizada.
3. **Comunidad local:** foto/video genuino de comunidad, sin insinuar usuarios existentes no comprobados. Hook ES: «Estamos creando la comunidad de mascotas de LA». EN: «Help build LA's pet community». CTA «Únete a los primeros usuarios / Join the first members».

Producción: escenas reales de producto, mascotas/fotos con derechos, marca actual, textos ES/EN de verdad, subtítulos, 9:16 y variantes seguras para feeds, ofertas 18+ y uso gratuito explícitos. No generar fake reviews ni claims de tamaño de red.

## Embudo / KPIs
- `landing_view`: sesión elegible desde UTM válida y consentimiento adecuado.
- `sign_up_confirmed`: nuevo usuario realmente confirmado; no click en "registrarse", no email pendiente sin verificación.
- `pet_created`: **primera** mascota creada por un nuevo usuario; una cuenta cuenta una sola vez.
- `first_value`: primera acción que entregue utilidad (ej. QR real abierto, publicación creada, interacción social real); documentar definición precisa antes de usar.
- `D7_return`: usuario activado que vuelve en día 7 (ventana/cohorte explícitas). No confundir recarga o token refresh con retorno útil.
- `cost_per_confirmed_signup`, `cost_per_activated_owner`, `activated_users`, `D7 retention`; fuentes y denominadores siempre visibles.

Eventos mínimos propuestos first-party: `acquisition_landing`, `auth_signup_verified`, `first_pet_created`, `onboarding_completed`, `activation_first_value`, `user_return_d7`. Capturar solo UTM con allowlist `utm_source=meta; utm_medium=paid_social; utm_campaign=pazo_beta_local_202610; utm_content={perfil|qr|comunidad}_{es|en}`, excluyendo cualquier PII/ID externo de URL. Validar almacenamiento, vencimiento y consentimiento bajo `docs/PAZO_PRIVACY_DATA_GOVERNANCE.md` y `docs/PAZO_DATA_INVENTORY.md`; no instalar tags no aprobados.

## QA / gates antes de abrir medios
1. Confirmar URL canónica HTTPS, PWA, mapa, Auth, confirmación por email, navegación y creación de mascota en iOS/Android físicos; excluir PayPal de esta campaña. **Gate NO verificado en esta auditoría desde sitio público**.
2. Confirmar que UTM persiste del primer toque al registro sin filtración a proveedores/URLs; probar acceso directo, bloqueador, consentimiento denegado y cambio de idioma.
3. Registro first-party QA en Supabase: un único `sign_up_confirmed`, mascota creada, primera acción y D7 sin duplicados; excluir listas de QA/fundador sin publicarlas.
4. Política de privacidad, consentimiento, minimización, retención, derechos California y cualquier Meta Pixel/CAPI deben pasar gate legal y técnico; PostHog beta sigue OFF salvo nueva aprobación explícita.
5. Revisar cuenta Ads Manager, elegibilidad, propiedad de negocio, 18+, páginas Instagram/Facebook, estado de facturación/moneda/zona horaria, evento disponible, límite y reglas de gasto. No conectar ni publicar sin acción del PO.
6. Verificar media y claims; aprobación creativa y autorización **separada y explícita** de gasto.
7. Antes de etapa B: leer gasto real, registros confirmados, primeras mascotas, QA excluded y fallas de medición.

## Reglas de pausa
PAUSA INMEDIATA por error de registro/pago, fuga de PII, tracking sin consentimiento, destino roto, cargo que desborda el límite o incumplimiento de plataforma.
Luego de A: si no hay registros confirmados o perfiles reales atribuibles de calidad, **no iniciar B**; diagnosticar creatividad, landing y email. Un resultado con muestras pequeñas no justifica "escala" automática.
No asumir CPA rentable sin margen/LTV ni D7 maduras; $350 es presupuesto de aprendizaje, no presupuesto de crecimiento garantizado.

## Reportes
- Día 0: pass/fail de gates + versión del sistema + GO financiero explícito.
- Diarios durante piloto: gasto consumido/restante, landing, signups verificados, primeras mascotas, problemas de email, CPAs observados, sin extrapolar.
- Al finalizar A/B: resumen por concepto/idioma, cohortes maduras, calidad de datos, hipótesis que sobrevive, siguiente experimento y decisión PO.

## Fuentes primarias revisadas (2026-10-23)
- Meta, medición click-through y engage-through, 2026-03-03: https://about.fb.com/ltam/news/2026/03/simplificando-la-medicion-de-anuncios-para-un-mundo-social-first/
- Meta, cambios en Pixel/CAPI, 2026-04-15: https://about.fb.com/ltam/news/2026/04/eliminar-barreras-tecnicas-para-ayudar-a-empresas-de-todos-los-tamanos-a-aprovechar-mas-sus-anuncios/
- Google Analytics GA4 recommended events: https://support.google.com/analytics/answer/9267735
- California CPPA: https://www.cppa.ca.gov/regulations/
- Brain OS Marketing: https://github.com/DigitalAppcorp/project-brain-os/tree/main/knowledge/marketing

## Estado al cierre de este plan
**DOCUMENTACIÓN ONLY**. Ninguna campaña creada; presupuesto aprobado solo como máximo para **planificación**, NO gastado; ningún pago, secret, Pixel, CAPI, deploy, DB write ni cambio de políticas. La decisión GO/NOGO depende de gates y consentimiento del PO.
