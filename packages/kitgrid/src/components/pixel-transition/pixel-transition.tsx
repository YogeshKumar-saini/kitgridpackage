"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { cx } from "../../utils/cx.js"

export interface PixelTransitionProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** What shows at rest. */
  first: ReactNode
  /** What the pixels reveal on hover, focus or tap. */
  second: ReactNode
  /** Pixels per side of the grid. */
  gridSize?: number
  /** Total time for the cover and the reveal, in ms. */
  duration?: number
  /** Show `second` without interaction, for controlled use. */
  active?: boolean
}

const noise = (n: number) => {
  const s = Math.sin(n * 78.233 + 12.9898) * 43758.5453
  return s - Math.floor(s)
}

/**
 * Swaps two faces of a card through a field of pixels that flicker on in random order, then
 * off again over the new face. Tapping toggles on touch screens; reduced motion swaps
 * instantly.
 */
export const PixelTransition = forwardRef<HTMLDivElement, PixelTransitionProps>(
  (
    {
      first,
      second,
      gridSize = 8,
      duration = 520,
      active: activeProp,
      className,
      style,
      onPointerEnter,
      onPointerLeave,
      onFocus,
      onBlur,
      onClick,
      ...props
    },
    ref,
  ) => {
    const reduced = useReducedMotion()
    const [hovered, setHovered] = useState(false)
    const want = activeProp ?? hovered
    const [shown, setShown] = useState(want)
    const [phase, setPhase] = useState<"idle" | "cover" | "reveal">("idle")
    const touch = useRef(false)
    const pixels = useMemo(
      () => Array.from({ length: gridSize * gridSize }, (_, i) => noise(i)),
      [gridSize],
    )

    useEffect(() => {
      if (want === shown) return
      if (reduced) {
        setShown(want)
        setPhase("idle")
        return
      }
      setPhase("cover")
      const half = duration / 2
      const swap = window.setTimeout(() => {
        setShown(want)
        setPhase("reveal")
      }, half)
      const end = window.setTimeout(() => setPhase("idle"), duration + 40)
      return () => {
        window.clearTimeout(swap)
        window.clearTimeout(end)
      }
    }, [want, shown, reduced, duration])

    return (
      <div
        ref={ref}
        className={cx(
          "kg-pixel-transition group/pixel relative grid overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-surface shadow-kg-md [--_pixel:var(--kg-pixel-transition-color,var(--kg-paper-sage))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
          className,
        )}
        data-state={shown ? "second" : "first"}
        data-phase={phase}
        tabIndex={0}
        style={
          {
            "--_grid": gridSize,
            "--_half": `${duration / 2}ms`,
            ...style,
          } as CSSProperties
        }
        onPointerEnter={(event) => {
          onPointerEnter?.(event)
          touch.current = event.pointerType === "touch"
          if (!touch.current) setHovered(true)
        }}
        onPointerLeave={(event) => {
          onPointerLeave?.(event)
          if (event.pointerType !== "touch") setHovered(false)
        }}
        onFocus={(event) => {
          onFocus?.(event)
          setHovered(true)
        }}
        onBlur={(event) => {
          onBlur?.(event)
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHovered(false)
        }}
        onClick={(event) => {
          onClick?.(event)
          if (touch.current) setHovered((value) => !value)
        }}
        {...props}
      >
        <div
          className="kg-pixel-transition__face min-w-0 [grid-area:1/1] [&>img]:block [&>img]:size-full [&>img]:object-cover group-data-[state=second]/pixel:invisible"
          aria-hidden={shown || undefined}
        >
          {first}
        </div>
        <div
          className="kg-pixel-transition__face min-w-0 [grid-area:1/1] [&>img]:block [&>img]:size-full [&>img]:object-cover group-data-[state=first]/pixel:invisible"
          data-face="second"
          aria-hidden={!shown || undefined}
        >
          {second}
        </div>
        <div
          className="kg-pixel-transition__grid pointer-events-none absolute inset-0 grid grid-cols-[repeat(var(--_grid),1fr)] grid-rows-[repeat(var(--_grid),1fr)]"
          aria-hidden="true"
        >
          {pixels.map((delay, i) => (
            <span
              key={i}
              className="kg-pixel-transition__pixel -m-[0.5px] bg-(--_pixel) opacity-0 group-data-[phase=cover]/pixel:opacity-100 group-data-[phase=cover]/pixel:[transition:opacity_40ms_linear_calc(var(--_d)_*_var(--_half)_*_0.85)] group-data-[phase=reveal]/pixel:[transition:opacity_40ms_linear_calc(var(--_d)_*_var(--_half)_*_0.85)]"
              style={{ "--_d": delay.toFixed(3) } as CSSProperties}
            />
          ))}
        </div>
      </div>
    )
  },
)

PixelTransition.displayName = "PixelTransition"
