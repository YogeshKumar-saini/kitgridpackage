import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { posix } from "node:path"

export const DEFAULT_URL = "https://kitgrid.dev/r"
export const DEFAULT_BASE = "components/kitgrid"
export const LIB = "kitgrid-lib"
export const THEME = "kitgrid-theme"
export const CHARTS = "charts"

const ITEM_SCHEMA = "https://ui.shadcn.com/schema/registry-item.json"
const INDEX_SCHEMA = "https://ui.shadcn.com/schema/registry.json"
const LIB_DIRS = ["utils", "hooks", "primitives", "provider"]
const PEERS = new Set(["react", "react-dom"])
const IMPORT = /(\bfrom\s+|\bimport\s*\(?\s*)(["'])([^"']+)\2/g

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n")

const walk = (dir, rel = "") =>
  readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    const path = rel ? `${rel}/${entry}` : entry
    if (statSync(full).isDirectory()) return walk(full, path)
    return /\.(tsx?|css)$/.test(entry) && !/\.test\.tsx?$/.test(entry) ? [path] : []
  })

/** Where a library file (path relative to src/) lands, relative to the base dir. */
export const targetOf = (rel) => {
  const [top, ...rest] = rel.split("/")
  if (top === "components") return rest.join("/")
  if (top === "charts") return rel
  if (top === "styles") return `theme/${rest.join("/")}`
  if (LIB_DIRS.includes(top)) return `lib/${rel}`
  throw new Error(`kitgrid registry: no target for ${rel}`)
}

/** The registry item a library file belongs to. */
export const ownerOf = (rel) => {
  const [top, name] = rel.split("/")
  if (top === "components") return name
  if (top === "charts") return CHARTS
  if (top === "styles") return THEME
  if (LIB_DIRS.includes(top)) return LIB
  throw new Error(`kitgrid registry: no item for ${rel}`)
}

const resolveIn = (files) => (from, spec) => {
  const joined = posix.join(posix.dirname(from), spec).replace(/\.js$/, "")
  const hit = [joined, `${joined}.ts`, `${joined}.tsx`, `${joined}/index.ts`, `${joined}/index.tsx`].find(
    (candidate) => files.has(candidate),
  )
  if (!hit) throw new Error(`kitgrid registry: ${from} imports missing ${spec}`)
  return hit
}

const specifiers = (content) => [...content.matchAll(IMPORT)].map((match) => match[3])

const packageOf = (spec) => spec.split("/").slice(0, spec.startsWith("@") ? 2 : 1).join("/")

/** Rewrites relative imports for the copied layout and drops the .js suffix. */
export const rewriteImports = (content, from, resolve) =>
  content.replace(IMPORT, (whole, lead, quote, spec) => {
    if (!spec.startsWith(".")) return whole
    const to = targetOf(resolve(from, spec)).replace(/\.tsx?$/, "")
    let next = posix.relative(posix.dirname(targetOf(from)), to)
    if (!next.startsWith(".")) next = `./${next}`
    return `${lead}${quote}${next}${quote}`
  })

const words = (name) => name.split("-").map((word) => word[0].toUpperCase() + word.slice(1))

const docComment = (content, name) => {
  const wanted = name.replaceAll("-", "").toLowerCase()
  for (const [, body, ident] of content.matchAll(
    /\/\*\*((?:(?!\*\/)[\s\S])*)\*\/\s*export\s+(?:const|function)\s+(\w+)/g,
  )) {
    if (ident.toLowerCase() !== wanted) continue
    return body
      .split("\n")
      .map((line) => line.replace(/^\s*\*?\s?/, "").trim())
      .filter(Boolean)
      .join(" ")
  }
  return ""
}

const unquote = (quote, text) => (quote === '"' ? JSON.parse(`"${text}"`) : text.replace(/\\(.)/g, "$1"))

/** Reads `{ id, name, description }` from the site's defineDemo() calls. */
export const readDemos = (dir) => {
  const demos = {}
  if (!existsSync(dir)) return demos
  const field = (chunk, key) => {
    const match = chunk.match(new RegExp(`\\b${key}:\\s*(["'\`])((?:\\\\.|(?!\\1)[^\\\\])*)\\1`))
    return match && !match[2].includes("${") ? unquote(match[1], match[2]) : ""
  }
  for (const file of readdirSync(dir).filter((entry) => /\.tsx?$/.test(entry))) {
    for (const chunk of read(join(dir, file)).split("defineDemo(").slice(1)) {
      const id = field(chunk, "id")
      if (id && !demos[id]) demos[id] = { name: field(chunk, "name"), description: field(chunk, "description") }
    }
  }
  return demos
}

const themeEntry = `/* kitgrid: import this file before @import "tailwindcss" in your global stylesheet. */
@layer theme, base, kg, components, utilities;
@layer kg.tokens, kg.base, kg.utilities, kg.components;

@import "./theme/tokens.css";
@import "./theme/base.css";
@import "./theme/theme.css";
`

export const buildRegistry = ({ src, url = DEFAULT_URL, base = DEFAULT_BASE, demos = {} }) => {
  const sources = new Map()
  for (const top of ["components", "charts", ...LIB_DIRS]) {
    for (const rel of walk(join(src, top))) {
      if (top !== "components" || rel.includes("/")) sources.set(`${top}/${rel}`, read(join(src, top, rel)))
    }
  }
  const resolve = resolveIn(sources)
  const itemUrl = (name) => `${url}/${name}.json`
  const fileType = (rel) => {
    if (rel.endsWith(".css")) return "registry:file"
    if (rel.startsWith("hooks/")) return "registry:hook"
    return ownerOf(rel) === LIB ? "registry:lib" : "registry:ui"
  }
  const file = (rel, content = sources.get(rel)) => ({
    path: `kitgrid/src/${rel}`,
    type: fileType(rel),
    content: rel.endsWith(".css") ? content : rewriteImports(content, rel, resolve),
    target: `${base}/${targetOf(rel)}`,
  })

  const groups = new Map()
  for (const rel of sources.keys()) {
    const owner = ownerOf(rel)
    if (owner !== LIB) groups.set(owner, [...(groups.get(owner) ?? []), rel])
  }

  const libFiles = new Set()
  const visit = (rel) => {
    for (const spec of specifiers(sources.get(rel))) {
      if (!spec.startsWith(".")) continue
      const dep = resolve(rel, spec)
      if (ownerOf(dep) === LIB && !libFiles.has(dep)) {
        libFiles.add(dep)
        visit(dep)
      }
    }
  }
  for (const files of groups.values()) files.forEach(visit)

  const depsOf = (name, files) => {
    const registry = new Set()
    const npm = new Set()
    for (const rel of files) {
      for (const spec of specifiers(sources.get(rel))) {
        if (!spec.startsWith(".")) {
          if (!PEERS.has(packageOf(spec))) npm.add(packageOf(spec))
          continue
        }
        const owner = ownerOf(resolve(rel, spec))
        if (owner !== name) registry.add(owner)
      }
    }
    return { dependencies: [...npm].sort(), registryDependencies: [...registry].sort().map(itemUrl) }
  }

  const items = []
  for (const [name, files] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const main = files.find((rel) => rel.endsWith(`/${name}.tsx`))
    const demo = demos[name] ?? {}
    items.push({
      $schema: ITEM_SCHEMA,
      name,
      type: "registry:ui",
      title: demo.name || words(name).join(" "),
      description: (main && docComment(sources.get(main), name)) || demo.description || "",
      ...depsOf(name, files),
      files: files.sort().map((rel) => file(rel)),
      meta: { base },
    })
  }

  const lib = [...libFiles].sort()
  items.push({
    $schema: ITEM_SCHEMA,
    name: LIB,
    type: "registry:lib",
    title: "kitgrid lib",
    description: "Shared utils, hooks, primitives and provider the kitgrid components import.",
    ...depsOf(LIB, lib),
    files: lib.map((rel) => file(rel)),
    meta: { base },
  })

  items.push({
    $schema: ITEM_SCHEMA,
    name: THEME,
    type: "registry:theme",
    title: "kitgrid theme",
    description: "Design tokens, base styles and the Tailwind v4 kg theme. Import kitgrid.css before tailwindcss.",
    dependencies: [],
    registryDependencies: [],
    files: [
      ...["tokens.css", "base.css", "theme.css"].map((name) => ({
        path: `kitgrid/src/styles/${name}`,
        type: "registry:file",
        content: read(join(src, "styles", name)),
        target: `${base}/theme/${name}`,
      })),
      { path: "kitgrid/kitgrid.css", type: "registry:file", content: themeEntry, target: `${base}/kitgrid.css` },
    ],
    meta: { base },
  })

  const index = {
    $schema: INDEX_SCHEMA,
    name: "kitgrid",
    homepage: url.replace(/\/r\/?$/, ""),
    items: items.map(({ $schema, files, ...rest }) => ({
      ...rest,
      files: files.map(({ content, ...entry }) => entry),
    })),
  }

  const llms = [
    "# kitgrid",
    "",
    "> Accessible React components written in Tailwind v4 on the kg theme. Copy editable source into a project with `npx @kitgrid/cli add <name>`; every item below is a shadcn-compatible registry item.",
    "",
    "## Components",
    "",
    ...items.map((item) => `- [${item.name}](${itemUrl(item.name)})${item.description ? `: ${item.description}` : ""}`),
    "",
  ].join("\n")

  return { items, index, llms }
}

export const writeRegistry = ({ items, index, llms }, out, llmsPath = join(out, "llms.txt")) => {
  mkdirSync(out, { recursive: true })
  for (const item of items) writeFileSync(join(out, `${item.name}.json`), `${JSON.stringify(item, null, 2)}\n`)
  writeFileSync(join(out, "registry.json"), `${JSON.stringify(index, null, 2)}\n`)
  mkdirSync(dirname(llmsPath), { recursive: true })
  writeFileSync(llmsPath, llms)
}
