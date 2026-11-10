import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { variants } from "../../utils/variants.js"

/*
 * Paper Layers: pairs sit on the page split by ink hairlines; `bordered` is a sheet with an
 * ink edge, `striped` lays sage paper behind every other pair.
 */
const listVariants = variants({
  base: "kg-description-list @container m-0 grid text-kg-base text-kg-fg [--_term:9rem]",
  variants: {
    layout: {
      grid: "grid-cols-[repeat(var(--_columns),minmax(0,1fr))] gap-x-6 gap-y-5",
      inline: "grid-cols-1",
      stacked: "grid-cols-1",
    },
    variant: {
      plain: "",
      bordered: "gap-0 overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-surface shadow-kg-xs",
      striped: "",
    },
  },
  defaults: { layout: "grid", variant: "plain" },
})

const itemVariants = variants({
  base: "kg-description-list__item grid min-w-0 gap-1",
  variants: {
    layout: {
      grid: "col-span-(--_span,1) @max-[30rem]:col-[1/-1]",
      inline: "grid-cols-[var(--_term)_minmax(0,1fr)] items-baseline gap-4 py-3 @max-[30rem]:grid-cols-1 @max-[30rem]:gap-1",
      stacked: "py-3",
    },
    variant: {
      plain: "",
      bordered: "px-4 py-3.5 shadow-[inset_-1px_0_0_color-mix(in_oklab,var(--kg-ink)_25%,transparent),inset_0_-1px_0_color-mix(in_oklab,var(--kg-ink)_25%,transparent)]",
      striped: "rounded-kg-md px-3 odd:bg-kg-paper-sage",
    },
  },
  defaults: { layout: "grid", variant: "plain" },
  compound: [
    { layout: "inline", variant: "plain", class: "[&+&]:border-t [&+&]:border-kg-ink/25" },
    { layout: "stacked", variant: "plain", class: "[&+&]:border-t [&+&]:border-kg-ink/25" },
  ],
})

export type DescriptionListLayout = "grid" | "inline" | "stacked"
export type DescriptionListVariant = "plain" | "bordered" | "striped"

export interface DescriptionListItem {
  term: ReactNode
  description: ReactNode
  /** Columns this pair spans in the grid layout. */
  span?: number
  key?: string
}

export interface DescriptionListProps extends HTMLAttributes<HTMLDListElement> {
  items: DescriptionListItem[]
  /** `grid` lays pairs in columns, `inline` puts term and value on one row, `stacked` one under another. */
  layout?: DescriptionListLayout
  variant?: DescriptionListVariant
  /** Grid columns at full width. Collapses to one column on narrow containers. */
  columns?: number
  /** Width of the term column in the inline layout. */
  termWidth?: string
}

/** Labelled values in a semantic `<dl>`, grouped per pair so each term stays with its value. */
export const DescriptionList = forwardRef<HTMLDListElement, DescriptionListProps>(
  (
    {
      items,
      layout = "grid",
      variant = "plain",
      columns = 3,
      termWidth,
      className,
      style,
      ...props
    },
    ref,
  ) => (
    <dl
      ref={ref}
      className={listVariants({ layout, variant, className })}
      data-layout={layout}
      data-variant={variant}
      style={
        {
          "--_columns": columns,
          ...(termWidth ? { "--_term": termWidth } : null),
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {items.map((item, index) => (
        <div
          key={item.key ?? index}
          className={itemVariants({ layout, variant })}
          style={
            item.span && layout === "grid"
              ? ({ "--_span": Math.min(item.span, columns) } as CSSProperties)
              : undefined
          }
        >
          <dt className={`kg-description-list__term text-kg-sm font-medium ${variant === "striped" ? "text-kg-fg" : "text-kg-fg-muted"}`}>{item.term}</dt>
          <dd className="kg-description-list__description m-0 min-w-0 font-medium tabular-nums [overflow-wrap:anywhere]">{item.description}</dd>
        </div>
      ))}
    </dl>
  ),
)
DescriptionList.displayName = "DescriptionList"
