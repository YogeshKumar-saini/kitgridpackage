"use client"

import { forwardRef, useEffect, useRef, useState } from "react"
import { Layer } from "../../primitives/layer.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export interface HintLayerProps {
  /** Elements carrying this attribute show its text as a hint. */
  attribute?: string
  /** Also take over native `title` tooltips, keeping their text as the accessible description. */
  replaceTitles?: boolean
  /** Gap between the pointer and the hint, in px. */
  offset?: number
  className?: string
}

/**
 * One hint surface for a whole app, ported from the dashboard: anything with `data-hint`
 * (or a `title`) shows a styled hint that follows the pointer, and a keyboard focus shows it
 * under the element. Lines split on newlines; the first is bold when there are several.
 */
export const HintLayer = forwardRef<HTMLDivElement, HintLayerProps>(
  (
    { attribute = "data-hint", replaceTitles = false, offset = 14, className },
    forwardedRef,
  ) => {
    const [lines, setLines] = useState<string[] | null>(null)
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const point = useRef({ x: 0, y: 0, below: false })

    const place = () => {
      const node = local.current
      if (!node) return
      const { x, y, below } = point.current
      const flipX = x + node.offsetWidth + offset > window.innerWidth
      const flipY = !below && y + node.offsetHeight + offset > window.innerHeight
      node.style.left = `${Math.round(flipX ? x - offset - node.offsetWidth : below ? x : x + offset)}px`
      node.style.top = `${Math.round(flipY ? y - offset - node.offsetHeight : below ? y : y + offset)}px`
    }

    useEffect(() => {
      const selector = replaceTitles ? `[${attribute}], [title]` : `[${attribute}]`
      let current: HTMLElement | null = null
      let frame = 0

      const textOf = (host: HTMLElement) => {
        const native = replaceTitles ? host.getAttribute("title") : null
        if (native) {
          host.setAttribute(attribute, native)
          host.removeAttribute("title")
        }
        const text = host.getAttribute(attribute)
        // The hint itself is hidden from assistive tech, so its text lives on as the
        // host's description, as a title's would have.
        if (
          text &&
          !["aria-label", "aria-describedby", "aria-description"].some((name) =>
            host.hasAttribute(name),
          )
        )
          host.setAttribute("aria-description", text)
        return text
      }

      const show = (host: HTMLElement, x: number, y: number, below: boolean) => {
        const text = textOf(host)
        if (!text) return
        current = host
        point.current = { x, y, below }
        setLines(text.split("\n").filter(Boolean))
      }

      const hide = () => {
        cancelAnimationFrame(frame)
        current = null
        setLines(null)
      }

      const over = (event: PointerEvent) => {
        if (event.pointerType === "touch") return
        const host = (event.target as Element | null)?.closest?.<HTMLElement>(selector)
        if (host && host !== current) show(host, event.clientX, event.clientY, false)
      }
      const move = (event: PointerEvent) => {
        if (!current) return
        point.current = { x: event.clientX, y: event.clientY, below: false }
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(place)
      }
      const out = (event: PointerEvent) => {
        const next = event.relatedTarget as Node | null
        if (current && !(next && current.contains(next))) hide()
      }
      const focusIn = (event: FocusEvent) => {
        const host = (event.target as Element | null)?.closest?.<HTMLElement>(selector)
        if (!host || !host.matches(":focus-visible")) return
        const rect = host.getBoundingClientRect()
        show(host, rect.left, rect.bottom + 6, true)
      }
      const key = (event: KeyboardEvent) => {
        if (event.key === "Escape" && current) hide()
      }

      document.addEventListener("pointerover", over)
      document.addEventListener("pointermove", move, { passive: true })
      document.addEventListener("pointerout", out)
      document.addEventListener("pointerdown", hide)
      document.addEventListener("focusin", focusIn)
      document.addEventListener("focusout", hide)
      document.addEventListener("keydown", key)
      window.addEventListener("scroll", hide, { capture: true, passive: true })
      return () => {
        cancelAnimationFrame(frame)
        document.removeEventListener("pointerover", over)
        document.removeEventListener("pointermove", move)
        document.removeEventListener("pointerout", out)
        document.removeEventListener("pointerdown", hide)
        document.removeEventListener("focusin", focusIn)
        document.removeEventListener("focusout", hide)
        document.removeEventListener("keydown", key)
        window.removeEventListener("scroll", hide, { capture: true })
      }
    }, [attribute, replaceTitles])

    useEffect(() => {
      if (lines) place()
    })

    if (!lines || lines.length === 0) return null
    const [head, ...rest] = lines

    return (
      <Layer
        ref={ref}
        role="tooltip"
        aria-hidden="true"
        className={cx(
          "kg-hint-layer grid gap-[2px] max-w-[min(18rem,calc(100vw-1rem))] px-3 py-2 text-kg-xs leading-[1.45] text-kg-fg",
          "bg-kg-surface border-2 border-kg-ink rounded-kg-md shadow-kg-sm pointer-events-none z-kg-tooltip",
          "animate-[kg-fade-in_var(--kg-duration-fast)_var(--kg-ease-out)]",
          className,
        )}
      >
        {rest.length > 0 ? (
          <strong className="kg-hint-layer__head font-semibold">{head}</strong>
        ) : (
          <span>{head}</span>
        )}
        {rest.map((line, index) => (
          <span key={`${index}-${line}`} className="kg-hint-layer__line text-kg-fg-muted">
            {line}
          </span>
        ))}
      </Layer>
    )
  },
)

HintLayer.displayName = "HintLayer"
