// Jest stand-ins for stubbing globals: stubGlobal replaces a global for the
// current test, unstubAllGlobals puts every original back.
const originals = new Map<string, PropertyDescriptor | undefined>()

export function stubGlobal(name: string, value: unknown): void {
  if (!originals.has(name)) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name))
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true, enumerable: true })
}

export function unstubAllGlobals(): void {
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor)
    else delete (globalThis as Record<string, unknown>)[name]
  }
  originals.clear()
}
