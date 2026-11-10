"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useMediaQuery } from "../../hooks/use-media-query.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { createSpring } from "../../hooks/use-spring.js"
import { Slot } from "../../primitives/slot.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"
import {
  createLensFilter,
  drawDisplacementMap,
  filterMarkup,
  supportsRefraction,
} from "./lens.js"

export type LiquidGlassElement =
  | "div"
  | "nav"
  | "header"
  | "footer"
  | "aside"
  | "section"
  | "article"
  | "form"
  | "span"

/** How the glass is being rendered: `refract` in Chromium, `frost` elsewhere, `solid` on request. */
export type LiquidGlassMode = "refract" | "frost" | "solid"

export interface LiquidGlassProps extends HTMLAttributes<HTMLElement> {
  as?: LiquidGlassElement
  /** Merge the glass onto the single child element instead of rendering a wrapper. */
  asChild?: boolean
  /** How far the rim bends the backdrop, in px. 0 turns refraction off. */
  refraction?: number
  /** Width of the curved rim that does the bending, in px. */
  bevel?: number
  /** 0 to 1: chromatic aberration along the rim, red and blue landing apart. */
  dispersion?: number
  /** Backdrop blur in px. The frosted fallback uses a stronger blur for legibility. */
  blur?: number
  /** Any CSS color, used as the body of the glass. Defaults to a whisper of the surface color. */
  tint?: string
  /** Corner radius: px as a number, or any CSS length. */
  radius?: number | string
  /** 0 to 1: strength of the rim light and surface sheen. */
  specular?: number
  /** The rim light orbits toward the pointer, and the surface gives slightly when pressed. */
  interactive?: boolean
}

const REST_ANGLE = -45
const REACH = 520

/**
 * A web approximation of Apple's Liquid Glass: a surface that refracts what sits behind it
 * through a curved rim, splits colour at the edge, and catches a light that orbits toward the
 * pointer. Chromium gets true refraction through an SVG displacement filter in
 * `backdrop-filter`; other browsers get frosted glass; `prefers-reduced-transparency` gets an
 * opaque surface.
 */
