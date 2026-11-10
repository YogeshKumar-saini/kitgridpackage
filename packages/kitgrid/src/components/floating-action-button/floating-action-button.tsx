"use client"

import {
  type ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type FloatingActionButtonPlacement =
  | "bottom-end"
  | "bottom-start"
  | "bottom-center"
  | "static"
export type FloatingActionButtonSize = "md" | "lg"
export type FloatingActionButtonVariant = "solid" | "surface"

/* Paper Layers: a round sheet on an offset; hover lifts it further, pressing pushes it flat. */
const fabVariants = variants({
  base: [
    "kg-fab group/fab relative inline-flex items-center justify-center isolate cursor-pointer",
    "[font-family:inherit] text-kg-base font-semibold border-2 border-kg-ink rounded-full [-webkit-tap-highlight-color:transparent]",
    "shadow-[4px_4px_0_var(--_lift,var(--kg-ink))] transition-[translate,box-shadow] duration-(--kg-duration-base) ease-kg-out",
    "interactive:hover:-translate-px interactive:hover:shadow-[6px_6px_0_var(--_lift,var(--kg-ink))]",
    "interactive:active:translate-x-[4px] interactive:active:translate-y-[4px] interactive:active:shadow-none",
    "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-kg-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "data-[placement^=bottom]:fixed data-[placement^=bottom]:z-40 data-[placement^=bottom]:bottom-[max(calc(var(--kg-space)*6),env(safe-area-inset-bottom))]",
    "data-[placement=bottom-end]:end-6 data-[placement=bottom-start]:start-6",
    "data-[placement=bottom-center]:inset-x-0 data-[placement=bottom-center]:mx-auto data-[placement=bottom-center]:w-fit",
  ],
  variants: {
    size: {
      md: "h-[2.75rem] min-w-[2.75rem] px-[0.625rem]",
      lg: "h-[3.5rem] min-w-[3.5rem] px-[1rem]",
    },
    variant: {
      solid: "bg-kg-accent text-kg-accent-fg [--_lift:var(--kg-paper-sage)]",
      surface: "bg-kg-surface text-kg-fg",
    },
  },
  defaults: { size: "lg", variant: "solid" },
})

const labelClass = [
  "kg-fab__label grid grid-cols-[1fr] group-data-collapsed/fab:grid-cols-[0fr] group-data-collapsed/fab:opacity-0",
  "[transition:grid-template-columns_var(--kg-duration-slow)_var(--kg-ease-out),opacity_var(--kg-duration-base)_var(--kg-ease-out)]",
]

export interface FloatingActionButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: ReactNode
  /** Always the accessible name; also shown as text when `extended`. */
  label: string
  extended?: boolean
  /** Fold the extended label away while the page scrolls down, back on scroll up. */
  collapseOnScroll?: boolean
  placement?: FloatingActionButtonPlacement
  size?: FloatingActionButtonSize
  variant?: FloatingActionButtonVariant
}

/** The screen's primary action, pinned to a corner. */
export const FloatingActionButton = forwardRef<
  HTMLButtonElement,
  FloatingActionButtonProps
>(
  (
    {
      icon,
      label,
      extended = false,
      collapseOnScroll = false,
      placement = "bottom-end",
      size = "lg",
      variant = "solid",
      className,
      type,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLButtonElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
      if (!extended || !collapseOnScroll) return
      let last = window.scrollY
      let frame = 0
      const onScroll = () => {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => {
          const y = window.scrollY
          if (Math.abs(y - last) < 6) return
          setCollapsed(y > last && y > 48)
          last = y
        })
      }
      window.addEventListener("scroll", onScroll, { passive: true })
      return () => {
        cancelAnimationFrame(frame)
        window.removeEventListener("scroll", onScroll)
      }
    }, [extended, collapseOnScroll])

    return (
      <button
        ref={ref}
        type={type ?? "button"}
        aria-label={extended ? undefined : label}
        className={fabVariants({ size, variant, className })}
        data-placement={placement}
        data-size={size}
        data-variant={variant}
        data-extended={extended || undefined}
        data-collapsed={(extended && collapsed) || undefined}
        {...props}
      >
        <span className="kg-fab__icon inline-grid size-[1.5rem] place-items-center [&_svg]:size-full" aria-hidden="true">
          {icon}
        </span>
        {extended && (
          <span className={cx(labelClass)}>
            <span className="overflow-hidden ps-2 pe-1 whitespace-nowrap group-data-collapsed/fab:p-0">
              {label}
            </span>
          </span>
        )}
      </button>
    )
  },
)

FloatingActionButton.displayName = "FloatingActionButton"
