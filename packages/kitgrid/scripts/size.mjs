import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist")
const importPattern = /(?:from|import)\s*"(\.{1,2}\/[^"]+\.js)"/g

// Walks the relative import graph so shared hooks count toward every component using them.
const closure = (entry, seen = new Set()) => {
  if (seen.has(entry)) return seen
  seen.add(entry)
  const source = readFileSync(entry, "utf8")
  for (const [, specifier] of source.matchAll(importPattern)) {
    closure(join(dirname(entry), specifier), seen)
  }
  return seen
}

const gzip = (files) =>
  gzipSync(Buffer.concat([...files].map((file) => readFileSync(file)))).length

const components = join(dist, "components")
const rows = readdirSync(components)
  .filter((name) => statSync(join(components, name)).isDirectory())
  .map((name) => ({ name, bytes: gzip(closure(join(components, name, "index.js"))) }))
  .sort((a, b) => b.bytes - a.bytes)

const width = Math.max(...rows.map((row) => row.name.length))
for (const row of rows) {
  console.log(`${row.name.padEnd(width)}  ${(row.bytes / 1024).toFixed(2)} kB gz`)
}
const css = gzipSync(readFileSync(join(dist, "styles.css"))).length
console.log(`\n${"styles.css".padEnd(width)}  ${(css / 1024).toFixed(2)} kB gz`)
