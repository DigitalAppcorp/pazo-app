> **ESTADO DE RELEASE VIGENTE — 2026-10-10:** `LEGAL_RELEASE_READY=true` en código significa que el texto bilingüe está preparado para revisión, no aprobación legal ni salida pública. La fecha efectiva permanece `null` hasta publicación. El readiness técnico actual está en `docs/PAZO_MVP_TECHNICAL_RELEASE_READINESS.md`; beta pública NO-GO hasta sus gates de privacidad, Preview/PWA y operación.

# PAZO — Privacy & Data Governance

**Estado:** ACTIVO / BETA GATE  
**Producto objetivo:** 18+  
**Propósito:** definir qué puede recopilar, mostrar, registrar o enviar PAZO antes de Beta pública.

> Este documento es una política técnica/producto interna, no asesoría legal. Privacy Policy y Terms públicos deben revisarse antes de Beta.

## 1. Principio

PAZO recopila solo los datos necesarios para una función aprobada.

No usar:
- “por si acaso”;
- “quizá sirva para analytics”;
- “la herramienta lo captura automáticamente”

como razón suficiente para recolectar datos.

## 2. Clasificación

### Público por intención del usuario
Ejemplos:
- nombre de mascota;
- foto pública;
- bio pública;
- contenido social publicado;
- perfil público de rescate limitado.

Debe quedar claro qué será público antes de publicar.

### Privado de cuenta
Ejemplos:
- email de autenticación;
- estados internos de cuenta;
- preferencias privadas.

No exponer a otros usuarios.

### Privado sensible
Ejemplos:
- documentos de mascota;
- contactos/reportes de avistamiento;
- ubicación precisa;
- datos de pago/entitlement;
- futuros mensajes privados.

Reglas:
- acceso mínimo;
- RLS/ownership;
- no analytics;
- no logs de contenido;
- no session replay sobre estas superficies.

### Operacional/telemetría
Solo eventos mínimos para:
- estabilidad;
- seguridad;
- uso agregado;
- validación de producto.

No incluir contenido del usuario.

## 3. Tracking

### Permitido por defecto
- eventos explícitos de producto;
- UUID interno;
- session id aleatorio;
- tipo de evento;
- booleanos/categorías cerradas;
- release/environment;
- errores sanitizados.

### Prohibido por defecto
- email;
- teléfono;
- nombre real;
- texto de posts/comentarios;
- mensajes;
- texto de búsqueda;
- contenido de documentos;
- filename privado;
- ubicación precisa/GPS;
- tokens;
- cookies/identificadores de terceros no necesarios;
- datos de tarjeta;
- session replay;
- autocapture indiscriminado.

Cualquier excepción requiere:
1. razón;
2. minimización;
3. retención;
4. proveedor;
5. revisión de privacidad;
6. autorización del PO.

## 4. PostHog

Configuración inicial:
- ingestión manual únicamente;
- sin autocapture;
- sin session replay;
- sin heatmaps que capturen contenido;
- sin formularios capturados automáticamente.

Si se habilita una de esas funciones:
- debe existir revisión de superficies privadas;
- masking;
- lista de exclusión;
- actualización de Privacy Policy;
- aprobación explícita del Product Owner.

## 5. Edad / menores

PAZO está diseñado como servicio 18+.

Política inicial:
- no pedir ID ni documento de identidad por defecto;
- no recolectar fecha de nacimiento completa si no es necesaria;
- mantener age attestation 18+;
- no diseñar marketing/UX dirigido a niños;
- si PAZO obtiene conocimiento concreto de que una cuenta pertenece a un menor, debe existir procedimiento de restricción/cierre y eliminación según corresponda antes de Beta pública;
- cualquier sistema futuro de age assurance debe recopilar/retener el mínimo posible.

No asumir que “18+” en Terms resuelve por sí solo todos los escenarios regulatorios.

## 6. User-generated content

Antes de Beta pública debe existir:
- reportar contenido;
- reportar perfil;
- bloqueo;
- ocultar contenido;
- moderación;
- proceso para contenido ilegal/abusivo;
- procedimiento para reclamaciones de copyright/IP;
- eliminación de contenido/cuenta;
- manejo de contenido derivado después de borrar cuenta.

## 7. Pagos

PAZO no almacena:
- número de tarjeta;
- CVV;
- credenciales PayPal.

Fuente de verdad:
- proveedor de pagos + backend verificado.

