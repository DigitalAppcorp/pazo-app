# PAZO — Política aprobada de producto para «Gracias, Amigos de PAZO»

**Estado:** POLÍTICA DE PRODUCTO APROBADA (2026-10-13). **La base privada de consentimientos fue aplicada a Supabase con autorización PO posterior**, pero todavía NO existen consentimientos reales habilitados, pagos ni muro público con mascotas. Sin autorización para etapas adicionales.  
**Fecha:** 2026-10-13.  
**Categoría:** F16, monetización voluntaria y privacidad.  
**Fuente:** identidad PET-ONLY, diseño de cuadrícula (opción 2), acceso público desde Bienvenida A01 y selección simulada desde Mi mascota, previamente aprobados.

**Gate del Product Owner (2026-10-13):** el PO respondió explícitamente **«si aprobado»** a las reglas de participación y retirada presentadas, incluidas visibilidad sin registro, opt-in individual, revocación, mantenimiento hasta el fin del período pagado, expiración, nueva autorización tras reactivar y eliminación. **ESTAS REGLAS QUEDAN APROBADAS COMO PRODUCTO; NO HABILITAN MIGRACIONES, PAYPAL NI DESPLIEGUE.** Documento técnico siguiente: [plan READ ONLY](PAZO_SUPPORTER_WALL_BACKEND_DESIGN_PREFLIGHT_20261013.md).

**Gate técnico posterior de solo esquema (2026-10-13):** instalada migración `20261013215221_f16_supporter_wall_consents_foundation` tras autorización PO. Verificación alojada READ ONLY: tabla con RLS forzada, cero registros de consentimiento y helper de entitlement con resultado false; no permite publicación de mascotas ni acceso anónimo a la tabla. No incluye textos legales definitivos ni procesador de pagos.

## 1. Regla de oro

Ser Amigo de PAZO y consentir la presencia pública en el muro son decisiones **independientes**. Ningún checkout, fundador, inicio de sesión, mascota creada, selección visual ni estado guardado solamente en el cliente equivale a consentimiento o a membresía activa. Una cuenta puede recibir beneficios autorizados sin incluir ninguna de sus mascotas en el muro.

## 2. Elegibilidad de publicación

Un registro visible debe satisfacer **todas** las condiciones verificadas por el servidor en el momento de cada consulta pública:

1. La cuenta propietaria mantiene una membresía mensual Amigo de PAZO con derecho vigente y período pagado validado por el proveedor/webhook seguro; no basta una respuesta del navegador.
2. La mascota existe, no ha sido eliminada y pertenece actualmente a dicha cuenta; el acceso a la gestión es exclusivamente del propietario autenticado.
3. La mascota posee consentimiento individual **expreso, vigente y no revocado**, concedido después de mostrar el alcance público.
4. No hay restricción de privacidad/moderación que impida exhibir esa mascota.

Si alguno falla, el muro no la muestra. Las mascotas gratuitas o nunca autorizadas no aparecen; no crear automáticamente un registro con consentimiento al activarse el cobro. Un mismo pago de la cuenta no fuerza la inclusión de todas sus mascotas. Ningún cap numérico se inventa para mascotas por cuenta.

## 3. Contenido mínimo permitido en la tarjeta pública

Únicamente `pet_id` para navegación interna segura, nombre de la mascota, su imagen pública si existe (si no, placeholder no personal), y la insignia cuyo entitlement esté confirmado. No exponer nombre de persona, email, identificador Auth, @usuario inventado, duración exacta de pagos, fechas de cobro, estados de facturación ni historial de pagos. Un estilo de perfil decorativo solo podría mostrarse tras habilitar preferencias autorizadas; fuera del MVP del muro.

**Visibilidad real:** el muro puede abrirse sin registrarse desde Bienvenida A01. El consentimiento debe explicitar que el nombre y la foto pública de la mascota pueden verse sin cuenta y no puede evitar capturas hechas por terceros. La entrada a perfiles sociales desde tarjetas requiere auditar una ruta pública segura antes de implementarla; no abrir vistas privadas ni forzar registro en silencio. Para usuarios ya autenticados aún falta decisión de ubicación del enlace público (no reintroducir en Explorar).

## 4. Consentimiento informado por mascota

En `Mi mascota → Amigo de PAZO`, el usuario ve cada mascota propia con su nombre/foto y estado. El sistema primero informa qué datos se publicarán, que podrán verse sin iniciar sesión, y cómo retirar autorización. Cada mascota empieza desactivada. La acción inequívoca «Autorizar aparición» se confirma y registra **en backend** únicamente por el dueño; ninguna selección del prototipo actual cuenta.

El consentimiento tiene identificador de mascota, versión del aviso aceptado, fecha de aceptación y marca de revocación; no requiere guardar nombre/email humano extra. Separar registro privado de consentimiento del conjunto público derivado. Rechazar acciones de un dueño sobre mascotas ajenas mediante RLS y validación de ownership en backend.

## 5. Retirada / interrupción

