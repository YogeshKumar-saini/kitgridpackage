const TABBABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "iframe",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]",
].join(",")

/** Keyboard-reachable descendants of `root`, in tree order. */
export const getTabbable = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter(
    (element) => element.tabIndex >= 0 && !element.closest("[hidden], [inert]"),
  )

/**
 * Moves focus into a surface that just opened: the preferred element, else the first tabbable
 * one not matching `skip` (so a corner close button isn't the default), else the surface itself.
 */
export const focusInto = (
  root: HTMLElement,
  preferred?: HTMLElement | null,
  skip?: string,
): void => {
  if (preferred) {
    preferred.focus()
    return
  }
  const candidates = getTabbable(root)
  const target =
    candidates.find((element) => !skip || !element.matches(skip)) ??
    candidates[0] ??
    root
  target.focus()
}

/** True when focus is about to be lost: on the body, nowhere, or inside a closing surface. */
export const shouldReclaimFocus = (surface: HTMLElement | null): boolean => {
  const active = document.activeElement
  return !active || active === document.body || (surface?.contains(active) ?? false)
}
