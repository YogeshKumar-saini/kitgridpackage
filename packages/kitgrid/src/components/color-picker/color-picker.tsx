"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"
import {
  type ColorPickerHsva,
  hexToHsv,
  hsvToHex,
  luminance,
  parseHex,
} from "./color.js"

export interface ColorPickerLabels {
  area: string
  hue: string
  alpha: string
  hex: string
  eyeDropper: string
  swatches: string
}

export interface ColorPickerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Hex, `#rrggbb` or `#rrggbbaa` with `alpha`. */
  value?: string
  defaultValue?: string
  onValueChange?: (hex: string) => void
  /** Called when a drag ends or a key is released. */
  onValueCommit?: (hex: string) => void
  /** Adds an opacity slider and reports 8-digit hex. */
  alpha?: boolean
  /** Preset colors shown under the controls. */
  swatches?: readonly string[]
  /** Shows the browser eyedropper where it exists. */
  eyeDropper?: boolean
  labels?: Partial<ColorPickerLabels>
  disabled?: boolean
}

const defaultLabels: ColorPickerLabels = {
  area: "Saturation and brightness",
  hue: "Hue",
  alpha: "Opacity",
  hex: "Hex",
  eyeDropper: "Pick from screen",
  swatches: "Presets",
}

interface EyeDropperWindow extends Window {
  EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> }
}

const pct = (n: number) => `${Math.round(n * 100)}%`

// Functional gradient: the checkerboard that shows through translucent colour.
const checker =
  "repeating-conic-gradient(var(--kg-muted) 0 25%, var(--kg-surface) 0 50%) 0 0 / 10px 10px"

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring"

// Paper Layers thumb: a white disc ringed in ink, crisp edge, no blur.
const thumb = cx(
  "kg-color-picker__thumb absolute size-4 -translate-1/2 rounded-full pointer-events-none",
  "border-2 border-kg-surface shadow-[0_0_0_2px_var(--kg-ink)]",
  "transition-[scale] duration-(--kg-duration-base) ease-kg-spring [:active>&]:scale-120",
)

const track = cx(
  "kg-color-picker__track relative h-3.5 rounded-full border-2 border-kg-ink cursor-pointer touch-none",
  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-kg-ring",
)

/** Pointer drag with capture over an element, reporting 0..1 positions. */
const useDrag = (onMove: (x: number, y: number) => void, onEnd: () => void, disabled?: boolean) => {
  const move = useEventCallback(onMove)
  const end = useEventCallback(onEnd)
  const update = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    move(
      clamp((event.clientX - rect.left) / (rect.width || 1), 0, 1),
      clamp((event.clientY - rect.top) / (rect.height || 1), 0, 1),
    )
  }
  return {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled || event.button !== 0) return
      event.preventDefault()
      event.currentTarget.focus()
      event.currentTarget.setPointerCapture?.(event.pointerId)
      update(event)
    },
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) update(event)
    },
    onPointerUp: () => end(),
    onPointerCancel: () => end(),
  }
}

/**
 * A dependency-free color picker: a saturation and brightness area, hue and opacity sliders,
 * a hex field and optional presets. Every part is a keyboard slider with spoken values.
 */