export const LiquidGlass = forwardRef<HTMLElement, LiquidGlassProps>(
  (
    {
      as: Tag = "div",
      asChild = false,
      refraction = 36,
      bevel = 22,
      dispersion = 0.45,
      blur = 3,
      tint,
      radius,
      specular = 0.7,
      interactive = true,
      className,
      style,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const id = `kg-lens-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
    const reducedTransparency = useMediaQuery("(prefers-reduced-transparency: reduce)")
    const reduced = useReducedMotion()
    const visible = useInView(local, { once: false, amount: 0, rootMargin: "120px" })
    const [mode, setMode] = useState<LiquidGlassMode>("frost")
    const lensOn = refraction > 0 && !reducedTransparency

    useIsomorphicLayoutEffect(() => {
      const node = local.current
      if (reducedTransparency) {
        setMode("solid")
        return
      }
      if (!node || !lensOn || !supportsRefraction()) {
        setMode("frost")
        return
      }
      const filter = createLensFilter(id)
      let frame = 0
      let applied = ""

      const render = () => {
        frame = 0
        const width = node.offsetWidth
        const height = node.offsetHeight
        if (width < 2 || height < 2) return
        const corner =
          Number.parseFloat(getComputedStyle(node).borderTopLeftRadius) || 0
        const r = Math.min(corner, width / 2, height / 2)
        const signature = `${width}:${height}:${r}:${bevel}:${refraction}:${dispersion}`
        if (signature === applied) return
        applied = signature
        const map = drawDisplacementMap({ width, height, radius: r, bevel })
        if (!map) return
        filter.setAttribute("width", String(width))
        filter.setAttribute("height", String(height))
        filter.innerHTML = filterMarkup(
          map,
          { width, height },
          { refraction, dispersion: clamp(dispersion, 0, 1) },
        )
        node.style.setProperty("--_lens", `url(#${id})`)
      }

      render()
      setMode("refract")
      const observer = new ResizeObserver(() => {
        if (!frame) frame = requestAnimationFrame(render)
      })
      observer.observe(node)
      return () => {
        observer.disconnect()
        cancelAnimationFrame(frame)
        filter.remove()
        node.style.removeProperty("--_lens")
      }
    }, [id, lensOn, reducedTransparency, refraction, bevel, dispersion])

    const tracking = interactive && !reduced && visible

    useEffect(() => {
      const node = local.current
      if (!node || !tracking) return
      const config = { stiffness: 120, damping: 20, precision: 0.05 }
      const write = () => {
        node.style.setProperty("--_angle", `${angle.get().toFixed(2)}deg`)
        node.style.setProperty("--_glow", glow.get().toFixed(3))
      }
      const angle = createSpring(REST_ANGLE, write, config)
      const glow = createSpring(0, write, { ...config, precision: 0.002 })
      let frame = 0
      let last: PointerEvent | null = null

      const flush = () => {
        frame = 0
        if (!last) return
        const rect = node.getBoundingClientRect()
        const dx = last.clientX - (rect.left + rect.width / 2)
        const dy = last.clientY - (rect.top + rect.height / 2)
        // Clockwise from 12 o'clock, the frame conic-gradient angles use.
        const target = (Math.atan2(dx, -dy) * 180) / Math.PI
        // Unwrapped so the light takes the short way round instead of spinning back past 0.
        const current = angle.get()
        const delta = ((((target - current) % 360) + 540) % 360) - 180
        angle.set(current + delta)
        const outside = Math.max(
          Math.abs(dx) - rect.width / 2,
          Math.abs(dy) - rect.height / 2,
          0,
        )
        glow.set(clamp(1 - outside / REACH, 0, 1))
      }

      const handleMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return
        last = event
        if (!frame) frame = requestAnimationFrame(flush)
      }
      const handleLeave = () => {
        last = null
        glow.set(0)
      }
      const handleDown = (event: PointerEvent) => {
        if (event.button === 0) node.dataset.pressed = ""
      }
      const handleUp = () => {
        delete node.dataset.pressed
      }

      document.addEventListener("pointermove", handleMove, { passive: true })
      document.documentElement.addEventListener("pointerleave", handleLeave)
      node.addEventListener("pointerdown", handleDown)
      window.addEventListener("pointerup", handleUp)
      window.addEventListener("pointercancel", handleUp)
      return () => {
        cancelAnimationFrame(frame)
        angle.stop()
        glow.stop()
        document.removeEventListener("pointermove", handleMove)
        document.documentElement.removeEventListener("pointerleave", handleLeave)
        node.removeEventListener("pointerdown", handleDown)
        window.removeEventListener("pointerup", handleUp)
        window.removeEventListener("pointercancel", handleUp)
        node.style.removeProperty("--_angle")
        node.style.removeProperty("--_glow")
        delete node.dataset.pressed
      }
    }, [tracking])

    const Root = asChild ? Slot : Tag
    const vars = {
      "--_blur": `${Math.max(0, blur)}px`,
      "--_specular": clamp(specular, 0, 1),
      ...(tint ? { "--kg-glass-tint": tint } : null),
      ...(radius !== undefined
        ? { "--kg-glass-radius": typeof radius === "number" ? `${radius}px` : radius }
        : null),
      ...style,
    } as CSSProperties

    return (
      <Root
        ref={ref}
        className={cx(
          "kg-liquid-glass relative isolate rounded-[var(--kg-glass-radius,var(--kg-radius-2xl))] text-kg-fg",
          "transition-[scale,box-shadow] duration-(--kg-duration-spring) ease-kg-spring data-interactive:data-pressed:scale-[0.985]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
          className,
        )}
        data-lens={mode}
        data-interactive={interactive || undefined}
        style={vars}
        {...props}
      >
        {children}
      </Root>
    )
  },
)

LiquidGlass.displayName = "LiquidGlass"
