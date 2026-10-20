# Notas del starter original (archivo de referencia)

La guía actual de instalación, desarrollo, migraciones y despliegue está en [`README.md`](../README.md).

El proyecto usa **Bun** como gestor de paquetes. Los scripts de desarrollo y compilación
se ejecutan con `bun run dev` y `bun run build`. Se mantiene Node.js >=22.13
para la ejecución de Wrangler y algunos procesos de Cloudflare.

El código de integración heredado de ChatGPT Sites se conserva en
`src/integrations/sites/` e `infrastructure/sites/`. Las cuentas de DJ usan Better Auth con
correo y contraseña; el acceso local ficticio de Sites está deshabilitado.
Consulta `README.md` para configurar el secreto y aplicar las migraciones.
