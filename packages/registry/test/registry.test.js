import { join, posix } from "node:path"
import { buildRegistry, rewriteImports } from "../src/index.js"

const { items, index, llms } = buildRegistry({ src: join(__dirname, "../../kitgrid/src") })
const byName = new Map(items.map((item) => [item.name, item]))
const targets = new Map(items.flatMap((item) => item.files.map((file) => [file.target, item.name])))
const relativeImports = (content) =>
  [...content.matchAll(/(?:\bfrom\s+|\bimport\s*\(?\s*)["'](\.[^"']+)["']/g)].map((match) => match[1])

describe("registry items", () => {
  it("emits a shadcn-shaped button item", () => {
    const button = byName.get("button")
    expect(button).toMatchObject({
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: "button",
      type: "registry:ui",
      title: "Button",
      dependencies: [],
      registryDependencies: ["https://kitgrid.dev/r/kitgrid-lib.json"],
    })
    expect(byName.get("alert-dialog").description).toMatch(/^A modal/)
    expect(button.files.map((file) => file.target)).toEqual([
      "components/kitgrid/button/button.tsx",
      "components/kitgrid/button/index.ts",
    ])
    expect(button.files[0].content).toContain('from "../lib/primitives/slot"')
  })

  it("keeps the card item free of tests", () => {
    const card = byName.get("card")
    expect(card.files.some((file) => file.path.includes(".test."))).toBe(false)
    expect(card.files.map((file) => file.type)).toEqual(["registry:ui", "registry:ui"])
  })

  it("ships dialog's keyframes sheet and its component dependencies", () => {
    const dialog = byName.get("dialog")
    expect(dialog.files.map((file) => file.target)).toContain("components/kitgrid/dialog/dialog.css")
    expect(dialog.files.find((file) => file.target.endsWith(".css")).type).toBe("registry:file")
    expect(dialog.registryDependencies).toContain("https://kitgrid.dev/r/icon-button.json")
  })

  it("bundles the charts as one item that needs echarts", () => {
    const charts = byName.get("charts")
    expect(charts.dependencies).toEqual(["echarts"])
    expect(charts.files.map((file) => file.target)).toContain("components/kitgrid/charts/line-chart.tsx")
    expect(charts.registryDependencies).toContain("https://kitgrid.dev/r/stat.json")
  })

  it("lists every item in registry.json without content, and one llms.txt line each", () => {
    expect(index.items).toHaveLength(items.length)
    expect(index.items[0].files[0]).not.toHaveProperty("content")
    for (const item of items) expect(llms).toContain(`- [${item.name}](https://kitgrid.dev/r/${item.name}.json)`)
  })
})

describe("import rewriting", () => {
  const resolve = (from, spec) => posix.join(posix.dirname(from), spec).replace(/\.js$/, ".ts")
  it("maps library paths to the copied layout and drops .js", () => {
    const source = [
      'import { cx } from "../../utils/cx.js"',
      'import type { Thing } from "../other/other.js"',
      'export { useX } from "./x.js"',
      'import { useState } from "react"',
    ].join("\n")
    expect(rewriteImports(source, "components/demo/demo.tsx", resolve)).toBe(
      [
        'import { cx } from "../lib/utils/cx"',
        'import type { Thing } from "../other/other"',
        'export { useX } from "./x"',
        'import { useState } from "react"',
      ].join("\n"),
    )
  })

  it("leaves no .js suffix on any relative import", () => {
    for (const item of items) {
      for (const file of item.files) {
        for (const spec of relativeImports(file.content)) expect(spec).not.toMatch(/\.js$/)
      }
    }
  })
})

describe("closure", () => {
  it("resolves every emitted relative import to a file some item ships, declared as a dependency", () => {
    for (const item of items) {
      const deps = new Set(item.registryDependencies.map((url) => url.split("/").pop().replace(/\.json$/, "")))
      for (const file of item.files) {
        for (const spec of relativeImports(file.content)) {
          const base = posix.join(posix.dirname(file.target), spec)
          const hit = [base, `${base}.ts`, `${base}.tsx`].find((candidate) => targets.has(candidate))
          expect([file.target, spec, hit !== undefined]).toEqual([file.target, spec, true])
          const owner = targets.get(hit)
          if (owner !== item.name) expect([item.name, owner, deps.has(owner)]).toEqual([item.name, owner, true])
        }
      }
    }
  })

  it("ships only lib files something imports", () => {
    const imported = new Set()
    for (const item of items) {
      for (const file of item.files) {
        for (const spec of relativeImports(file.content)) {
          const base = posix.join(posix.dirname(file.target), spec)
          for (const candidate of [`${base}.ts`, `${base}.tsx`]) imported.add(candidate)
        }
      }
    }
    for (const file of byName.get("kitgrid-lib").files) expect([file.target, imported.has(file.target)]).toEqual([file.target, true])
  })
})
