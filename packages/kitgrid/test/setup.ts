import "@testing-library/jest-dom"
import { cleanup } from "@testing-library/react"

afterEach(cleanup)

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver
globalThis.IntersectionObserver ??=
  NoopObserver as unknown as typeof IntersectionObserver

if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.show = function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event("close"))
  }
}

Element.prototype.scrollIntoView ??= () => {}
Element.prototype.animate ??= function () {
  return {
    finished: Promise.resolve(),
    cancel() {},
    finish() {},
    onfinish: null,
  } as unknown as Animation
}
