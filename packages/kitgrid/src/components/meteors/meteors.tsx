import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react"
import { backdropRoot, hasChildren } from "../aurora/internal/backdrop.js"
import { createRandom, round } from "../aurora/internal/random.js"

export interface MeteorsProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of meteors. */
  count?: number
  /** Direction of travel in degrees, clockwise from pointing right: 90 falls straight down. */
  angle?: number
  /** Any CSS color. Defaults to the ink, so meteors read in light and dark themes. */
  color?: string
  /** Tail length, in px. */
  tailLength?: number
  /** Shortest and longest flight, in seconds. */
  duration?: readonly [min: number, max: number]
  /** Longest initial delay, in seconds; each meteor waits a seeded fraction of it. */
  maxDelay?: number
  /** Same seed, same sky: positions and timings are reproducible on server and client. */
  seed?: number
  /** Optional content, painted above the meteors. */
  children?: ReactNode
}

/** Distance each meteor travels, in `cqmax` of the layer, so it always crosses the frame. */
const TRAVEL = 120

/**
 * Meteors streaking across the frame on CSS keyframes alone. Every meteor passes a seeded point
 * halfway through its flight, so coverage is even at any angle, and that midpoint is the static
 * frame shown under reduced motion. Server-component safe.
 */
export const Meteors = forwardRef<HTMLDivElement, MeteorsProps>(
  (
    {
      count = 20,
      angle = 130,
      color,
      tailLength = 90,
      duration = [3, 8],
      maxDelay = 8,
      seed = 7,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const wrapper = hasChildren(children)
    const random = createRandom(seed)
    const radians = (angle * Math.PI) / 180
    const backX = round(Math.cos(radians) * (TRAVEL / 2))
    const backY = round(Math.sin(radians) * (TRAVEL / 2))
    const [shortest, longest] = duration
    const total = Math.max(Math.round(count), 0)

    const meteors = Array.from({ length: total }, (_, index) => {
      const x = round(random() * 100, 2)
      const y = round(random() * 100, 2)
      const flight = round(shortest + random() * Math.max(longest - shortest, 0), 2)
      const delay = round(random() * Math.max(maxDelay, 0), 2)
      const scale = round(0.6 + random() * 0.8, 2)
      return (
        <span
          key={index}
          className="kg-meteors__meteor absolute aspect-square w-[calc(var(--_scale,1)*2px)] rounded-full bg-[var(--_color)] opacity-55 will-change-[transform,opacity]"
          style={
            {
              left: `calc(${x}% - ${backX}cqmax)`,
              top: `calc(${y}% - ${backY}cqmax)`,
              animationDuration: `${flight}s`,
              animationDelay: `${delay}s`,
              "--_scale": scale,
            } as CSSProperties
          }
        />
      )
    })

    return (
      <div
        ref={ref}
        {...backdropRoot(
          "kg-meteors absolute inset-0 overflow-hidden pointer-events-none data-wrapper:relative data-wrapper:inset-auto data-wrapper:overflow-visible data-wrapper:isolate data-wrapper:pointer-events-auto [--_color:var(--kg-meteors-color,var(--kg-ink))]",
          className,
          wrapper,
        )}
        style={
          {
            ...(color ? { "--kg-meteors-color": color } : null),
            "--kg-meteors-angle": `${angle}deg`,
            "--kg-meteors-tail": `${Math.max(tailLength, 0)}px`,
            "--kg-meteors-travel": `${TRAVEL}cqmax`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div
          className="kg-meteors__layer pointer-events-none absolute inset-0 z-0 overflow-hidden [container-type:size]"
          aria-hidden="true"
        >
          {meteors}
        </div>
        {wrapper && <div className="kg-meteors__content relative z-1">{children}</div>}
      </div>
    )
  },
)

Meteors.displayName = "Meteors"
