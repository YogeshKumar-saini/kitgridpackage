"use client"

import {
  Children,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"

export interface BounceCardsProps extends HTMLAttributes<HTMLDivElement> {
  /** The cards, left to right. Images or small panels work best. */
  children: ReactNode
  /** Rotation between neighbouring cards, in degrees. */
  spread?: number
  /** Horizontal overlap step between neighbouring cards, in px. */
  offset?: number
  /** How far the neighbours of a hovered card make room, in px. */
  push?: number
}

/**
 * A fanned hand of cards that bounce in one by one. Hovering or focusing a card straightens
 * and lifts it while its neighbours lean away to make room.
 */
export const BounceCards = forwardRef<HTMLDivElement, BounceCardsProps>(
  (
    { children, spread = 9, offset = 92, push = 56, className, style, onPointerLeave, ...props },
    ref,
  ) => {
    const cards = Children.toArray(children)
    const [active, setActive] = useState<number | null>(null)
    const mid = (cards.length - 1) / 2

    return (
      <div
        ref={ref}
        className={cx(
          "kg-bounce-cards relative grid min-h-[calc(var(--_w)*1.45)] w-full place-items-center [--_w:var(--kg-bounce-cards-width,9.5rem)]",
          className,
        )}
        data-active={active === null ? undefined : ""}
        style={{ "--_n": cards.length, "--_offset": `${offset}px`, ...style } as CSSProperties}
        onPointerLeave={(event) => {
          onPointerLeave?.(event)
          setActive(null)
        }}
        {...props}
      >
        {cards.map((card, i) => {
          const rest = (i - mid) * spread
          const x = (i - mid) * offset
          const lifted = active === i
          const shift = active === null || lifted ? 0 : i < active ? -push : push
          return (
            <div
              key={i}
              className="kg-bounce-cards__card aspect-square w-(--_w) overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-surface-raised shadow-kg-lg transition-transform duration-(--kg-duration-slow) ease-kg-out [grid-area:1/1] [transform:translateX(var(--_x))_rotate(var(--_rot))] animate-[kg-bounce-in_var(--kg-duration-slower)_var(--kg-ease-out)_both] [animation-delay:calc(var(--_i)*70ms)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-kg-ring data-lifted:[transform:translateX(var(--_x))_translateY(-10px)_rotate(0deg)_scale(1.06)] motion-reduce:animate-none [[data-kg-motion=reduce]_&]:animate-none [&>img]:block [&>img]:size-full [&>img]:object-cover"
              data-lifted={lifted || undefined}
              style={
                {
                  "--_i": i,
                  "--_x": `${x + shift}px`,
                  "--_rot": `${lifted ? 0 : rest}deg`,
                  zIndex: lifted ? cards.length + 1 : undefined,
                } as CSSProperties
              }
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              {card}
            </div>
          )
        })}
      </div>
    )
  },
)

BounceCards.displayName = "BounceCards"