Antes de reactivar Supporter:
- precio/periodicidad claros;
- beneficio claro;
- cancelación clara;
- entitlement server-side;
- Privacy Policy/Terms reflejan el proveedor;
- no dark patterns;
- no paywall sobre seguridad/rescate.

## 8. Ubicación

- ubicación exacta solo cuando una función concreta la necesita;
- preferir uso efímero;
- no persistir GPS exacto por defecto;
- ubicación social visible debe ser explícita;
- logs/analytics no reciben coordenadas exactas.

## 9. Documentos

- bucket privado;
- URLs firmadas temporales;
- owner-only;
- no indexar contenido;
- no enviar metadatos privados a analytics;
- no session replay en modal/flujo de documentos.

## 10. Logs y errores

Los logs no deben ser una segunda base de datos de PII.

Errores:
- redactar email;
- JWT/tokens;
- query params sensibles;
- no adjuntar estado completo del usuario;
- no serializar payloads de formularios.

## 11. Retención

Antes de Beta debe existir una matriz de retención para:
- cuenta;
- contenido;
- documentos;
- rescue sightings;
- logs;
- analytics;
- backups.

No prometer borrado “instantáneo” hasta conocer el comportamiento real de backups/proveedores.

## 12. Transparencia antes de Beta

Requisitos de lanzamiento:
- Privacy Policy visible;
- Terms of Use visibles;
- effective date;
- categorías de datos recopilados;
- categorías de proveedores/terceros;
- propósito;
- proceso de acceso/corrección/eliminación cuando aplique;
- cambios materiales;
- edad mínima;
- pagos/cancelación si Supporter está activo;
- contacto de privacidad.

California CalOPPA exige una privacy policy visible para operadores comerciales que recopilan información personalmente identificable de consumidores de California. CCPA/CPRA applicability debe evaluarse por sus criterios vigentes; no asumir aplicabilidad o exención solo por tamaño.

## 13. Beta Gate

No abrir Beta pública hasta que:
- F14 cierre moderación/privacy;
- Privacy Policy y Terms existan y reflejen el producto real;
- account deletion exista;
- UGC reporting/blocking exista;
- data inventory y retention matrix estén documentados;
- tracking audit PASS;
- providers list actualizada;
- payment wording PASS si Supporter está activo;
- proceso de minor/underage report esté definido;
- legal review sea obtenida si el PO decide que el riesgo/alcance lo amerita.

## 14. Referencias regulatorias a revisar al lanzamiento

- FTC COPPA Rule / FAQs;
- FTC guidance vigente sobre age verification;
- California Online Privacy Protection Act (CalOPPA);
- CCPA/CPRA y regulaciones de California vigentes.

Revisar fuentes oficiales en la fecha de lanzamiento; no congelar requisitos legales en documentación antigua.

## Contacto público de privacidad y soporte — decisión PO 2026-10-10

El PO autorizó **appdigital.corp@gmail.com** para recibir consultas de privacidad y soporte de PAZO. Es una dirección **deliberadamente pública**, enlazada mediante `mailto:` en la vista de privacidad/Terms y en la solicitud de baja (ES/EN). Esta autorización **no** convierte el email en identidad legal del responsable, **no** concede permisos de Supabase, y no permite publicar su UUID Auth, credenciales ni metadatos de solicitudes. Los mensajes que envíen usuarios a ese buzón pueden contener información personal: tratarlos como datos privados de soporte, acceso mínimo, sin analítica ni copias en issues públicos, con política de retención pendiente de fijar antes de Beta externa.

La recepción de un email o una solicitud en la app **no equivale a eliminación completada**. Mantener `LEGAL_RELEASE_READY=false` hasta validar responsable legal, retención, tratamiento de terceros y operación manual de baja con cuenta descartable. No enviar email desde el navegador automáticamente: el enlace abre el cliente de correo del usuario.

## Entidad operadora — decisión PO (2026-10-10)

El Product Owner identifica **Alvarado Solutions LLC** como la empresa registrada bajo la cual opera PAZO. Se permite atribuir públicamente al operador de PAZO este nombre en **borradores** de Privacidad y Términos en español e inglés. El PO confirmó **California** como estado de registro; no consta revisión independiente del registro público ni domicilio registral proporcionado. No inventar dirección, agente registrado ni otros datos de identificación. El canal público autorizado es `appdigital.corp@gmail.com`. **La entidad legal y el buzón son conceptos distintos**, no implican permisos extra para cuentas Auth ni una certificación del proceso de bajas. `LEGAL_RELEASE_READY` permanece falso hasta validar tratamientos, retención y procedimiento real de eliminación para la beta pública.
