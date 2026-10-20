# Ritmo DJ

## Comprobaciones

- Usa Bun para dependencias. `bun.lock` es el único lockfile.
- Valida con `bun run lint`, `bun run format:check`, `bun run typecheck` y
  `bun run test`; compila antes de publicar.
- Conserva la estructura de `src/` descrita en `docs/architecture.md`.
- El texto de interfaz debe identificar acciones, campos o estados útiles.
  No agregues eslóganes ni instrucciones fuera de contexto.
- Las canciones solo se seleccionan desde Spotify. Título y artista no se editan.

## Publicación

- Este proyecto se publica con el plugin y skill **Sites**. Sigue sus instrucciones
  y `docs/deployment-sites.md` para publicar cambios solicitados.
- Reutiliza el `project_id` de `.openai/hosting.json`; no crees un sitio duplicado.
- Conserva el acceso público, los secretos alojados y los datos de D1. Las cuentas
  de DJ usan correo y contraseña; los invitados acceden sin sesión por QR.
- `bun run sites:prepare` sincroniza el código con la copia aislada de publicación
  después de abrirla con el helper de Sites. No sustituye el guardado/despliegue
  nativo ni publica por sí solo.
- Nunca publiques `.dev.vars`, bases locales, credenciales, `node_modules` ni
  carpetas de ejecución. No regeneres secretos de producción en cada actualización.
- Las migraciones existentes son inmutables. Los cambios de esquema agregan una
  migración nueva y se validan antes de publicar.
- Mantén GitHub actualizado con los cambios y confirma el resultado de CI.
