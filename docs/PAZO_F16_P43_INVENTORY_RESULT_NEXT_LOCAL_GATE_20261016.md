# PAZO F16-P43 — inventario ejecutado y próximo gate operativo (16-oct-2026)

## Evidencia informada por Codex (NO ejecutada por este agente)

El operador ejecutó `scripts/f16-p43-local-tooling-inventory.ps1` en Windows y reportó:

```text
supabase=NOT_INSTALLED
psql=NOT_INSTALLED
vercel=INSTALLED 63.1.2
database.credential.xml=ABSENT
connection.json=ABSENT
P43_TOOLING_INVENTORY_ONLY_NO_DB_AUTH_OR_MUTATION
```

El operador indica que guardó el resultado en una ruta local `INVENTARIO_20261016.txt`.
**No se ha abierto ese archivo local desde ChatGPT**; lo anterior es una
reproducción del reporte textual suministrado, no una auditoría de bytes.

**Interpretación:** no hay ninguna ruta local PostgreSQL ya lista; es
incorrecto afirmar que la provisión P42 puede comenzar ahora. No se
demostró error de contraseña: no existe todavía un cliente conectado para
probarla. `vercel` está instalado, pero disponibilidad de CLI **no
implica** acceso autenticado al equipo `digitalapp`.

## Primer paso — comprobar alcance sin alterar nada

Archivo nuevo:
`scripts/f16-p43-next-prereqs-readonly.ps1`.

Ejecutar en el checkout correcto con PowerShell 7:

```powershell
./scripts/f16-p43-next-prereqs-readonly.ps1
```

El archivo consulta solo la presencia de `node`, `npm`, `scoop`,
`psql`, `supabase` y, si está instalado `vercel`, realiza
`vercel whoami` y `vercel teams ls` (sin iniciar sesión, desplegar,
vincular proyecto, leer env vars ni imprimir email/token/nombre de cuenta).
Emite únicamente estados como `VERCEL_SESSION=AUTHENTICATED` y
`VERCEL_DIGITALAPP_TEAM=LISTED`. Terminal esperado:
`P43_TOOLING_SCOPE_READ_ONLY_NO_SECRETS`.

Si el equipo digitalapp no está accesible, el dueño del proyecto debe
restaurar el acceso desde la sesión privada autorizada de Vercel antes de
auditar nombres de variables. **No ejecutar `vercel env pull`, `env add`,
`env rm`, `vercel link` o `deploy` como parte de este gate**.

## Herramientas por instalar — únicamente en equipo local y con el usuario

- **Supabase CLI para Windows:** vía Scoop, opción oficialmente
  documentada: `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git`
  y `scoop install supabase`. Esto instalaría una herramienta local;
  el agente NO lo ha ejecutado. Si Scoop no está disponible, verificar
  versión Node >=20 para evaluar `npx supabase --help`, que puede
  descargar dependencias al caché; `npm install -g supabase` NO
  está soportado oficialmente. Fuentes:
  https://supabase.com/docs/guides/local-development/cli/getting-started
- **PostgreSQL client `psql`:** usar los instaladores oficiales para
  Windows, seleccionando las **Command Line Tools** sin servidor ni
  servicio PostgreSQL adicional, o ruta cliente-only verificada.
  https://www.postgresql.org/download/windows/
- Tras instalación, repetir inventario y únicamente consultar
  `supabase --version`, `psql --version`, `supabase db dump --help`
  (help, **no dump**). Ni login, ni link, ni crear un rol temporal aún.

El acceso DB temporal por Supabase CLI se mencionó en
`scripts/backup-database.ps1` y docs del proveedor. Probar la ruta real
`db dump --dry-run` podría emitir material secreto/crear rol temporal:
**NO ejecutar sin gate separado, revisión de versión e interfaz privada
para conservar secreto fuera de logs**. Ese camino podría evitar reset
de contraseña, pero todavía no está demostrado en esta PC.

## Gates pendientes

1. Vercel equipo digitalapp: sesión y acceso confirmado, variables
   por nombre/destino **sin valores**, no auditoría actual (conector 403).
2. CLI local y `psql` instalados y versionados.
3. Revisión/autorización independiente para usar credenciales temporales,
   si corresponde (o decisión explícita sobre reset, tras impacto).
4. Decisión PO `not_before` exacta y política `not_after`
   para P42; **120 segundos es solo vigencia de firma HMAC**.
5. Provisión dual segura y postflight, todos los gates desactivados.

**Estado:** P43-BLOQUEADO por acceso y vigencia, F16 NO-GO.
**Sin cambios Supabase, PayPal, Vercel, claves reales ni pagos.**
