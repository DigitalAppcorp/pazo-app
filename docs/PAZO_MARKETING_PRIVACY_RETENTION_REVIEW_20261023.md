## Issue96 — programación de medición interna preparada, OFF (23-oct-2026)

Trabajo en PR91 sin instalación ni activación. Auditoría técnica, pruebas y gates externos: [cierre técnico](PAZO_MARKETING_TECHNICAL_COMPLETION_ISSUE96_20261023.md) y [runbook](PAZO_MARKETING_INSTALLATION_RUNBOOK_20261023.md). Estas notas prevalecen sobre propuestas históricas del módulo que aún indican cron/antiabuso sin programar.

> VIGENTE: decisión del Product Owner, atribución interna AUTOMÁTICA sin casilla en registro. Cualquier propuesta de opt-in UI o cadena `pazo-marketing-optin-v1` más abajo es histórica y queda reemplazada por `docs/PAZO_MARKETING_AUTOMATIC_INTERNAL_ATTRIBUTION_20261023.md`. Privacidad/retención y activación siguen pendientes.

# PAZO F17 — Revisión de privacidad y retención para atribución Meta (NO PUBLICAR)

**Estado:** PROPUESTA PARA APROBACIÓN DEL PRODUCT OWNER · 2026-10-23 PDT  
**Código:** PR #91 (Draft), separado del plan de anuncios #89 · **gasto $0**.  
**Resultado actual:** no hay telemetría de anuncios activa ni filas alojadas. Ningún consentimiento de usuario ha sido recogido por esta función.

## 1. Finalidad estricta propuesta

Conocer si una cuenta nueva verificó su correo y creó la primera mascota después de llegar a PAZO mediante una creatividad propia de la campaña piloto Meta. No medir perfiles, nombres de mascotas, ubicaciones GPS, contenido social, información financiera o mensajes. No inferir que un clic en el anuncio equivale a una alta válida. No se comparte conversión individual con Meta, Google ni PostHog en este incremento. No añadir terceros ni cookies de terceros.

## 2. Categorías exactas de datos

| Categoría | Uso | Superficie | Clase |
| --- | --- | --- | --- |
| `owner_id` UUID Auth | deduplicar una alta verificada; vínculo reversible a cuenta | `marketing_private.acquisition` | privado personal/pseudónimo |
| `source=meta`, `medium=paid_social`, `campaign`, `creative` (enums cerrados) | separar fuentes / seis anuncios | mismo | privado telemetría |
| `first_touch_at` y `signup_verified_at` | cohorte de campaña | mismo | privado |
| `consent_version`, `consent_recorded_at` | versión declarada de la aceptación; tiempo **servidor** | mismo | privado |
| Creación primera mascota | derivada de datos existentes `public.pets`, sin copiar nombre/foto | lectura interna | privado derivado |
| Actividad D7 | consulta de día/módulo existente, **proxy de pantalla**, no retención significativa | `admin_private.app_activity_daily` | privado derivado |

No persistir UTM de texto libre, referrer completo, dirección IP, email, fbclid, gps, agente de usuario, ID de mascota, post, mensaje o URL completa. `sessionStorage` del mismo tab con TTL72h solo después del GO específico; actualmente el gate UI está apagado.

## 3. Consentimiento — especificación sin activar

- Casilla separada y **desmarcada** por defecto; consentimiento no necesario para registrarse, confirmar correo, usar QR, formar comunidad o usar el mapa.
- Explicar finalidad, datos exactos, intervalo aprobado, acceso/retiro, no compartir conversiones individuales con plataformas de anuncios en este piloto. 18+ separado.
- Guardar la acción `true` solo en respuesta a un clic del usuario (no derivar de Terms, email verificado, carga de página o evento de Meta).
- Cuando exista un UI aprobado y un servidor con contrato verificado, enviar una única señal de consentimiento versionado. Actualmente `consent.granted=true` en el contrato de laboratorio **no prueba** el clic: no activar hasta instrumentar E2E UX y revisión de accesibilidad.
- No enviar datos de campaña para quien no acepta; borrar `sessionStorage` si rechaza/retira, y eliminar fila atribuida si retira después.
- No enviar Pixel, CAPI, GA4, sesión replay, autocapture ni identificadores de terceros por efecto de este opt-in.

### Borrador para la UI, no aprobado

