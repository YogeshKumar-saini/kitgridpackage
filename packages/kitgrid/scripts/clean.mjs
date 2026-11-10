import { existsSync, readdirSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

// Empties dist instead of removing it: on Windows a running dev server watching dist holds the
// folder itself open, so deleting it fails, while its contents can still be replaced.
const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist")
if (existsSync(dist))
  for (const entry of readdirSync(dist)) rmSync(join(dist, entry), { recursive: true, force: true })
