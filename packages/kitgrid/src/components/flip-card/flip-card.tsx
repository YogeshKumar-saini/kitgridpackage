"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { cx } from "../../utils/cx.js"

export type FlipCardTrigger = "hover" | "click" | "manual"
export type FlipCardAxis = "x" | "y"

export interface FlipCardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "children"
> {
  front: ReactNode
  back: ReactNode
  /**
   * `click` flips on click, tap or the keyboard toggle. `hover` flips while a mouse is over the
   * card and still offers the toggle for keyboard and touch. `manual` leaves it to `flipped`.
   */
  trigger?: FlipCardTrigger
  flipped?: boolean
  defaultFlipped?: boolean
  onFlippedChange?: (flipped: boolean) => void
  axis?: FlipCardAxis
  /** Accessible name of the toggle button. */
  label?: string
}

const INTERACTIVE =
  'a[href], button, input, select, textarea, label, summary, [role="button"], [tabindex]'

/**
 * A two-faced card that flips in 3D on a spring. Its height follows the taller face, the hidden
 * face is inert, and under reduced motion the faces crossfade instead of rotating.
 */
export const FlipCard = forwardRef<HTMLDivElement, FlipCardProps>(
  (
    {
      front,
      back,
      trigger = "click",
      flipped: flippedProp,
      defaultFlipped = false,
      onFlippedChange,
      axis = "y",
      label = "Flip card",
      className,
      onClick,
      onPointerDown,
      onPointerEnter,
      onPointerLeave,
      ...props
    },
    ref,
  ) => {
    const [flipped, setFlipped] = useControllableState({
      value: flippedProp,
      defaultValue: defaultFlipped,
      onChange: onFlippedChange,
    })
    const reduced = useReducedMotion()
    const frontRef = useRef<HTMLDivElement>(null)
    const backRef = useRef<HTMLDivElement>(null)
    const pointerType = useRef("")
    const interactive = trigger !== "manual"
    const face = cx(
      "kg-flip-card__face min-w-0 rounded-[inherit] border-2 border-kg-ink bg-kg-surface p-6 text-kg-fg shadow-kg-md [grid-area:1/1] [-webkit-backface-visibility:hidden] [backface-visibility:hidden]",
      reduced && "transition-opacity duration-[180ms] ease-[ease]",
    )

    // Set as DOM properties because React 18 and 19 disagree on serialising a boolean `inert`.
    useIsomorphicLayoutEffect(() => {
      if (frontRef.current) frontRef.current.inert = flipped
      if (backRef.current) backRef.current.inert = !flipped
    }, [flipped])

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
      onPointerDown?.(event)
      pointerType.current = event.pointerType
    }

    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
      onClick?.(event)
      if (event.defaultPrevented || !interactive) return
      const target = event.target as HTMLElement
      // Controls on a face keep their own behaviour; the toggle handles its own clicks.
      if (target.closest(INTERACTIVE)) return
      if (trigger === "hover" && pointerType.current === "mouse") return
      setFlipped((value) => !value)
    }

    const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
      onPointerEnter?.(event)
      if (trigger === "hover" && event.pointerType === "mouse") setFlipped(true)
    }

    const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
      onPointerLeave?.(event)
      if (trigger === "hover" && event.pointerType === "mouse") setFlipped(false)
    }

    return (
      <div
        ref={ref}
        className={cx(
          "kg-flip-card relative grid rounded-kg-xl [perspective:var(--kg-flip-perspective,1400px)] [-webkit-tap-highlight-color:transparent]",
          "[--_turn:rotateY(180deg)] data-[axis=x]:[--_turn:rotateX(180deg)] data-[trigger=click]:cursor-pointer data-[trigger=hover]:cursor-pointer",
          "has-[>button:focus-visible]:outline-2 has-[>button:focus-visible]:outline-offset-2 has-[>button:focus-visible]:outline-kg-ring",
          className,
        )}
        data-axis={axis}
        data-trigger={trigger}
        data-state={flipped ? "back" : "front"}
        data-motion={reduced ? "reduce" : undefined}
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        {...props}
      >
        {interactive && (
          <button
            type="button"
            className="kg-flip-card__toggle kg-visually-hidden"
            aria-pressed={flipped}
            onClick={() => setFlipped((value) => !value)}
          >
            {label}
          </button>
        )}
        <div
          className={cx(
            "kg-flip-card__inner grid rounded-[inherit] [transform-style:preserve-3d]",
            reduced
              ? "transition-none"
              : "transition-transform duration-[calc(var(--kg-duration-spring)*1.3)] ease-kg-spring",
            flipped && !reduced && "[transform:var(--_turn)]",
          )}
        >
          <div
            ref={frontRef}
            className={cx(face, reduced && flipped && "pointer-events-none opacity-0")}
            data-face="front"
            aria-hidden={flipped || undefined}
          >
            {front}
          </div>
          <div
            ref={backRef}
            className={cx(
              face,
              reduced ? !flipped && "pointer-events-none opacity-0" : "[transform:var(--_turn)]",
            )}
            data-face="back"
            aria-hidden={!flipped || undefined}
          >
            {back}
          </div>
        </div>
      </div>
    )
  },
)

FlipCard.displayName = "FlipCard"
