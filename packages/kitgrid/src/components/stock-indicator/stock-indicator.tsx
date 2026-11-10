import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { variants } from "../../utils/variants.js"
import { clamp } from "../../utils/math.js"

export type StockIndicatorStatus =
  "in-stock" | "low-stock" | "out-of-stock" | "backorder" | "preorder"
export type StockIndicatorSize = "sm" | "md"

export interface StockIndicatorLabels {
  inStock?: string
  /** Receives the quantity when it is known. */
  lowStock?: (quantity: number | undefined) => string
  outOfStock?: string
  backorder?: string
  preorder?: string
}

export interface StockIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  /** Units on hand. Derives the status unless `status` is given. */
  quantity?: number
  /** At or below this many units the item counts as low stock. */
  lowStockThreshold?: number
  status?: StockIndicatorStatus
  /** Show a small bar of how much stock is left. */
  showBar?: boolean
  /** Quantity that fills the bar. Defaults to twice the low-stock threshold. */
  barMax?: number
  size?: StockIndicatorSize
  labels?: StockIndicatorLabels
  /** Replaces the status text, e.g. a delivery promise. */
  children?: ReactNode
}

const defaultLabels: Required<StockIndicatorLabels> = {
  inStock: "In stock, ready to ship",
  lowStock: (quantity) =>
    quantity === undefined ? "Low stock" : `Only ${quantity} left`,
  outOfStock: "Out of stock",
  backorder: "Ships in 2-3 weeks",
  preorder: "Pre-order now",
}

export const getStockStatus = (
  quantity: number,
  lowStockThreshold = 5,
): StockIndicatorStatus =>
  quantity <= 0
    ? "out-of-stock"
    : quantity <= lowStockThreshold
      ? "low-stock"
      : "in-stock"

const fallbackLevel: Record<StockIndicatorStatus, number> = {
  "in-stock": 1,
  "low-stock": 0.2,
  "out-of-stock": 0,
  backorder: 0,
  preorder: 0,
}

const indicatorVariants = variants({
  base: [
    "kg-stock-indicator inline-grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-1.5 leading-[1.3] font-[550]",
    "[--_text-color:color-mix(in_oklab,var(--_tone),var(--kg-fg)_35%)] text-(--_text-color)",
  ],
  variants: {
    status: {
      "in-stock": "[--_tone:var(--kg-success)]",
      "low-stock": "[--_tone:var(--kg-warning)] [--_text-color:color-mix(in_oklab,var(--kg-warning),var(--kg-fg)_55%)]",
      "out-of-stock": "[--_tone:transparent] [--_text-color:var(--kg-fg-muted)]",
      backorder: "[--_tone:var(--kg-info)]",
      preorder: "[--_tone:var(--kg-accent)]",
    },
    size: {
      sm: "text-kg-xs [--_dot:0.5rem]",
      md: "text-kg-sm [--_dot:0.625rem]",
    },
  },
  defaults: { status: "in-stock", size: "md" },
})

/** Availability as a colored dot plus words, so color is never the only signal. Server-safe. */
export const StockIndicator = forwardRef<HTMLSpanElement, StockIndicatorProps>(
  (
    {
      quantity,
      lowStockThreshold = 5,
      status: statusProp,
      showBar = false,
      barMax,
      size = "md",
      labels,
      className,
      children,
      style,
      ...props
    },
    ref,
  ) => {
    const text = { ...defaultLabels, ...labels }
    const status =
      statusProp ??
      (quantity === undefined
        ? "in-stock"
        : getStockStatus(quantity, lowStockThreshold))
    const messages: Record<StockIndicatorStatus, string> = {
      "in-stock": text.inStock,
      "low-stock": text.lowStock(quantity),
      "out-of-stock": text.outOfStock,
      backorder: text.backorder,
      preorder: text.preorder,
    }
    const level =
      quantity === undefined
        ? fallbackLevel[status]
        : clamp(quantity / (barMax ?? lowStockThreshold * 2), 0, 1)

    return (
      <span
        ref={ref}
        className={indicatorVariants({ status, size, className })}
        data-status={status}
        data-size={size}
        style={showBar ? ({ "--_level": level, ...style } as CSSProperties) : style}
        {...props}
      >
        <span
          className="kg-stock-indicator__dot relative size-(--_dot) rounded-full border-[1.5px] border-kg-ink bg-(--_tone)"
          aria-hidden="true"
        />
        <span className="kg-stock-indicator__text">
          {children ?? messages[status]}
        </span>
        {showBar && (
          <span
            className="kg-stock-indicator__bar col-span-full block h-2 w-full min-w-24 overflow-hidden rounded-full border-[1.5px] border-kg-ink bg-kg-surface"
            aria-hidden="true"
          >
            <span className="kg-stock-indicator__fill block h-full origin-left scale-x-[var(--_level,1)] bg-(--_tone) transition-[scale] duration-(--kg-duration-slower) ease-kg-out rtl:origin-right" />
          </span>
        )}
      </span>
    )
  },
)

StockIndicator.displayName = "StockIndicator"
