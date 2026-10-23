# PAZO F17 — Fuentes verificadas de fotos reales, sin Google Places

**Decisión PO 22-oct-2026:** No se necesita API Google Maps; seis fotos
reales diferentes reemplazan la carretera genérica de Unsplash. Solo Runyon
Canyon refleja el lugar concreto de la ficha. Las otras cinco son
**fotografías ilustrativas de su actividad**, indicadas mediante
«Ilustrativa». No describen la fachada ni el negocio anunciado.

| Ficha PAZO | Fuente real de fotografía | Autor | Licencia | Verificación |
|---|---|---|---|---|
| Silver Lake Dog Park | https://commons.wikimedia.org/wiki/File:Dog_Park_Fun_-_15343944411.jpg | Bob Haarmans | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | Fotografía ilustrativa, parque canino |
| Runyon Canyon Park | https://commons.wikimedia.org/wiki/File:Runyon_Canyon_view_to_Downtown_LA.jpg | Peter Greenberg | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) | Fotografía del parque real desde su mirador |
| The Morrison | https://commons.wikimedia.org/wiki/File:Hamburger_with_fries_(36301680856).jpg | www.snack-nieuws.nl | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | Fotografía ilustrativa, comida |
| VCA Miller-Robertson Animal Hospital | https://commons.wikimedia.org/wiki/File:Close-up_of_a_veterinarian_examining_a_maltese_dog_with_a_stethoscope._(51687314898).jpg | Nenad Stojkovic | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/) | Fotografía ilustrativa, consulta veterinaria |
| Groomickey Salon & Store | https://commons.wikimedia.org/wiki/File:Dog_grooming.JPG | Mickeysamuni | [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) | Fotografía ilustrativa, cuidado del pelaje |
| Petco Los Angeles - DTLA | https://commons.wikimedia.org/wiki/File:Pet_shop_interior,_Polmorla_Walk,_Wadebridge,_Cornwall_-_August_2026.jpg | Mutney | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Fotografía ilustrativa, tienda de mascotas |

Los autores y enlaces directos a la ficha original y a la licencia se
presentan en cada tarjeta. CSS aplica un recorte visual (object-cover)
sin modificar los binarios. El contenido original permanece en Wikimedia
Commons; PAZO no copia fotografías en Storage. Los archivos se muestran
mediante miniaturas (500 px, ancho compatible con el servicio de miniaturas) solo al necesitarse (lazy), con referrer
suprimido. La disponibilidad de las URLs depende de Wikimedia;
si fallan, se muestra una superficie sin foto.

`pet_places.photo_url` tiene prioridad para una fotografía genuina
aportada en el futuro con autorización de derechos. No copiar
imágenes de Google/Yelp/Tripadvisor ni exponer secretos. No se activan
APIs con pago, ni cambios de SQL, Stripe/PayPal, ni Vercel.
El QA visual real en Android y el control de licencias antes de publicar
siguen siendo gates distintos de los tests del código.
