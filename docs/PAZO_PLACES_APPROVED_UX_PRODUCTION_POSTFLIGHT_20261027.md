# Lugares aprobado — producción y cierre

27 octubre2026, America/Guatemala. **PUBLISHED / POSTFLIGHT PASS.** Dominio oficial: https://pazo-app.vercel.app/

PO aprobó propuesta02 y corrección03 de idioma y ordenó expresamente producción. PR138 integrado en `8dbf4ef5fe7a926f1caee3a55ee3c60f31400c04`, árbol idéntico al candidato `3e6448f44c56e5b04675240ee6dc6264f0969252`. Las nueve comprobaciones del candidato terminaron SUCCESS: CI40615616407 (7jobs) y F1840615616484 (2jobs).

Vercel producción `dpl_3KrqGdJmijURjdirv1W1iwhkhSW7`, proyecto `prj_nk61nr5ZVpxlp8qbIvRCsua36iXI`, team `team_02Ax5UcD1OlLzpDBYyNMi6KO`: READY, gitSHA exacto del merge. Se leyó de nuevo el alias canónico apuntando a este despliegue. URL propia: https://pazo-o7ggl0531-digitalapp.vercel.app. Sin rollback; despliegue anterior conservado `dpl_47U5Q21kxWGDiiyLh5hU62Yurp3c`.

## Postflight verificado

- 22 comprobaciones públicas PASS: HTML, rutas PayPal return/cancel con token ficticio sin pago, manifest standalone, iconos PNG192/512, worker y cuatro bundles. Se comprobaron los marcadores de la ficha, claves de validación y el nuevo contenido inglés en el artefacto servido.
- Chromium público390px: bienvenida/demo reales, mapa de proveedor real, catálogo Supabase `pet_places` HTTP200, selección desde pin y ficha aprobada. Dogs, descripción y reglas en inglés; vuelta a español muestra Perros y descripción original. Direcciones conserva coordenadas/URL original.
- Fotos abre el destino en desarrollo; el visitante demo no tiene botón para registrar interés y recibe el mensaje de inicio de sesión. Canvas1, cero desbordamiento horizontal y cero errores JavaScript.
- No escrituras de validación, presencia, cuentas ni finanzas. Dos POST a la RPC pública de mantenimiento son lecturas existentes: la función SQL es STABLE y sólo SELECT. No se clasificaron incorrectamente como escrituras por su método HTTP.
- Capturas de ficha EN/ES, Fotos EN y controles revisadas. La comparación previa con el prototipo aprobado y las pruebas integradas están en el informe de release.

## Scope closure reconciliation

Los seis accesos contextuales, diseño propio de Lugares, arte vectorial, idiomas y liquid aprobados están integrados y publicados. Doce funciones del controlador y ocho archivos protegidos permanecen idénticos tras normalizar EOL. Sin cambios a esquema, RLS, Edge, Auth, secretos, pagos, flags o marketing. No se crearon funciones futuras ni datos simulados en cuentas reales.

Las pruebas previas sobre componentes reales con límites de servicios aislados cubren interés/deduplicación/intención, errores/reintento y presencia privada/inicio/visibilidad/salida. El postflight público no equivale a una escritura autenticada en producción, una compra real, GPS físico ni instalación PWA física; no se realizaron esas operaciones. Tampoco convierte cohortes anteriores/nuevas de exposición en comparables causalmente. Las traducciones conocidas no son un servicio general de traducción de contenido futuro.

Evidencia: `docs/places-ux-20261027/production-release.json`, `production-http.json`, `production-browser.json`, `production-spanish.json`, `preflight.json`, `flows.json`, `language.json`, `fidelity.json`, `invariants.json`, `po-approval.json`. Los commits de documentación posteriores no implican nuevo despliegue ni otro artefacto frontend.
