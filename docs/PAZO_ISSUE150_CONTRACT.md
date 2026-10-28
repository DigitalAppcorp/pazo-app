# #150 — contrato de comportamiento (candidato, colección nueva OFF)

Fuente: issue150 y aclaración6479704793. Base6b032f0b; producción y utilidad existentes se preservan. Desarrollo, migraciones preparadas, pruebas y staging autorizados; merge/publicación/activación final pendientes de GO único.

## Preguntas, fuentes y unidades

| Pregunta | Fuente / numerador | Denominador / falsos positivos |
|---|---|---|
| Anuncio → registro | landing_daily, solicitudes aceptadas con Turnstile; nuevos hitos anónimos solo si protección proporcional | Solicitudes, nunca personas. No se unen a cuentas. Prerregistro sin protección suficiente = NOT_MEASURED |
| Embudo pagado | auth verificada → mascota persistida → vista herramienta observada → cuidado persistido/Share resuelto → retorno maduro | Misma cohorte verificada desde inicio de nueva cobertura; intersecciones anidadas, no división por señales anónimas |
| Origen | acquisition validada, campaña y creatividad permitidas | paid_attributed o unknown; organic_evidenced/direct NO inferidos de ausencia de UTM |
| Recorrido | sesiones efímeras autenticadas, vistas al cambiar pantalla visible, estados cerrados y pasos agregados | Última vista sin continuación no prueba abandono; sin tiempos activos, replay, eventos de contenido o pagos |
| Retorno | sesiones separadas por30min, días America/Los_Angeles, primera acción tras regreso, cohortes maduras D1/D7 | Solo desde cobertura, ventana máxima14d; antigüedad conocida de cuenta no demuestra sesiones históricas |
| Utilidad | fuentes autoritativas existentes QR/cuidado; repetición de cuidado y Share durante sesión observada | QR visible/descarga son auxiliares, no guardado ni rescate; Share es resolución de API, no entrega externa |

Fechas almacenadas en servidor UTC, días/reportes America/Los_Angeles. Retención nueva14d desde primera observación de cada sesión; no renovar con visitas. Períodos7/30/90 muestran effective_days≤14 e histórico no disponible. D1/D7 requieren tiempo maduro, población y ventana comparables. Muestras<10 y grupos complementarios suprimidos: no identificadores, secuencias individuales ni exportación cruda.

## Implementación mínima y privacidad

Reusar marketing_private, eligibility backend, allowlists, retención/Cron, retirada y borrado existentes. Añadir gate independiente OFF, sesiones/eventos enums acotados y RPC de agregados admin. auth.uid determina propietario; token de la vigencia original fijado, aborto al logout/login/A→B→A, nada persistente de navegación en storage. Orden secuencial/idempotencia, topes por sesión/cuenta, colas cortas y caducidad; sin beacon anónimo ni bucle de reintentos. Supresión retirada no se deshace con visitas. No recoger pantallas sensibles ni atributos libres.

Prerregistro: inspeccionar mecanismo Turnstile single-use existente antes de extender; sin identidad persistente, sesión anónima ni IP guardada. Si un hito no es medible de forma segura, exponer NOT_MEASURED con motivo y alternativa; esto satisface la orden sin instrumentación invasiva.

Aviso ES/EN candidato, sin fingir vigencia/recogida antes de release. Proporcionalidad y derechos revisados contra DOJ/CPPA oficiales, sin certificación jurídica ni inferencia de umbrales empresariales desconocidos. Acceso/retirada/supresión por canales existentes y control autenticado de retirada inmediata del nuevo seguimiento.

## Dirección Design OS

UI nueva autorizada: DESIGN_QA autónomo, PO_VISUAL_ACCEPTED=NOT_REQUESTED. Conservar Administración/Campañas/Actividad. Elegida lectura editorial de decisiones: prerregistro separado primero, embudo de cuentas después, recorridos/retorno y diagnóstico accionable. Descartada pared de KPIs/charts iguales (oculta unidades y prioridad) y no añadir panel (no permite diagnosticar). Barras horizontales HTML con etiquetas directas y tablas listas compactas; sin nueva librería. Verde PAZO focal, superficies neutras, amarillo selección, terracota error; color nunca única señal. Sin contornos. Mobile apila en el mismo orden, valores siempre visibles, sin hover obligatorio.

Pregunta voluntaria de motivos descartada: no necesaria para responder comportamiento observado y añadiría fricción antes de conocer muestra/retorno. No inferir motivación. Hipótesis derivadas de evidencia agregada, etiquetadas, con tamaño de muestra y sin causalidad.

## Gates de entrega

PG17 real aislado: ACL/RLS/QA, falsificación, orden/concurrencia, rate limit, retirada/borrado,14d/Cron fail-closed y resultados matemáticos. Runtime ES/EN320/390/430/escritorio: datos etiquetados, loading/vacío/pausado/error/reintento, keyboard/foco, red/offline y cambio de sesión. Crítica adversarial separada con corrección y recaptura. CI completo, regresiones protegidas, staging con backend aislado controlado cuando no exista Supabase staging seguro. No contaminar producción para simular éxito. Informe final distinguirá pruebas alojadas reales de interceptadas y cualquier límite.
