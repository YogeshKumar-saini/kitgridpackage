import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: a product badge is a paper chip with ink text (--_paper). The flag shape is a
 * solid sheet (--_solid / --_solid-fg) with an ink edge and offset, made to sit on an image.
 */
export const productBadgeVariants = variants({
  base: [
    "kg-product-badge inline-flex h-6 items-center gap-[0.35em] px-2.5 whitespace-nowrap",
    "text-kg-xs font-semibold leading-none tracking-[0.02em] tabular-nums",
  ],
  variants: {
    kind: {
      new: "[--_paper:var(--kg-paper-sage)] [--_solid:var(--kg-accent)] [--_solid-fg:var(--kg-accent-fg)]",
      sale: "[--_paper:var(--kg-paper-rose)] [--_solid:var(--kg-danger)] [--_solid-fg:var(--kg-danger-fg)]",
      bestseller: "[--_paper:var(--kg-paper-butter)] [--_solid:var(--kg-accent)] [--_solid-fg:var(--kg-accent-fg)]",
      limited: "[--_paper:var(--kg-paper-peach)] [--_solid:var(--kg-warning)] [--_solid-fg:var(--kg-warning-fg)]",
      "low-stock": "[--_paper:var(--kg-paper-peach)] [--_solid:var(--kg-warning)] [--_solid-fg:var(--kg-warning-fg)]",
      "sold-out": "[--_paper:var(--kg-muted)] [--_solid:var(--kg-fg-muted)] [--_solid-fg:var(--kg-bg)]",
      eco: "[--_paper:var(--kg-paper-sage)] [--_solid:var(--kg-success)] [--_solid-fg:var(--kg-success-fg)]",
      preorder: "[--_paper:var(--kg-paper-sky)] [--_solid:var(--kg-info)] [--_solid-fg:var(--kg-info-fg)]",
      exclusive: "[--_paper:var(--kg-paper-sky)] [--_solid:var(--kg-accent)] [--_solid-fg:var(--kg-accent-fg)]",
    },
    shape: {
      pill: "rounded-full border-2 border-transparent bg-(--_paper) text-kg-fg",
      tag: [
        "rounded-kg-xs bg-(--_paper) pe-3.5 text-kg-fg",
        "[clip-path:polygon(0_0,calc(100%-0.45rem)_0,100%_50%,calc(100%-0.45rem)_100%,0_100%)]",
      ],
      flag: [
        "h-6.5 rounded-s-kg-xs rounded-e-kg-md border-2 border-kg-ink bg-(--_solid) text-(--_solid-fg)",
        "shadow-kg-sm",
      ],
    },
  },
  defaults: { kind: "new", shape: "pill" },
  compound: [{ kind: "sold-out", shape: "pill", class: "text-kg-fg-muted" }],
})

type ProductBadgeVariantProps = VariantProps<typeof productBadgeVariants>
export type ProductBadgeKind = NonNullable<ProductBadgeVariantProps["kind"]>
export type ProductBadgeShape = NonNullable<ProductBadgeVariantProps["shape"]>
export type ProductBadgeGroupPlacement = "top-start" | "top-end" | "bottom-start" | "bottom-end"

export interface ProductBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  kind?: ProductBadgeKind
  /** `tag` has a notched end; `flag` is a solid corner flag for image overlays. */
  shape?: ProductBadgeShape
  /** Text. Defaults to a label for `kind`, e.g. "Bestseller". */
  children?: ReactNode
  icon?: ReactNode
}

const defaults: Record<ProductBadgeKind, string> = {
  new: "New",
  sale: "Sale",
  bestseller: "Bestseller",
  limited: "Limited",
  "low-stock": "Low stock",
  "sold-out": "Sold out",
  eco: "Eco",
  preorder: "Pre-order",
  exclusive: "Online only",
}

/** Merchandising label for product tiles: New, Sale, Bestseller, Sold out and friends. */
export const ProductBadge = forwardRef<HTMLSpanElement, ProductBadgeProps>(
  ({ kind = "new", shape = "pill", children, icon, className, ...props }, ref) => (
    <span
      ref={ref}
      className={productBadgeVariants({ kind, shape, className })}
      data-kind={kind}
      data-shape={shape}
      {...props}
    >
      {icon != null && (
        <span className="kg-product-badge__icon inline-grid [&_svg]:size-[0.85rem]" aria-hidden="true">
          {icon}
        </span>
      )}
      {children ?? defaults[kind]}
    </span>
  ),
)

ProductBadge.displayName = "ProductBadge"

export interface ProductBadgeGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Pins the group over the corner of a positioned parent, such as a product image. */
  placement?: ProductBadgeGroupPlacement
}

const groupVariants = variants({
  base: "kg-product-badge-group flex flex-wrap gap-1.5",
  variants: {
    placement: {
      "top-start": "top-3 start-3 items-start",
      "top-end": "top-3 end-3 items-end",
      "bottom-start": "bottom-3 start-3 items-start",
      "bottom-end": "bottom-3 end-3 items-end",
    },
    pinned: {
      true: "pointer-events-none absolute z-1 flex-col",
      false: "",
    },
  },
})

/** Stacks badges, optionally over a corner of the product image. */
export const ProductBadgeGroup = forwardRef<HTMLDivElement, ProductBadgeGroupProps>(
  ({ placement, className, ...props }, ref) => (
    <div
      ref={ref}
      className={groupVariants({ placement, pinned: placement !== undefined, className })}
      data-placement={placement}
      {...props}
    />
  ),
)

ProductBadgeGroup.displayName = "ProductBadgeGroup"
