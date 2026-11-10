# @kitgrid/registry

Builds the kitgrid Resource Registry from `packages/kitgrid/src`: one shadcn-compatible item per
component, plus `kitgrid-lib`, `kitgrid-theme`, `charts`, the `registry.json` index and `llms.txt`.

```bash
node packages/registry/bin/build.js                      # → packages/registry/dist/r
node packages/registry/bin/build.js --out public/r --llms public/llms.txt --url https://kitgrid.dev/r
```

| option | default |
| --- | --- |
| `--src` | `packages/kitgrid/src` |
| `--demos` | `Kitgridui/src/features/demos` (fallback descriptions) |
| `--out` | `packages/registry/dist/r` |
| `--llms` | `<out>/llms.txt` |
| `--url` | `https://kitgrid.dev/r`, used in `registryDependencies` and `llms.txt` |
| `--base` | `components/kitgrid`, the base every `target` is written for |

The site runs it on `predev`/`prebuild`, so `/r/<name>.json`, `/r/registry.json` and `/llms.txt`
are served from `Kitgridui/public`. Format and decisions:
`docs/superpowers/specs/2026-11-01-registry-cli-design.md`.
