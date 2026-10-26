# Marketing PAZO: candidato reconciliado y gates pendientes

Fecha: 26-oct-2026, America/Guatemala. Orden directa del PO adjunta al chat Codex.
Base: main `870db392ffdd68869244484f2a66f361f8ac0c91`; producción observada:
`a8d837994eacaa8c90844c252ffd5131e17fdd4b`, Vercel
`dpl_GeqCir3UT9hyKN8bDygQqiUW6N7F`, READY y alias pazo-app.vercel.app.
La orden autoriza completar código/pruebas/PR; conserva GO independiente para
instalación OFF, recopilación, proveedores y publicidad. Ninguna escritura alojada.

## Estado verificable

| Control | Resultado |
| --- | --- |
| TRACKING CODE | PASS local; CI del candidato registrado en evidence/marketing-e2e-20261026 |
| HOSTED INSTALLATION | BLOCKED: requiere GO específico de instalación OFF |
| TRACKING COLLECTION | OFF, sin esquema ni Edge de marketing instalados |
| REAL E2E VERIFICATION | BLOCKED: no se autorizó registrar cuentas alojadas ni activar colección/proveedor |
| PRIVACY & RETENTION | PENDING; propuesta de 14 días, sin política configurada |
| META CAMPAIGN DRAFT READINESS | READY para preparar los tres borradores sin publicar ni gastar; elegibilidad de cuenta Meta no inspeccionada |
| TRAFFIC LAUNCH READINESS | BLOCKED: falta medición alojada, política/proveedor y GO de presupuesto |
| PRODUCTION REGRESSIONS | NONE VERIFIED en controles públicos y salud financiera leída; no certifica una compra real |

READY TO CREATE ADS significa preparación técnica para borradores, no autorización
para crear anuncios en esta ejecución. READY TO LAUNCH TRAFFIC permanece BLOCKED.
La página pública y PWA se comprobaron realmente; el embudo se ensayó en aislamiento.

## Reconciliación y correcciones

PR91 sigue DRAFT en `39ef9c0c1303170821c9e95931f96986aecb201b`, basado en F17 antiguo.
Issue96 está cerrado por alcance de programación, no por instalación.
Este candidato incorpora ese trabajo sobre main actual, preservando UI aprobada,
servicios financieros, migraciones históricas, Auth y dependencias de producción.
Conflictos resueltos conservando ambos historiales documentales, scripts F18 y
configuraciones Edge existentes. No usar el SHA antiguo como candidato de despliegue.

Se corrigió un riesgo de atribución entre cuentas: el staging local queda vinculado
al UUID devuelto por el registro; restaurar una cuenta distinta no lo consume.
Cada envío fija el token de la sesión correspondiente, evitando tomar el de una
cuenta que cambió mientras la petición estaba pendiente. Una respuesta tardía no
borra el staging de otra cuenta. El UUID local no se incluye en el cuerpo analítico,
URLs ni reportes; el servidor autentica por separado. El staging vence a las 72 h.
Datos antiguos sin vínculo no se convierten automáticamente.

Se añadió una regresión ejecutable con restauración, doble envío, fallo de red,
cambio de cuenta y respuesta tardía. Se corrigió una aserción de código sensible
a CRLF; no se cambió el comportamiento para ocultarla. El laboratorio Docker usa
socket local explícito Windows/Linux, sin heredar un contexto remoto. El navegador
recupera módulos de prueba por loopback con fetch de Node, porque el transporte
APIRequestContext del runtime local devolvía ECONNRESET repetidamente.

F17 conserva los controles de sus 122 fuentes históricas y ocho archivos prehistóricos.
Las únicas adiciones son las dos migraciones exactas de PR91, registradas como
NOT_APPLIED con SHA256 en [manifiesto](evidence/marketing-e2e-20261026/prepared-migrations.json).
El guard comprueba versiones, rutas y hashes, sin permitir SQL adicional arbitrario.
NO_GO_DB_PUSH / NO_MIGRATION_REPAIR / NO_RESET se mantienen.

## Embudo y límites

UTM cerrada → llegada aproximada → solicitud de registro ≠ conversión → Auth
confirmado → primera atribución por cuenta → primera mascota literal dentro de
7 días → proxy de navegación D7. SQL excluye QA/SandboxQA/fundador/admin de forma
retroactiva; deriva mascotas y actividad sin copiar contenido. Borrado Auth CASCADE.
No visitantes únicos, CVR, ROAS ni causalidad inferidos. D7 no equivale a retención
significativa. Una ventana sin madurar no demuestra ausencia de retención.

Los códigos canónicos existentes se conservan para Facebook e Instagram:
`utm_source=meta&utm_medium=paid_social&utm_campaign=pazo_beta_local_202610`.
No se afirma separación Facebook/Instagram: las URLs usan el mismo origen canónico.
Contrato propuesto para los tres creativos ingleses del piloto:

| Formato | utm_content | Etiqueta actual del panel |
| --- | --- | --- |
| Imagen | perfil_en | Profile · English |
| Carrusel | qr_en | QR · English |
| Video | comunidad_en | Communities · English |

Los nombres técnicos son heredados; este mapeo explícito permite distinguir los tres
anuncios sin modificar las migraciones revisadas. No añadir IDs dinámicos, emails,
nombres ni URLs completas. Ejemplo imagen:
https://pazo-app.vercel.app/?utm_source=meta&utm_medium=paid_social&utm_campaign=pazo_beta_local_202610&utm_content=perfil_en
Para carrusel/video sustituir únicamente utm_content según la tabla. Las tres URLs
usan el mismo contrato validado; aún no prueban atribución alojada porque está OFF.

