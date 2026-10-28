# Issue #147 — pantallas ilustradas y aviso de primer uso

## Dirección vigente

La aclaración directa del PO distingue dos superficies: **carga y error pertenecen a sus pantallas; la orientación inicial es un aviso independiente**. La referencia a cookies se aplica a la segunda, sin crear consentimiento, almacenamiento ni cookies nuevas.

Esta revisión sustituye el cierre visual del commit `598533fe30a256fe609ed59b76800d947aebf935`. Las pruebas de aquel candidato eran válidas dentro de su alcance, pero no justificaban tratar su acabado como satisfactorio para el PO. El prototipo posterior que convirtió carga/error en avisos fue una interpretación equivocada, se retiró y no se presenta como candidato final.

Se recibió una imagen adjunta del patrón antiguo142. No se afirma haber visto una segunda imagen no adjunta: los estados de carga/error se reprodujeron en el runtime real. Las capturas anteriores conservan valor histórico, no acreditan la dirección corregida.

## Implementación elegida

- **Inicio pendiente:** composición propia dentro de `main`, ilustración original de postales, título «Buscando historias», explicación breve y acceso a Mi mascota. Sin banner flotante ni cierre de aviso.
- **Inicio con error:** ilustración distinta de nube/reconexión, explicación, reintento principal y Mi mascota secundario; dos botones alineados con igual espacio. El reintento sigue siendo local al feed.
- **Primer uso:** aviso no modal en una capa de aplicación independiente del scroll. Ilustración de pasaporte; QR primario a todo el ancho; Agenda y Explorar secundarios de igual tamaño. Cierre y Escape devuelven el foco al tab activo. No se abre ninguna herramienta automáticamente ni se bloquea el dock.
- **Separación verificable:** `HomeFeedStatus` solo se monta en `main`. `AppNotice` admite únicamente `kind='welcome'`. Las pruebas comprueban la ubicación y ausencia de avisos durante carga/error, junto con callbacks, foco, Escape, geometría y navegación.

Se conserva la llegada a Mi mascota tras guardar el primer perfil, el idioma, los botones nativos, los controles de vigencia de sesión/pet y las mejoras1A/1B. Se retira el desplazamiento automático que necesitaba la orientación incrustada en herramientas. No cambian marketing, SQL1B, AuthProvider/MFA, PayPal, invitaciones ni reglas comerciales.

## Crítica y corrección

La revisión anterior favoreció la eliminación de superficies hasta dejar un estado demasiado austero. El prototipo siguiente aplicó la referencia de cookies a la pieza equivocada. El error fue de interpretación y juicio; no se resuelve añadiendo otro checklist de botones.

La dirección corregida se contrasta con el encargo antes de evaluarse estilísticamente: significado de la ilustración, superficie correcta, jerarquía de acciones, espacio real para cada botón, contenido subyacente, dock y comportamiento por teclado. Se inspeccionan pantallas completas ES/EN320/390/430 y altura568; datos pendientes/contenido/vacío/error forzados y recuperación explícita. La pasada adversarial es separada del mismo agente; no se inventa un revisor independiente.

