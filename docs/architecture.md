# Estructura del proyecto

La organización combina las convenciones de App Router con módulos por función.
`src/app` contiene las entradas de las rutas; las pantallas, los servicios y la
infraestructura viven fuera de ellas. No se cambian las URLs públicas.

```text
src/
  app/                 Páginas, layout, estilos globales y entradas de API
  components/          Componentes compartidos y primitivas de interfaz
  features/
    auth/              Formularios, validación y cliente de sesión
    dj/                Cabina, lista de canciones y QR
    requests/          Formulario público de peticiones
    spotify/           Búsqueda de canciones desde el navegador
  hooks/               Hooks compartidos
  lib/                 Cliente HTTP y utilidades de interfaz
  types/               Contratos compartidos de eventos y canciones
  server/
    auth/              Configuración de autenticación y verificación de sesiones
    db/                Conexión Drizzle y esquema de D1
    events/            Handlers HTTP y reglas de negocio de eventos/peticiones
    spotify/           Consulta al catálogo y credenciales de Spotify
  integrations/sites/  Adaptadores y contratos heredados de Sites
infrastructure/sites/  Plugins de Vite y entradas de Cloudflare Workers
drizzle/               Migraciones versionadas y metadatos de Drizzle
tests/
  unit/                Validación de formularios, sin servidor
  integration/         Registro, sesiones, permisos y eventos contra D1 local
scripts/               Comandos de desarrollo y herramientas locales
docs/                  Arquitectura y documentación de referencia
public/                Recursos estáticos
```

## Dependencias

- Las rutas delegan en handlers; los handlers verifican sesión, origen y entrada.
- Los servicios de eventos concentran las consultas y las reglas de negocio.
- Los componentes del navegador no importan `src/server`; ESLint verifica esa
  separación. Las credenciales y la conexión D1 permanecen en el servidor.
- La interfaz se divide por función. Los componentes compartidos no contienen
  reglas de negocio específicas de una pantalla.
- El alias `@/` apunta a `src/`. La configuración de herramientas permanece en la raíz.
- `infrastructure/` contiene código fuente, mientras `dist/`, `.wrangler/` y las
  cachés son salidas locales ignoradas por Git.

## Convenciones

- Archivos en `kebab-case`; componentes React en `PascalCase`.
- TypeScript estricto, sin `any` en los contratos de la API.
- Prettier para formato y ESLint para reglas de código y límites de importación.
- Bun como gestor único; `bun.lock` se mantiene en control de versiones.
- Las migraciones ya aplicadas no se renombran ni reescriben. Usa un nombre
  descriptivo al generar una migración nueva, por ejemplo
  `bun run db:generate --name add-event-description`.
- El texto de interfaz identifica campos, acciones o estados. Las indicaciones
  deben resolver una duda o permitir el siguiente paso en el contexto visible;
  no se añaden subtítulos promocionales, obviedades ni ayudas de otra pantalla.

## Comprobaciones

```sh
bun run test
bun run typecheck
bun run lint
bun run format:check
bun run build
```

Para la integración, inicia `bun run dev --port 5184` y ejecuta
`bun run test:auth` en otra terminal. Estas pruebas usan cuentas y eventos
desechables que eliminan al terminar. El estado de D1 sigue en `.wrangler/state`.

La carpeta `src/` y las rutas siguen las [convenciones del framework](https://nextjs.org/docs/app/api-reference/file-conventions/src-folder).
