# Publicación y actualizaciones en Sites

Sitio: https://ritmo-live-fernando.neatloon16.chatgpt.site

La identidad está en `.openai/hosting.json`. Conserva ese `project_id`, el binding
`DB` y el acceso público. Los invitados entran por QR sin cuenta de ChatGPT; las
cuentas de DJ se gestionan con Better Auth dentro de la aplicación.

## Publicar una actualización desde Codex

Pide a Codex: «Actualiza Ritmo DJ en Sites con los cambios del proyecto».
El agente debe usar el skill **Sites** y sus herramientas nativas:

1. Ejecutar las comprobaciones de código y consultar `get_site` con el ID del
   manifiesto. No crear otro sitio ni cambiar su dirección o audiencia.
2. Obtener una credencial temporal con
   `create_source_repository_write_credential`. Guardarla solo en memoria y
   entregarla al helper del plugin por stdin, nunca en argumentos ni archivos.
3. Abrir el código alojado con `site-workflow.mjs --project-id <project_id>` desde
   `.sites-runtime/sites-source`. La primera vez, crea esa carpeta vacía; en
   publicaciones posteriores, reabre la misma copia y reconcilia cambios remotos.
   Usa la ruta y el resultado que devuelve el helper.
4. Desde la raíz del proyecto, ejecutar `bun run sites:prepare`. Copia el código
   actual a esa copia aislada y conserva su historial. Rechaza archivos privados
   y cambios a migraciones existentes. Revisa el diff antes de publicar.
5. Si cambiaron las dependencias o aún no están instaladas en la copia aislada,
   ejecutar `install-dependencies.mjs` del plugin desde ella.
6. Desde la copia aislada, ejecutar otra vez `site-workflow.mjs`, pasando la
   credencial y el resultado de apertura por stdin. Incluir como comando
   `['node', '<plugin-root>/scripts/build-site.mjs']` y como `archivePath` la ruta
   absoluta a `.sites-runtime/releases/ritmo-dj.tar.gz` del proyecto principal.
   El helper compila, crea el commit, sincroniza el código y empaqueta el resultado.
7. Pasar el `project_id`, `commit_sha` y `archive` devueltos a `save_site_version`.
   Publicar el ID de versión recibido con `deploy_site_version`, porque el sitio
   ya es público. Consultar el despliegue hasta que termine y comunicar su URL.
8. Sincronizar los cambios del proyecto principal con GitHub. GitHub Actions
   valida cada push; la publicación en Sites se realiza mediante este flujo.

`<plugin-root>` es el directorio del plugin Sites instalado en el entorno de
Codex. No se incluye una ruta personal ni una credencial permanente en el código.
En Windows, el empaquetado necesita Git Bash disponible en el PATH del proceso.
Configura también `TAR_OPTIONS=--force-local` en ese proceso para que GNU tar
interprete correctamente las rutas absolutas con letra de unidad.

## Variables de producción

Se configuran con las herramientas de variables de entorno de Sites:

| Variable                | Tipo     | Uso                                       |
| ----------------------- | -------- | ----------------------------------------- |
| `SPOTIFY_CLIENT_ID`     | Secreto  | Identificador de la aplicación de Spotify |
| `SPOTIFY_CLIENT_SECRET` | Secreto  | Autenticación del catálogo de Spotify     |
| `BETTER_AUTH_SECRET`    | Secreto  | Firma de las sesiones de DJ               |
| `BETTER_AUTH_URL`       | Variable | Origen HTTPS exacto del sitio publicado   |
| `ABLY_API_KEY`          | Secreto  | Avisos por WebSocket para la cabina       |

Conserva los secretos existentes al actualizar. No regeneres `BETTER_AUTH_SECRET`
en cada publicación: invalidaría las sesiones. Modifica las credenciales de
Spotify solo cuando cambien en su panel. `.dev.vars` se usa únicamente en local
y nunca se copia al sitio, al archivo de despliegue o a GitHub.

## Base de datos y recuperación

Sites administra D1 y aplica las migraciones incluidas antes de publicar el
Worker. Las migraciones existentes no se editan ni se eliminan; agrega una nueva
con `bun run db:generate --name nombre-del-cambio`.

La base local `.wrangler/state` y D1 alojada son independientes. Publicar código
no copia cuentas, contraseñas, eventos ni peticiones locales a producción.
Las actualizaciones normales conservan los datos alojados. Una migración ya
aplicada permanece aunque se vuelva a publicar una versión anterior del código.

Si falla una publicación, conserva el ID de versión y de despliegue y consulta
sus registros antes de reintentar. Reutiliza el mismo sitio y los resultados
válidos; no crees otro proyecto como solución a un error de publicación.
