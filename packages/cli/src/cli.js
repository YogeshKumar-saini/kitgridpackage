import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, posix, relative, resolve } from "node:path"
import { parseArgs } from "node:util"

export const DEFAULT_REGISTRY = "https://kitgrid.dev/r"
const CONFIG = "kitgrid.json"
const THEME = "kitgrid-theme"

const usage = `kitgrid <command> [options]

  init                 write kitgrid.json and install the theme
  add <name...>        copy components and their dependencies into the project
  list                 list registry items
  diff <name>          show which local files differ from the registry

  --registry <url|path>  registry to read (default: kitgrid.json, then ${DEFAULT_REGISTRY})
  --base-dir <dir>       init: where components go (default: components/kitgrid, or src/components/kitgrid)
  --overwrite            add: replace local files that differ
  --dry-run              add: print what would change, write nothing
  --cwd <dir>            project root (default: current directory)`

const normalize = (text) => text.replace(/\r\n/g, "\n")
const itemName = (ref) => ref.replace(/\\/g, "/").split("/").pop().replace(/\.json$/, "")

const loader = (registry, cwd) => {
  const remote = /^https?:\/\//.test(registry)
  const cache = new Map()
  return (name) => {
    if (!cache.has(name)) {
      cache.set(
        name,
        (async () => {
          if (!remote) {
            const file = join(resolve(cwd, registry), `${name}.json`)
            if (!existsSync(file)) throw new Error(`"${name}" is not in the registry at ${registry}`)
            return JSON.parse(readFileSync(file, "utf8"))
          }
          const response = await fetch(`${registry.replace(/\/$/, "")}/${name}.json`)
          if (!response.ok) throw new Error(`"${name}" could not be fetched from ${registry} (${response.status})`)
          return response.json()
        })(),
      )
    }
    return cache.get(name)
  }
}

const resolveItems = async (names, load) => {
  const ordered = []
  const seen = new Set()
  const visit = async (name) => {
    if (seen.has(name)) return
    seen.add(name)
    const item = await load(name)
    for (const dep of item.registryDependencies ?? []) await visit(itemName(dep))
    ordered.push(item)
  }
  for (const name of names) await visit(itemName(name))
  return ordered
}

const localPath = (config, item, file) => {
  const base = item.meta?.base
  const rel = base && file.target.startsWith(`${base}/`) ? file.target.slice(base.length + 1) : file.target
  return join(config.baseDir, rel)
}

const readConfig = (cwd) => {
  const file = join(cwd, CONFIG)
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null
}

const installedPackages = (cwd) => {
  const file = join(cwd, "package.json")
  if (!existsSync(file)) return new Set()
  const pkg = JSON.parse(readFileSync(file, "utf8"))
  return new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies }))
}

const add = async (names, config, { cwd, registry, overwrite, dryRun, log }) => {
  const items = await resolveItems(names, loader(registry, cwd))
  const cssEntry = join(cwd, config.baseDir, "kitgrid.css")
  const imports = []
  const npm = new Set()
  const counts = { written: 0, unchanged: 0, skipped: 0 }

  for (const item of items) {
    for (const dep of item.dependencies ?? []) npm.add(dep)
    for (const file of item.files) {
      const rel = localPath(config, item, file)
      const dest = join(cwd, rel)
      const content = normalize(file.content)
      const shown = rel.replace(/\\/g, "/")
      if (existsSync(dest)) {
        if (normalize(readFileSync(dest, "utf8")) === content) {
          counts.unchanged++
        } else if (!overwrite) {
          counts.skipped++
          log(`skip       ${shown} (local copy differs; --overwrite to replace)`)
        } else {
          counts.written++
          log(`${dryRun ? "would overwrite" : "overwrite"}  ${shown}`)
          if (!dryRun) writeFileSync(dest, content)
        }
      } else {
        counts.written++
        log(`${dryRun ? "would write" : "write"}      ${shown}`)
        if (!dryRun) {
          mkdirSync(dirname(dest), { recursive: true })
          writeFileSync(dest, content)
        }
      }
      if (item.name !== THEME && rel.endsWith(".css")) {
        imports.push(`@import "./${posix.relative(config.baseDir.replace(/\\/g, "/"), shown)}";`)
      }
    }
  }

  if (imports.length > 0) {
    const current = existsSync(cssEntry) ? normalize(readFileSync(cssEntry, "utf8")) : ""
    const missing = imports.filter((line) => !current.includes(line))
    if (missing.length > 0) {
      log(`${dryRun ? "would add" : "add"}        ${missing.length} @import to ${relative(cwd, cssEntry).replace(/\\/g, "/")}`)
      if (!dryRun) writeFileSync(cssEntry, `${current.replace(/\n*$/, "\n")}${missing.join("\n")}\n`)
    }
  }

  log(
    `${items.length} items: ${counts.written} ${dryRun ? "to write" : "written"}, ${counts.unchanged} unchanged, ${counts.skipped} skipped`,
  )
  const installed = installedPackages(cwd)
  const needed = [...npm].filter((dep) => !installed.has(dep)).sort()
  if (needed.length > 0) log(`\nInstall the npm dependencies:\n  npm install ${needed.join(" ")}`)
  return { items, counts, dependencies: needed }
}

