import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { variants } from "../../utils/variants.js"

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Backdrop blur radius, in px. */
  blur?: number
  /** How much of the surface color tints the glass, 0–1. */
  tint?: number
  /** Fine film grain over the glass, which hides blur banding on large panels. */
  grain?: boolean
  /** Corner radius scale. */
  radius?: "lg" | "xl" | "2xl"
  children?: ReactNode
}

const GRAIN =
  `url("data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>" +
      "<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>" +
      "<feColorMatrix type='saturate' values='0'/></filter>" +
      "<rect width='100%' height='100%' filter='url(#g)'/></svg>",
  )}")`

export const glassPanelVariants = variants({
  base: [
    "kg-glass-panel relative isolate border text-kg-fg",
    "border-[color-mix(in_oklab,var(--kg-border)_70%,transparent)]",
    "bg-[color-mix(in_oklab,var(--kg-surface)_var(--kg-glass-panel-tint,55%),transparent)]",
    "backdrop-blur-[var(--kg-glass-panel-blur,18px)] backdrop-saturate-150",
    "shadow-[inset_0_1px_0_0_color-mix(in_oklab,var(--kg-surface)_40%,transparent),0_24px_48px_-28px_color-mix(in_oklab,var(--kg-ink)_45%,transparent)]",
    "before:pointer-events-none before:absolute before:-inset-px before:-z-1 before:rounded-[inherit] before:p-px",
    "data-grain:after:pointer-events-none data-grain:after:absolute data-grain:after:inset-0 data-grain:after:-z-1",
    "data-grain:after:rounded-[inherit] data-grain:after:bg-(image:--kg-glass-panel-grain) data-grain:after:bg-size-[160px]",
    "data-grain:after:opacity-[0.06] data-grain:after:mix-blend-overlay data-grain:after:content-['']",
  ],
  variants: {
    radius: {
      lg: "rounded-kg-lg",
      xl: "rounded-kg-xl",
      "2xl": "rounded-kg-2xl",
    },
  },
  defaults: { radius: "xl" },
})

/**
 * A frosted glass surface: backdrop blur with saturation, a surface tint, a hairline edge that
 * catches light along the top and an optional grain. The building block for panels laid over
 * any of the backgrounds. Server-component safe.
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      blur = 18,
      tint = 0.55,
      grain = false,
      radius = "xl",
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={glassPanelVariants({ radius, className })}
      data-radius={radius}
      data-grain={grain || undefined}
      style={
        {
          "--kg-glass-panel-blur": `${Math.max(blur, 0)}px`,
          "--kg-glass-panel-tint": `${Math.round(Math.min(Math.max(tint, 0), 1) * 100)}%`,
          ...(grain ? { "--kg-glass-panel-grain": GRAIN } : null),
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  ),
)

GlassPanel.displayName = "GlassPanel"
