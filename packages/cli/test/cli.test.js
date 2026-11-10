import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { buildRegistry, writeRegistry } from "../../registry/src/index.js"
import { run } from "../src/cli.js"

let root
let registry
let project
let output

const kitgrid = async (...args) => {
  output = []
  const code = await run([...args, "--cwd", project], { log: (line) => output.push(line) })
  return code
}
const read = (rel) => readFileSync(join(project, rel), "utf8")

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "kitgrid-cli-"))
  registry = join(root, "r")
  writeRegistry(buildRegistry({ src: join(__dirname, "../../kitgrid/src") }), registry)
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

beforeEach(() => {
  project = mkdtempSync(join(root, "app-"))
  writeFileSync(join(project, "package.json"), JSON.stringify({ dependencies: { react: "19.0.0" } }))
})

describe("kitgrid init", () => {
  it("writes kitgrid.json, installs the theme and prints the import line", async () => {
    expect(await kitgrid("init", "--registry", registry)).toBe(0)
    expect(JSON.parse(read("kitgrid.json"))).toEqual({
      registry,
      baseDir: "components/kitgrid",
      alias: "@/components/kitgrid",
    })
    expect(read("components/kitgrid/kitgrid.css")).toContain('@import "./theme/tokens.css";')
    expect(existsSync(join(project, "components/kitgrid/theme/theme.css"))).toBe(true)
    expect(output.join("\n")).toContain('@import "./components/kitgrid/kitgrid.css";')
  })
})

describe("kitgrid add", () => {
  beforeEach(() => kitgrid("init", "--registry", registry))

  it("writes the component, its registry dependencies and the css import", async () => {
    await kitgrid("add", "alert-dialog")
    for (const file of [
      "components/kitgrid/alert-dialog/alert-dialog.tsx",
      "components/kitgrid/dialog/modal.tsx",
      "components/kitgrid/button/button.tsx",
      "components/kitgrid/lib/utils/cx.ts",
    ]) {
      expect([file, existsSync(join(project, file))]).toEqual([file, true])
    }
    expect(read("components/kitgrid/kitgrid.css")).toContain('@import "./dialog/dialog.css";')
  })

  it("reports npm dependencies that are not installed", async () => {
    await kitgrid("add", "charts")
    expect(output.join("\n")).toContain("npm install echarts")
  })

  it("lists changes without writing on --dry-run", async () => {
    await kitgrid("add", "button", "--dry-run")
    expect(output.join("\n")).toContain("would write      components/kitgrid/button/button.tsx")
    expect(existsSync(join(project, "components/kitgrid/button/button.tsx"))).toBe(false)
  })

  it("skips a local file that differs, replaces it with --overwrite, and diff sees the edit", async () => {
    await kitgrid("add", "button")
    const file = join(project, "components/kitgrid/button/button.tsx")
    const original = readFileSync(file, "utf8")
    writeFileSync(file, `${original}\n// edited\n`)

    expect(await kitgrid("diff", "button")).toBe(1)
    expect(output).toContain("modified   components/kitgrid/button/button.tsx")

    await kitgrid("add", "button")
    expect(output.join("\n")).toContain("skip       components/kitgrid/button/button.tsx")
    expect(readFileSync(file, "utf8")).toContain("// edited")

    await kitgrid("add", "button", "--overwrite")
    expect(readFileSync(file, "utf8")).toBe(original)
    expect(await kitgrid("diff", "button")).toBe(0)
  })

  it("fails clearly on an unknown component", async () => {
    await expect(kitgrid("add", "no-such-thing")).rejects.toThrow('"no-such-thing" is not in the registry')
  })
})

describe("kitgrid list", () => {
  it("prints registry items", async () => {
    await kitgrid("list", "--registry", registry)
    expect(output.some((line) => /^button\b/.test(line))).toBe(true)
  })
})
