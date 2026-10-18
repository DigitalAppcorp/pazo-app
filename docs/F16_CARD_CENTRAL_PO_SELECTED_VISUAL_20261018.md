> **Ajuste visual PO aprobado, 2026-10-18 — CTA PayPal opción 2:** el Product Owner detectó que el logo azul de PayPal era ilegible sobre el botón verde bosque en su captura real, y seleccionó explícitamente **opción 2: fondo lima claro, texto verde oscuro, logo PayPal azul original visible**. Aplicado en `SandboxCheckoutQaPanel.tsx` (botones inline/standalone, normal/focus/hover/disabled), icono ampliado a 25px y sin opacidad artificial en estado deshabilitado. Se mantienen `disabled={!consent||busy||phase!=='ready'||attempted.current}`, consentimiento desmarcado inicialmente, términos exactos, idempotencia y pago Sandbox. Regresión añadida a `f16SupporterProductExperience.test.mjs`; código `bbde81a08ed417adcfe9b039156eca2933e9c092` **GitHub Actions 7/7 SUCCESS**. Sigue pendiente aceptación visual en Vite. No toca PayPal, SQL, Edge, Live, main ni backend.

# F16 — «Card Central», referencia visual seleccionada por el Product Owner

**2026-10-18. Estado de código: 7/7 GitHub Actions PASS; aceptación visual real pendiente.**

## Decisión del Product Owner
PO eligió explícitamente la **opción 4 «Card Central»** del tablero de alternativas estructurales, mostró recorte de la maqueta y ordenó «calca tal cual el diseño» y «daleeeeeeeee». Esta decisión **reemplaza** la disposición anterior de oferta como hero horizontal con insignia a la derecha + lista de cuatro tarjetas verticales. No hacer rediseños adicionales ni reinterpretar a estilo ecommerce.

### Composición objetivo, de arriba hacia abajo
1. Header PAZO de flecha atrás + «Amigo de PAZO», fondo crema.
2. **Una tarjeta blanca grande, centrada, esquinas redondeadas, sombra leve de elevación, sin contornos.** Moneda oficial dorada `/supporter/amigo-pazo-inicio.png` de 134 px **centrada flotando sobre borde superior de tarjeta**, cuatro pequeñas marcas verdes decorativas laterales.
3. Contenido de tarjeta centrado: **«Ayuda a que PAZO siga creciendo»** en ~21–24 px; párrafo español **literalmente aprobado**:
   «PAZO está dando sus primeros pasos y aún tenemos mucho por construir. Con tu apoyo podemos seguir cuidando este pequeño mundo, mejorándolo y creando nuevas experiencias para ti, tu mascota y toda nuestra comunidad.»
   Precio `US$2.99 al mes` centrado en cápsula verde pálida.
4. Botón principal **verde oscuro** «Quiero apoyar a PAZO», seguido de «Continuar con PayPal». Este botón conserva `onClick={()=>void begin()}`, `disabled={!consent||busy||phase!=='ready'||attempted.current}`, y el servicio de PayPal Sandbox/controles contra duplicados. **No** se habilita con consentimiento desmarcado. A continuación, dentro de tarjeta, casilla legal y divulgación accesible de condiciones contractuales V2, **sin alterar las condiciones ni su digest**.
5. Bloque independiente «Como agradecimiento», centrado, con **una sola fila horizontal de cuatro iconos compactos**: insignia, 5 fondos, muro (opt-in), medallas. Los títulos visibles quedan resumidos; la explicación de cada beneficio queda también disponible en etiqueta accesible, así como en las condiciones originales.
6. Nota final «PAZO seguirá siendo gratis para todos.» y salida voluntaria «Ahora no, seguir usando PAZO».
7. Panel técnico «Gestionar mi prueba de PayPal Sandbox» permanece separado/debajo para pruebas; nunca debe ser protagonista de la invitación.

## Archivos
- `src/features/supporter/components/SupporterOfferB.tsx`: diseño Card Central, sin peticiones de red ni permisos financieros.
- `src/features/supporter/components/SandboxCheckoutQaPanel.tsx`: CTA verde antes del consentimiento, conservando botón deshabilitado hasta aceptación; términos completos y avisos Sandbox se mantienen visibles.
- `src/features/supporter/components/SupporterAccountManagement.tsx`: lienzo crema, nota final luego de agradecimientos, salida accesible.
- `src/features/supporter/testing/f16SupporterProductExperience.test.mjs`: prueba estructural de referencia, reglas cero contornos, promesa de PAZO gratuito, legal y redirección intactas.

**Validación:** commit de código `06cb189e6ea1d088f7c5244a50122cb000acbe2b`; GitHub Actions **7/7 SUCCESS**: CI (build, TS, regresiones F16) y 6 laboratorios PostgreSQL. Sin DDL/DML, Edge, PayPal Live, `main`, cobros o alteraciones de derechos. PR #44 permanece DRAFT.

**Siguiente gate — visual Vite:** PO sincroniza rama y abre en PAZO Sandbox una cuenta sin membresía. Comparar la pantalla real con el recorte de la opción 4; comprobar que la tarjeta, medalla flotante, CTA verde, casilla legal y fila única sean fieles, a 375–390 px y otras anchuras, con scroll natural. Sin pagar para QA visual. CI no equivale a aceptación visual ni pixel-perfect.

**Gate:** `F16_CARD_CENTRAL_CODE_7_OF_7_PASS_WAIT_PO_VITE_VISUAL_ACCEPTANCE`.
