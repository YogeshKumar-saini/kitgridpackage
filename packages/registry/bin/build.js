#!/usr/bin/env node
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseArgs } from "node:util"
import { buildRegistry, DEFAULT_BASE, DEFAULT_URL, readDemos, writeRegistry } from "../src/index.js"

const here = dirname(fileURLToPath(import.meta.url))
const { values } = parseArgs({
  options: {
    src: { type: "string", default: join(here, "../../kitgrid/src") },
    demos: { type: "string", default: join(here, "../../../../Kitgridui/src/features/demos") },
    out: { type: "string", default: join(here, "../dist/r") },
    llms: { type: "string" },
    url: { type: "string", default: DEFAULT_URL },
    base: { type: "string", default: DEFAULT_BASE },
  },
})

const out = resolve(values.out)
const result = buildRegistry({
  src: resolve(values.src),
  url: values.url.replace(/\/$/, ""),
  base: values.base,
  demos: readDemos(resolve(values.demos)),
})
writeRegistry(result, out, values.llms && resolve(values.llms))
const described = result.items.filter((item) => item.description).length
console.log(`kitgrid registry: ${result.items.length} items (${described} described) → ${out}`)
