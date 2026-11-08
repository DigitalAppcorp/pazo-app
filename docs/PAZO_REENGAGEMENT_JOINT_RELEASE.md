# Entrega conjunta de regreso a PAZO

El [PR #219](https://github.com/DigitalAppcorp/pazo-app/pull/219) reúne el perfil social compartible, el acceso desde Administración, la atribución de campaña, el aviso para instalar PAZO, sus dos conteos y los consejos de regreso. La hoja madre y la subhoja se mantienen en el [PR #211](https://github.com/DigitalAppcorp/pazo-app/pull/211). Los puntos ya publicados siguen identificados por sus propios despliegues.

## Revisión de la entrega

- Probar `/mascota/{id}` sin sesión y desde otra cuenta. El HTML inicial lleva nombre, descripción, foto, marca PAZO y URL canónica para Open Graph. Confirmar que un perfil moderado devuelve 404 y que el enlace anterior con `/#/pet/{id}` sigue abriendo el perfil. Verificar la vista previa en el depurador de la red tras la publicación conjunta.
- En un entorno aislado, registrar una cuenta con un enlace de campaña en Chrome y confirmar desde otro perfil de Chrome. Revisar que el código aparece en Administración dentro de 14 días y que el dato pendiente deja de usarse a las 72 horas.
- En un teléfono de prueba, completar la primera mascota y el primer cuidado. Comprobar el aviso de instalación, una instalación real y que volver a abrir desde el icono conserva el mismo conteo. El consejo de primera mascota debe abrir su formulario aun con PAZO abierto. El aviso de compartir debe abrir Mi mascota con el panel de compartir. Si el navegador exige un gesto dentro de PAZO, tocar «Compartir vínculo» debe abrir el menú del dispositivo. Usar una ventana local permitida.
- Revisar los textos de privacidad en ambos idiomas. Revisar los horarios y textos de los consejos antes de activar envíos. Mantener apagada la fase de 14 días hasta observar resultados de las primeras etapas.

## Orden para publicar

Tras el visto bueno del paquete y la validación de la versión revisada, instalar de forma dirigida las tres migraciones nuevas. Verificar en cada caso que la puerta de instalación, la de continuidad de campañas y la de consejos están apagadas. No usar un empuje masivo del historial de Supabase.

Desplegar el worker de push compatible con las cuatro categorías y publicar el frontend que incluye el aviso de privacidad y la función `api/pet-preview.js`. La función usa `VITE_SUPABASE_PUBLISHABLE_KEY` en tiempo de ejecución para leer el perfil con los permisos de invitado. `VITE_PAZO_PENDING_CAMPAIGN_ENABLED` habilita el dato mínimo en el alta por correo y `VITE_PAZO_RETURN_TIPS_ENABLED` conecta las acciones del frontend con consejos. Configurar ambos junto con la publicación y verificar su correspondencia con las puertas del servidor antes de activarlas. Abrir las puertas aprobadas después de confirmar la versión de producción, el perfil sin sesión, los permisos administrativos y el acceso de una cuenta de prueba.

Ante un problema, cerrar primero la puerta afectada. Los consejos en cola vuelven a verificar el estado y la preferencia antes de intentar el envío. Cerrar una puerta de medición o consejos mantiene el perfil público, la Agenda y el registro operativos. La lectura de campaña conserva el plazo de 14 días.

El RPC administrativo `pazo_admin_return_tip_summary` devuelve cuatro totales por etapa para los últimos 30 días. El proveedor puede aceptar un push sin que el teléfono lo muestre. Las aperturas son las que PAZO pudo observar al abrir el aviso. Comparar el progreso durante siete días con un grupo sin aviso cuando haya suficiente volumen para decidir si procede la fase siguiente.
