"use client"

import { useCallback, useRef } from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"

export interface FlyToCartOptions {
  /** Where to land. Defaults to the first visible `[data-cart-target]`. */
  target?: Element | null
  /** Flight time in ms. */
  duration?: number
  /** How high the arc rises above the straight line, in px. */
  arc?: number
}

export type FlyToCart = (
  from: Element | null,
  options?: FlyToCartOptions,
) => Promise<void>

const STEPS = 16

const findTarget = (): Element | null => {
  for (const node of document.querySelectorAll("[data-cart-target]")) {
    const rect = node.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) return node
  }
  return null
}

/** Scale bounce on the cart icon, so the add registers even without a flight. */
export const bumpCartTarget = (target: Element | null): void => {
  target?.animate?.(
    [
      { scale: 1 },
      { scale: 1.22, offset: 0.35 },
      { scale: 0.94, offset: 0.7 },
      { scale: 1 },
    ],
    { duration: 480, easing: "ease-out" },
  )
}

const makeGhost = (from: Element, rect: DOMRect): HTMLElement => {
  const image = from instanceof HTMLImageElement ? from : from.querySelector("img")
  let ghost: HTMLElement
  if (image) {
    const img = document.createElement("img")
    img.src = image.currentSrc || image.src
    img.alt = ""
    img.style.objectFit = "cover"
    ghost = img
  } else {
    ghost = from.cloneNode(true) as HTMLElement
  }
  ghost.setAttribute("aria-hidden", "true")
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    zIndex: "2147483000",
    pointerEvents: "none",
    boxShadow: "var(--kg-shadow-lg)",
    transformOrigin: "center",
    willChange: "transform, opacity",
  })
  return ghost
}

/**
 * Returns `fly(fromElement)`: clones the product image (or `fromElement` itself) and sends it
 * along an arc into the cart icon, then bumps the icon. Under reduced motion only the bump plays.
 */
export const useFlyToCart = (): FlyToCart => {
  const reduced = useReducedMotion()
  const latest = useRef(reduced)
  useIsomorphicLayoutEffect(() => {
    latest.current = reduced
  })

  return useCallback(async (from, options = {}) => {
    const target = options.target ?? findTarget()
    if (!target) return
    if (latest.current || !from || typeof document.body.animate !== "function") {
      bumpCartTarget(target)
      return
    }
    const start = from.getBoundingClientRect()
    const end = target.getBoundingClientRect()
    if (start.width === 0 || start.height === 0) {
      bumpCartTarget(target)
      return
    }

    const ghost = makeGhost(from, start)
    document.body.append(ghost)

    const dx = end.left + end.width / 2 - (start.left + start.width / 2)
    const dy = end.top + end.height / 2 - (start.top + start.height / 2)
    const endScale = Math.max(
      0.06,
      Math.min(end.width / start.width, end.height / start.height),
    )
    const arc = options.arc ?? Math.min(220, Math.max(80, Math.abs(dx) * 0.35))
    // Quadratic Bézier from the image to the icon with its control point above both.
    const cx = dx * 0.35
    const cy = Math.min(0, dy) - arc

    const keyframes: Keyframe[] = Array.from({ length: STEPS + 1 }, (_, step) => {
      const t = step / STEPS
      const u = 1 - t
      const x = 2 * u * t * cx + t * t * dx
      const y = 2 * u * t * cy + t * t * dy
      const scale = 1 + (endScale - 1) * t ** 1.4
      return {
        offset: t,
        transform: `translate(${x}px, ${y}px) scale(${scale})`,
        opacity: t > 0.85 ? 1 - (t - 0.85) / 0.15 : 1,
        borderRadius: `${12 + 40 * t}%`,
      }
    })

    try {
      await ghost.animate(keyframes, {
        duration: options.duration ?? 720,
        easing: "cubic-bezier(0.45, 0, 0.25, 1)",
        fill: "forwards",
      }).finished
    } catch {
      // Cancelled (e.g. the page navigated): still clean up below.
    } finally {
      ghost.remove()
    }
    bumpCartTarget(target)
  }, [])
}
