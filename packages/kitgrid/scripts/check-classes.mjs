// Fails the build on the two Tailwind mistakes that compile silently: a class glued to a
// template interpolation (`bg-x${…}`), which the scanner never sees, and a private variable
// mangled to `var(-- x)` inside an arbitrary value.
import { readFileSync, readdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const sources = readdirSync(join(root, "src"), { recursive: true })
  .filter((file) => file.endsWith(".tsx") && !file.includes(".test."))
  .map((file) => join(root, "src", file))

const problems = []
for (const file of sources) {
  const text = readFileSync(file, "utf8")
  // Tailwind v4 has no duration theme namespace: duration-kg-* would generate nothing.
  for (const [token] of text.matchAll(/\bduration-kg-[\w-]+/g))
    problems.push(`${file}: "${token}" generates no CSS; use duration-(--kg-duration-*)`)
  for (const template of text.matchAll(/`([^`]*)`/g)) {
    for (const [, token] of template[1].matchAll(/(?:^|\s)([a-z!\[][\w:\-[\]()/.%!#,=&>*+~@]*[\w\])%])\$\{/g))
      if (/[:[(]|-/.test(token) && !/^kg-[\w-]+$/.test(token))
        problems.push(`${file}: class "${token}" is glued to \${…}; Tailwind will not generate it`)
  }
}
if (readFileSync(join(root, "dist", "utilities.css"), "utf8").includes("var(-- "))
  problems.push("dist/utilities.css contains `var(-- `: a private variable was mangled")

if (problems.length) {
  console.error(problems.join("\n"))
  process.exit(1)
}
console.log("kitgrid: class check passed")
