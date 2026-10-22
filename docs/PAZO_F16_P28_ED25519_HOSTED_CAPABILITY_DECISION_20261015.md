# PAZO F16-P28 — Ed25519 versus PostgreSQL: decisión NO-GO

## Evidencia, 2026-10-15
- CI Ed25519: PASS, runs 38851502609 y 38851502618.
- PostgreSQL alojado tiene pgcrypto 1.3 en extensions y supabase_vault 0.3.1 en vault.
- pgsodium NO aparece entre las extensiones instaladas consultadas.
- Las pruebas Ed25519 realizadas pertenecen al runtime WebCrypto; no prueban verificación de firma en SQL.
- Una comprobación de catálogo previa no encontró funciones para verificar firmas asimétricas entre las funciones examinadas.

## Decisión de arquitectura
No instalar una RPC Ed25519 en el proyecto alojado, porque falta un
verificador SQL compatible y auditado. Tampoco se instalarán extensiones
sin autorización específica. Evitar afirmar que pgcrypto.hmac equivale
a verificación de firma asimétrica.

## Rutas que requieren evaluación
A. Separar el servicio verificador de la persistencia y diseñar consumo
atómico resistente a reintentos; exige modelo de confianza para service_role.
B. Evaluar una extensión compatible con firmas asimétricas bajo la
política de Supabase, con permisos mínimos y gestión de versiones.
C. Mantener la integración deshabilitada y revisar si esta funcionalidad
administrativa histórica resulta indispensable para liberar el MVP.

## Alcance del bloqueo
Solo P28 revisión histórica. No bloquear por defecto otras funcionalidades
independientes de PAZO. No cambiar PayPal, worker ni beneficios.

Estado: REVIEW ONLY; NO secretos, DDL ni endpoints alojados.
