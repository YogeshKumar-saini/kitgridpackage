"use client"

import { type CSSProperties, forwardRef, type HTMLAttributes, useRef } from "react"
import { usePointerVars } from "../../hooks/use-pointer-vars.js"
import { Slot } from "../../primitives/slot.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export type PointerLightBlend =
  "normal" | "soft-light" | "overlay" | "plus-lighter" | "screen"

export interface PointerLightProps extends HTMLAttributes<HTMLDivElement> {
  /** Any CSS color. Defaults to a soft sage paper light. */
  color?: string
  /** Radius of the light, in px. */
  size?: number
  /** Strength, 0–1. */
  intensity?: number
  /** How the light combines with the content beneath it. */
  blend?: PointerLightBlend
  /** Light the child element itself instead of wrapping it in a div. */
  asChild?: boolean
}

const lightClass = cx(
  "kg-pointer-light relative isolate",
  "after:pointer-events-none after:absolute after:inset-0 after:z-1 after:rounded-[inherit] after:opacity-0 after:content-['']",
  "after:bg-[radial-gradient(var(--kg-pointer-light-size,280px)_circle_at_var(--kg-pointer-x,50%)_var(--kg-pointer-y,50%),var(--kg-pointer-light-color,color-mix(in_oklab,var(--kg-paper-sage)_70%,transparent)),transparent_70%)]",
  "after:transition-opacity after:duration-(--kg-duration-slow) after:ease-kg-out",
  "data-[pointer=in]:after:opacity-(--kg-pointer-light-intensity)",
  "data-[blend=soft-light]:after:mix-blend-soft-light data-[blend=overlay]:after:mix-blend-overlay",
  "data-[blend=plus-lighter]:after:mix-blend-plus-lighter data-[blend=screen]:after:mix-blend-screen",
)

/**
 * A light that follows the cursor over any surface: an image, a chart, a panel. Unlike a
 * spotlight card it brings no styling of its own and sits over the content, not behind it.
 * One style write per frame, no re-renders.
 */
export const PointerLight = forwardRef<HTMLDivElement, PointerLightProps>(
  (
    {
      color,
      size = 280,
      intensity = 1,
      blend = "normal",
      asChild = false,
      className,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    usePointerVars(local)
    const Component = asChild ? Slot : "div"

    return (
      <Component
        ref={ref}
        className={cx(lightClass, className)}
        data-blend={blend}
        style={
          {
            ...(color ? { "--kg-pointer-light-color": color } : null),
            "--kg-pointer-light-size": `${Math.max(size, 0)}px`,
            "--kg-pointer-light-intensity": Math.min(Math.max(intensity, 0), 1),
            ...style,
          } as CSSProperties
        }
        {...props}
      />
    )
  },
)

PointerLight.displayName = "PointerLight"
