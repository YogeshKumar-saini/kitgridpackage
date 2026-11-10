"use client"

import {
  type CSSProperties,
  type ElementType,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import type { TextEffectElement } from "../text-reveal/split-text.js"
import { usePlayback } from "../text-reveal/use-playback.js"

export type TrueFocusMode = "auto" | "hover"

export interface TrueFocusProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
  /** The sentence. Assistive tech reads it once, unblurred. */
  children: string
  as?: TextEffectElement
  /** `auto` steps through the words; `hover` focuses the word under the pointer. */
  mode?: TrueFocusMode
  /** Time on each word for `auto`, in ms. */
  interval?: number
  /** Blur on the words out of focus, in px. */
  blur?: number
}

/**
 * Blurs every word but one and frames the sharp word with four corner brackets that glide to
 * the next. Under reduced motion every word stays sharp and nothing cycles.
 */
export const TrueFocus = forwardRef<HTMLElement, TrueFocusProps>(
  (
    {
      children,
      as = "span",
      mode = "auto",
      interval = 1600,
      blur = 4,
      className,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const playing = usePlayback(local, !reduced && mode === "auto")
    const words = useMemo(() => children.split(/\s+/).filter(Boolean), [children])
    const [active, setActive] = useState(0)

    useEffect(() => {
      if (!playing || words.length < 2) return
      const timer = window.setInterval(
        () => setActive((index) => (index + 1) % words.length),
        interval,
      )
      return () => window.clearInterval(timer)
    }, [playing, interval, words.length])

    useIsomorphicLayoutEffect(() => {
      const root = local.current
      const word = root?.querySelectorAll<HTMLElement>(".kg-true-focus__word")[active]
      if (!root || !word) return
      const place = () => {
        root.style.setProperty("--_x", `${word.offsetLeft}px`)
        root.style.setProperty("--_y", `${word.offsetTop}px`)
        root.style.setProperty("--_w", `${word.offsetWidth}px`)
        root.style.setProperty("--_h", `${word.offsetHeight}px`)
      }
      place()
      if (typeof ResizeObserver === "undefined") return
      const observer = new ResizeObserver(place)
      observer.observe(root)
      return () => observer.disconnect()
    }, [active, words])

    const Tag = as as ElementType

    return (
      <Tag
        ref={ref}
        className={cx("kg-true-focus group/focus inline-block [--_corner:0.42em] [--_line:2px] [--_pad:0.18em]", className)}
        data-mode={mode}
        data-reduced={reduced || undefined}
        style={{ "--_blur": `${blur}px`, ...style } as CSSProperties}
        {...props}
      >
        <span className="kg-visually-hidden">{children}</span>
        <span className="kg-true-focus__text relative inline-flex flex-wrap justify-center gap-x-[0.32em] gap-y-[0.1em]" aria-hidden="true">
          {words.map((word, i) => (
            <span
              key={i}
              className="kg-true-focus__word opacity-55 transition-[filter,opacity] duration-(--kg-duration-slower) ease-kg-out [filter:blur(var(--_blur))] group-data-[mode=hover]/focus:cursor-default data-active:opacity-100 data-active:[filter:none] group-data-reduced/focus:opacity-100 group-data-reduced/focus:[filter:none]"
              data-active={i === active || undefined}
              onPointerEnter={mode === "hover" ? () => setActive(i) : undefined}
            >
              {word}
            </span>
          ))}
          <span className="kg-true-focus__frame pointer-events-none absolute top-0 left-0 group-data-reduced/focus:hidden">
            <span
              className="absolute top-0 left-0 size-(--_corner) border-solid border-kg-ink transition-transform duration-(--kg-duration-spring) ease-kg-spring rounded-tl-[3px] [border-width:var(--_line)_0_0_var(--_line)] [transform:translate(calc(var(--_x,0px)_-_var(--_pad)),calc(var(--_y,0px)_-_var(--_pad)))]"
              data-corner="tl"
            />
            <span
              className="absolute top-0 left-0 size-(--_corner) border-solid border-kg-ink transition-transform duration-(--kg-duration-spring) ease-kg-spring rounded-tr-[3px] [border-width:var(--_line)_var(--_line)_0_0] [transform:translate(calc(var(--_x,0px)_+_var(--_w,0px)_+_var(--_pad)_-_var(--_corner)),calc(var(--_y,0px)_-_var(--_pad)))]"
              data-corner="tr"
            />
            <span
              className="absolute top-0 left-0 size-(--_corner) border-solid border-kg-ink transition-transform duration-(--kg-duration-spring) ease-kg-spring rounded-bl-[3px] [border-width:0_0_var(--_line)_var(--_line)] [transform:translate(calc(var(--_x,0px)_-_var(--_pad)),calc(var(--_y,0px)_+_var(--_h,0px)_+_var(--_pad)_-_var(--_corner)))]"
              data-corner="bl"
            />
            <span
              className="absolute top-0 left-0 size-(--_corner) border-solid border-kg-ink transition-transform duration-(--kg-duration-spring) ease-kg-spring rounded-br-[3px] [border-width:0_var(--_line)_var(--_line)_0] [transform:translate(calc(var(--_x,0px)_+_var(--_w,0px)_+_var(--_pad)_-_var(--_corner)),calc(var(--_y,0px)_+_var(--_h,0px)_+_var(--_pad)_-_var(--_corner)))]"
              data-corner="br"
            />
          </span>
        </span>
      </Tag>
    )
  },
)

TrueFocus.displayName = "TrueFocus"
