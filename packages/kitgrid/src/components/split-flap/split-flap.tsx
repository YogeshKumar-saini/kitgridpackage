"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useMemo,
  useRef,
} from "react"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { graphemes } from "../text-reveal/split-text.js"

export interface SplitFlapProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** What the board shows. Changing it flips each cell through the charset to the new glyph. */
  value: string
  /** Pads (or trims) the board to this many cells, so it never changes width. */
  length?: number
  /** The drum each cell flips through, in order. Glyphs outside it are reached in one flip. */
  charset?: string
  /** Time of one flip, in ms. */
  speed?: number
  /** Gap between neighbouring cells starting, in ms. */
  stagger?: number
  /** Announce new values politely, for live departures or scores. */
  live?: boolean
}

const DEFAULT_CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-"

const cellsOf = (value: string, length: number | undefined) => {
  const chars = graphemes(value.toUpperCase())
  if (length === undefined) return chars
  return Array.from({ length }, (_, i) => chars[i] ?? " ")
}

/**
 * A split-flap departure board. Each cell is two halves and two hinged flaps; on change the
 * upper flap falls while the lower one swings down behind it, one glyph at a time.
 */
export const SplitFlap = forwardRef<HTMLSpanElement, SplitFlapProps>(
  (
    {
      value,
      length,
      charset = DEFAULT_CHARSET,
      speed = 70,
      stagger = 25,
      live = false,
      className,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLSpanElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const target = useMemo(() => cellsOf(value, length), [value, length])
    const drum = useMemo(() => graphemes(charset), [charset])
    // The glyph each cell currently shows, which may lag `target` while it flips.
    const shown = useRef<string[]>(target)
    const initial = useRef(target)

    useEffect(() => {
      const root = local.current
      if (!root) return
      const cells = Array.from(root.querySelectorAll<HTMLElement>(".kg-split-flap__cell"))
      const timers: number[] = []
      const parts = (cell: HTMLElement) =>
        Array.from(cell.querySelectorAll<HTMLElement>("[data-part] > span"))

      const paint = (cell: HTMLElement, current: string, next: string) => {
        const [top, bottom, flapTop, flapBottom] = parts(cell)
        if (top) top.textContent = next
        if (bottom) bottom.textContent = current
        if (flapTop) flapTop.textContent = current
        if (flapBottom) flapBottom.textContent = next
      }

      cells.forEach((cell, i) => {
        const goal = target[i] ?? " "
        const from = shown.current[i] ?? " "
        if (reduced || from === goal) {
          paint(cell, goal, goal)
          cell.removeAttribute("data-flipping")
          shown.current[i] = goal
          return
        }
        let current = from
        const advance = () => {
          const at = drum.indexOf(current)
          const next =
            at === -1 || !drum.includes(goal) ? goal : (drum[(at + 1) % drum.length] ?? goal)
          paint(cell, current, next)
          cell.removeAttribute("data-flipping")
          void cell.offsetWidth
          cell.setAttribute("data-flipping", "")
          timers.push(
            window.setTimeout(() => {
              current = next
              shown.current[i] = next
              paint(cell, next, next)
              cell.removeAttribute("data-flipping")
              if (next !== goal) advance()
            }, speed),
          )
        }
        timers.push(window.setTimeout(advance, i * stagger))
      })
      return () => {
        for (const timer of timers) window.clearTimeout(timer)
      }
    }, [target, drum, reduced, speed, stagger])

    return (
      <span
        ref={ref}
        className={cx(
          "kg-split-flap inline-block font-kg-mono font-semibold [--_face:var(--kg-split-flap-face,var(--kg-surface-raised))] [--_h:1.5em] [--_ink:var(--kg-split-flap-ink,var(--kg-fg))] [--_w:1.05em]",
          className,
        )}
        style={{ "--_speed": `${speed}ms`, ...style } as CSSProperties}
        {...props}
      >
        <span className="kg-visually-hidden" aria-live={live ? "polite" : undefined}>
          {value}
        </span>
        <span className="kg-split-flap__board inline-flex gap-[0.12em]" aria-hidden="true">
          {target.map((_, i) => {
            const glyph = initial.current[i] ?? " "
            return (
              <span
                key={i}
                className="kg-split-flap__cell group/cell relative inline-block h-(--_h) w-(--_w) rounded-kg-sm text-(--_ink) shadow-kg-xs [perspective:6em] after:absolute after:inset-x-0 after:top-1/2 after:z-3 after:h-px after:bg-[color-mix(in_oklab,var(--kg-bg)_70%,transparent)] after:content-['']"
              >
                <span className="absolute inset-x-0 h-1/2 overflow-hidden [backface-visibility:hidden] *:block *:h-(--_h) *:text-center *:leading-(--_h) *:whitespace-pre top-0 rounded-t-kg-sm bg-(--_face)" data-part="top">
                  <span>{glyph}</span>
                </span>
                <span className="absolute inset-x-0 h-1/2 overflow-hidden [backface-visibility:hidden] *:block *:h-(--_h) *:text-center *:leading-(--_h) *:whitespace-pre bottom-0 rounded-b-kg-sm bg-[color-mix(in_oklab,var(--_face),var(--kg-fg)_4%)] *:-translate-y-1/2" data-part="bottom">
                  <span>{glyph}</span>
                </span>
                <span
                  className="absolute inset-x-0 h-1/2 overflow-hidden [backface-visibility:hidden] *:block *:h-(--_h) *:text-center *:leading-(--_h) *:whitespace-pre top-0 rounded-t-kg-sm bg-(--_face) invisible z-2 group-data-flipping/cell:visible motion-reduce:animate-none! motion-reduce:invisible! [[data-kg-motion=reduce]_&]:animate-none! [[data-kg-motion=reduce]_&]:invisible! origin-bottom group-data-flipping/cell:animate-[kg-flap-fall_var(--_speed)_var(--kg-ease-in)_forwards]"
                  data-part="flap-top"
                >
                  <span>{glyph}</span>
                </span>
                <span
                  className="absolute inset-x-0 h-1/2 overflow-hidden [backface-visibility:hidden] *:block *:h-(--_h) *:text-center *:leading-(--_h) *:whitespace-pre bottom-0 rounded-b-kg-sm bg-[color-mix(in_oklab,var(--_face),var(--kg-fg)_4%)] *:-translate-y-1/2 invisible z-2 group-data-flipping/cell:visible motion-reduce:animate-none! motion-reduce:invisible! [[data-kg-motion=reduce]_&]:animate-none! [[data-kg-motion=reduce]_&]:invisible! origin-top [transform:rotateX(90deg)] group-data-flipping/cell:animate-[kg-flap-land_var(--_speed)_var(--kg-ease-out)_forwards]"
                  data-part="flap-bottom"
                >
                  <span>{glyph}</span>
                </span>
              </span>
            )
          })}
        </span>
      </span>
    )
  },
)

SplitFlap.displayName = "SplitFlap"
