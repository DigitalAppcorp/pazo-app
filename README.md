# PAZO

**PAZO** es una aplicación web progresiva (PWA) para dueños de mascotas. Su código frontend utiliza React, TypeScript y Vite; los servicios y datos se integran con Supabase y las publicaciones se realizan mediante Vercel. La experiencia está diseñada en español e inglés.

## Empezar por aquí

- **Para humanos y agentes:** [handoff activo breve](docs/PAZO_ACTIVE_HANDOFF.md). Indica qué se verificó, qué es incierto y cuál es la siguiente reconciliación pendiente. No sustituye consultar GitHub y proveedores vivos.
- **Reglas del proyecto y cautelas:** [AGENTS.md](AGENTS.md). Contiene también registros históricos fechados; no asumir que un encabezado antiguo «vigente» sigue siendo el estado actual.
- **Arquitectura y límites de dominios:** [contrato](docs/PAZO_ARCHITECTURE_CONTRACT.md).
- **Datos, privacidad y retención:** [inventario de datos](docs/PAZO_DATA_INVENTORY.md).
- **Historia del handoff:** [archivo preservado íntegramente](docs/history/PAZO_ACTIVE_HANDOFF_PRE_COMPACTION_20261106.md).
- **Método compartido de trabajo con agentes:** [Project Brain OS](https://github.com/DigitalAppcorp/project-brain-os), especialmente el [protocolo de continuidad verificable](https://github.com/DigitalAppcorp/project-brain-os/blob/main/patterns/VERIFIABLE_HANDOFF.md).

## Desarrollo local

Tras clonar el repositorio y configurar únicamente las variables necesarias según [.env.example](.env.example):

```bash
npm ci
npm run dev
```

Comprobaciones disponibles en `package.json`: `npm run build`, `npm run lint` y `npm run test:governance`. Algunas pruebas requieren configuraciones y servicios específicos; revisar sus contratos y no ejecutar operaciones alojadas o destructivas sin autorización.

## Publicación y estado real

El código de `main`, la CI, las migraciones aplicadas y el despliegue de producción son hechos **diferentes**. `vercel.json` tiene `git.deploymentEnabled=false`: fusionar cambios no autoriza ni garantiza una publicación. Comprobar el despliegue remoto y los proveedores antes de declarar una función activa. Los cambios sensibles de producción necesitan la autorización correspondiente del Product Owner.

**Regla documental:** actualizar el handoff breve en lugar de seguir anexando cronologías. Preservar evidencia e historial con enlaces y fechas, sin convertir notas antiguas en instrucciones nuevas.
