# Ritmo DJ — solicitudes de canciones con QR y Spotify

Web para eventos de DJ. Un evento tiene **un código QR público** que abre un formulario para solicitar canciones, sin obligar a los invitados a crear una cuenta ni a iniciar sesión en Spotify. El DJ recibe las solicitudes automáticamente en su cabina.

Se mantiene la arquitectura del proyecto original: **React 19 + TypeScript + Vinext (Next compatible) + Cloudflare Workers + Cloudflare D1**. Los controles de interfaz se construyen con **React Aria Components**. El QR se genera en el navegador con `qrcode.react`.

El código se organiza en `src/`: rutas en `app`, interfaz por función en
`features` y autenticación, servicios y base de datos en `server`. La integración
de Cloudflare está en `infrastructure/sites`, las pruebas en `tests` y las
convenciones en [docs/architecture.md](./docs/architecture.md).

La publicación en Sites y el procedimiento para actualizarla se describen en
[docs/deployment-sites.md](./docs/deployment-sites.md). `bun run sites:prepare`
prepara la copia de publicación; Codex completa el despliegue con el plugin Sites.

ESLint comprueba el código con las reglas de TypeScript y React/Next. Ejecuta
`bun run lint` para validar o `bun run lint:fix` para aplicar las correcciones
automáticas disponibles. La integración continua de GitHub verifica lint sin
advertencias, formato, tipos, pruebas unitarias y compilación.

## Qué incluye

- **Código QR por evento**, visible en la cabina y descargable como PNG.
- Enlace público `https://tu-dominio/?evento=<id>` para abrir desde un celular.
- **Búsqueda de Spotify** por canción o artista, con portada y selección de la coincidencia correcta.
- La selección muestra portada, título, artista y enlace oficial de Spotify sin campos editables. Puedes quitarla para elegir otra canción.
- Las peticiones requieren seleccionar una canción del catálogo de Spotify.
- Nombre y dedicatoria opcionales del invitado.
- Cola persistente en D1 con cuatro estados: pendiente, aceptada, tocada y descartada.
- Actualización automática cada 3 segundos en la cabina; avisos visuales, sonido opcional y notificaciones del navegador con permiso.
- Pausar o reabrir la recepción de peticiones, crear múltiples eventos y cambiar entre ellos.
- Componentes accesibles: `Button`, `TextField`, `Input`, `Label`, `TextArea`, `ListBox`, `Tabs`, `Modal` y `Dialog` de React Aria.

## Requisitos

