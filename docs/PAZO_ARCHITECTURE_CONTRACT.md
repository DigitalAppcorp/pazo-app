# PAZO — Architecture Contract

**Estado:** ACTIVO  
**Propósito:** hacer que la arquitectura sea explícita para humanos y agentes, sin refactor masivo de riesgo.

## 1. Regla general

La estructura del repositorio debe comunicar a qué dominio pertenece cada pieza.

PAZO no usará una carpeta global creciente como sustituto de arquitectura.

### Código nuevo
Por defecto, cualquier funcionalidad nueva o extensión sustancial de un dominio debe vivir bajo:

```
src/features/<domain>/
```

Ejemplos:
- `src/features/search/`
- `src/features/places/`
- futuro: `src/features/communities/`
- futuro: `src/features/care/`
- futuro: `src/features/documents/`
- futuro: `src/features/rescue/`

Cada dominio puede contener únicamente lo que necesite:

```
components/
services/
types.ts
hooks/
utils/
index.ts
```

No crear carpetas vacías “por arquitectura”.

## 2. Capas compartidas permitidas

### `src/components/ui/`
Componentes visuales realmente genéricos y reutilizables.

No poner aquí lógica de negocio.

### `src/components/shared/`
Composición reutilizada por múltiples dominios, sin ownership de un módulo concreto.

### `src/lib/`
Infraestructura técnica compartida:
- clientes externos;
- configuración;
- helpers sin conocimiento de UI/producto.

### `src/types/`
Tipos cross-domain verdaderamente compartidos.

Los tipos específicos de un módulo deben vivir con el módulo.

### `src/context/`
Solo contextos realmente globales.

No crear un Context por feature si estado local/servicio es suficiente.

## 3. Carpetas legacy actuales

Estas carpetas existen y NO deben provocar un refactor masivo dentro de Production Hardening:

- `src/services/`
- `src/components/views/`
- `src/components/modals/`
- `src/types/pazo.ts`

Regla:
- no mover archivos solo “para que se vea bonito”;
- si una fase modifica sustancialmente un dominio legacy, puede migrar ese dominio de forma incremental;
- cada migración debe mantener imports, tests/build y comportamiento;
- no mezclar refactor estructural grande con una feature de alto riesgo.

## 4. Ownership de dominio

Un módulo debe tener una fuente clara para:

- datos;
- reglas;
- tipos;
- UI;
- navegación;
- telemetría;
- permisos/backend.

No duplicar una regla de negocio entre `App.tsx`, un modal y un service.

## 5. Dependencias

Preferencia:

```
feature UI
  -> feature service
    -> shared infrastructure/lib
```

Evitar:

```
feature A -> internals de feature B
```

Cuando A necesita B:
- usar contrato público/export;
- extraer una pieza compartida si de verdad pertenece a ambos;
- no importar archivos internos arbitrarios entre features.

## 6. App.tsx

`App.tsx` es composición/orquestación, no un dominio.

No debe convertirse otra vez en:
- lógica de pagos;
- entitlement;
- reglas de moderación;
- consultas Supabase complejas;
- lógica de analytics específica;
- lógica de negocio de módulos.

Las reglas deben vivir en su dominio/servicio.

## 7. Backend

Supabase debe conservar separación explícita:

- migraciones versionadas;
- RLS como boundary de autorización;
- lógica privilegiada en esquemas privados;
- wrappers públicos mínimos cuando haga falta;
- grants explícitos;
- ninguna service-role key en browser.

## 8. Regla para agentes

Antes de crear un archivo nuevo:
1. determinar el dominio;
2. usar `src/features/<domain>` si pertenece a una feature;
3. usar shared/lib/types solo si es realmente cross-domain;
4. no añadir nuevos servicios de dominio directamente a `src/services/` sin justificarlo.

## 9. Enforcement

CI mantiene una lista baseline de archivos legacy.

El check debe fallar si aparece:
- un nuevo service de dominio en `src/services/`;
- una nueva view de dominio en `src/components/views/`;
- un nuevo modal de dominio en `src/components/modals/`;

salvo que el baseline/contrato sea actualizado conscientemente en el mismo PR.

Eso no prohíbe mantener los archivos existentes.

## 10. Estrategia de migración

No existe una “fase de mover carpetas” automática.

Migración incremental cuando:
- un módulo se rediseña sustancialmente;
- se añade backend importante;
- la estructura actual dificulta mantenimiento;
- moverlo reduce riesgo neto.

El objetivo es **arquitectura legible sin churn innecesario**.
