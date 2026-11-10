import { forwardRef, type HTMLAttributes } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Each child resets the span properties first, so a nested grid never inherits its parent cell
 * span, then reads its own from `data-span`, `data-span-md` and `data-row-span`.
 */
const spans = [
  "*:col-span-full *:min-w-0 *:[--_lg:initial] *:[--_md:initial] *:[--_md-auto:initial] *:[--_rows:initial]",
  "*:[grid-row:span_var(--_rows,1)] *:[--_md-cols:var(--_md,var(--_md-auto,12))] *:[--_lg-cols:var(--_lg,12)]",
  "@min-[40rem]/kg-panel-grid:*:col-span-(--_md-cols) @min-[64rem]/kg-panel-grid:*:col-span-(--_lg-cols)",
  "*:data-[span=1]:[--_lg:1] *:data-[span=2]:[--_lg:2] *:data-[span=3]:[--_lg:3] *:data-[span=4]:[--_lg:4]",
  "*:data-[span=5]:[--_lg:5] *:data-[span=6]:[--_lg:6] *:data-[span=7]:[--_lg:7] *:data-[span=8]:[--_lg:8]",
  "*:data-[span=9]:[--_lg:9] *:data-[span=10]:[--_lg:10] *:data-[span=11]:[--_lg:11] *:data-[span=12]:[--_lg:12] *:data-[span=full]:[--_lg:12]",
  "*:data-[span=1]:[--_md-auto:6] *:data-[span=2]:[--_md-auto:6] *:data-[span=3]:[--_md-auto:6]",
  "*:data-[span=4]:[--_md-auto:6] *:data-[span=5]:[--_md-auto:6] *:data-[span=6]:[--_md-auto:6]",
  "*:data-[span=7]:[--_md-auto:12] *:data-[span=8]:[--_md-auto:12] *:data-[span=9]:[--_md-auto:12]",
  "*:data-[span=10]:[--_md-auto:12] *:data-[span=11]:[--_md-auto:12] *:data-[span=12]:[--_md-auto:12] *:data-[span=full]:[--_md-auto:12]",
  "*:data-[span-md=1]:[--_md:1] *:data-[span-md=2]:[--_md:2] *:data-[span-md=3]:[--_md:3] *:data-[span-md=4]:[--_md:4]",
  "*:data-[span-md=5]:[--_md:5] *:data-[span-md=6]:[--_md:6] *:data-[span-md=7]:[--_md:7] *:data-[span-md=8]:[--_md:8]",
  "*:data-[span-md=9]:[--_md:9] *:data-[span-md=10]:[--_md:10] *:data-[span-md=11]:[--_md:11] *:data-[span-md=12]:[--_md:12] *:data-[span-md=full]:[--_md:12]",
  "*:data-[row-span=2]:[--_rows:2] *:data-[row-span=3]:[--_rows:3]",
]

const panelGridVariants = variants({
  base: [
    "kg-panel-grid @container/kg-panel-grid grid min-w-0 grid-flow-row-dense grid-cols-12 empty:hidden",
    spans,
  ],
  variants: {
    variant: {
      spaced: "",
      // Paper Layers: one ink seam between panels. The grid paints the seams, each child covers its cell.
      seam: [
        "gap-[2px] overflow-clip rounded-kg-xl border-2 border-kg-ink bg-kg-ink shadow-kg-sm",
        "*:rounded-none *:border-0 *:shadow-none",
      ],
    },
    gap: {
      sm: "",
      md: "",
      lg: "",
    },
  },
  compound: [
    { variant: "spaced", gap: "sm", class: "gap-2.5" },
    { variant: "spaced", gap: "md", class: "gap-4" },
    { variant: "spaced", gap: "lg", class: "gap-6" },
  ],
  defaults: { variant: "spaced", gap: "md" },
})

type PanelGridVariantProps = VariantProps<typeof panelGridVariants>
export type PanelGridVariant = NonNullable<PanelGridVariantProps["variant"]>
export type PanelGridGap = NonNullable<PanelGridVariantProps["gap"]>

export interface PanelGridProps extends HTMLAttributes<HTMLDivElement> {
  /** `spaced` floats panels on the page; `seam` joins them with one ink seam, like a print plate. */
  variant?: PanelGridVariant
  gap?: PanelGridGap
}

/**
 * A 12-column dashboard grid that responds to its own width, not the viewport's, so it works
 * the same in a sidebar layout, a dialog or a full page. Children choose their columns with
 * `data-span` (wide containers) and `data-span-md` (medium); `Panel` sets both from its `span`
 * props. Below 40rem every child takes the full row. Server-safe.
 */
export const PanelGrid = forwardRef<HTMLDivElement, PanelGridProps>(
  ({ variant = "spaced", gap = "md", className, ...props }, ref) => (
    <div
      ref={ref}
      className={panelGridVariants({ variant, gap, className })}
      data-variant={variant}
      data-gap={gap}
      {...props}
    />
  ),
)

PanelGrid.displayName = "PanelGrid"
