import type { CSSProperties } from "react"
import { cx } from "./cx.js"

type AnyProps = Record<string, unknown>

const isHandler = (
  key: string,
  value: unknown,
): value is (...args: unknown[]) => void =>
  /^on[A-Z]/.test(key) && typeof value === "function"

/** Merges slot props onto child props: handlers chain (child first), classes join, styles spread. */
export const mergeProps = (slot: AnyProps, child: AnyProps): AnyProps => {
  const merged: AnyProps = { ...slot, ...child }
  for (const key of Object.keys(slot)) {
    const slotValue = slot[key]
    const childValue = child[key]
    if (isHandler(key, slotValue) && isHandler(key, childValue)) {
      merged[key] = (...args: unknown[]) => {
        childValue(...args)
        const event = args[0] as { defaultPrevented?: boolean } | undefined
        if (!event?.defaultPrevented) slotValue(...args)
      }
    } else if (key === "className") {
      merged[key] = cx(slotValue as string, childValue as string)
    } else if (key === "style") {
      merged[key] = {
        ...(slotValue as CSSProperties),
        ...(childValue as CSSProperties),
      }
    }
  }
  return merged
}
