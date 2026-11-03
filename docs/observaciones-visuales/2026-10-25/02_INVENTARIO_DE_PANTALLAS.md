# 02 — Inventario de pantallas, estados y componentes de PAZO

**Interpretación:** cada fila es una **superficie o estado identificable** que exige evaluación de producto. `C` = inspección de código; `V` = además hay captura/fixture revisado; `I` = inventario sin revisión detallada de su representación; `N` = interacción/render completo NOT_TESTED. Ninguna fila etiquetada C se promueve a «visual PASS» por sí sola. Los archivos citados existen en la referencia de `main` usada en el informe.

## A. Inicio de sesión, instalación, onboarding y contingencias

| ID | Superficie / variante | Archivo principal (código) | Estado | Dictamen y comprobación siguiente |
| --- | --- | --- | --- | --- |
| A01 | Splash y entrada inicial | `features/splash/PazoSplash.tsx` | C/N | Motion, duración, accesibilidad status; probar reduced-motion y dispositivo pequeño |
| A02 | Verificando sesión / cargando mascotas | `App.tsx:1634-1695` | C/N | Estados explícitos; comprobar que no bloquean permanentemente y spinner no sustituye texto |
| A03 | Bienvenida ilustrada A01 | `views/OnboardingView.tsx:190-267` | C/N | **Contraste CSS y jerarquía**; repetir visual con fondo gradiente en 320/390 |
| A04 | Registro de adulto/correo A02 | `views/OnboardingView.tsx:273-411` | C/N | Etiquetas de email/pass presentes; validar consentimiento adulto, error y foco |
| A05 | Alta inicial de mascota | `views/OnboardingView.tsx:425-536` | C/N | Selector foto invisible con Tab y labels de texto desconectados; alta prioridad |
| A06 | Zona e intereses de mascota | `views/OnboardingView.tsx:539-615` | C/N | Campos y botón final; revisar permiso, privacidad, chips, señal de persistencia |
| A07 | Iniciar sesión y mensajes de autenticación | `App.tsx:1760-1922` | C/N | Revisar jerarquía y anuncio de error; mensajes en div sin estado explícito |
| A08 | Recuperar/actualizar contraseña | `features/auth/PasswordRecoveryView.tsx` | C/N | Campos envueltos en label y alerta presente; comprobar flujo/token y foco |
| A09 | Demo vs cuenta real | `App.tsx:1700-1922` | C/N | No permitir que copy de demo parezca dato real; diferencias de capacidades claras |
| A10 | Error de bootstrap / reintentar | `App.tsx:1679-1704` | C/N | Estado y CTA explícitos; probar conexión interrumpida y regreso |
| A11 | Error global de aplicación | `components/ErrorBoundary.tsx` | C/N | Mensaje y salida visibles; validar idioma y reintento sin pérdida |
| A12 | Instalar PWA / ayuda instalación | `features/pwa/components/PazoInstallControl.tsx` | C/N | Instalada/no instalada; texto 10–11px y ayuda; comprobar iOS/Android |
| A13 | Mantenimiento + acceso de admin | `features/maintenance/MaintenanceGate.tsx` | C/N | Mensajes en dos idiomas; comprobar cierre de tareas y acceso seguro del admin |
| A14 | Pantalla legal / privacidad | `features/legal/LegalPreviewDialog.tsx` | C/N | Foco inicial/retorno; probar trampa Tab en contenido largo |

## B. Navegación y exploración social

