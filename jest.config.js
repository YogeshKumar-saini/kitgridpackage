// Runs the kitgrid library, registry and CLI test suites (jsdom + SWC, no Vite).
export default {
  rootDir: "packages/kitgrid",
  roots: ["<rootDir>", "<rootDir>/../registry", "<rootDir>/../cli"],
  testEnvironment: "<rootDir>/test/jsdom-environment.cjs",
  testMatch: [
    "<rootDir>/src/**/*.test.{ts,tsx}",
    "<rootDir>/../registry/test/**/*.test.js",
    "<rootDir>/../cli/test/**/*.test.js",
  ],
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: true },
          transform: { react: { runtime: "automatic" } },
          target: "es2022",
        },
        module: { type: "commonjs" },
      },
    ],
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  // Do not let SWC/pirates transform node_modules — undici's CJS destructuring
  // of node:zlib (createZstdDecompress) breaks when rewritten by SWC.
  // Jest's default already ignores node_modules; this makes it explicit.
  transformIgnorePatterns: ["/node_modules/"],
  // Match Vitest's default fake-timer surface: timers and Date only.
  fakeTimers: {
    doNotFake: [
      "nextTick",
      "queueMicrotask",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "requestIdleCallback",
      "cancelIdleCallback",
      "performance",
      "hrtime",
    ],
  },
  testTimeout: 15000,
}