const globalCss = (cwd) =>
  ["app/globals.css", "src/app/globals.css", "src/index.css", "src/styles/globals.css", "styles/globals.css"].find(
    (file) => existsSync(join(cwd, file)),
  )

export const run = async (argv, { cwd: start = process.cwd(), log = console.log } = {}) => {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      registry: { type: "string" },
      "base-dir": { type: "string" },
      overwrite: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      cwd: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  })
  const [command, ...names] = positionals
  const cwd = resolve(start, values.cwd ?? ".")
  if (values.help || !command) {
    log(usage)
    return 0
  }

  const config = readConfig(cwd)
  const registry = values.registry ?? config?.registry ?? DEFAULT_REGISTRY
  const options = { cwd, registry, overwrite: values.overwrite, dryRun: values["dry-run"], log }

  if (command === "init") {
    const next = config ?? {
      registry,
      baseDir: values["base-dir"] ?? (existsSync(join(cwd, "src")) ? "src/components/kitgrid" : "components/kitgrid"),
      alias: "@/components/kitgrid",
    }
    if (values.registry) next.registry = values.registry
    if (config) log(`${CONFIG} exists, keeping it`)
    else log(`write      ${CONFIG}`)
    if (!options.dryRun) writeFileSync(join(cwd, CONFIG), `${JSON.stringify(next, null, 2)}\n`)
    await add([THEME], next, options)
    const css = globalCss(cwd)
    const entry = join(cwd, next.baseDir, "kitgrid.css")
    const from = css ? relative(dirname(join(cwd, css)), entry) : relative(cwd, entry)
    const line = `@import "${from.startsWith(".") ? "" : "./"}${from.replace(/\\/g, "/")}";`
    log(`\nAdd this line ${css ? `to ${css} ` : "to your global stylesheet "}before @import "tailwindcss":\n  ${line}`)
    return 0
  }

  if (command === "list") {
    const remote = /^https?:\/\//.test(registry)
    const index = remote
      ? await (await fetch(`${registry.replace(/\/$/, "")}/registry.json`)).json()
      : JSON.parse(readFileSync(join(resolve(cwd, registry), "registry.json"), "utf8"))
    for (const item of index.items) log(`${item.name.padEnd(28)} ${item.description ?? ""}`.trimEnd())
    return 0
  }

  if (!config) throw new Error(`no ${CONFIG} in ${cwd}; run "kitgrid init" first`)

  if (command === "add") {
    if (names.length === 0) throw new Error("kitgrid add needs at least one component name")
    await add(names, config, options)
    log(`\nImport from "${config.alias}/<name>", e.g. import { Button } from "${config.alias}/button"`)
    return 0
  }

  if (command === "diff") {
    if (names.length === 0) throw new Error("kitgrid diff needs a component name")
    const load = loader(registry, cwd)
    let changed = 0
    for (const name of names) {
      const item = await load(itemName(name))
      for (const file of item.files) {
        const rel = localPath(config, item, file)
        const dest = join(cwd, rel)
        const shown = rel.replace(/\\/g, "/")
        if (!existsSync(dest)) {
          changed++
          log(`missing    ${shown}`)
          continue
        }
        if (normalize(readFileSync(dest, "utf8")) === normalize(file.content)) continue
        changed++
        log(`modified   ${shown}`)
      }
    }
    if (changed === 0) log("No differences from the registry.")
    return changed === 0 ? 0 : 1
  }

  throw new Error(`unknown command "${command}"\n\n${usage}`)
}
