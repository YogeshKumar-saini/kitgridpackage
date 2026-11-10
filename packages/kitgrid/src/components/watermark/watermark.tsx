import { type CSSProperties, forwardRef, type HTMLAttributes, type ReactNode } from "react"
import { cx } from "../../utils/cx.js"

export interface WatermarkProps extends Omit<HTMLAttributes<HTMLDivElement>, "content"> {
  /** One line, or several stacked lines per tile. */
  content: string | string[]
  children?: ReactNode
  /** Degrees. */
  rotate?: number
  /** Space between tiles, in px: [horizontal, vertical]. */
  gap?: [number, number]
  fontSize?: number
  fontWeight?: number
  /** 0 to 1, applied to the theme foreground color. */
  opacity?: number
  /** Covers the whole viewport instead of the wrapped content. */
  fullscreen?: boolean
}

const xml = (text: string) =>
  text.replace(/[<>&'"]/g, (char) => `&#${char.charCodeAt(0)};`)

/**
 * Builds the tile as an SVG mask, so the mark is drawn with theme tokens rather than a color
 * baked into the image, and follows light and dark themes.
 */
const tile = (
  lines: string[],
  rotate: number,
  [gapX, gapY]: [number, number],
  fontSize: number,
  fontWeight: number,
) => {
  const lineHeight = fontSize * 1.35
  const textWidth = Math.max(...lines.map((line) => line.length)) * fontSize * 0.58
  const width = Math.ceil(textWidth + gapX)
  const height = Math.ceil(lines.length * lineHeight + gapY)
  const cx = width / 2
  const cy = height / 2
  const top = cy - ((lines.length - 1) * lineHeight) / 2
  const text = lines
    .map(
      (line, index) =>
        `<text x='${cx}' y='${top + index * lineHeight}' text-anchor='middle' dominant-baseline='middle'>${xml(line)}</text>`,
    )
    .join("")
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'><g transform='rotate(${rotate} ${cx} ${cy})' font-family='system-ui,sans-serif' font-size='${fontSize}' font-weight='${fontWeight}' fill='black'>${text}</g></svg>`
  return { url: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`, width, height }
}

/** Tiles a faint, rotated text mark over its children. The mark is hidden from assistive tech. */
export const Watermark = forwardRef<HTMLDivElement, WatermarkProps>(
  (
    {
      content,
      children,
      rotate = -22,
      gap = [96, 88],
      fontSize = 14,
      fontWeight = 600,
      opacity = 0.09,
      fullscreen = false,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const lines = (Array.isArray(content) ? content : [content]).filter(Boolean)
    const mark = lines.length ? tile(lines, rotate, gap, fontSize, fontWeight) : null
    return (
      <div
        ref={ref}
        className={cx("kg-watermark relative isolate", className)}
        data-fullscreen={fullscreen || undefined}
        style={style}
        {...props}
      >
        {children}
        {mark && (
          <div
            className="kg-watermark__layer pointer-events-none absolute inset-0 z-1 bg-kg-fg opacity-(--_opacity) select-none [mask-image:var(--_mask)] [mask-repeat:repeat] [mask-size:var(--_tile)] [-webkit-mask-image:var(--_mask)] [-webkit-mask-repeat:repeat] [-webkit-mask-size:var(--_tile)] [[data-fullscreen]>&]:fixed [[data-fullscreen]>&]:z-kg-overlay print:opacity-[calc(var(--_opacity)*1.5)] print:[print-color-adjust:exact]"
            aria-hidden="true"
            style={
              {
                "--_mask": mark.url,
                "--_tile": `${mark.width}px ${mark.height}px`,
                "--_opacity": opacity,
              } as CSSProperties
            }
          />
        )}
      </div>
    )
  },
)
Watermark.displayName = "Watermark"
