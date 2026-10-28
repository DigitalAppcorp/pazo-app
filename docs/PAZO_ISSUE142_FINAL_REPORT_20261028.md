# Issue 142 — paquete integral para decisión única del PO

> **GO final ejecutado:** [publicación #142/#147 y pruebas reales](PAZO_ISSUE147_RELEASE_20261028.md). Producto corregido4ce38450 publicado, única SQL1B instalada y medición activa tras aviso/retención verificados. La falta de GO y el estadoOFF del texto inferior son históricos. No publicar la UI142 original ni repetir migraciones.

> **Superado por issue147:** el PO rechazó la composición visual de este candidato142. Usar el [paquete147 y candidato corregido](PAZO_ISSUE147_FINAL_REPORT_20261028.md) para publicación. Design OS resolvió autónomamente el diseño nuevo y su crítica; no requiere aceptación estética ordinaria del PO. Producción y nueva medición siguen sin cambios. Este documento conserva la evidencia y el runbook histórico, no autoriza publicar su antigua UI.

Orden: [#142](https://github.com/DigitalAppcorp/pazo-app/issues/142). Implementación, pruebas e integración completadas; **la publicación final sigue reservada al PO**. Este informe no autoriza por sí mismo instalar SQL ni promover un deployment.

## Candidato y trazabilidad

| Entrega | Estado y referencia |
| --- | --- |
| 1A: cargas independientes y vigencia por solicitud | [PR140](https://github.com/DigitalAppcorp/pazo-app/pull/140), integrado previamente en `5c4635e56b0ff95f0d5a23bb6357c59eedd861c2`; no se reimplementó |
| 1B: resultados de primera utilidad y privacidad | [PR143](https://github.com/DigitalAppcorp/pazo-app/pull/143), head probado `e57fac0d41004e3245a5e8747c4b81894ca37b05`, integrado en `913491839ff0b2a9b46f3696af587b5f13971aed` |
| PR2: sugerencia contextual y claridad | [PR144](https://github.com/DigitalAppcorp/pazo-app/pull/144), head probado `bed5cf758d173bd7d49aa94431c15f1287fdf842`, integrado en `091399be959a937029d6e813cd9a972b85befd6c` |
| Ajuste final ES/EN detectado en revisión alojada | [PR145](https://github.com/DigitalAppcorp/pazo-app/pull/145), head probado `b23d046a0f4c3e7192b38c6c1854783cfdf7763a`, integrado en `ed1a64d49eeb656d6d4ac30c7a017b6f06d01283`: indicador de carga localizado y assertions de recuperación en ambos idiomas |
| Candidato final alojado | [Staging](https://pazo-ljxboxg3v-digitalapp.vercel.app), `dpl_CtkXfusaJz8gm5V9uEKTx7vVQ5sb`, READY, SHA exacto `b23d046a0f4c3e7192b38c6c1854783cfdf7763a` |
| Producción conservada y rollback frontend | `8dbf4ef5fe7a926f1caee3a55ee3c60f31400c04`, `dpl_3KrqGdJmijURjdirv1W1iwhkhSW7`, READY; alias `pazo-app.vercel.app` |

El candidato contiene los PR143/144 integrados y el ajuste final de idioma, árbol Git `a0fa27a3eb9011c59967cdc47d61027c960c9585`, idéntico al merge final `ed1a64d4`. Los cambios de este paquete final son documentación/evidencias; no alteran el artefacto candidato. La preview conserva las protecciones de acceso vigentes de Vercel; se verificó con transporte CLI autenticado, sin publicar bypass ni tokens.

## Qué quedó implementado

1A permite usar Comunidades, Lugares y Mi mascota con el feed pendiente. Identidad/autenticación siguen siendo gates; feed, cuidados, documentos y recordatorios tienen cargas y recuperación independientes. La vigencia por solicitud descarta respuestas y finalizadores antiguos, incluso A → B → A y cambios de sesión.

1B extiende el marketing propio existente con resultados mínimos, reporte administrativo agregado, deduplicación, exclusión QA/admin/fundador, retención y supresión. El cuidado se mide al persistir en backend, dentro de su transacción. Los fallos o locks de analítica no bloquean herramientas. El SQL nuevo queda preparado y **apagado por defecto, sin instalar en el servicio alojado**. El marketing vigente mantiene sus flags y funcionamiento.

PR2 ofrece una sugerencia inline descartable tras la primera mascota realmente guardada: QR, Agenda o Explorar. La intención QR requiere atribución aceptada; recibos obsoletos se descartan por generación. No existe hoy código aprobado de campaña de cuidados: no se amplió la allowlist y el caso desconocido es neutro con acceso directo a Agenda. Copy ES/EN aclara ficha QR pública, ausencia de GPS/rescate garantizado, recordatorios dentro de PAZO y alertas solo para pérdidas. Se conserva la funcionalidad social, sin tutorial obligatorio, pagos ni alertas ficticias. Mejoras locales de foco, teclado, etiquetas y objetivo táctil en QR/Agenda.

## Matriz de aceptación y evidencia

| Criterio | Resultado y prueba |
| --- | --- |
| Otras vistas con feed pendiente | PASS: 18 visitas en cada matriz alojada ES/EN ×320/390/430. Frontend Vercel real; Auth/datos interceptados. [1A alojado](evidence/issue142/hosted-1a.json), [candidato final](evidence/issue142/final-hosted-navigation.json) |
| Servicios secundarios independientes y recuperación | PASS: tests de componentes reales con cuidados/documentos rechazados, reintento local sin rebootstrap; navegador alojado con fallo/reintento del feed y navegación offline |
| Integridad A → B, A → B → A, sesiones y MFA | PASS: 21 casos 1A de navegación/cargas/vigencia/MFA en la suite existente, navegador ABA y sesiones antiguas; PR2 añade recibo A → B → A con payload idéntico. No usa solo igualdad de ID |
| Primera mascota e intención contextual | PASS: 13 pruebas de primer uso/intención y seis recorridos locales + seis del frontend final alojado. Perfil realmente persistido en PostgreSQL17 aislado, recibo de campaña confirmado por SQL, Explorar/QR/Agenda, sin repetición tras reload |
| QR y cuidado útil | PASS: QR montado, cancelación no contada, Web Share resuelto contado, descarga funcional con métrica503 y cuidado persistido/trigger/rollback. [Browser1B](evidence/issue142/utility-browser.json), [PR2 local](evidence/issue142/contextual-browser.json), [candidato alojado + PG17 aislado](evidence/issue142/final-hosted-contextual.json) |
| Medición, permisos y privacidad | PASS: 21 tests cliente/parser/panel y32 comprobaciones PG17, ACL/FORCE RLS, dueño ajeno, QA,16 solicitudes concurrentes, contención de analítica, pausa, D7/maduración, supresión, purga y baja. [PG17](evidence/issue142/utility-pg17.json) |
| ES/EN móvil y accesibilidad | PASS dentro del alcance:320/390/430, cero errores de página/desbordamiento, acciones44px de sugerencia/cierre, Tab/ShiftTab/Escape, labels de cuidado, copy honesto. [Design OS](PAZO_CONTEXTUAL_FIRST_USE_PR2_20261028.md) |
| Auth, MFA, PayPal, invitaciones, PWA y seguridad | PASS CI: contratos, navegador público Auth/PWA sin escrituras, callbacks PayPal, LIVE-only beneficios, idempotencia financiera, F17/F18/marketing y SQL aislado. No se hicieron pagos ni nuevos registros alojados |
| Build y regresiones generales | PASS: gobernanza759 casos (incluye527 cierre,21 medición,13 primer uso), F16 sintético1196, F14 Linux53, dist/PWA4, release guard y TypeScript/build |

Las matrices alojadas ejecutan JavaScript y assets reales del deployment exacto; **no son una prueba real de Auth o base alojada**. En primera utilidad, el transporte interceptado ejecuta operaciones reales sobre PostgreSQL17 desechable con RLS/trigger. En navegación, los servicios son sintéticos controlados. Se bloquearon todas las escrituras alojadas y recursos externos. Compartir usa API nativa simulada; no prueba recepción externa ni guardado físico del SVG. Las capturas aisladas usan fallback cuando la fuente remota queda bloqueada. Mapbox/cartografía real, lector de pantalla físico y PWA instalada en dispositivos no se certifican por estas pruebas.

Capturas permanentes completas del candidato: [18 de primer uso/QR/cuidados](evidence/issue142/final-hosted-contextual/) y [18 de Comunidades/Lugares/Mi mascota con feed pendiente](evidence/issue142/final-hosted-navigation/). [Hashes SHA256 y tamaños](evidence/issue142/final-hosted-sha256.json), [verificación consolidada](evidence/issue142/verification.json).

## CI exacto y hallazgos negativos

PR143: seis workflows completos SUCCESS: [CI](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40664021394), [utilidad/PG/browser](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40664021739), [marketing](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40664021246), [F17 seguridad](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40664021259), [historia SQL](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40664021272), [F18](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40664021375).

PR144: cinco workflows completos SUCCESS: [CI y regresiones](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40665503520), [utilidad/contexto PG/browser](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40665503636), [marketing](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40665503521), [F17](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40665503493), [F18](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40665503431). El detector histórico separado no se dispara para este diff sin SQL; los guards de historia también pasan en CI principal. Artifact `first-utility-es-en-40665503636`, ID12806251662, contiene capturas/resultados y caduca11-nov-2026; una selección permanente está versionada en `docs/evidence/issue142`.

Se corrigieron fallos encontrados en CI1B: directorio de caché ausente en runner limpio; nueva migración sin registro explícito en el guard histórico; tests nuevos ejecutados antes de instalar dependencias. Se registró la SQL pendiente con hash exacto y estado no aplicado, preservando baseline histórico y cinco registros previos. No se omitieron gates para conseguir verde. Se corrigió además el respeto del panel al flag de reporte existente y la respuesta sintética del viejo fixture.

La inspección visual del primer candidato integrado detectó el indicador de feed heredado en español al usar inglés. PR145 lo corrigió, añadió comprobación explícita ES/EN en el recorrido contextual y actualizó las assertions alojadas de recuperación para reconocer ambos idiomas. Sus cuatro workflows completos SUCCESS: [CI](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40666706067), [utilidad/contexto](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40666706234), [marketing](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40666706212), [F18](https://github.com/DigitalAppcorp/pazo-app/actions/runs/40666706174). Se repitieron las matrices alojadas sobre el candidato corregido; los JSON previos se conservan como `pre-language-hosted-*.json`. Artifact final `first-utility-es-en-40666706234`, ID12806038400, caduca11-nov-2026; las36 capturas alojadas finales quedan versionadas sin depender de esa caducidad.

ESLint global **no está limpio**:166 diagnósticos (148 errores/18 warnings), idénticos en head1B y headPR2; el gate heredado sigue siendo no bloqueante. Los módulos nuevos no tienen diagnósticos. No se amplió esta tarea para remediar deuda ajena. La comprobación F14 local con CRLF conserva su sensibilidad histórica; Linux CI pasa53/53. No se modificaron fuentes F14 para ocultarla.

## Métricas y límites de interpretación

[Contrato completo](PAZO_ISSUE142_ACCEPTANCE.md) y [diseño/privacidad1B](PAZO_FIRST_UTILITY_1B_20261028.md). QR visible y descarga iniciada son auxiliares. Primera utilidad confirmada es cuidado persistido o Web Share resuelto dentro7d de primera mascota. Cuenta verificada elegible es la unidad, con cohortes maduras/denominadores explícitos y estado de datos insuficientes. Ventana de conservación máxima14d desde verificación, sin prolongación por clics; D7 exige maduración y uso significativo en días7–13. No se equipara proxy de navegación heredado con retención. No hay Pixel/CAPI ni envío individual a Meta, texto de cuidados o ubicación sensible en métricas. Supresión y baja incluyen los nuevos datos.

No hay impacto, conversiones ni cohortes reales nuevas que informar: la colección nueva no se activó. QR ocasional puede dar valor sin retornos frecuentes. No se afirma causalidad, entrega externa ni mejora de rendimiento.

## Publicación preparada y reversión

No fueron necesarios despliegues intermedios de producción. Staging1A `dpl_HETaHdE5xWzppSsNEthNYL58FfrE` verificó SHA5c; staging integrado `dpl_HT5gXeGRrGsxgS2BeofnbNXyAn2c` verificó091399 y permitió detectar el detalle de idioma; staging final `dpl_CtkXfusaJz8gm5V9uEKTx7vVQ5sb` verifica b23d046a con ese ajuste. Supabase alojado se consultó solo por lectura:132 migraciones, candidato `20261028075145` ausente y tabla nueva ausente, marketing vigente enabled/14d/aviso v1/retención saludable. No `db push`, `migration repair`, SQL alojado nuevo, promociones ni cambios de flags comerciales.

Procedimiento preparado para cuando el PO apruebe el lanzamiento final:

1. Revalidar deployment/commit, salud de retención y que no se movieron producción/historia. Comparar SHA256 canónico de la única migración candidata contra `prepared-migrations.json`; revisar sus prerrequisitos en la historia real y ejecutar guards históricos. No publicar todas las migraciones pendientes ni reparar historia en bloque.
2. Instalar únicamente la migración revisada mediante el ejecutor controlado aprobado para PAZO, en transacción y con utilidad OFF; registrar versión alojada/archivo/hash exactos de forma aditiva. Si el ejecutor asigna versión distinta, reconciliar el mapeo explícito antes de continuar. No activar colección como efecto de instalar.
3. Publicar frontend/aviso ES/EN exactos y comprobar QR, navegación, cuidados, panel y rutas protegidas. Mantener PayPal/invitaciones/Auth y demás flags existentes.
4. Solo en el release aprobado y con aviso/retención verificados habilitar explícitamente `utility_enabled`, `utility_started_at` y `utility_notice_version='pazo-first-utility-notice-v1'` en el gate existente. Comprobar únicamente lecturas/fixtures QA excluidos; no generar transacciones reales ni cohortes artificiales.
5. Postflight y observación de fallos; si falla una condición, apagar utilidad (o gate global cuando corresponda), conservar la purga y revertir frontend al deployment anterior. No DROP destructivo ni borrado de auditoría para revertir. El esquema inerte puede permanecer.

**GO técnico para revisión/decisión de publicación del PO**, condicionado al preflight de instalación y postflight descritos. **NO GO para lanzamiento autónomo ahora**: falta exclusivamente la decisión única del PO sobre el paquete final, incluida aceptación visual y publicación del aviso/medición. No existe un bloqueo de implementación pendiente ni se necesita una autorización intermedia adicional. Los límites de prueba y deuda de lint se conservan expresamente.