| ID | Superficie | Archivo | Estado | Dictamen y comprobación siguiente |
| --- | --- | --- | --- | --- |
| B01 | Header/logo, idioma, búsqueda, mensajes, alertas | `components/HeaderBar.tsx` | C/N | Controles 40px; nombres; contrastar espaciado y cantidad de acciones en 320px |
| B02 | Barra inferior 5 tabs | `components/BottomNav.tsx`, `index.css:230-310` | C/N | Etiquetas inactivas ocultas; preservar diseño y probar reconocimiento/foco |
| B03 | Inicio: título/filtros | `views/HomeView.tsx:244-276` | C/N | Textos de 8.5/9.5px en `main`; R1 en PR #106 propone ampliar |
| B04 | «Cerca · Próximamente» (fake door) | `views/HomeView.tsx:277-322` | C/N | Mensaje legítimo de prototipo; distinguir vista previa de funcionalidad |
| B05 | Feed: lista/carga/estado vacío | `App.tsx:1980-2044`, `views/HomeView.tsx` | C/N | Loading/retry existen; revisar espacio ocupado por celdas, truncación y scroll |
| B06 | Publicación/PostCard | `views/HomeView.tsx:392-642` | C/N | Iconos/acciones, timestamp, badges; comprobar densidad móvil |
| B07 | Comentarios y envío | `views/HomeView.tsx:608-642` | C/N | Input sin label accesible explícito; foco y estados bajo teclado |
| B08 | Menú de 3 puntos del post | `views/HomeView.tsx:495-539` | C/N | `role=menu` sin navegación ARIA completa identificada; verificar teclado |
| B09 | Comunidades: lista y tarjeta «Unirme» | `views/CommunitiesView.tsx:132-255` | C/N | `role=button` anidando botón real con Enter/Espacio; alto riesgo |
| B10 | Comunidades: estado vacío | `features/communities/components/CommunitiesEmptyState.tsx` | C/N | Ilustración contextual, CTA; comprobar anuncio de vacío y ritmo |
| B11 | Comunidades: detalle/historia/acciones | `views/CommunityDetailView.tsx` | C/N | Densidad alta, persistencia, modal interno y textos técnicos en errores |
| B12 | Crear/editar comunidad | `modals/CreateCommunityModal.tsx` | C/N | Campos con labels visuales no siempre asociados; selector de foto oculto |
| B13 | Búsqueda global | `views/GlobalSearchView.tsx` | C/N | autofocus sí; input sin label visible/explicito; verificar filtros/estado vacío |
| B14 | Filtros de búsqueda líquidos | `features/search/components/LiquidSearchFilters.tsx` | C/N | Grupo nombrado; verificar semántica/presencia de resultados |
| B15 | Perfil público de mascota | `views/PublicProfileView.tsx` | C/N | Dirección F13 aprobada, menú y tabs; comprobar perfil propio/ajeno, perdido, insignia |
| B16 | Tabs del perfil público | `features/profile/components/PublicProfileTabs.tsx` | C/N | Selector semántico; revisar contraste y foco |
| B17 | Denunciar contenido | `features/moderation/ReportDialog.tsx` | C/N | Trampa y devolución de foco previstas; revisar label anidado y resultado |
| B18 | Acciones «Seguir» | `components/shared/FollowButton.tsx` | I/N | Componente identificado; validar optimistic state y disabled/foco con usuario real |
| B19 | Notificaciones/avisos | `modals/NotificationsModal.tsx` | C/N | `role=dialog`, filtros, `aria-live`; medir legibilidad de fechas/capacidad |
| B20 | Mensajes/placeholder | `modals/MessagesModal.tsx` | C/N | Rama placeholder vs mensajes reales; verificar texto «en desarrollo» por estado y foco |

## C. Lugares, mapa, mascotas y servicios

