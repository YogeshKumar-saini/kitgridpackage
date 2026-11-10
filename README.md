# kitgridpackage

Every npm package in Kitgrid, as one npm workspace. The published library is `packages/kitgrid`.

```bash
npm install          # installs and links every workspace package
npm run build        # builds every package that has a build script
```

The site (`../Kitgridui`) and Studio (`../kitgridstudio`) depend on
`file:../kitgridpackage/packages/kitgrid`. Rebuild after library changes.

| Folder | Package | Phase | State |
| --- | --- | ---: | --- |
| `packages/kitgrid` | kitgrid | 1 | Built: 394 components, 34 charts, 15 hooks |
| `packages/test` | @kitgrid/test | 1 | Planned |
| `packages/registry` | @kitgrid/registry | 2 | Planned |
| `packages/cli` | kitgrid (CLI) | 2 | Planned |
| `packages/mcp` | @kitgrid/mcp | 2 | Planned |
| `packages/tokens` | @kitgrid/tokens | 4 | Planned |
| `packages/icons` | @kitgrid/icons | 6 | Planned |
| `packages/core` | @kitgrid/core | 7 | Planned |
| `packages/vue` | @kitgrid/vue | 7 | Planned |
| `packages/svelte` | @kitgrid/svelte | 7 | Planned |
| `packages/angular` | @kitgrid/angular | 7 | Planned |
| `packages/elements` | @kitgrid/elements | 7 | Planned |

A planned folder holds only a README until its phase starts. The component contract is
[CONTRIBUTING.md](CONTRIBUTING.md).
