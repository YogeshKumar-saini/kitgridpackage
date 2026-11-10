# @kitgrid/cli

Copies the editable Tailwind source of kitgrid components into your project. Zero runtime
dependencies, Node 20+.

```bash
npx @kitgrid/cli init                  # kitgrid.json + theme, prints the CSS import line
npx @kitgrid/cli add button dialog     # component, its kitgrid dependencies, npm install hint
npx @kitgrid/cli list
npx @kitgrid/cli diff button           # which local files differ from the registry
```

Add the printed line to your global stylesheet, before Tailwind:

```css
@import "../components/kitgrid/kitgrid.css";
@import "tailwindcss";
```

| option | |
| --- | --- |
| `--registry <url\|path>` | registry URL or local directory (default `kitgrid.json`, then `https://kitgrid.dev/r`) |
| `--base-dir <dir>` | `init` only; default `components/kitgrid`, or `src/components/kitgrid` when `src/` exists |
| `--overwrite` | replace local files that differ (otherwise they are skipped and named) |
| `--dry-run` | print what would change, write nothing |
| `--cwd <dir>` | project root |

The items are shadcn-compatible, so `npx shadcn add https://kitgrid.dev/r/button.json` also works;
it does not append component sheets to `kitgrid.css`. Format and decisions:
`docs/superpowers/specs/2026-11-01-registry-cli-design.md`.
