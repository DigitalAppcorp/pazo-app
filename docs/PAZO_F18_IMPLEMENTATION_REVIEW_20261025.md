# PAZO F18 — revisión de implementación

**Estado:** código y laboratorio preparados para revisión. Sin merge, migración alojada, despliegue oficial, activación pública, secretos nuevos ni compra real. La aceptación visual y el GO de producción pertenecen al PO. Este informe no declara cierre global de F16/F17 ni de la fase histórica de Adopciones.

Revisión posterior: [correcciones del comentario 6394513523 y evidencia reproducible](PAZO_F18_REVIEW_CORRECTIONS_20261025.md). La resolución masiva de incidencias se retiró; el inicio de checkout ya no hereda la condición canaria de una función histórica; los controles dependen del estado autorizado del servidor.

La implementación sustituye la puerta comercial gradual por admisión financiera pública de cuentas elegibles. El acceso manual, la primera invitación, la bandeja interna y los regresos de PayPal usan la misma membresía. Se conserva el precio US$2.99 mensual, la renovación hasta cancelar, el consentimiento inmutable y PAZO gratuito. El diseño G usa el brote luminoso sobre una huella, con salida visible, foco sin contornos y movimiento reducido.

## Cambios relevantes

La migración `20261025054548_pazo_f18_public_supporter_invitations.sql` se creó con CLI y se instala con compras e invitaciones OFF, sin certificado. La admisión ya no consulta cupos, espera, reservas comerciales, etapa, interés ni autorización individual. Exige cuenta real autenticada/elegible, onboarding, ausencia de QA/baja/baneo, generación y merchant originales, certificado técnico, plan/oferta, salud reciente, webhook, ausencia de incidentes y retenciones críticas. Conserva el bloqueo transaccional por propietario, una sola intención abierta, el claim de proveedor único y la recuperación del intento original.

Promoción y finanzas tienen controles independientes. Pausar compras no apaga conciliación, recuperación original ni cancelación. El worker privado existente ejecuta un tick transaccional de notificaciones; no se añade un scheduler, proveedor o canal externo. Se retiraron de la UI los paneles y hooks graduales, la política promocional anterior de 7/30 días, sus herramientas de presentación y el mantenimiento de promociones/reservas. Las RPC comerciales viejas pierden permisos y sus tres triggers de cola quedan deshabilitados. **Tablas, ledger, auditorías, consentimientos, transacciones e historia se conservan.** Las funciones históricas financieras de propietario/claim/proyección se reutilizan porque preservan controles, aunque mantengan nombres antiguos; no se eliminan por nombre.

La promoción se identifica por cuenta/campaña. La primera utilización y el retorno se fechan en el servidor (días UTC); una acción significativa proviene de escrituras confirmadas de publicación/cuidado o de uso de QR propio habilitado, sin contenido privado. Una reserva de presentación de un minuto se recupera si nunca llegó a comprometerse. Un segundo CAS autoriza una única presentación y no se vuelve a emitir; el timestamp de impresión se confirma tras render visible, o mediante una acción de la pantalla. Si el proceso muere exactamente entre compromiso y render/ACK, se prefiere perder ese contacto a mostrarlo dos veces; no se programa un recordatorio sin una impresión/visita conocida. Un cierre normal no es opt-out. El opt-out explícito persiste también frente a campañas futuras.

La segunda y última invitación se inserta únicamente en `notifications`, después de 14 días completos desde la impresión confirmada; para quien conocía voluntariamente la oferta, desde esa primera visita. Inbox y ACK se confirman juntos con IDs únicos. No hay push, SMS ni correo. Se suprimen suscripciones/pagos pendientes, cortesías vigentes, rescate y opt-out. La primera pantalla se compone exclusivamente en Inicio, fuera de onboarding, formularios, errores, overlays, edición y mascotas perdidas. Las cortesías mantienen beneficios y tienen una entrada voluntaria a la oferta.

El agradecimiento depende del recibo firmado, venta conciliada, período vigente y beneficio activo, aunque no exista fila gradual. Es único por cuenta; no vuelve con una renovación. El feedback opcional `ok/issue/skipped` enlaza un ticket privado idempotente y nunca modifica derechos. El resumen de ingresos verifica además recibo original y correlación; intentos, cortesías y filas sin firma no se presentan como ventas. El contador de miembros comparte la misma autoridad de cobertura.

## Panel PayPal Live

| Sección | Operación disponible |
|---|---|
| Resumen | Estado efectivo de nuevos cobros/publicidad, merchant, plan/precio, salud, miembros verificados, pendientes e incidencias; importes de ledger separados de saldo/neto PayPal |
| Configuración y controles | Solo pausar **o** abrir checkout según estado y prerrequisitos; solo pausar **o** reanudar invitaciones; confirmación literal, MFA reciente servidor, CAS/nonce y auditoría. Incidencias en lectura, sin acción de resolución |
| Suscripciones y miembros | Búsqueda autorizada por cuenta/mascota, estado de suscripción, cancelación, períodos/cobertura y gestión de cortesías existente |
| Pagos y conciliación | Resumen verificado, eventos recientes, pendientes, holds por reembolso/disputa y soporte privado |
| Invitaciones y conversiones | Elegibilidad por señal, pantalla mostrada, último recordatorio, aperturas, descartes, conversiones verificadas y opt-outs; sin contar intentos como ventas |
| Integración y seguridad | Readiness, verificación de recursos, custodia existente solo si falta y auditoría; sin reserva comercial, rotación automática ni editor de secretos guardados |

