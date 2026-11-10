import { execSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"
import { bundle, transform } from "lightningcss"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const src = join(root, "src")
const dist = join(root, "dist")
const components = join(src, "components")
const version = (major, minor = 0) => (major << 16) | (minor << 8)

// The floor where color-mix(), :has() and @layer all ship natively.
const targets = {
  chrome: version(111),
  edge: version(111),
  firefox: version(113),
  safari: version(16, 4),
  ios_saf: version(16, 4),
}

const LAYERS = "@layer kg.tokens, kg.base, kg.utilities, kg.components;\n"
const readText = (file) => readFileSync(file, "utf8")

// Minifying drops layer names that hold no rules in a given file, so every sheet re-declares the
// full order up front; whichever kitgrid sheet loads first then fixes it for all of them.
const finish = (label, { code, warnings }) => {
  for (const warning of warnings) console.warn(`${label}: ${warning.message}`)
  return LAYERS.trim() + String(code)
}

const bundleStyle = (file) =>
  finish(file, bundle({ filename: join(src, "styles", file), minify: true, targets }))

const transformSource = (label, source) =>
  finish(
    label,
    transform({ filename: label, code: Buffer.from(source), minify: true, targets }),
  )

mkdirSync(dist, { recursive: true })

// Tailwind utilities used by the components. They sit below kg.components: a converted component
// has no sheet of its own, so the only legacy rules left are unconverted consumers deliberately
// adjusting a child, and those must win. Unlayered app CSS still wins over both.
const compiled = join(dist, ".utilities.tmp.css")
execSync(`npx tailwindcss -i "${join(src, "styles", "utilities.css")}" -o "${compiled}"`, {
  cwd: root,
  stdio: ["ignore", "ignore", "inherit"],
})
const utilities = transformSource(
  "utilities.css",
  `${LAYERS}@layer kg.utilities {\n${readText(compiled)}\n}`,
)
rmSync(compiled)
writeFileSync(join(dist, "utilities.css"), utilities)

const styles = `${bundleStyle("index.css")}\n${utilities}`
writeFileSync(join(dist, "styles.css"), styles)
writeFileSync(join(dist, "tokens.css"), bundleStyle("tokens.css"))
writeFileSync(
  join(dist, "base.css"),
  transformSource(
    "base.css",
    LAYERS +
      readText(join(src, "styles", "tokens.css")) +
      readText(join(src, "styles", "base.css")),
  ),
)
copyFileSync(join(src, "styles", "tailwind.css"), join(dist, "tailwind.css"))
copyFileSync(join(src, "styles", "theme.css"), join(dist, "theme.css"))

// Per-component sheets for apps that load only what they render, on top of base.css. Each one
// also carries the styles of the components it renders, found through its relative imports.
const folders = readdirSync(components, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

const sheetsOf = (name) =>
  readdirSync(join(components, name))
    .filter((file) => file.endsWith(".css"))
    .sort()
    .map((file) => join(components, name, file))

const importPattern = /from "\.\.\/([\w-]+)\//g

const directDeps = (name) => {
  const deps = new Set()
  for (const file of readdirSync(join(components, name))) {
    if (!/\.tsx?$/.test(file) || file.includes(".test.")) continue
    for (const [, dep] of readText(join(components, name, file)).matchAll(
      importPattern,
    )) {
      if (dep !== name && folders.includes(dep)) deps.add(dep)
    }
  }
  return deps
}

const closure = (name, seen = new Set()) => {
  if (seen.has(name)) return seen
  seen.add(name)
  for (const dep of directDeps(name)) closure(dep, seen)
  return seen
}

let count = 0
for (const name of folders) {
  if (sheetsOf(name).length === 0) continue
  const files = [...closure(name)].reverse().flatMap(sheetsOf)
  const out = join(dist, "components", name)
  if (!existsSync(out)) mkdirSync(out, { recursive: true })
  writeFileSync(
    join(out, "styles.css"),
    transformSource(`${name}.css`, LAYERS + files.map(readText).join("\n")),
  )
  count++
}

// The charts entry ships its own sheet, carrying the Stat styles its SparkGrid renders.
const charts = join(src, "charts")
mkdirSync(join(dist, "charts"), { recursive: true })
writeFileSync(
  join(dist, "charts", "styles.css"),
  transformSource(
    "charts.css",
    LAYERS + [...sheetsOf("stat"), join(charts, "charts.css")].map(readText).join("\n"),
  ),
)

console.log(
  `kitgrid: styles.css ${(styles.length / 1024).toFixed(1)} kB, ` +
    `${(gzipSync(styles).length / 1024).toFixed(1)} kB gz · ${count} component sheets`,
)
