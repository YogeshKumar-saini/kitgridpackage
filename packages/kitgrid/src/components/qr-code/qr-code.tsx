import { type CSSProperties, forwardRef, type ReactNode, type SVGAttributes } from "react"
import { cx } from "../../utils/cx.js"
import { encodeQr, type QrCodeErrorLevel } from "./encode.js"

export type QrCodeStyle = "square" | "dots" | "rounded"

export interface QrCodeProps extends Omit<SVGAttributes<SVGSVGElement>, "style" | "children"> {
  value: string
  /** Error correction: L 7%, M 15%, Q 25%, H 30%. Defaults to M, or H with an `icon`. */
  level?: QrCodeErrorLevel
  /** Rendered size in px. */
  size?: number
  /** Quiet zone in modules. The spec asks for 4; scanners usually manage with 2. */
  margin?: number
  moduleStyle?: QrCodeStyle
  /** A small mark in the centre. Modules beneath it are cleared. Keep it under ~20% wide. */
  icon?: ReactNode
  /** Fraction of the symbol the icon area takes. */
  iconSize?: number
  /** Accessible name. Defaults to “QR code: <value>”. */
  label?: string
  style?: CSSProperties
}

/** An SVG QR Code from a dependency-free encoder (byte mode, versions 1-40, all ECC levels). */
export const QrCode = forwardRef<SVGSVGElement, QrCodeProps>(
  (
    {
      value,
      level,
      size = 160,
      margin = 2,
      moduleStyle = "square",
      icon,
      iconSize = 0.22,
      label,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const ecc = level ?? (icon ? "H" : "M")
    const matrix = encodeQr(value, ecc)
    const total = matrix.size + margin * 2
    const hole = icon ? Math.ceil(matrix.size * iconSize) | 1 : 0
    const holeStart = Math.floor((matrix.size - hole) / 2)
    const inHole = (x: number, y: number) =>
      hole > 0 &&
      x >= holeStart - 1 &&
      x < holeStart + hole + 1 &&
      y >= holeStart - 1 &&
      y < holeStart + hole + 1

    // Finder patterns are drawn as shapes so `dots` and `rounded` keep crisp, scannable eyes.
    const isFinder = (x: number, y: number) => {
      const s = matrix.size
      return (x < 7 && y < 7) || (x >= s - 7 && y < 7) || (x < 7 && y >= s - 7)
    }

    const path = (() => {
      let d = ""
      for (let y = 0; y < matrix.size; y++) {
        const row = matrix.modules[y] as boolean[]
        for (let x = 0; x < matrix.size; x++) {
          if (!row[x] || isFinder(x, y) || inHole(x, y)) continue
          const px = x + margin
          const py = y + margin
          if (moduleStyle === "dots") {
            d += `M${px + 0.5} ${py + 0.08}a0.42 0.42 0 1 1 0 0.84a0.42 0.42 0 1 1 0-0.84z`
          } else if (moduleStyle === "rounded") {
            d += `M${px + 0.25} ${py}h0.5a0.25 0.25 0 0 1 0.25 0.25v0.5a0.25 0.25 0 0 1-0.25 0.25h-0.5a0.25 0.25 0 0 1-0.25-0.25v-0.5a0.25 0.25 0 0 1 0.25-0.25z`
          } else {
            d += `M${px} ${py}h1v1h-1z`
          }
        }
      }
      return d
    })()

    const eyes = [
      [0, 0],
      [matrix.size - 7, 0],
      [0, matrix.size - 7],
    ].map(([ex, ey]) => [(ex as number) + margin, (ey as number) + margin] as const)
    const r = moduleStyle === "square" ? 0 : 1.6
    const ri = moduleStyle === "square" ? 0 : 0.9

    return (
      <svg
        ref={ref}
        role="img"
        aria-label={label ?? `QR code: ${value}`}
        viewBox={`0 0 ${total} ${total}`}
        width={size}
        height={size}
        shapeRendering={moduleStyle === "square" ? "crispEdges" : undefined}
        className={cx(
          "kg-qr-code block h-auto max-w-full [--_ink:var(--kg-qr-ink,var(--kg-fg))] [--_paper:var(--kg-qr-paper,var(--kg-surface-raised))] [--_eye:var(--kg-qr-eye,var(--_ink))]",
          className,
        )}
        data-theme="light"
        data-style={moduleStyle}
        data-version={matrix.version}
        style={style}
        {...props}
      >
        <rect className="kg-qr-code__paper fill-(--_paper)" width={total} height={total} rx={margin * 0.6} />
        <path className="kg-qr-code__ink fill-(--_ink)" d={path} />
        {eyes.map(([ex, ey]) => (
          <g key={`${ex}-${ey}`} className="kg-qr-code__eye">
            <path
              className="kg-qr-code__ink fill-(--_ink)"
              fillRule="evenodd"
              d={`M${ex + r} ${ey}h${7 - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${7 - 2 * r}a${r} ${r} 0 0 1-${r} ${r}h-${7 - 2 * r}a${r} ${r} 0 0 1-${r}-${r}v-${7 - 2 * r}a${r} ${r} 0 0 1 ${r}-${r}z M${ex + 1 + ri} ${ey + 1}h${5 - 2 * ri}a${ri} ${ri} 0 0 1 ${ri} ${ri}v${5 - 2 * ri}a${ri} ${ri} 0 0 1-${ri} ${ri}h-${5 - 2 * ri}a${ri} ${ri} 0 0 1-${ri}-${ri}v-${5 - 2 * ri}a${ri} ${ri} 0 0 1 ${ri}-${ri}z`}
            />
            <rect
              className="kg-qr-code__pupil fill-(--_eye)"
              x={ex + 2}
              y={ey + 2}
              width={3}
              height={3}
              rx={moduleStyle === "square" ? 0 : 0.8}
            />
          </g>
        ))}
        {icon && (
          <foreignObject
            x={holeStart + margin}
            y={holeStart + margin}
            width={hole}
            height={hole}
          >
            <div className="kg-qr-code__icon grid size-full place-items-center rounded-[22%] bg-(--_paper) text-(--_ink) [&>img]:size-[72%] [&>svg]:size-[72%]">{icon}</div>
          </foreignObject>
        )}
      </svg>
    )
  },
)
QrCode.displayName = "QrCode"
