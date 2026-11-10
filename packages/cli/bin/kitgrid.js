#!/usr/bin/env node
import { run } from "../src/cli.js"

run(process.argv.slice(2)).then(
  (code) => {
    process.exitCode = code
  },
  (error) => {
    console.error(`kitgrid: ${error.message}`)
    process.exitCode = 1
  },
)
