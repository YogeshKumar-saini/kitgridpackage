import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ElementType,
  forwardRef,
  type ReactNode,
} from "react"
import { cx } from "../../utils/cx.js"

export type StarBorderElement = "button" | "a" | "div"

export interface StarBorderProps
  extends ButtonHTMLAttributes<HTMLElement>,
    Omit<AnchorHTMLAttributes<HTMLElement>, keyof ButtonHTMLAttributes<HTMLElement>> {
  children?: ReactNode
  as?: StarBorderElement
  /** One lap of the two light points, in ms. */
  speed?: number
  /** Thickness of the lit edge, in px. */
  thickness?: number
}

/**
 * A pill whose edge is lit by two soft points of light travelling in opposite directions along
 * its top and bottom. Pure CSS and server-safe; the light stops under reduced motion.
 */
export const StarBorder = forwardRef<HTMLElement, StarBorderProps>(
  (
    {
      as = "button",
      speed = 5000,
      thickness = 1,
      type,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const Tag = as as ElementType
    return (
      <Tag
        ref={ref}
        className={cx(
          "kg-star-border relative inline-block overflow-hidden rounded-full border-0 bg-transparent px-0 py-(--_thickness) text-kg-fg no-underline [--_star:var(--kg-star-border-color,var(--kg-ink))] [font:inherit] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring disabled:cursor-not-allowed disabled:opacity-50",
          as === "div" ? "cursor-auto" : "cursor-pointer",
          className,
        )}
        type={as === "button" ? (type ?? "button") : type}
        style={
          {
            "--_speed": `${speed}ms`,
            "--_thickness": `${thickness}px`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <span
          className="kg-star-border__star pointer-events-none absolute h-1/2 w-[300%] rounded-full bg-[radial-gradient(circle,var(--_star),transparent_12%)] opacity-80 motion-reduce:animate-none motion-reduce:opacity-0 [[data-kg-motion=reduce]_&]:animate-none [[data-kg-motion=reduce]_&]:opacity-0 -right-[250%] -bottom-[12px] animate-[kg-star-bottom_var(--_speed)_linear_infinite_alternate]"
          data-edge="bottom"
          aria-hidden="true"
        />
        <span
          className="kg-star-border__star pointer-events-none absolute h-1/2 w-[300%] rounded-full bg-[radial-gradient(circle,var(--_star),transparent_12%)] opacity-80 motion-reduce:animate-none motion-reduce:opacity-0 [[data-kg-motion=reduce]_&]:animate-none [[data-kg-motion=reduce]_&]:opacity-0 -top-[12px] -left-[250%] animate-[kg-star-top_var(--_speed)_linear_infinite_alternate]"
          data-edge="top"
          aria-hidden="true"
        />
        <span className="kg-star-border__inner relative z-1 flex min-h-[var(--kg-control-lg)] items-center justify-center gap-2 rounded-[inherit] border-2 border-kg-ink bg-kg-surface-raised px-6 font-[560]">{children}</span>
      </Tag>
    )
  },
)

StarBorder.displayName = "StarBorder"