export const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(
  (
    {
      value: valueProp,
      defaultValue = "#e8742a",
      onValueChange,
      onValueCommit,
      alpha = false,
      swatches,
      eyeDropper = true,
      labels: labelsProp,
      disabled = false,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const labels = { ...defaultLabels, ...labelsProp }
    const initial = hexToHsv(valueProp ?? defaultValue) ?? { h: 0, s: 0, v: 0, a: 1 }
    // HSV is the source of truth so hue survives grey and black, which hex can't express.
    const [hsva, setHsva] = useState<ColorPickerHsva>(initial)
    const [draft, setDraft] = useState<string | null>(null)
    const [canDrop, setCanDrop] = useState(false)
    const emitted = useRef(hsvToHex(initial, alpha))

    useEffect(() => {
      setCanDrop(eyeDropper && typeof (window as EyeDropperWindow).EyeDropper === "function")
    }, [eyeDropper])

    useEffect(() => {
      if (valueProp === undefined || valueProp.toLowerCase() === emitted.current) return
      const next = hexToHsv(valueProp)
      if (next) {
        emitted.current = valueProp.toLowerCase()
        setHsva(next)
      }
    }, [valueProp])

    const hex = hsvToHex(hsva, alpha)
    const opaque = hsvToHex({ ...hsva, a: 1 }, false)
    const commit = () => onValueCommit?.(emitted.current)

    const update = (patch: Partial<ColorPickerHsva>) => {
      if (disabled) return
      const next = { ...hsva, ...patch }
      setHsva(next)
      setDraft(null)
      const nextHex = hsvToHex(next, alpha)
      if (nextHex !== emitted.current) {
        emitted.current = nextHex
        onValueChange?.(nextHex)
      }
    }

    const area = useDrag((x, y) => update({ s: x, v: 1 - y }), commit, disabled)
    const hue = useDrag((x) => update({ h: x * 360 }), commit, disabled)
    const opacity = useDrag((x) => update({ a: x }), commit, disabled)

    const keyStep = (event: ReactKeyboardEvent, base: number) =>
      event.shiftKey ? base * 10 : base

    const areaKeys = (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const step = keyStep(event, 0.01)
      const moves: Record<string, Partial<ColorPickerHsva>> = {
        ArrowLeft: { s: clamp(hsva.s - step, 0, 1) },
        ArrowRight: { s: clamp(hsva.s + step, 0, 1) },
        ArrowUp: { v: clamp(hsva.v + step, 0, 1) },
        ArrowDown: { v: clamp(hsva.v - step, 0, 1) },
        PageUp: { v: clamp(hsva.v + 0.1, 0, 1) },
        PageDown: { v: clamp(hsva.v - 0.1, 0, 1) },
        Home: { s: 0 },
        End: { s: 1 },
      }
      const patch = moves[event.key]
      if (!patch) return
      event.preventDefault()
      update(patch)
    }

    const channelKeys =
      (key: "h" | "a", max: number, step: number) =>
      (event: ReactKeyboardEvent<HTMLDivElement>) => {
        const current = hsva[key]
        const s = keyStep(event, step)
        const moves: Record<string, number> = {
          ArrowLeft: current - s,
          ArrowDown: current - s,
          ArrowRight: current + s,
          ArrowUp: current + s,
          PageDown: current - step * 10,
          PageUp: current + step * 10,
          Home: 0,
          End: max,
        }
        const next = moves[event.key]
        if (next === undefined) return
        event.preventDefault()
        update({ [key]: clamp(next, 0, max) })
      }

    const commitDraft = () => {
      if (draft === null) return
      const next = hexToHsv(draft)
      if (next) {
        update(alpha ? next : { ...next, a: 1 })
        commit()
      }
      setDraft(null)
    }

    const pick = async () => {
      const Ctor = (window as EyeDropperWindow).EyeDropper
      if (!Ctor) return
      try {
        const { sRGBHex } = await new Ctor().open()
        const next = hexToHsv(sRGBHex)
        if (next) update({ ...next, a: hsva.a })
      } catch {
        // The person dismissed the eyedropper.
      }
    }

    const vars = {
      ...style,
      "--_color": hex,
      "--_opaque": opaque,
    } as CSSProperties

    return (
      <div
        ref={ref}
        className={cx(
          "kg-color-picker grid grid-cols-[minmax(0,1fr)] gap-3 w-[17rem] max-w-full p-3",
          "bg-kg-surface border-2 border-kg-ink rounded-kg-xl shadow-kg-md",
          "data-disabled:opacity-50 data-disabled:pointer-events-none",
          className,
        )}
        style={vars}
        data-disabled={disabled || undefined}
        {...props}
      >
        <div
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={labels.area}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(hsva.s * 100)}
          aria-valuetext={`Saturation ${pct(hsva.s)}, brightness ${pct(hsva.v)}`}
          aria-disabled={disabled || undefined}
          className={cx(
            "kg-color-picker__area relative aspect-[4/3] rounded-kg-lg border-2 border-kg-ink",
            "cursor-crosshair touch-none",
            focusRing,
          )}
          style={{
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex({ h: hsva.h, s: 1, v: 1, a: 1 }, false)})`,
          }}
          onKeyDown={areaKeys}
          onKeyUp={commit}
          {...area}
        >
          <span
            className={cx(thumb, "bg-(--_opaque)")}
            style={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%` }}
            data-kind="area"
            aria-hidden="true"
          />
        </div>
        <div className="kg-color-picker__row flex items-center gap-3">
          <span
            className="kg-color-picker__preview relative shrink-0 size-9 rounded-full border-2 border-kg-ink overflow-hidden"
            style={{ background: checker }}
            aria-hidden="true"
          >
            <span className="absolute inset-0 bg-(--_color) transition-[background-color] duration-(--kg-duration-fast) ease-kg-out" />
          </span>
          <div className="kg-color-picker__sliders grid gap-2.5 flex-1 min-w-0">
            <div
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={labels.hue}
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(hsva.h)}
              aria-valuetext={`${Math.round(hsva.h)} degrees`}
              aria-disabled={disabled || undefined}
              className={track}
              data-kind="hue"
              style={{
                background:
                  "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
              }}
              onKeyDown={channelKeys("h", 360, 1)}
              onKeyUp={commit}
              {...hue}
            >
              <span
                className={cx(thumb, "top-1/2 bg-kg-surface")}
                style={{ left: `${(hsva.h / 360) * 100}%` }}
                data-kind="hue"
                aria-hidden="true"
              />
            </div>
            {alpha && (
              <div
                role="slider"
                tabIndex={disabled ? -1 : 0}
                aria-label={labels.alpha}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(hsva.a * 100)}
                aria-valuetext={pct(hsva.a)}
                aria-disabled={disabled || undefined}
                className={track}
                style={{ background: checker }}
                data-kind="alpha"
                onKeyDown={channelKeys("a", 1, 0.01)}
                onKeyUp={commit}
                {...opacity}
              >
                <span
                  className="kg-color-picker__alpha-fill absolute inset-0 rounded-[inherit]"
                  style={{ background: `linear-gradient(to right, transparent, ${opaque})` }}
                />
                <span
                  className={cx(thumb, "top-1/2 bg-kg-surface")}
                  style={{ left: `${hsva.a * 100}%` }}
                  data-kind="alpha"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        </div>
        <div className="kg-color-picker__fields flex items-center gap-2">
          <label
            className={cx(
              "kg-color-picker__hex flex items-center flex-1 min-w-0 h-kg-sm px-2.5 cursor-text",
              "bg-kg-surface border-2 border-kg-ink rounded-kg-md",
              "transition-[box-shadow] duration-(--kg-duration-fast) ease-kg-out",
              "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-kg-ring",
              "focus-within:shadow-[3px_3px_0_var(--_lift,var(--kg-ink))]",
              "has-[[aria-invalid=true]]:border-kg-danger has-[[aria-invalid=true]]:[--_lift:var(--kg-danger)]",
            )}
          >
            <span className="kg-color-picker__hex-label text-kg-xs font-semibold text-kg-fg-muted me-2">{labels.hex}</span>
            <input
              type="text"
              spellCheck={false}
              autoComplete="off"
              maxLength={alpha ? 9 : 7}
              disabled={disabled}
              className={cx(
                "kg-color-picker__hex-input flex-1 min-w-0 p-0 border-0 bg-transparent outline-none",
                "font-kg-mono text-kg-sm tracking-[0.04em] text-kg-fg",
                "aria-invalid:text-[color-mix(in_oklab,var(--kg-danger),var(--kg-fg)_30%)]",
              )}
              value={draft ?? hex.toUpperCase()}
              aria-invalid={draft !== null && !parseHex(draft) ? true : undefined}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commitDraft()
                } else if (event.key === "Escape" && draft !== null) {
                  event.preventDefault()
                  setDraft(null)
                }
              }}
            />
          </label>
          {alpha && (
            <span className="kg-color-picker__alpha-readout min-w-11 text-kg-xs tabular-nums text-end text-kg-fg-muted" aria-hidden="true">
              {pct(hsva.a)}
            </span>
          )}
          {canDrop && (
            <button
              type="button"
              className={cx(
                "kg-color-picker__dropper inline-grid place-items-center shrink-0 size-(--kg-control-sm) p-0",
                "text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-kg-md cursor-pointer",
                "transition-[background-color] duration-(--kg-duration-fast) ease-kg-out interactive:hover:bg-kg-muted",
                "disabled:cursor-not-allowed [&_svg]:size-4",
                focusRing,
              )}
              aria-label={labels.eyeDropper}
              disabled={disabled}
              onClick={pick}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path
                  d="m14.5 5.5 4 4M4 20l1-4 9.5-9.5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
        {swatches && swatches.length > 0 && (
          <div className="kg-color-picker__swatches grid grid-cols-[repeat(auto-fill,minmax(1.5rem,1fr))] gap-1.5 pt-3 border-t border-kg-border" role="group" aria-label={labels.swatches}>
            {swatches.map((swatch) => {
              const current = swatch.toLowerCase() === opaque.toLowerCase()
              return (
                <button
                  key={swatch}
                  type="button"
                  className={cx(
                    "kg-color-picker__swatch relative aspect-square p-0 cursor-pointer",
                    "bg-(--_swatch) border-2 border-kg-ink rounded-kg-sm",
                    "transition-[translate,box-shadow] duration-(--kg-duration-fast) ease-kg-out interactive:hover:-translate-y-px",
                    // The offset ring marks the current preset, so colour is not the only signal.
                    "aria-pressed:shadow-[0_0_0_2px_var(--kg-surface),0_0_0_4px_var(--kg-ink)]",
                    "disabled:cursor-not-allowed",
                    focusRing,
                  )}
                  aria-label={swatch.toUpperCase()}
                  aria-pressed={current}
                  data-tone={luminance(swatch) > 0.55 ? "light" : "dark"}
                  disabled={disabled}
                  style={{ "--_swatch": swatch } as CSSProperties}
                  onClick={() => {
                    const next = hexToHsv(swatch)
                    if (next) update({ ...next, a: hsva.a })
                    commit()
                  }}
                />
              )
            })}
          </div>
        )}
      </div>
    )
  },
)

ColorPicker.displayName = "ColorPicker"
