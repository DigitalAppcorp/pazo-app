# PAZO — conciliación de alcance beta y cierre operativo (22-oct-2026 UTC)

Estado: **EN CURSO / NO BETA FINANCIERA PÚBLICA**. No sustituye `AGENTS.md`, `PAZO_ACTIVE_HANDOFF.md` ni la orden textual del PO del 21-oct-2026.

## Autoridad y criterio
El PO ordenó terminar el software de beta y PayPal Live **antes** de entregar la configuración de credenciales. Su única operación rutinaria final debe ser el ingreso privado del Client ID y Secret en Administración; un canary real por US$2.99 y la apertura de Live requieren consentimiento/GO independientes. No repetir Sandbox aprobado ni publicar beneficios basados en una aprobación o retorno sin pago liquidado. No crear otro plan/webhook.

## Reconciliación de gates (evidencia positiva no heredable a gates siguientes)

| Gate | Estado y prueba |
| --- | --- |
| Integración F13/F16 y código P1–P4 | **CODE + CI / integrado a main antes de este PR**: PR71, SHA `f7cc359a15e874942f68fc15f55c43e851f7724d`; infraestructura Supabase activa según postflight previo. |
| Production HTTPS libre de login de Vercel | **PASS** deployment `dpl_J548ManBu2xMJCUwV6L7QwiNfNzM` READY y origen `https://pazo-app-t83r.vercel.app`. |
| HTTP estático de PWA | **PASS limitado**: siete rutas GET (home, return, cancel, manifest, SW, iconos) en Actions `39718690012`. No prueba instalación física, sesión autenticada ni flujo PayPal real. |
| Certificado técnico P4 | **PASS**: una fila firmada por digest documentado, `admin_private.pazo_live_artifact_ready()=true`. |
| PayPal Live | **OFF / NO CANARY**: release `off`, interruptor Live apagado, kill-switch activo, sin merchant ni venta Live. No tocar hasta credenciales privadas/GO. |
| Administración de cuentas con rol admin-only | **BUG CONFIRMADO Y CORRECCIÓN EN PR74**: el cliente filtraba por moderador aunque admin grant fuera válido. Se separaron UI y cola de denuncias, manteniendo el control de RLS/RPC. |
| Accesibilidad de consola | **MEJORA EN PR74**: diálogo fullscreen enfocable, Escape, confinamiento de Tab, restauración de foco; pendiente interacción real por navegador para aceptación. |
| Fidelidad visual de Admin | **NO CERRADO**: PO rechazó iteraciones previas; el último rediseño integrado no tiene aceptación visual explícita. Referencia canónica Library `Panel de Control PAZO en Tiempo Real (1)(1).png`. No alterar el diseño sin captura actual. |
| PWA instalada (Android/iOS), login y retorno | **NO E2E**: falta prueba en dispositivo real, con sesión propia y rutas de retorno/Cancel sin fuga ni pérdida del contexto. |
| E2E PayPal Live con dinero | **BLOQUEADO POR CREDENCIALES PRIVADAS Y GO**: compra original US$2.99, recibo firmado, conciliación, período, insignia, cancelación y rollback, sin cargos hasta aprobación expresa. |
| Auth y seguridad de contraseña | **REVISIÓN**: el advisor Supabase indica `auth_leaked_password_protection` WARN; no se cambiaron parámetros Auth. Los avisos `rls_enabled_no_policy` en esquemas privados no prueban vulnerabilidad y no se corrigen concediendo políticas permisivas. |
| Cambio de `main` o nuevo despliegue | **NO** como parte de PR74: no se realizó merge, Vercel deploy ni operación financiera. |

## Corrección técnica en PR74

- `src/features/moderation/ModerationAccess.tsx`: el permiso de administrador permite abrir la consola sin privilegios de moderador. La cola de denuncias y de medios permanece exclusiva de moderadores. Los permisos siguen verificándose por RPC/RLS alojados.
- `src/features/admin/components/AdminDashboard.tsx`: oculta la pestaña de denuncias cuando el operador no tiene ruta autorizada; preserva el panel responsive seleccionado por el PO. Adiciona administración accesible de teclado sin bordes decorativos.
- `src/features/admin/testing/adminDashboard.test.mjs`: añade contratos de roles, enfoque del diálogo, Escape, Tab y restauración del foco.
- `.github/workflows/ci.yml`: únicamente el job PG17 desechable F16-P12 usa un puerto publicado dinámicamente. CI anterior `39723743142`: prueba estática antigua falló después del cambio de nodo portal; también ocurrió colisión efímera de puerto fijo 55442. Prueba corregida; siguiente CI `39723890289` tuvo 4/4 jobs PASS **antes** del ajuste del puerto. Cualquier CI posterior debe inspeccionarse antes del merge.

## Secuencia restante

1. CI final de PR74 PASS, revisión de diff, actualización de evidencias.
2. Validación visual en navegador real de la última consola (desktop ~1440, móvil ~390) frente a referencia ya elegida; no pedir nuevas opciones de diseño.
3. Prueba física PWA Android Chrome/iOS Safari y login/ruta de retorno/cancelación con cuenta autorizada, sin forzar una venta antes del canary.
4. Cierre de avisos de seguridad relevantes y revisión manual de políticas/baja de cuenta MVP conforme al carril reducido aprobado.
5. Solo con software y UX listos: provisionar credenciales Live **exclusivamente desde PAZO Admin con MFA**. Canary financiero US$2.99 bajo GO separado, conciliación, cancelación, beneficios; luego GO público.

**Prohibido declarar BETA_LISTA por CI, certificado P4 o deployment READY aisladamente.**
