# PAZO — Corrección del recorrido Demo (26-oct-2026)

## Alcance autorizado

El Product Owner aprobó corregir el recorrido del botón Demo tras auditoría de Design Intelligence OS v0.6 y Project Brain OS. Implementación aislada en `fix/demo-guest-journey-20261026`, basada en `main` `870db392`.

**No** se autorizaron cambios a `main`, publicación, SQL, Supabase, PayPal, controles de monetización, datos reales, infraestructura ni secretos.

## Contrato funcional

- Entrada en `A01 > Demo` o vínculo desde login. El visitante no requiere autenticación ni crea cuenta.
- Se inicializan publicaciones y tres mascotas de ejemplo con copias aisladas en memoria, sin carga infinita.
- Feed: me gusta, guardados y comentarios funcionan exclusivamente en memoria; no se registra un evento remoto ni se llama a RPC autenticada.
- Perfil: permite cambiar mascotas de ejemplo y consultar sus publicaciones; nunca consulta perfiles por IDs ficticios en Supabase.
- Comunidades: catálogo ilustrativo local, claramente identificado como ejemplo, con CTA honesto para crear cuenta al intentar unirse; sin miembros reales fingidos.
- Buscar: filtro local de mascotas/comunidades de ejemplo; acceso al módulo de mapa con consulta pública existente. No se ejecuta búsqueda autenticada.
- Mapa: se conserva el mapa de Lugares tal como existe; check-in y propuestas siguen restringidos por el contrato `canUsePlaces=false`.
- Mensajería: muestra **En desarrollo**, la misma disponibilidad de usuarios reales; no se presenta una bandeja ficticia operativa.
- Encabezado persistente de Demo: identifica naturaleza simulada, acciones no persistentes, CTA de registro y salida explícita.
- Salir de Demo vuelve a `A01` **sin** `supabase.auth.signOut()`; acciones que requieren cuenta llevan a `A02` (registro) con acceso existente a login.
- Login y registro reales, MFA, sesiones, permisos, facturación y visuales aprobados fuera de estas superficies permanecen inalterados.
- No se agrega telemetría de invitados ni almacenamiento local; tráfico y conversión aún no cuentan con medición específica.

## Pruebas y gates

- `npm run test:mvp` ejecuta `src/features/demo/demoExperience.test.mjs` y `scripts/demo-journey-contract.test.mjs`: fixture aislado, interacción reversible, privilegios bloqueados, rutas de entrada/salida.
- Además deben ejecutarse `npm run build`, `npm run test:governance`, pruebas manuales en viewport Android y ES/EN, accesibilidad/teclado/retorno y regresión de login con cuenta autorizada.
- No confundir tests sintéticos o CI con la verificación visual de runtime.
- Modo actual: **IMPLEMENTATION IN ISOLATED BRANCH**; merge/main/producción bloqueados hasta revisión, QA y autorización PO.

## Guía de prueba manual

1. Abrir PAZO deslogueado: A01 > Demo. Tras la introducción aparece Feed con muestras, sin spinner infinito.
2. Tocar Me gusta, Guardar, Comentarios; verificar cambios visibles. Recargar: los cambios de Demo desaparecen.
3. Tocar los autores Luna, Nube, Bruno y cambiar mascota; jamás abrir un perfil real ficticio ni llamar a escritura.
4. Abrir Comunidades, desplegar tarjeta, tocar unirse; debe llevar a registro A02.
5. Reingresar a Demo y tocar Buscar; filtrar nombres, entrar a mascota/comunidades/mapa.
6. En Mi mascota, tocar salida: regresa a bienvenida sin cerrar cuentas reales.
7. Pulsar mensajería: debe aparecer En desarrollo, no mensajes inventados.
8. Verificar en navegador móvil ES y EN, foco visible, teclado, scroll/dock, mapa.
9. Repetir registro/login auténticos en entorno de QA, confirmar que el feed real funciona y que Demo no alteró la seguridad.

Estado de pruebas reales: **PENDIENTE** hasta informes CI / validación del Product Owner.
