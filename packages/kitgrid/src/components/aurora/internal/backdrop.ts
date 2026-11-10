import type { ReactNode } from "react"
import { cx } from "../../../utils/cx.js"

/** Edge fades shared by every pattern-style background. */
export type BackdropMask = "none" | "radial" | "top" | "bottom" | "edges"

export const hasChildren = (children: ReactNode): boolean =>
  children !== undefined &&
  children !== null &&
  children !== false &&
  children !== true &&
  children !== ""

/**
 * Every background renders the same shell: on its own it is a full-bleed, inert, aria-hidden
 * layer (`position: absolute; inset: 0`); given children it becomes an isolated wrapper that
 * paints the effect behind them, so content never needs its own z-index.
 */
export const backdropRoot = (
  base: string,
  className: string | undefined,
  wrapper: boolean,
) => ({
  className: cx(base, className),
  "data-wrapper": wrapper || undefined,
  "aria-hidden": wrapper ? undefined : (true as const),
})

/** `useId` output contains characters that are awkward inside `url(#…)` references. */
export const svgId = (prefix: string, reactId: string): string =>
  `${prefix}-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`
