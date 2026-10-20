# Migración de pnpm a Bun

**Gestor oficial:** Bun 1.4.3 (`packageManager` en `package.json`).

La migración está completada. `bun.lock` es el único lockfile mantenido; el
archivo anterior de pnpm se retiró después de generar y verificar el de Bun.

## Desarrollo

```bash
bun --version                 # 1.4.3 recomendado
bun install
bun run test
bun run typecheck
bun run lint
bun run build
```

En CI:

```bash
bun run install:ci             # frozen lockfile
bun run build
```

- React Aria, QR y Spotify permanecen intactos.
- Bun gestiona las dependencias e invoca los comandos con `bun run`.
  Los scripts `dev`, `build`, `start` y `db:migrate:local` usan Node.js
  `>=22.13` para Vinext y Wrangler; Miniflare necesita eventos WebSocket que
  no están implementados en el runtime de Bun usado durante la comprobación.
- `scripts/install-pnpm.sh` y los instaladores específicos de npm/pnpm
  se retiraron, y `pnpm-workspace.yaml` fue sustituido por `bunfig.toml`.
- Si alguna dependencia necesita un script `postinstall`, revisa
  `bun pm untrusted` antes de permitirla mediante `bun pm trust <paquete>`.

Consulta la [documentación de migración de Bun](https://bun.sh/docs/pm/cli/install#pnpm-migration).