## Pruebas ejecutadas

| Comando/control | Evidencia y resultado |
| --- | --- |
| npm run test:marketing | 38 PASS, incluye cruce de cuentas |
| npm run test:marketing:pg17 | 28 comprobaciones adicionales PASS más SQL legado; roles, concurrencia, rollback/purga y Cron simulado |
| npm run test:marketing:e2e | 54 PASS; React AuthProvider/Onboarding/Edge/PG17/Admin reales en laboratorio; email/Auth/Siteverify/Cron simulados |
| npm run test:governance | PASS; incluye nueva suite marketing |
| npm run test:gradual | PASS; último grupo 69 casos |
| npm run test:f16:synthetic | 1196 PASS; OpenSSL existente añadido solo al PATH del proceso tras ENOENT inicial |
| npm run build | PASS TypeScript/Vite; dependencias existentes, lockfile intacto |
| Contratos F17/historia/mapa/mantenimiento | 35 PASS después de registrar las dos fuentes pendientes |
| HTTPS/PWA canónica | 7/7 PASS real: home, rutas return/cancel con token ficticio no financiero, manifest, SW e iconos |
| Chromium público | HTTP200, sin overflow ni errores JS a 320/390/1440; cero llamadas marketing/Meta/Turnstile; peticiones POST bloqueadas deliberadamente |

Capturas `synthetic-*` representan fixtures, aunque el panel muestre “Collection
active”. No son métricas de producción. Capturas `hosted-*` son navegación pública
sin autenticación. No certifican PWA instalada en un teléfono físico, Safari/iOS,
cuenta normal/admin alojada, correo entregado o compra PayPal Live. CI F17 y su
PostgreSQL/navegador deben comprobarse en el SHA exacto del PR; no reutilizar CI91.

## Preflight alojado realmente observado

Supabase PAZO `mrybvqdebbgcayuvgkkr`, PG17.11: no marketing_private, no puente de
purga ni versiones `20261024020632`/`20261024034549`; Edge de marketing ausentes;
pg_cron1.6.4 existente, sin job `pazo-marketing-retention-v1`.
Dependencias Auth, profiles.is_founder, pets(owner_id/created_at), admin_grants,
app_activity_daily, gradual_qa_accounts, f16_sandbox_qa_owners y pazo_is_admin existen.
No se han verificado ACLs de objetos inexistentes en hosted; sí en PG17 aislado.

Salud financiera en SELECT de 19:26:55 UTC: public_supporter_health=true,
checkouts_enabled=true, invitations_enabled=false, hosted_certified=true.
No se llamó a PayPal ni se ejecutaron workers o compras. Este resultado acredita
estado interno momentáneo, no una transacción financiera end-to-end.

## Gate siguiente y reversión

Solicitud única siguiente: autorizar integrar el candidato revisado e instalar
exclusivamente las dos migraciones y ambas Edge de marketing con recopilación,
landing y reporte OFF, retención0, sin Cron nuevo, proveedor ni usuarios de prueba
alojados. El riesgo es DDL dirigido y publicación de código inactivo; revisar CI,
hashes/ACL y postflight antes de ejecutar. No alcanza a PayPal, tablas financieras,
política de retención, Cloudflare o anuncios.

Aplicar [runbook](PAZO_MARKETING_INSTALLATION_RUNBOOK_20261023.md) con el nuevo
candidato exacto. Mantener versiones/checksums y no replay del historial. Si falla:
gates OFF, revertir frontend/Edge al deployment fuente conocido, preservar datos
y eliminación ya autorizada; nunca borrar tablas/usuarios/evidencia financiera.
Al no haberse instalado nada, no hay rollback alojado necesario en esta entrega.

Antes de recopilar: aprobar aviso/plazo y manejo real de backups/logs; configurar
Cloudflare en privado y validar proveedor real; instalar Cron con GO y observar
dos ejecuciones periódicas reales separadas, salud≤7h; autorizar una cuenta QA
alojada aislada y su eliminación, sin incluirla en métricas comerciales. Si la
exclusión QA impide atribución comercial, verificar rechazo como resultado esperado;
un caso positivo requiere entorno alojado de pruebas aislado, nunca convertir QA
en usuario comercial para fabricar una conversión.

[Privacidad y Meta](PAZO_MARKETING_PRIVACY_META_GATE_20261026.md) contiene la propuesta
revisable. Los requisitos pendientes no autorizan activar colección en esta entrega.

Revisión React del candidato: panel con estado vinculado a período/revisión/idioma, sin mostrar respuestas antiguas al cambiar consulta; ESLint de marketing/panel PASS y54 E2E reejecutadas PASS. AuthContext mantiene tres diagnósticos ESLint preexistentes (set-state-in-effect/only-export-components); no se refactoriza Auth fuera del alcance. Build y suite de Auth pasan. Brain OS canónico consultado fab6ff1c; Token Savior intentado con checkout absoluto verificado, índice no encontró símbolos de este worktree nuevo; lecturas acotadas contrastadas, sin ahorro medido/config global cambiada. Landing pública comienza en español con selector de idioma; el idioma inglés de los anuncios no se presenta como detección automática del sitio.