| ID | Superficie | Archivo | Estado | Dictamen y comprobación siguiente |
| --- | --- | --- | --- | --- |
| C01 | Mapa inmersivo principal | `views/MapView.tsx` + `places/components/ImmersivePlacesStage.tsx` | C/N | Preservar full-bleed/mapa estándar; revisar posiciones superpuestas y gestos |
| C02 | Mapbox, marcadores 2D/3D y fallbacks | `places/map/MapboxMap.tsx` | C/N | Errores y fallback presentes; verificar accesibilidad de pines y tiles reales |
| C03 | Filtros/ubicación/carrusel | `places/components/ImmersivePlacesStage.tsx:80-254` | C/N | Textos 10–11px, scroll horizontal, acciones «centrar» vs «check-in» |
| C04 | Detalle de lugar + «Cómo llegar» | `views/MapView.tsx:429-800` | C/N | Dialog con `autoFocus` en Cerrar; falta verificación de ciclo/retorno de foco |
| C05 | Sugerir lugar | `modals/SuggestPlaceModal.tsx` | C/N | Texto de privacidad 9px y labels; revisar claridad y campos |
| C06 | Mi mascota: resumen/control | `views/PetView.tsx:260-438` | C/N | Identidad propia, menú; evaluar densidad y switch entre mascotas |
| C07 | Mi mascota: editar datos/foto | `views/PetView.tsx:440-580` | C/N | Labels no asociados; foto inaccesible con teclado; acceso a datos privados |
| C08 | Mi mascota: beneficios/tareas/cards | `views/PetView.tsx:585-830` | C/N | QR/Cuidados/Docs/Alerta; comprobar jerarquía y zonas táctiles |
| C09 | Añadir otra mascota | `modals/AddPetModal.tsx` | C/N | File input oculto y placeholder-only; primera prioridad |
| C10 | Agenda de cuidados | `modals/CareModal.tsx` | C/N | Formularios densos labels no asociados, fecha/tipo; revisar errores y teclado |
| C11 | Documentos privados/lista/subir | `modals/DocumentsModal.tsx` | C/N | **Acierto**: botón real activa file input oculto; otros campos carecen de asociación |
| C12 | Pasaporte/QR | `modals/PassportModal.tsx` | C/N | CTA copiar, QR, compartir; probar mensajes y recuperación de enlaces |
| C13 | Declarar mascota perdida | `modals/AlertModal.tsx` | C/N | Trámite sensible; exactitud, datos y CTA requieren prueba de estados |
| C14 | Previsualizar alerta | `features/rescue/components/LostAlertReview.tsx` | C/N | Explicar alcance, preview y acción de confirmar |
| C15 | Aviso perdido activo/compartir | `features/rescue/components/ActiveLostAlertPanel.tsx` | C/N | Compartir, WhatsApp, ubicación; copy 10px, atención a urgencia |
| C16 | Detalle de avistamiento | `modals/SightingDetailModal.tsx` | C/N | Confirmar estado, dato y salida, no asumir modal accesible |
| C17 | QR público de rescate / informar | `views/PublicRescueView.tsx` | C/N | Etiquetas `sr-only`, roles de estado; revisar idioma ES-only y privacidad |
| C18 | Hub de creación (post/comunidad/lugar/aviso) | `modals/CreateModal.tsx` | C/N | Distinguir acción real/fake door, áreas grandes y cancelación |
| C19 | Crear publicación | `modals/CreatePostModal.tsx` | C/N | Foto ocultada a Tab, contenidos/ubicación y errores con alert() |
| C20 | Preview de evento/lugar propuesto | `modals/CreateModal.tsx` | C/N | Evitar prometer evento creado cuando solo se mide interés |
| C21 | Ayuda y soporte del usuario | `features/support/components/SupportRequestDialog.tsx` | C/N | Dialog bien estructurado; comprobar nombre/rol y reply/history |
| C22 | Solicitud de eliminación de cuenta | `features/account/DeletionRequestDialog.tsx` | C/N | Consentimiento y estados explícitos; foco/restauración y scroll |
| C23 | Módulo de instalar PWA contextual | `features/pwa/components/PazoInstallControl.tsx` | C/N | Estados instalado/no disponible; no reiterar CTA tras instalación |

## D. Membresía, apoyos y privacidad del muro

| ID | Superficie | Archivo | Estado | Dictamen y prueba |
| --- | --- | --- | --- | --- |
| D01 | Invitación G ES/EN (320/390/1440) | `supporter/components/SupporterInvitationPrompt.*` | **V+C/N** | Metáfora visual clara; secundarios 9–11px, texto opt-out móvil; verificar scroll/zoom |
| D02 | Oferta con condiciones | `supporter/components/SupporterOfferB.tsx` | **V+C/N** | Demasiada carga editorial en card compacta; términos deben conservarse |
| D03 | Consentimiento y continuar PayPal | `supporter/components/SupporterLiveCheckoutPanel.tsx` | **V+C/N** | Copy técnico sobrante en pitch; consentimiento y estado pago no se eliminan |
| D04 | Gestión de suscripción / retorno | `supporter/components/SupporterAccountManagement.tsx` | C/N | Exceso de estados financieros, algunos necesarios; simplificar sin perder exactitud |
| D05 | Preparando/esperando/verificando | `supporter/components/SupporterPreparingScreen.tsx` | I/N | Asegurar fallback, progreso comprensible y no generar segundo checkout |
| D06 | Beneficios activos | `supporter/components/SupporterBenefitsHome.tsx` | C/N | Beneficios verificados, CTA, medallas; revisar foco y jerarquía |
| D07 | Insignias/hitos | `supporter/components/SupporterBadge.tsx` | I/N | Nombres/estados accesibles; no fingir «verificado» si no corresponde |
| D08 | Muro público/estado vacío | `supporter/components/GratitudeWallScene.tsx` | C/N | Consentimiento, ausencia de datos falsos, feedback |
| D09 | Consentimiento público por mascota | `supporter/components/SupporterWallConsentSettings.tsx` | C/N | Privacidad clara; verificar distinción consentir/revocar por mascota |
| D10 | Temas/fondos del perfil | `supporter/components/SupporterProfileThemes.tsx` | C/N | Vista previa, contraste al elegir decoración |
| D11 | Preview participación y consentimiento | `supporter/components/GratitudeParticipationPreview.tsx` | C/N | Claridad de simulación vs publicación real |
| D12 | Coordinador de invitaciones | `supporter/public/SupporterInvitationCoordinator.tsx` | C/N | Defensas para no interrumpir formulario/alerta; comprobar calendario real |
| D13 | Vista de «muro de agradecimiento» en bienvenida | `supporter/components/GratitudeWallScene.tsx` | C/N | Debe funcionar sin sesión ni datos inventados |