**ES:** “Opcional: acepto que PAZO guarde qué anuncio de nuestra campaña me trajo, junto con la confirmación de mi registro y si creé mi primera mascota, para saber si la campaña funciona. No usamos estos datos para mostrar anuncios personalizados ni enviamos mis conversiones a Meta. Puedo retirar mi permiso desde Ajustes. Más información en Privacidad.”

**EN:** “Optional: I allow PAZO to store which of our campaign ads brought me here, whether my registration was verified, and whether I created my first pet profile, so PAZO can measure the campaign. This data is not used to personalize ads or send my conversions to Meta. I can withdraw permission in Settings. Learn more in Privacy.”

Nota: ajustar texto al período aprobado y al UX verdadero; no prometer botón de revocación hasta implementarlo y probarlo. Debe existir acceso permanente a Privacidad desde registro/Ajustes.

## 4. Retención — decisión separada pendiente

**Recomendación técnica para el piloto:** `30 días` desde `recorded_at` para las filas personales de atribución (suficientes para una lectura D7 de cohortes pequeñas). Este número es una **propuesta**, no política efectiva. El máximo técnico del DDL se limita a 90 días; no constituye autorización para retener 90 días. `collection_gate.retention_days = 0` al instalarse: impide habilitar el gate con `enabled=true` hasta configurar días válidos y la versión de política.

El lector de cohortes es limitado por `recorded_at` y la retención configurada; por sí solo **no elimina filas**. `public.pazo_marketing_prune_v1()` ofrece purga exacta únicamente a servicio, pero **no existe job programado** y por tanto **no se puede prometer borrado automático a los 30 días**. Antes de activar: implementar calendario de borrado, prueba de fallos, límite de reintentos y evidencia agregada sin ID. Hacer especial prueba con registros en corte de mes/huso LA.

Las copias físicas, PITR y backups externos siguen ciclos distintos a las tablas. No prometer desaparición instantánea de backups. Auditar restauración para evitar reactivar atribución previamente purgada y registrar procedimiento de supresión posterior a una restauración. No equiparar “la fila se borró” con “todas las copias desaparecieron”.

## 5. Retirada, eliminación y cuentas QA

- `ON DELETE CASCADE` desde `auth.users` retira la fila individual al eliminar efectivamente Auth, no cuando alguien **solicita** la baja.
- Función privada `public.pazo_marketing_withdraw_v1(owner)` borra atribución, idempotente, solo `service_role`. **Todavía no está conectada a Ajustes ni a Auth**; el futuro endpoint debe derivar `owner` de JWT validado por servidor y no de un UUID del cliente.
- QA, fundadores, moderadores y admins excluidos por fuentes internas; no confiar en atributos QA del navegador. Revalidar cuando se elimine una tabla o se cambie el esquema F16.
- La retirada de consentimiento de marketing no debe cancelar membresías, alterar beneficios, ni borrar contenido de mascota o facturación.
- Registro de consentimiento: los campos de versión/hora por sí solos no aportan evidencia de UI aceptado; evaluar necesidad y retención de evidencias minimalistas en próximo gate.

## 6. Transparencia legal pendiente (ES/EN)

Actualizar texto público de Privacidad **antes** de procesar campañas: finalidad, datos, lugar del almacenamiento (Supabase), controles de opt-in/retiro, plazo aprobado, diferencia entre medición de campaña y telemetría operacional ya existente, retención y ciclo de backups. No cambiar el texto publicado en este PR ni asumir que el permiso para marketing implica permiso para publicidad personalizada. El requisito legal aplicable y base de tratamiento deben ser revisados antes del GO.

## 7. Checklist de release

- [x] Esquema privado, RLS FORCE y permisos de roles; apagado por defecto
- [x] Retención configurada inicialmente en cero, máximo defensivo 90 (no política aprobada)
- [x] Cohort reader ignora filas fuera de ventana configurada
- [x] SQL de retirada y purga solo servicio; pruebas sintéticas sin usuarios reales
- [ ] Plazo específico aprobado por PO
- [ ] Política/legal ES/EN aprobada y publicada antes de activar
- [ ] Interfaz opt-in / revocación ES/EN accesible y real, separada de 18+
- [ ] Endpoint real de revocación con verificación Auth y sesión
- [ ] Programador de borrado, prueba backups/PITR y revisión del plan del proveedor
- [ ] E2E email entre pestañas y dispositivos, no duplicar cuenta
- [ ] Migración instalada en Supabase con GO **separado**, gate aún OFF
- [ ] Go separado para activar ingestión y campaña Meta

**No publicar, no activar, no aplicar SQL alojado ni gastar dólares en Meta con este documento.**
