# PAZO — Places / Map Demand Experiment

**Estado:** EXPERIMENTO ACTIVO  
**Owner:** Product Owner  
**Fecha:** 2026-10-07

## 1. Decisión

Fase 8 permanece técnicamente COMPLETADA.

El rollout público de Mapa/Lugares queda **PAUSADO** por decisión de producto/costo.

Mientras este experimento esté activo:

- el mapa real permanece disponible en desarrollo local con `npm run dev`;
- builds publicados de Vite no montan Mapbox;
- producción no necesita `VITE_MAPBOX_ACCESS_TOKEN`;
- no se solicita ubicación;
- no se crean check-ins desde la superficie pública;
- la pestaña Mapa muestra un fake door honesto de validación.

No borrar el módulo real ni su backend. Se conserva como prototipo funcional listo para reevaluación.

## 2. Hipótesis

> Usuarios activos de PAZO mostrarán suficiente interés en descubrir lugares pet-friendly mediante un mapa como para justificar costo, mantenimiento y rollout público.

## 3. Instrumentación

Reutilizar el framework genérico existente.

**module_key:** `places_map`  
**source:** `bottom_nav_map`

Eventos persistentes:
- `module_validation_views`;
- `module_validation_interests`.

Unidad principal:
- cuenta/usuario único;
- no mascota;
- interés deduplicado por cuenta + módulo;
- views deduplicadas por usuario + módulo + sesión.

No crear una tabla específica para Mapbox/Places.

## 4. UX del experimento

La pestaña Mapa debe dejar claro:
- que la función está en evaluación;
- que todavía no está activa en la app publicada;
- qué valor ofrecería;
- CTA único principal: **Me interesa**;
- después del CTA, mostrar confirmación persistente.

No simular mapa ni lugares reales.

## 5. Privacidad

Durante el fake door:
- no solicitar geolocalización;
- no cargar Mapbox;
- no enviar coordenadas;
- no activar check-ins;
- no persistir ninguna ubicación.

La telemetría solo contiene:
- module key;
- source;
- session id técnico;
- user id server-owned;
- timestamps.

## 6. Lectura

Seguir `docs/PAZO_FEATURE_VALIDATION_FRAMEWORK.md`.

Muestra:
- <30 viewers únicos: insuficiente;
- 30–99: direccional;
- 100+: base inicial razonable.

Interest Rate:
- <10%: señal débil;
- 10–24%: seguir validando;
- >=25%: señal prometedora.

Estas bandas NO autorizan automáticamente activar el mapa.

## 7. Revisión de decisión

Al alcanzar muestra suficiente, revisar:
- viewers únicos;
- interested users únicos;
- Interest Rate;
- revisitas en sesiones/días distintos;
- costo real de Mapbox/Vercel;
- prioridad frente a otros módulos;
- capacidad operativa/moderación del catálogo local.

Resultados posibles:
- reactivar rollout;
- MVP más reducido;
- mantener experimento;
- posponer indefinidamente.

## 8. Regla de costo

No comprar Vercel Pro, Mapbox add-ons ni otro plan únicamente para habilitar este módulo durante validación.

Cualquier reactivación de proveedor pagado requiere autorización explícita del Product Owner.


## 9. Backend gate

The generic validation tables already exist.

Required registry entry:
- `validation_private.modules.module_key = 'places_map'`.

Prepared migration:
- `20261008013000_register_places_map_validation.sql`.

Status: **PENDING explicit Product Owner authorization + production apply + runtime persistence verification.**