## E. Administración, gobernanza y moderación

| ID | Superficie | Archivo | Estado | Dictamen y prueba |
| --- | --- | --- | --- | --- |
| E01 | Panel administrador completo | `admin/components/AdminDashboard.tsx` | C/N | Diálogo con ciclo/retorno de foco: conservar; demasiadas secciones para móvil |
| E02 | Resumen PayPal Live (320/390/1440) | `admin/components/AdminPaypalLiveConsole.tsx` | **V+C/N** | Jerarquía KPI adecuada, fixture extenso, evaluar agrupación operacional |
| E03 | Controles PayPal Live (320/390/1440) | mismo archivo + `AdminLiveReleaseControl.tsx` | **V+C/N** | Mensajes de bloqueo correctos para administradores; evaluar densidad |
| E04 | Panel de usuarios/mascotas | `admin/components/AdminDashboard.tsx` | C/N | Tablas/listas, datos sensibles; evaluar columnas, búsqueda y cambio ES/EN |
| E05 | Finanzas Live vs Sandbox | `admin/components/AdminLiveFinanceSummary.tsx` + Dashboard | C/N | Etiquetado explícito; no usar suma ficticia como recaudación real |
| E06 | Métricas de actividad | `admin/components/AdminDashboard.tsx` | C/N | Diferenciar historial, datos aproximados y «tracking since» |
| E07 | Interés/fake doors/conversiones | Dashboard y `AdminPaypalLiveConsole.tsx` | C/N | Evitar ranking sesgado por múltiples votos/personas |
| E08 | Configuración PayPal avanzada | `admin/components/AdminPayPalSettings.tsx` | C/N | Operaciones técnicas sí son copy legítimo en audiencia administradora; ver estructura |
| E09 | Revisión de recursos, credenciales/MFA | `admin/components/AdminPaypalLiveResourceCheck.tsx` + `AdminPaypalMfaStepUp.tsx` | I/N | Riesgo alto; revisar restricciones, confirmación y estados, sin pruebas que alteren |
| E10 | Mantenimiento operativo | `maintenance/AdminMaintenanceControls.tsx` | C/N | Distinguir apagado de app vs renovaciones PayPal externas |
| E11 | Bandeja de soporte | `support/components/AdminSupportInbox.tsx` | C/N | Notas internas vs respuesta pública están separadas: preservar |
| E12 | Beneficios de cortesía | `support/components/AdminGiftBenefits.tsx` | C/N | Distinguir beneficios otorgados de pago; confirmación y trazabilidad |
| E13 | Cola de denuncias | `moderation/ModeratorQueue.tsx` | C/N | Diálogo/tab trampa implementados; prioridad/acciones sin falsos positivos |
| E14 | Cola de archivos retenidos | `moderation/ModerationMediaQueue.tsx` | C/N | Revisar consecuencias antes de acciones irreversibles |
| E15 | Selección de roles de moderación | `moderation/ModerationAccess.tsx` | C/N | Accesos distintos según permiso |
| E16 | Estado de mantenimiento global | `maintenance/MaintenanceGate.tsx` | C/N | Estado visible y recuperación admin |

## Criterio de cierre del inventario
El inventario contiene **superficies condicionales** y no prueba que todas sean accesibles a todos los usuarios/planes. Las superficies I deben revisarse a nivel componente antes de marcarse C. Todas las filas con `N` requieren una segunda fase de inspección renderizada y, según riesgos, pruebas de teclado/lector. **Nunca convertir este inventario de 80+ contextos en «80 pantallas visualmente aprobadas».** 
