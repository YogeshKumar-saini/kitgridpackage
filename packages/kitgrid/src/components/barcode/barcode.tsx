import { forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"
import { code128Widths, encodeCode128 } from "./code128.js"

export interface BarcodeProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** Printable ASCII. Digit runs are packed two per symbol automatically. */
  value: string
  /** Bar height in px. */
  height?: number
  /** Width of the narrowest bar in px. */
  moduleWidth?: number
  /** Prints the value under the bars. */
  showValue?: boolean
  /** Quiet zone on each side, in modules. The spec asks for at least 10. */
  quietZone?: number
  /** Accessible name. Defaults to “Barcode: <value>”. */
  label?: string
}

/** A Code 128 barcode as crisp SVG, encoded without dependencies. Server-safe. */
export const Barcode = forwardRef<HTMLElement, BarcodeProps>(
  (
    {
      value,
      height = 64,
      moduleWidth = 2,
      showValue = true,
      quietZone = 10,
      label,
      className,
      ...props
    },
    ref,
  ) => {
    let widths: number[] = []
    let invalid = false
    try {
      widths = code128Widths(encodeCode128(value))
    } catch {
      invalid = true
    }
    const modules = widths.reduce((sum, width) => sum + width, 0) + quietZone * 2
    let x = quietZone
    let d = ""
    widths.forEach((width, index) => {
      if (index % 2 === 0) d += `M${x} 0h${width}v1h-${width}z`
      x += width
    })

    return (
      <figure
        ref={ref}
        className={cx(
          "kg-barcode m-0 inline-grid justify-items-center gap-1 rounded-kg-md bg-(--_paper) pt-2 pb-1.5 [--_ink:var(--kg-barcode-ink,var(--kg-fg))] [--_paper:var(--kg-barcode-paper,var(--kg-surface-raised))]",
          className,
        )}
        data-theme="light"
        data-invalid={invalid || undefined}
        {...props}
      >
        {invalid ? (
          <span className="kg-barcode__error p-3 font-kg-mono text-kg-xs text-kg-danger" role="img" aria-label={label ?? `Barcode: ${value}`}>
            {value}
          </span>
        ) : (
          <svg
            role="img"
            aria-label={label ?? `Barcode: ${value}`}
            viewBox={`0 0 ${modules} 1`}
            preserveAspectRatio="none"
            width={modules * moduleWidth}
            height={height}
            shapeRendering="crispEdges"
            className="kg-barcode__bars block max-w-full"
          >
            <rect className="kg-barcode__paper fill-(--_paper)" width={modules} height={1} />
            <path className="kg-barcode__ink fill-(--_ink)" d={d} />
          </svg>
        )}
        {showValue && !invalid && (
          <figcaption className="kg-barcode__value font-kg-mono text-kg-xs tracking-[0.18em] text-(--_ink)" aria-hidden="true">
            {value}
          </figcaption>
        )}
      </figure>
    )
  },
)
Barcode.displayName = "Barcode"
