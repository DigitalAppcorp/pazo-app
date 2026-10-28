# PR1B — medición mínima de primera utilidad (issue142)

> **Actualización tras GO final147:** [release verificado](PAZO_ISSUE147_RELEASE_20261028.md). Migración canónica20261028075145 instalada con versión dirigida20261028185856, hash exacto, sin reescribir historia. Se instalóOFF y se activó explícitamente a2026-10-28T19:17:46.696036Z después de publicar el aviso ES/EN; retención14d/Cron saludables. Las referencias siguientes a «candidato/no instalado/OFF» describen la preparación histórica. No repetir la instalación ni reiniciar su fecha de cobertura.

Implementado en rama desde `main@5c4635e5`. Backend nuevo **candidato, no instalado ni activado en producción**. [Contrato de definiciones y alcance](PAZO_ISSUE142_ACCEPTANCE.md). Producción continúa `8dbf4ef5` / `dpl_3KrqGdJmijURjdirv1W1iwhkhSW7`; no fue necesario publicar 1A para avanzar: se utilizó staging.

## Cambios y privacidad

Una migración creada por Supabase CLI2.122.0 extiende el gate de `marketing_private` con utilidad OFF, dos tablas privadas con FORCE RLS (resultados por cuenta y supresión hasta el fin de la misma ventana), dos RPC autenticadas de resultado/reporte y un trigger opcional de INSERT de cuidado. Sin Edge, SDK, proveedor ni Cron nuevo. Se reutilizan elegibilidad QA/admin/fundador, salud de retención, la purga actual, supresión y baja de cuenta. El interruptor global OFF conserva su efecto sin exigir cambiar el subgate nuevo.

Datos: UUID interno de cuenta y fechas/enum; no QR, URLs, archivos, texto de cuidados, salud, ubicaciones ni contactos. Pet UUID se verifica para propiedad al recibir la señal, pero no se conserva en métricas. Reportes solo agregados, siete segmentos allowlisted como máximo. Campaña viene exclusivamente de atribución validada existente; ausencia de atribución significa grupo neutro, sin inferir intención.

La medición empieza solo para cuentas verificadas desde su activación. Retención fija14d desde verificación, sin prolongación por uso; ventanas administrativas30/90 no prometen cobertura superior14d. Denominadores se explican en el panel; umbral operativo10 cuentas/ventana cerrada no es significancia estadística. D7 requiere maduración y resultado significativo en días7–13; la ventana corta puede censurar activaciones tardías. No inferir causalidad ni fracaso por un QR de uso ocasional.

`qr_visible` se registra al montar un QR válido; `qr_download_initiated` tras ejecutar descarga y `qr_share_confirmed` solo tras resolver Web Share. Clipboard/cancelación no cuentan como compartir confirmado. Esas señales son autoinformadas por el cliente; no prueban guardado de archivo, entrega externa o rescate. Primera utilidad confirmada: cuidado persistido o Web Share resuelto, dentro7d de primera mascota. El cuidado se cuenta dentro de su transacción real, no desde un clic; rollback revierte también la métrica. Timeout de lock100ms y captura de error en el trigger mantienen el cuidado operativo si falla la medición. La RPC QR fija Authorization a la sesión verificada al iniciar; no migra a otra cuenta. Nunca se espera a métricas para abrir/descargar/compartir.

El panel administrativo existente incorpora resultados, estados de carga, pausa, error/reintento y datos insuficientes. Un RPC aún no instalado falla aisladamente, sin ocultar el resto de las métricas. Aviso ES/EN e inventario preparados; no se afirma activación ni aprobación jurídica nueva.

## Evidencia

- 21 pruebas de cliente/parser/panel e integridad del candidato PASS: payload mínimo, sesión fijada/cambio de cuenta, concurrencia, caída de red, reintento, rechazo de PII/segmentos no válidos/contadores imposibles, respuesta obsoleta, muestra insuficiente y hash de SQL pendiente.
- 32 comprobaciones PostgreSQL17 PASS: ACL/FORCE RLS, cuenta ajena, QA retroactiva, idempotencia real con16 solicitudes concurrentes, cuidado persistido/rollback, fila de analítica bloqueada sin bloquear cuidado, D7 con reloj de fixture y borde de maduración, pausa global, supresión/recolección impedida, purga existente y baja de cuenta.
- Browser real App/Auth/servicios → transporte interceptado → PostgreSQL17 real/RLS/trigger: ES/EN320/390/430. QR renderizado, Web Share cancelado no contado, promesa de compartir resuelta contada, descarga funcional con503 de métrica y cuidado efectivamente guardado. Sin compras ni escrituras alojadas. El API nativo de compartir se simula; no se prueba un destinatario ni se afirma entrega.
- TypeScript/build, gobernanza y cierre heredado PASS; módulos nuevos sin diagnósticos ESLint. CI del head exacto del PR143 completo SUCCESS y merge verificado: [paquete final](PAZO_ISSUE142_FINAL_REPORT_20261028.md).

[Resultados del laboratorio](evidence/issue142/utility-browser.json), [comprobaciones PG17](evidence/issue142/utility-pg17.json).

## 1A alojado, separado de la simulación local

Vercel staging `dpl_HETaHdE5xWzppSsNEthNYL58FfrE`, SHA exacto`5c4635e56b0ff95f0d5a23bb6357c59eedd861c2`, URL [preview](https://pazo-i1ovmf22z-digitalapp.vercel.app). Assets remotos auténticos mediante `vercel curl` autenticado, sin reconstruir App local ni modificar Trusted Sources. El token OIDC de desarrollo fue rechazado por la configuración existente; no se relajó la protección. Auth y datos se interceptaron por seguridad: **frontend alojado verificado, no sesión/DB de producción verificada**.

ES/EN320/390/430:18 vistas con feed pendiente, A→B→A, offline y error/reintento;0 pageerrors/overflow y0 escrituras alojadas. Se bloquearon también los intentos de métricas preexistentes de Lugares para excluir el tráfico QA. [Resultados](evidence/issue142/hosted-1a.json).

## Gate final y reversión

Sin `db push`, `migration repair`, aplicación de SQL/Edge a producción o lanzamiento final. La publicación requiere PO: instalar la única migración revisada en la historia vigente mediante vía aprobada, publicar aviso/frontend exactos, verificar retención y habilitar explícitamente utilidad con aviso`pazo-first-utility-notice-v1`/fecha de inicio. No ampliar flags financieros ni invitaciones.

Reversión mínima: apagar `utility_enabled` o el gate global, conservar la purga y volver al frontend previo si fuera necesario. No borrar auditoría ni ejecutar DROP destructivos. El esquema inerte puede permanecer hasta revisión; no es necesario tocar Auth, pagos ni datos clínicos. El paquete final de issue142 conserva la decisión única de publicación del PO.
