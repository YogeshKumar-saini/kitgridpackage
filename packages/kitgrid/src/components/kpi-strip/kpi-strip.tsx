import { Children, type CSSProperties, forwardRef, type HTMLAttributes } from "react"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Every item draws its rule on its leading and top edges and is pulled 1px out, so the strip's
 * overflow clips the rules of the first column and row wherever wrapping puts them.
 */
const kpiStripVariants = variants({
  base: "kg-kpi-strip m-0 flex list-none flex-wrap overflow-hidden p-0",
  variants: {
    density: {
      compact: "[--_pad:calc(var(--kg-space)*3)]",
      default: "[--_pad:calc(var(--kg-space)*5)]",
      comfortable: "[--_pad:calc(var(--kg-space)*7)]",
    },
  },
  defaults: { density: "default" },
})

export type KpiStripDensity = NonNullable<VariantProps<typeof kpiStripVariants>["density"]>

export interface KpiStripProps extends HTMLAttributes<HTMLUListElement> {
  /** Names the group for assistive tech, e.g. "Key metrics". */
  label?: string
  /** Narrowest an item gets before the strip wraps. Any CSS length. */
  minItemWidth?: string
  density?: KpiStripDensity
}

/**
 * A row of readouts separated by hairlines. Items wrap when space runs out and the dividers
 * follow the wrap, so no row starts with a stray rule. Server-safe.
 */
export const KpiStrip = forwardRef<HTMLUListElement, KpiStripProps>(
  (
    { label, minItemWidth, density = "default", className, style, children, ...props },
    ref,
  ) => (
    <ul
      ref={ref}
      className={kpiStripVariants({ density, className })}
      aria-label={label}
      data-density={density}
      style={
        minItemWidth
          ? ({ ...style, "--kg-kpi-strip-min": minItemWidth } as CSSProperties)
          : style
      }
      {...props}
    >
      {Children.map(children, (child) =>
        child == null || typeof child === "boolean" ? null : (
          <li className="kg-kpi-strip__item -ms-px -mt-px min-w-0 grow shrink basis-[var(--kg-kpi-strip-min,10rem)] border-s border-t border-kg-border px-(--_pad) py-[calc(var(--_pad)*0.75)]">{child}</li>
        ),
      )}
    </ul>
  ),
)

KpiStrip.displayName = "KpiStrip"
