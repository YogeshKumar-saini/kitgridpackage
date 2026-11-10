"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useRef,
} from "react"
import { usePointerVars } from "../../hooks/use-pointer-vars.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export interface LensProps extends HTMLAttributes<HTMLDivElement> {
  /** Magnification inside the lens. */
  zoom?: number
  /** Diameter of the lens, in px. */
  size?: number
}

/**
 * A round magnifier that follows the pointer over an image or any content. The magnified copy
 * is a clipped, scaled clone driven by pointer CSS variables, so it costs no re-renders; the
 * clone is inert and hidden from assistive tech.
 */
export const Lens = forwardRef<HTMLDivElement, LensProps>(
  ({ zoom = 2, size = 170, className, style, children, ...props }, forwardedRef) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const cloneRef = useRef<HTMLDivElement>(null)
    usePointerVars(local)

    useEffect(() => {
      const clone = cloneRef.current
      if (!clone) return
      clone.setAttribute("inert", "")
      // The clone must not duplicate ids (broken label/aria references) or form names
      // (radio groups and submissions would see two controls).
      const strip = () =>
        clone.querySelectorAll("[id], [name]").forEach((node) => {
          node.removeAttribute("id")
          node.removeAttribute("name")
        })
      strip()
      const observer = new MutationObserver(strip)
      observer.observe(clone, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["id", "name"],
      })
      return () => observer.disconnect()
    }, [])

    return (
      <div
        ref={ref}
        className={cx("kg-lens group/lens relative cursor-zoom-in overflow-hidden rounded-kg-xl [&_img]:block [&_img]:max-w-full", className)}
        style={{ "--_zoom": zoom, "--_size": `${size}px`, ...style } as CSSProperties}
        {...props}
      >
        {children}
        <div ref={cloneRef} className="kg-lens__zoom pointer-events-none absolute inset-0 origin-[var(--kg-pointer-x,50%)_var(--kg-pointer-y,50%)] opacity-0 transition-opacity duration-(--kg-duration-base) ease-kg-out [clip-path:circle(calc(var(--_size)_/_2_/_var(--_zoom))_at_var(--kg-pointer-x,50%)_var(--kg-pointer-y,50%))] [transform:scale(var(--_zoom))] group-data-[pointer=in]/lens:opacity-100" aria-hidden="true">
          {children}
        </div>
        <span
          className="kg-lens__ring pointer-events-none absolute top-0 left-0 size-(--_size) rounded-full border-2 border-kg-ink opacity-0 shadow-kg-lg transition-opacity duration-(--kg-duration-base) ease-kg-out [transform:translate(calc(var(--kg-pointer-x,0px)_-_var(--_size)_/_2),calc(var(--kg-pointer-y,0px)_-_var(--_size)_/_2))] group-data-[pointer=in]/lens:opacity-100"
          aria-hidden="true"
        />
      </div>
    )
  },
)

Lens.displayName = "Lens"
