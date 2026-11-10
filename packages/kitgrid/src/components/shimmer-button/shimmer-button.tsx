"use client"

import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  forwardRef,
  useRef,
} from "react"
import { Slot } from "../../primitives/slot.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { variants } from "../../utils/variants.js"
import { usePlayback } from "../marquee/use-playback.js"

/* A raised ink sheet like Button's solid variant; the light runs just inside its border. */
const shimmerButtonVariants = variants({
  base: [
    "kg-shimmer-button relative isolate inline-flex items-center justify-center gap-2 overflow-hidden",
    "rounded-[var(--kg-shimmer-radius,var(--kg-radius-full))] border-2 border-kg-ink",
    "bg-[var(--kg-shimmer-bg,var(--kg-ink))] text-[var(--kg-shimmer-fg,var(--kg-surface))]",
    "[--_shimmer:var(--kg-shimmer-color,var(--kg-paper-butter))] [--_lift:var(--kg-paper-sage)]",
    "font-semibold leading-none tracking-[-0.005em] whitespace-nowrap no-underline select-none cursor-pointer [-webkit-tap-highlight-color:transparent]",
    "shadow-[3px_3px_0_var(--_lift)] transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
    "interactive:hover:-translate-px interactive:hover:shadow-[5px_5px_0_var(--_lift)]",
    "interactive:active:translate-x-[3px] interactive:active:translate-y-[3px] interactive:active:shadow-none",
    "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-kg-ring",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
    "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:shadow-none",
    "[&_svg]:size-[1.15em] [&_svg]:shrink-0",
  ],
  variants: {
    size: {
      sm: "h-kg-sm px-3.5 text-kg-sm",
      md: "h-kg-md px-5 text-kg-base",
      lg: "h-kg-lg px-7 text-kg-md",
    },
  },
  defaults: { size: "md" },
})

export type ShimmerButtonSize = "sm" | "md" | "lg"

export interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Colour of the travelling light. Any CSS colour; defaults to the butter paper. */
  shimmerColor?: string
  /** Seconds for one lap of the light around the border. */
  duration?: number
  /** Surface colour. Defaults to the ink, which inverts with the theme. */
  background?: string
  /** Corner radius: px, or any CSS length. Defaults to a pill. */
  radius?: number | string
  size?: ShimmerButtonSize
  /** Render the child element (e.g. a router link) with the effect, not a <button>. */
  asChild?: boolean
}

const toLength = (value: number | string) =>
  typeof value === "number" ? `${value}px` : value

/**
 * A call-to-action whose border carries a travelling light, with a sheen sweeping across the
 * surface. CSS-only animation that pauses offscreen and turns static under
 * reduced motion.
 */
export const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor,
      duration = 3,
      background,
      radius,
      size = "md",
      asChild = false,
      className,
      style,
      type,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLButtonElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const playing = usePlayback(local)

    const shared = {
      className: shimmerButtonVariants({ size, className }),
      "data-size": size,
      "data-paused": !playing || undefined,
      style: {
        "--kg-shimmer-duration": `${duration}s`,
        ...(shimmerColor ? { "--kg-shimmer-color": shimmerColor } : null),
        ...(background ? { "--kg-shimmer-bg": background } : null),
        ...(radius !== undefined
          ? { "--kg-shimmer-radius": toLength(radius) }
          : null),
        ...style,
      } as CSSProperties,
    }

    if (asChild) {
      return (
        <Slot ref={ref} {...shared} {...props}>
          {children}
        </Slot>
      )
    }

    return (
      <button ref={ref} type={type ?? "button"} {...shared} {...props}>
        {children}
      </button>
    )
  },
)

ShimmerButton.displayName = "ShimmerButton"