- [Bun 1.4.3](https://bun.com/docs/installation), Node.js >= 22.13 (Wrangler/Cloudflare) y una base Cloudflare D1.
- Para Spotify, una aplicación en [Spotify for Developers](https://developer.spotify.com/dashboard) con **Web API** habilitada. Necesitas su `Client ID` y `Client Secret`.
- Las cuentas de DJ usan correo y contraseña con Better Auth, sesiones en D1 y un secreto `BETTER_AUTH_SECRET` (ver apartado de autenticación).

## Instalación con Bun

En Windows, instala Bun con PowerShell:

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

En macOS o Linux:

```bash
curl -fsSL https://bun.sh/install | bash
```

En la carpeta del proyecto, ejecuta:

```bash
bun install
# Configura BETTER_AUTH_SECRET en .dev.vars antes de arrancar (ver Autenticación).
# Inicializa la base local y aplica las migraciones pendientes:
bun run db:migrate:local
bun run typecheck
bun run build
bun run dev
```

Abre la URL indicada por Vinext (normalmente `http://localhost:5173`).
Para previsualizar el Worker ya compilado, usa `bun run start`.

`bun run db:migrate:local` usa `wrangler.local.json` y guarda el estado en
`.wrangler/state`, la misma base que usa el servidor de desarrollo. No requiere
compilar antes y se puede repetir: solo aplica las migraciones pendientes.
Si aparece `no such table: events`, ejecuta ese comando y recarga la página.

Bun gestiona las dependencias y los comandos `bun run`. Los scripts `dev` y
`build` ejecutan Vinext con Node.js para que Miniflare pueda usar los eventos
WebSocket `upgrade` y `unexpected-response` que necesita Cloudflare. Ejecutar
`bun scripts/run-framework.mjs dev` directamente puede mostrar advertencias
de compatibilidad y dejar el arranque esperando; utiliza `bun run dev`.

`bun.lock` es el único lockfile del proyecto. Para reinstalaciones reproducibles
o CI utiliza `bun run install:ci` (`bun install --frozen-lockfile`). No necesitas
pnpm ni npm para instalar las dependencias.

La estructura de `node_modules` de Bun se configura en modo `isolated`,
parecida a la de pnpm. Algunos paquetes nativos necesitan scripts de
instalación: se permiten solamente los listados en `trustedDependencies`
del `package.json`.

En desarrollo, el servidor escucha en la red local y el enlace y el QR usan la
IP del equipo, incluso si abres la cabina desde `localhost`. Conecta el celular
a la misma red y permite el acceso de Node.js a redes privadas en el firewall.
Si cambias de red, reinicia `bun run dev` para detectar la nueva IP.
Al publicar la aplicación, el QR usa el dominio desde el que se abre la cabina.

## Configurar Spotify

1. Accede a [Spotify for Developers](https://developer.spotify.com/dashboard) e inicia sesión.
2. Crea una app para **Web API** y copia su `Client ID` y `Client Secret`.
3. Configura ambas credenciales **solo en el backend**; nunca en el código React ni en variables `NEXT_PUBLIC_*`.

En desarrollo, crea un archivo `.dev.vars` (ya ignorado por Git) con:

```dotenv
SPOTIFY_CLIENT_ID=tu_client_id
SPOTIFY_CLIENT_SECRET=tu_client_secret
```

En despliegue configura estas dos variables como **secrets del Worker** o del entorno Sites que aloje la API:

```bash
# En un Worker desplegado con Wrangler:
bunx wrangler secret put SPOTIFY_CLIENT_ID
bunx wrangler secret put SPOTIFY_CLIENT_SECRET
```

La API `GET /api/search?q=...` usa **OAuth Client Credentials** desde el servidor, mantiene el token temporalmente en memoria de la instancia y consulta la búsqueda oficial `/v1/search` (máximo 10 resultados por consulta, mercado MX). Los invitados no tienen que autenticar su cuenta de Spotify.

Si Spotify devuelve un error o no está configurado, la interfaz muestra el problema y no permite enviar canciones manuales. Consulta las [cuotas de Spotify](https://developer.spotify.com/documentation/web-api/concepts/quota-modes) para configurar la aplicación.

**Spotify solo sirve como catálogo y enlace de referencia:** el proyecto no descarga audio, no reproduce tracks ni escribe en listas de reproducción de Spotify.

## Flujo de uso

1. El DJ entra al panel, crea un evento y visualiza su QR en la columna lateral.
2. Lo descarga como PNG para imprimir/proyectar, o copia el enlace.
3. Los invitados escanean, seleccionan una canción de Spotify, añaden sus datos opcionales y pulsan **Enviar petición**.
4. La nueva solicitud aparece en el panel (intervalo de actualización de 3 segundos); el DJ puede aceptarla, descartarla y marcarla como tocada.
5. El DJ puede pausar la entrada de solicitudes sin perder la lista.

## API

| Ruta | Propósito | Acceso |
|---|---|---|
| `GET /api/events` | Listar eventos del DJ | Propietario autenticado |
| `POST /api/events` | Crear evento | Propietario autenticado |
| `GET /api/event/:id` | Nombre y disponibilidad; solicita también cola solo si es propietario | Público, sin datos de invitados para terceros |
| `POST /api/event/:id` | Pedir una canción | Público, con límite básico de 30 s por identificador de navegador |
| `PATCH /api/event/:id` | Pausar, reabrir y modificar estados | Solo el propietario |
| `GET /api/search?q=...` | Búsqueda del catálogo Spotify | Público, sin exponer credenciales |

Ejecuta `bun run db:migrate:local` también si ya tienes la base creada: la segunda
migración añade usuarios, credenciales, sesiones y límites de acceso sin modificar
los eventos y peticiones existentes.

## Autenticación y producción

La página principal muestra **Iniciar sesión** y **Crear cuenta**. El registro pide
nombre del DJ, correo y una contraseña de al menos 8 caracteres. La sesión dura
7 días y el panel incluye **Cerrar sesión**, también en móviles. Cada cuenta solo
puede administrar sus propios eventos. Los invitados siguen usando el QR sin cuenta.

En desarrollo, configura `BETTER_AUTH_SECRET` en `.dev.vars` con un valor aleatorio
de al menos 32 caracteres. Puedes generarlo con este comando y copiarlo al archivo;
no lo subas a Git:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

En producción configura `BETTER_AUTH_SECRET` como secret del Worker y
`BETTER_AUTH_URL` con la URL HTTPS pública exacta. Aplica las migraciones pendientes
en la D1 de producción antes de usar las cuentas. El desarrollo detecta
automáticamente `localhost` y `127.0.0.1`.

Better Auth gestiona el hash de contraseñas y las cookies HttpOnly de sesión.
Las sesiones se comprueban en el servidor y los intentos de acceso tienen límites
persistidos en D1. Las APIs del DJ ya no aceptan la identidad de prueba de Sites
ni sus cabeceras. Los eventos antiguos de `local_seedy` se conservan con su
propietario original; no se asignan automáticamente a cuentas nuevas.

Esta versión permite registro e inicio/cierre de sesión. Aún no incluye
verificación del correo ni recuperación de contraseña por email.

La limitación de 30 segundos funciona mediante un identificador persistido en el navegador: es una mitigación inicial, **no una protección robusta contra abuso**. Para eventos masivos, añade Cloudflare Turnstile y limitación de frecuencia por IP en el edge. Los avisos del navegador requieren que la cabina permanezca abierta y que el permiso esté concedido (sonido tras interacción del DJ); no se incluyen notificaciones push con el navegador cerrado.

## Comprobación

Antes del despliegue ejecuta:

```bash
bun install
bun run test
bun run typecheck
bun run lint
bun run build
```

Para comprobar las cuentas, arranca el servidor local en una terminal con
`bun run dev --port 5184`. En otra terminal ejecuta `bun run test:auth`.
La prueba valida registro, inicio/cierre de sesión, credenciales incorrectas,
límites de acceso, aislamiento entre DJs y peticiones públicas por QR. Crea
cuentas y un evento desechables en D1 local y los elimina al terminar.

Luego prueba con dos dispositivos: QR (móvil) y cola del DJ (computadora).

Si al registrarte permaneces en el formulario, revisa los errores junto a los
campos: la cuenta solo se crea cuando el registro termina correctamente y se
abre la cabina. La contraseña nueva necesita al menos 8 caracteres y debe
coincidir con la confirmación.
