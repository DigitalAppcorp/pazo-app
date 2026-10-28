# Issue 142 — ejecución integral y contrato verificable

Autoridad: [orden única del PO #142](https://github.com/DigitalAppcorp/pazo-app/issues/142) y mensaje directo del 28-oct-2026. Sustituye únicamente los permisos pendientes de 1B/PR2 del snapshot maestro. Implementación, QA, PRs e integración técnica autorizados; publicación final reservada al PO. No se exige aprobación por pasos ordinarios. Producción no se modifica si staging permite continuar.

## Contrato de medición 1B

Extender `marketing_private`, el gate de colección, exclusión QA, retención/purga/supresión y panel administrativo existentes; sin SDK/proveedor/Edge paralelo. Nuevos resultados apagados por defecto mediante columna del gate existente. SQL candidato no aplicado a producción hasta el gate de publicación. Sin datos de cuidados, URLs, QR, ubicación, email, tokens ni IDs externos en métricas.

| Señal | Qué demuestra | Qué no demuestra |
| --- | --- | --- |
| `qr_visible` | Token obtenido y QR montado en pantalla | Uso físico o rescate |
| `qr_download_initiated` | El navegador ejecutó la descarga del SVG existente | Archivo guardado o usado |
| `qr_share_confirmed` | La promesa de Web Share se resolvió | Entrega/lectura en otra app |
| `care_created` | INSERT de un cuidado confirmado por el backend, dentro de la misma transacción | Cumplimiento del cuidado, push o salud |

Primera utilidad confirmada: primer `care_created` o `qr_share_confirmed` dentro de los 7 días posteriores a la primera mascota persistida y no después de 14 días desde registro. Descarga y QR visible se reportan separadamente como señales útiles auxiliares; su ausencia de repetición no implica fracaso. No se cuentan alertas de pérdida.

Unidad: cuenta verificada elegible, excluyendo fundador/admin/QA y metadatos QA confiables existentes; nunca datos sintéticos alojados. Denominador: registros elegibles con primera mascota dentro de 7 días; cohorte madura para comparación solo tras cerrar esa ventana. Ventana disponible máxima: 14 días, incluso si el selector administrativo pide 30/90. Retorno significativo D7: un resultado confirmado en días 7–13 tras la primera utilidad, únicamente para cohortes que ya alcanzaron D7. Es observación, no causalidad ni retención exigible al QR ocasional. No afirmar conversiones con muestra insuficiente: mostrar estado explícito, conteos y denominadores.

Campaña/intención: solo desde atribución validada y ligada a la cuenta por el mecanismo existente. Reporte agrupa los seis códigos actuales; sin atribución válida, grupo neutro/orgánico. La campaña actual no tiene código de Agenda: no inventarlo. En PR2, QR válido orienta al pasaporte; códigos sociales/perfil o falta de intención tienen orientación neutra. La interfaz conserva capacidad para Agenda si un código válido futuro llega a estar aprobado, sin ampliar ahora la allowlist.

Vigencia: fijar sesión al iniciar señales, descartar resultados antiguos y no reintentar con otra identidad. Fallos de instrumentación no bloquean herramientas. Backend deduplica por cuenta/resultado y limita actualización de retorno a una por día; la repetición no infla personas. Retención desde registro verificado, sin prolongarla por nuevos clics; cuenta eliminada y supresión retiran también los resultados nuevos.

## PR2 — contrato Design Intelligence OS

Design OS v0.6.0 canónico verificado (`knowledge/ui-ux-frontend/SKILL.md`, blob `f6580194f3908d56a5002f7210c045432a8e8c01`). Aplicar razonamiento, frontera de audiencia, memoria/feedback, contenido, integridad y gates. Preservar identidad, dock, pantallas y funciones sociales. Solo sugerencia inline descartable tras primera mascota, acciones directas a utilidades existentes y «Explorar PAZO»; sin paso obligatorio ni paywall. Copy ES/EN honesto sobre QR público, ausencia de GPS/rescate garantizado, Agenda sin promesa de push y alertas excepcionales.

Implementación autorizada por issue142; aceptación visual del PO queda pendiente para el paquete final. No atribuir aprobación visual automática al análisis o al CI. Comparar fuente/runtime ES/EN a320/390/430, foco/teclado, red lenta/offline, errores/reintentos y A→B→A/sesiones. No rediseño general.

## Matriz de cierre (en ejecución)

- A: comprobar merge1A, preview de SHA exacto, navegación y recuperación alojadas. Separar frontend alojado de servicios sintéticos.
- B: catálogo/denominadores/privacidad, SQL mínimo y pruebas PG17 de RLS/ACL/QA/idempotencia/retención/supresión/concurrencia; UI/API y cuidado realmente persistido en laboratorio seguro.
- C: orientación contextual y claridad, Design OS, capturas e interacción ES/EN móvil y regresiones de funciones protegidas.
- Final: PR1B y PR2 separados, CI exacto, candidato alojado para revisión, estado de producción/rollback y GO/NO GO documentado. Sin lanzamiento final.
