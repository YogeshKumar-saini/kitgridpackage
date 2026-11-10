import { type CSSProperties, forwardRef, type HTMLAttributes } from "react"
import { cx } from "../../utils/cx.js"

export type ProgressiveBlurSide = "top" | "bottom" | "left" | "right"

export interface ProgressiveBlurProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The edge the blur is strongest at. */
  side?: ProgressiveBlurSide
  /** Depth of the blurred band, as any CSS length. */
  size?: string
  /** Blur at the very edge, in px. */
  strength?: number
  /** Stacked blur steps. More is smoother and costs more to paint. */
  layers?: number
}

const towards: Record<ProgressiveBlurSide, string> = {
  top: "to top",
  bottom: "to bottom",
  left: "to left",
  right: "to right",
}

const placement: Record<ProgressiveBlurSide, string> = {
  top: "inset-x-0 top-0 h-(--_size)",
  bottom: "inset-x-0 bottom-0 h-(--_size)",
  left: "inset-y-0 left-0 w-(--_size)",
  right: "inset-y-0 right-0 w-(--_size)",
}

/**
 * An edge that blurs what scrolls under it more and more toward the side, like a lens
 * falling out of focus. Stacked backdrop filters, each masked to its own band. Place it in
 * a positioned container; server-safe and static.
 */
export const ProgressiveBlur = forwardRef<HTMLDivElement, ProgressiveBlurProps>(
  (
    { side = "bottom", size = "35%", strength = 12, layers = 6, className, style, ...props },
    ref,
  ) => {
    const n = Math.max(2, Math.round(layers))
    const step = 100 / (n + 1)
    return (
      <div
        ref={ref}
        className={cx("kg-progressive-blur pointer-events-none absolute z-1", placement[side], className)}
        data-side={side}
        aria-hidden="true"
        style={{ "--_size": size, ...style } as CSSProperties}
        {...props}
      >
        {Array.from({ length: n }, (_, i) => {
          const blur = strength / 2 ** (n - 1 - i)
          const mask = `linear-gradient(${towards[side]}, transparent ${i * step}%, #000 ${(i + 1) * step}%, #000 ${(i + 2) * step}%, transparent ${Math.min((i + 3) * step, 100)}%)`
          const last = i === n - 1
          return (
            <span
              key={i}
              className="kg-progressive-blur__layer absolute inset-0"
              style={{
                backdropFilter: `blur(${blur.toFixed(2)}px)`,
                WebkitBackdropFilter: `blur(${blur.toFixed(2)}px)`,
                maskImage: last
                  ? `linear-gradient(${towards[side]}, transparent ${i * step}%, #000 ${(i + 1) * step}%)`
                  : mask,
                WebkitMaskImage: last
                  ? `linear-gradient(${towards[side]}, transparent ${i * step}%, #000 ${(i + 1) * step}%)`
                  : mask,
              }}
            />
          )
        })}
      </div>
    )
  },
)

ProgressiveBlur.displayName = "ProgressiveBlur"
