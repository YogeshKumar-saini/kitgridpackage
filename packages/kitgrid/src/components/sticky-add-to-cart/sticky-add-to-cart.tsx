"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { type VariantProps, variants } from "../../utils/variants.js"
import { Button } from "../button/button.js"
import { Price } from "../price/price.js"

/*
 * Paper Layers: the bar is one white sheet on an ink edge and offset. Closed, it slides out past
 * its own edge (--_shift) and fades, so only translate and opacity move.
 */
export const stickyAddToCartVariants = variants({
  base: [
    "kg-sticky-atc z-(--kg-z-sticky) text-kg-fg",
    "transition-[translate,opacity] duration-[var(--kg-duration-slow)] ease-kg-out",
    "data-[state=closed]:pointer-events-none data-[state=closed]:translate-y-(--_shift) data-[state=closed]:opacity-0",
  ],
  variants: {
    position: {
      bottom: "fixed inset-x-0 bottom-0 p-3 [--_shift:110%]",
      top: "fixed inset-x-0 top-0 p-3 [--_shift:-110%]",
      inline: "relative w-full [--_shift:110%]",
    },
  },
  defaults: { position: "bottom" },
})

export type StickyAddToCartPosition = NonNullable<
  VariantProps<typeof stickyAddToCartVariants>["position"]
>

export interface StickyAddToCartProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  image?: string
  price: number
  compareAt?: number
  currency?: string
  locale?: string
  /** Chosen options, e.g. "Sage / M". */
  variant?: ReactNode
  /**
   * The page's main buy button. The bar shows once it scrolls out of view above the viewport
   * and hides again when it returns. Ignored when `visible` is set.
   */
  target?: RefObject<Element | null>
  visible?: boolean
  /** `inline` renders in flow, for previews. */
  position?: StickyAddToCartPosition
  onAdd?: () => void
  loading?: boolean
  disabled?: boolean
  actionLabel?: ReactNode
  /** Accessible name of the bar. */
  label?: string
}

/** A slim bar that keeps the buy button in reach once the shopper scrolls past the real one. */
export const StickyAddToCart = forwardRef<HTMLDivElement, StickyAddToCartProps>(
  (
    {
      name,
      image,
      price,
      compareAt,
      currency = "USD",
      locale,
      variant,
      target,
      visible: visibleProp,
      position = "bottom",
      onAdd,
      loading = false,
      disabled = false,
      actionLabel = "Add to cart",
      label = "Quick add to cart",
      className,
      ...props
    },
    ref,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const composed = useComposedRefs(local, ref)
    const [scrolledPast, setScrolledPast] = useState(false)
    const visible = visibleProp ?? (target ? scrolledPast : true)

    useEffect(() => {
      if (visibleProp !== undefined) return
      const node = target?.current
      if (!node || typeof IntersectionObserver === "undefined") return
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry) return
        // Only once the button has left through the top: not before the shopper reaches it.
        setScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < 0)
      })
      observer.observe(node)
      return () => observer.disconnect()
    }, [target, visibleProp])

    // Hidden bars must leave the tab order; inert is applied directly for React 18 and 19.
    useEffect(() => {
      local.current?.toggleAttribute("inert", !visible)
    }, [visible])

    return (
      <div
        ref={composed}
        role="region"
        aria-label={label}
        aria-hidden={!visible || undefined}
        className={stickyAddToCartVariants({ position, className })}
        data-position={position}
        data-state={visible ? "open" : "closed"}
        {...props}
      >
        <div className="kg-sticky-atc__inner mx-auto flex max-w-[56rem] items-center gap-3 rounded-kg-xl border-2 border-kg-ink bg-kg-surface p-2 shadow-kg-lg">
          <span
            className="kg-sticky-atc__image size-11 shrink-0 overflow-hidden rounded-kg-md border-2 border-kg-ink bg-kg-muted data-placeholder:bg-kg-paper-sage [&>img]:size-full [&>img]:object-cover"
            data-placeholder={image ? undefined : ""}
          >
            {image && <img src={image} alt="" />}
          </span>
          <span className="kg-sticky-atc__info grid min-w-0 flex-1">
            <span className="kg-sticky-atc__name truncate text-kg-sm font-semibold">{name}</span>
            {variant != null && <span className="kg-sticky-atc__variant text-kg-xs text-kg-fg-muted">{variant}</span>}
          </span>
          <Price
            className="kg-sticky-atc__price max-[30rem]:hidden!"
            amount={price}
            compareAt={compareAt}
            currency={currency}
            locale={locale}
            savings={false}
          />
          <Button onClick={onAdd} loading={loading} disabled={disabled}>
            {actionLabel}
          </Button>
        </div>
      </div>
    )
  },
)

StickyAddToCart.displayName = "StickyAddToCart"