**Design OS:** [PR #13](https://github.com/DigitalAppcorp/project-brain-os/pull/13) incorpora alineación expresa con el brief y semántica de referencias en el protocolo central, la plantilla y el validador de registros. Trece pruebas del motor y doce contraejemplos PASS; [CI del head5abadf01](https://github.com/DigitalAppcorp/project-brain-os/actions/runs/40745078592). El validador comprueba completitud e integridad, no belleza ni veracidad del juicio. No impone ilustraciones ni banners a todos los productos. No se fusionó ni instaló globalmente.

## Candidato y evidencia

| Elemento | Estado |
| --- | --- |
| PAZO | [PR #148](https://github.com/DigitalAppcorp/pazo-app/pull/148), abierto, sin merge automático |
| Producto | `39943f151ba0aaa8334eb437d4c37c66f8d65021` |
| Staging protegido | [Candidato](https://pazo-jgt7cf5k8-digitalapp.vercel.app), `dpl_HVSpTbnqckHQYFxqda4jdjDX7yCh`, READY, SHA exacto verificado |
| Brain OS | `5abadf01a5cc762a7d2748bbd205e1f32bbc9a76`, PR #13 abierto |
| Evidencia actual | [Capturas, resultados y registro profesional](evidence/issue147/illustrated-states/) |
| Histórico sustituido | [Informe598 antes del nuevo feedback](https://github.com/DigitalAppcorp/pazo-app/blob/598533fe30a256fe609ed59b76800d947aebf935/docs/PAZO_ISSUE147_FINAL_REPORT_20261028.md) |

Los commits documentales posteriores no alteran el producto del artefacto39943f15. Los resultados del head final quedan en PR148 para evitar un hash autorreferencial del informe.

## Pruebas y límites

**DESIGN_QA_PASS** tras inspección y corrección; **PO_VISUAL_ACCEPTED=NOT_REQUESTED**, sin inventar aceptación estética. [Registro profesional](evidence/issue147/illustrated-states/design-review.json), [integridad del registro](evidence/issue147/illustrated-states/record-validation.json) y [resultados](evidence/issue147/illustrated-states/verification.json).

| Prueba | Resultado |
| --- | --- |
| Pantallas completas ES/EN320/390/430 |24 combinaciones, seis recuperaciones PASS; fuentes/imágenes y transiciones asentadas |
| Altura568 |Cuatro casos ES/EN pendiente/error, welcome/foco/Escape, botones visibles y dock libre PASS |
| Utilidad PG17 |Seis recorridos con QR/Agenda/descarga bajo fallo métrico y persistencia real RLS/trigger PASS |
| Navegación |Seis recorridos,18 visitas a herramientas con feed pendiente, ABA/offline/retry PASS |
| Gobernanza |776 tests PASS:27 App,24 primer uso/servicio,527 cierre incluidos |
| Regresiones |F16 sintético1196, F14 Linux53, dist/PWA4, TypeScript/build/release guard PASS; utilidadPG17 32 checks PASS |
| ESLint |166 diagnósticos heredados (148 errores18 warnings); módulos nuevos0. No lint global limpio |

Cinco workflows del producto39943f15 SUCCESS: [CI](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40745553242), [PG/browser/composición](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40745553267), [marketing](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40745553299), [F17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40745553209), [F18](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40745553230). Artifacts composición12841198076/utilidad12840339957 caducan11-nov; capturas permanentes y [hashes](evidence/issue147/sha256.json) versionados. CI del último head documental en PR148.

El primer arranque del harness de navegación agotó20s mientras el transporte CLI autenticado obtenía assets (body vacío, sin pageerror). La espera de readiness90s y el reintento pasaron; no es medición de velocidad de PAZO. Evidencia histórica no se reutiliza como prueba de la nueva composición.

Las pruebas alojadas ejecutan assets reales de staging con Auth/datos interceptados. Los recorridos de utilidad persisten en PostgreSQL17 aislado con RLS y triggers. Share simulado no demuestra entrega externa. No hubo escrituras QA alojadas, pagos ni cohortes artificiales. No se certifican dispositivos físicos, todos los lectores de pantalla, Mapbox real o toda la accesibilidad. No se afirman mejoras medidas de velocidad, conversión o calidad del modelo. Lint global conserva deuda heredada; no se declara limpio.

## Publicación

Producción sigue en `8dbf4ef5fe7a926f1caee3a55ee3c60f31400c04`; mainPAZO en9cd y mainBrain en fab6, sin merge de estos PR. La nueva migración1B no está instalada ni la medición activada. Ninguna imagen o DESIGN_QA_PASS concede autorización de lanzamiento.

El GO final expreso para publicar la mejora completa cubrirá merge, preflight de historia/hash/retención, SQL único con utilidadOFF, frontend/aviso ES/EN, habilitación explícita de medición y postflight/rollback; [runbook conservado](PAZO_ISSUE142_FINAL_REPORT_20261028.md#publicación-preparada-y-reversión). No ejecutar `db push` general ni reparar historia en bloque. Reversión: apagar utilidad nueva y volver al deployment estable, conservando purga/auditoría; sin DROP destructivo ni cambios en Auth/pagos.
