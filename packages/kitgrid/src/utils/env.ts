export const canUseDOM =
  typeof window !== "undefined" && typeof document !== "undefined"

export const supportsPopover = (): boolean =>
  canUseDOM && typeof HTMLElement.prototype.showPopover === "function"