- **Retirada voluntaria:** el dueño revoca explícitamente para cada mascota y el servidor deja de incluirla en la consulta pública al confirmar la operación. Si falla la escritura, informar error y no afirmar retirada exitosa. Evitar cachés públicas que sigan sirviendo el registro revocado; limpiar o invalidar cachés propias al revocar.
- **Cancelar renovación:** si el período previamente pagado sigue vigente y no ha sido revocado, la mascota puede permanecer hasta su fecha real de vencimiento; nunca inventar una fecha de cobertura.
- **Vencimiento/impago:** al perder cobertura vigente, ocultar automáticamente la mascota del muro. Un intento de pago pendiente no concede elegibilidad. Reembolso/contracargo que invalida cobertura provoca ocultación según estado verificado del proveedor. No inventar período de gracia.
- **Reactivación:** por privacidad, no volver a publicar automáticamente una mascota excluida por pérdida de elegibilidad; solicitar una confirmación fresca por mascota. Un historial mínimo de revocación podrá conservarse según política de retención aprobada, nunca como permiso vigente.
- **Baja/eliminación o moderación:** excluir de la consulta pública desde el momento en que el backend marque la cuenta o mascota como eliminada/no pública o suspendida. Integrar limpieza con el SOP de baja existente, no añadir SQL de borrado improvisado.

Toda baja debe intentar dejar la consulta pública sin mascota desde la confirmación de estado. Las copias hechas fuera de PAZO no pueden retirarse retroactivamente.

## 6. Filtros y resultados

- **Todos:** lista de participantes vigentes con orden neutral estable (propuesta: nombre de mascota alfabético + ID opaco de desempate).
- **Recientes:** consentimiento público vigente más reciente primero; reingresos después de desactivación usan la última confirmación.
- **Más tiempo apoyando:** meses de apoyo **acumulados y verificados** de la cuenta, orden descendente, sin mostrar cantidades ni nombres humanos; no equivale a valor superior de un miembro. Desempates consistentes (fecha de inclusión vigente, ID opaco).
- Paginación y conteos solo sobre mascotas autorizadas y elegibles. Un usuario con varias mascotas puede aparecer con cada una de las que autorizó; nunca duplicar una mascota por pagos históricos.
- Estado vacío real si ninguna cumple criterios; errores de consulta deben mostrar un estado de error separado, no «0 participantes».

Los meses acumulados, su efecto de reembolso/contracargo y la presentación final del orden se verificarán en el contrato de entitlement antes de programar. **No activar «Más tiempo apoyando» con un orden falso; si faltan datos verificados, mantenerlo en modo informativo sin participantes fabricados.**

## 7. Estados UX ES/EN a diseñar

Sin membresía: explicar la función futura sin manipular consentimiento. Con membresía válida: «No participa», «Pendiente de confirmación» (solo durante envío), «Participa», «No se pudo actualizar» con reintento, «Retirada». Tras vencer membresía: «No visible; apoyo inactivo», con opción de reautorizar solo después de nueva cobertura verificada. La UI no debe confundir selección visual con autorización legal/real. Debe ser accesible con teclado, responsive y sin contornos según AGENTS.md.

Texto informativo ES propuesto:
> «Si autorizas a [nombre de la mascota], su nombre, fotografía pública e insignia Amigo de PAZO aparecerán en el muro, que cualquiera puede ver, incluso sin cuenta. Puedes retirarla cuando quieras. No se mostrarán tus datos de cuenta ni pagos».

EN equivalente y estados requieren gate UX final del PO. No recoger casillas globales de todas las mascotas por defecto.

## 8. Contrato de seguridad pendiente de aprobación técnica

- Una entidad privada de consentimiento por mascota con control de propiedad, versión de aviso y marcas temporales; datos exactos del schema sujetos a auditoría de Supabase real.
- Entitlement mensual derivado exclusivamente de proveedor validado del lado servidor; autoridad de webhook y conciliación de pagos fallidos/duplicados/refunds antes de lanzar.
- La lista pública debe provenir de consulta/función del lado servidor que haga `eligibilidad AND opt-in AND ownership AND estado`, proyectando solo datos de tarjeta. RLS/roles no permiten leer directamente datos de consentimiento o facturación.
- Revocación idempotente, protección ante carreras de confirmación y cambios de ownership, y pruebas de acceso ajeno, reembolsos, eliminaciones y cachés.
- Revisar documentación de privacidad/retención y actualizar `docs/PAZO_DATA_INVENTORY.md` cuando se autorice una categoría persistida; ahora no se modifica inventario pues **no hay nueva recolección**.

## 9. Gates no superados

1. **Product Owner:** **APROBADO (2026-10-13)**: reautorización por mascota tras pérdida de elegibilidad, exposición pública a visitantes sin registro y reglas de filtros. La aceptación no es autorización de implementación de backend.
2. **UX:** aprobar los textos/estados EN/ES y el acceso al muro desde sesión iniciada; no cambiar el A01 aprobado.
3. **Arquitectura/privacidad:** auditar Supabase RLS + SOP de baja, fijar retención y consentimiento server-side.
4. **Implementación autorizada por separado:** migraciones versionadas, API/función pública minimizada, pruebas automatizadas de seguridad, validación visual en Vite.
5. **Membresía/pagos:** aprobación adicional específica antes de configurar PayPal, webhook, cobros o servicios pagados.

Hasta entonces, F16 sigue BACKLOG y las pantallas existentes son **previews no persistentes**. **La política de producto está aprobada, pero no se ha concedido permiso para aplicar SQL/migraciones, desplegar, hacer cobros o activar consentimiento real.** No usar esto como términos legales vigentes ni afirmar que la membresía existe en producción.
