# PAZO F17 — Pulido solicitado de Lugares y Feed (22-oct-2026)

**Estado:** solo código en PR #81 DRAFT. **No desplegado en producción; no merge a main; no SQL ni cambios financieros.**

## Cambios implementados
- Buscador y chips de categorías conservan sus superficies redondeadas pero **se eliminó el fondo sólido de los contenedores exteriores**. El carrusel horizontal de categorías tiene máscara de desvanecimiento de ambos bordes; recorte suave sin capas que intercepten toques.
- Tarjetas de Lugares leen solo URLs de fotos reales existentes en `pet_places.photo_url`. El sitio alojado tiene **seis lugares y las seis URL están vacías**. Se retiró la foto genérica de carretera de Unsplash que se repetía para todos; hasta contar con contenido legítimo verificado se muestra una superficie por categoría explícitamente rotulada «Foto no disponible», sin publicidad falsa de establecimientos.
- En detalles de cada lugar hay botón **Cómo llegar**, que abre Apple Maps en iOS y un enlace universal Google Maps en Android/otras plataformas. Solo manda las coordenadas o dirección del **destino** a la aplicación de mapas que el usuario elija; no solicita permiso GPS ni lee ubicación de PAZO. El sistema de mapas externo puede usar la posición del usuario según sus permisos.
- El Feed conserva contador real de reacciones/comentarios y la lógica original. Botones renovados con pictogramas mayores y fondos redondos; no se agregaron contornos, métricas ni nuevas peticiones.

## Bloqueo externo para fotografías Google Maps
El PO solicitó fotos reales del establecimiento desde Google Maps. **No está habilitado:** el proyecto no tiene configuración de Google Places ni ID de lugar/fotos verificado; Google Places (New) exige facturación, clave/API y presentación conforme a términos/atribución. No activar un servicio facturable sin GO específico del PO ni extraer/scrapear fotos de Google, ni almacenarlas como fallback permanente. La UI ya soporta una URL de imagen por lugar con derechos de uso confirmados. Alternativa sin nuevo proveedor facturable: fotos autorizadas directamente por negocios, guardadas en Storage existente después de revisión. No afirmar que las seis fotos de Google ya estén instaladas.

## Próximo gate
CI GitHub del SHA exacto, revisión del PO en preview/local para fade y botón de mapa, decisión de fotos/restricciones de Google; autorización adicional antes de modificar facturación, datos del catálogo o publicar la versión.


## Fotos reales sin Google Places — corrección aprobada por Product Owner

PO aclaró que no requiere Google Maps como origen, solo fotos reales
en vez de la carretera genérica de Unsplash. La rama usa seis archivos
fotográficos licenciados desde Wikimedia Commons (uno del sitio exacto
Runyon Canyon y cinco imágenes ilustrativas claramente identificadas).
Las imágenes propias verificadas que se agreguen al catálogo en el
futuro tienen prioridad sobre las ilustrativas. Créditos y licencias
visibles; no se permite afirmar que una foto de otra tienda represente
al negocio. Sin nuevos proveedores facturables ni despliegue.
Véase `docs/PAZO_F17_PLACES_PHOTO_SOURCES_20261022.md`.
