"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useEffect,
  useRef,
} from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export interface StickyRevealProps extends HTMLAttributes<HTMLElement> {
  /** The media that opens up, usually a full-bleed image or video. */
  children: ReactNode
  /** Content that fades in over the media once it is nearly open. */
  overlay?: ReactNode
  /** Scroll distance the reveal takes, in viewport heights. */
  length?: number
  /** How far the media is inset at the start, as a percentage of each side. */
  inset?: number
  /** A scrolling ancestor to pin inside, instead of the page. Its height stands in for the viewport. */
  scroller?: RefObject<HTMLElement | null>
}

/**
 * A section that pins while you scroll through it, opening a framed media window to full
 * bleed and then fading its overlay in. Under reduced motion it renders the open state.
 */
export const StickyReveal = forwardRef<HTMLElement, StickyRevealProps>(
  (
    { children, overlay, length = 2, inset = 14, scroller, className, style, ...props },
    forwardedRef,
  ) => {
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const inView = useInView(local, { once: false, amount: 0 })

    useEffect(() => {
      const node = local.current
      if (!node || reduced || !inView) return
      const box = scroller?.current ?? null
      const source: HTMLElement | Window = box ?? window
      let frame = 0
      const update = () => {
        frame = 0
        const vh = box ? box.clientHeight : window.innerHeight
        if (box) node.style.setProperty("--_vh", `${vh}px`)
        const rect = node.getBoundingClientRect()
        const top = rect.top - (box ? box.getBoundingClientRect().top : 0)
        const travel = rect.height - vh
        const p = travel > 0 ? Math.min(Math.max(-top / travel, 0), 1) : 1
        node.style.setProperty("--_p", p.toFixed(4))
      }
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update)
      }
      update()
      source.addEventListener("scroll", schedule, { passive: true })
      window.addEventListener("resize", schedule)
      return () => {
        cancelAnimationFrame(frame)
        source.removeEventListener("scroll", schedule)
        window.removeEventListener("resize", schedule)
      }
    }, [reduced, inView, scroller])

    useEffect(() => {
      if (reduced) local.current?.style.removeProperty("--_p")
    }, [reduced])

    return (
      <section
        ref={ref}
        className={cx(
          "kg-sticky-reveal group/sticky relative h-[calc(var(--_vh,100svh)_*_var(--_steps))] [--_fade:clamp(0,(var(--_p)_-_0.65)_/_0.3,1)] [--_open:clamp(0,var(--_p)_/_0.7,1)] [--_p:0] data-reduced:h-auto data-reduced:[--_p:1]",
          className,
        )}
        data-reduced={reduced || undefined}
        style={
          {
            "--_steps": Math.max(length, 1) + 1,
            "--_inset": `${inset}%`,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div className="kg-sticky-reveal__pin sticky top-0 grid h-[var(--_vh,100svh)] overflow-hidden group-data-reduced/sticky:relative group-data-reduced/sticky:h-auto group-data-reduced/sticky:min-h-[70svh]">
          <div className="kg-sticky-reveal__media min-h-0 overflow-hidden [grid-area:1/1] [clip-path:inset(calc((1_-_var(--_open))_*_var(--_inset))_round_calc((1_-_var(--_open))_*_var(--kg-radius-2xl)))] [transform:scale(calc(1.08_-_var(--_open)_*_0.08))] [&>:is(img,video)]:block [&>:is(img,video)]:size-full [&>:is(img,video)]:object-cover">{children}</div>
          {overlay !== undefined ? (
            <div className="kg-sticky-reveal__overlay z-1 self-end p-10 opacity-(--_fade) [grid-area:1/1] [transform:translateY(calc((1_-_var(--_fade))_*_24px))]">{overlay}</div>
          ) : null}
        </div>
      </section>
    )
  },
)

StickyReveal.displayName = "StickyReveal"
