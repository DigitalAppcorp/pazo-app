# PAZO F16-P28 — revisión real de permisos Vault (NO-GO)
Fecha de evaluación: 2026-10-15. Solo lectura; proyecto Supabase mrybvqdebbgcayuvgkkr.

## Evidencia de catálogos alojados
- `vault.decrypted_secrets` (vista): SELECT concedido a service_role; denegado a anon y authenticated.
- `vault.secrets` (tabla): SELECT concedido a service_role; denegado a anon y authenticated.
- Esquema `vault`: USAGE service_role=true, anon=false, authenticated=false.
- `vault.create_secret` y `vault.update_secret`: EXECUTE service_role=true; anon/authenticated=false; SECURITY DEFINER=true.
- `extensions.hmac` (text y bytea): EXECUTE service_role, anon y authenticated=true. La función HMAC sola no expone una clave si no se le entrega una.
- Esquema `supporter_private`: USAGE service_role=false, anon=false, authenticated=false. El acceso a RPC específicas SECURITY DEFINER sigue siendo una frontera separada.

## Conclusión de seguridad
El service_role alojado puede, por permisos efectivos, consultar la vista de
secretos descifrados. No basta con guardar el HMAC en Vault para asegurar
aislamiento de la credencial contra un caller de service_role. Además,
la función de auditoría existente tiene privilegios de invocación para
service_role, y el prototipo SQL de lectura aún NO está instalado.

## Alternativas para revisión
A. Aislamiento por credencial distinta y mediación mediante servicio
privilegiado, con auditoría de invocaciones y sin enviar claves al cliente.
B. Rediseñar los privilegios Vault y crear un rol de verificación limitado,
siempre que sea compatible con el funcionamiento de Supabase y pueda
demostrarse con pruebas de permisos, revocación y restauración.
C. Utilizar verificaciones criptográficas asimétricas para que la base
únicamente conserve una clave pública, si el esquema de autorización y
transacciones permite verificar firmas por evento/solicitud.

No elegir ni instalar ninguna alternativa sin una revisión de amenazas.
En particular, ninguna opción resuelve por sí misma caducidad,
revocación de operadores, reintentos o rotación de claves.

## Gate requerido
1. Acordar amenaza de compromiso de service_role vs compromiso de Edge.
2. Elegir frontera criptográfica que no dependa de un supuesto falso
   de aislamiento Vault.
3. Verificar revocación, rotación, auditoría de accesos y retención.
4. Probar en PostgreSQL descartable antes de DDL alojado.
5. Obtener GO explícito del Product Owner para DDL, secretos reales y despliegue por separado.

**NO-GO alojado:** no nuevas RPC, secrets, endpoint, PayPal, worker ni beneficios.