Los datos se borran de la interfaz al cambiar de cuenta y las respuestas tardías de búsqueda se descartan. La campaña actual es fija, dos contactos y 14 días: no se expone un editor que permita exceder lo aprobado.

## Evidencia ejecutada

| Verificación | Resultado local |
|---|---|
| `npm run verify:prepreview` | PASS: governance (incluye 511 pruebas de cierre), 1,195 pruebas financieras sintéticas, compilación TypeScript/Vite y cuatro comprobaciones del dist/PWA |
| `npm run test:f18` | 12 PASS: controles MFA/input/origen/errores, acción de resolución retirada, matriz de estados y bloqueos, tick, manifiesto completo de fuentes y ausencia de autodeploy |
| `npm run test:gradual` | 68 PASS de límites financieros/recuperación y compatibilidad histórica, adaptadas a la nueva comunicación |
| `npm run test:f18:pg17` | PASS: migración real, ensayo ROLLBACK, 70 comprobaciones SQL previas + 26 de revisión + cuatro escenarios concurrentes; roles/RLS, señales/impresiones/14d, cuenta directa, cortesías, feedback, merchant/claims/pausa/certificado, resumen financiero e incidentes preservados |
| Sesiones PostgreSQL concurrentes | 20 dispositivos: un permiso; 30 cuentas sin cupos; ocho workers: 31 avisos/31 cuentas; feedback simultáneo: un ticket |
| `npm run test:f18:browser` | 260 comprobaciones PASS: React real → RPC PostgreSQL desechable → respuesta; Auth y proveedor simulados; todas las salidas externas interceptadas |
| Historial alojado de migraciones | 7 pruebas de integridad/archivo PASS; no replay desde cero ni reconciliación/repair de producción |
| `git diff --check` | PASS |

El baseline financiero anterior se reproduce antes del SQL F18; no se está certificando el replay histórico completo de Supabase. La fuente se compara en [SOURCE_MANIFEST.json](review/f18/SOURCE_MANIFEST.json), generado por `node scripts/f18-release-manifest.mjs`; incluye la clausura completa de imports de los tres Edge afectados y hash SQL sobre los bytes LF de Git, sin credenciales. La conversión CRLF del checkout de Windows no modifica ese contrato; el archivo SQL a instalar debe tener exactamente los bytes/hash LF revisados. El inventario F18 NOT_APPLIED se separa de las 122 versiones históricas, sin reescribirlas ni autorizar push. La diferencia de conteo 1,197→1,195 elimina exclusivamente dos pruebas de la política promocional obsoleta; las pruebas financieras permanecen.

Las 18 rutas del encargo se cubren mediante composición de pruebas reales SQL y pruebas de proveedor sintético existentes: primera contratación; salida sin autorizar/abandono; pendiente/rechazo/red; doble clic/dos dispositivos; webhook tardío/duplicado; actividad/renovación/fallo; cancelación/vencimiento; reembolso/disputa; cortesía/apoyo con cortesía; incidentes. No se concede cobertura por redirect o `ACTIVE` remoto. La cuenta con resultado incierto conserva su mismo intento y no ofrece otro CREATE.

## Revisión visual

Inspeccionadas capturas G ES/EN a 320×568, 390×844, 768×1024 y 1440×900; oferta ES/EN; panel resumen y controles también en los cuatro tamaños e idiomas. Precio y salida, scroll en pantalla corta, ausencia de palabras partidas/overflow horizontal, teclado/Escape y reduced-motion comprobados. El panel conserva superficies PAZO sin contornos. [Galería local estática](review/f18/index.html) y [dirección de arte/prompt](review/f18/ART_DIRECTION.md). Estas capturas son fixtures de laboratorio, no pagos ni clientes reales ni aprobación visual del PO.

## Auditoría de producción, solo lectura

Base inicial `main` 37e5e7c423148ff34aadc7990affeaf268b30a43; PR103 3570ff78bacb0d0325f56fec699ed05d4d3ef125. Se inventariaron PRs abiertos sin fusionar sus ramas. Supabase informó checkout v6, worker v11, account v7, webhook v2, admin gradual v2 activos. Vercel informó último deployment oficial READY desde bf78b857cfaf470d13703db0a88b6ecf3b345a73. Postflight solo lectura: modo `limited`, cero períodos pagados, tablas existentes de cortesías/soporte presentes y F18 no instalado. `vercel.json` mantiene `git.deploymentEnabled=false`.

## Gates pendientes, sin trabajo de código diferido

La aplicación real del SQL, los Edge y frontend requieren autorización explícita y ejecución del [runbook de producción](PAZO_F18_PRODUCTION_GATE_20261025.md). El certificado de despliegue es solo de operador PostgreSQL, registra commit/hashes/generación y exige ambas pausas; no activa nada. Abrir compras requiere después un administrador con MFA reciente en PAZO y confirmación expresa. Merge a main y publicidad pública requieren su GO, no se infieren del PR.

Sin comprador independiente y consentimiento auténtico no se certifican dinero recibido, entrega/firma del webhook real, período y beneficios Live efectivos, renovación mensual real, cancelación ante PayPal ni reembolso/disputa reales. No se fabricó una compra ni se cambió ningún secreto. La prueba Live real y la aceptación visual son los pasos de validación del PO, no funcionalidades sin programar.

Para revisar: abrir la galería, inspeccionar el diff/manifiesto y CI, revisar este informe y el runbook. Aprobar por separado visual, integración/despliegue, apertura pública y compra Live voluntaria. No ejecutar `supabase db push`, `migration repair` ni scripts de laboratorio contra producción.
