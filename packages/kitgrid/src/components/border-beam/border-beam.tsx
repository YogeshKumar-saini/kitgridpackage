"use client"

import { type CSSProperties, forwardRef, type HTMLAttributes, useRef } from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { usePlayback } from "../marquee/use-playback.js"

export interface BorderBeamProps extends HTMLAttributes<HTMLDivElement> {
  /** Length of the beam, in px. */
  size?: number
  /** Seconds per lap. */
  duration?: number
  /** Phase offset in seconds. Give two beams `delay={duration / 2}` to have them chase. */
  delay?: number
  /** Colour at the head of the beam. Defaults to the ink. */
  colorFrom?: string
  /** Colour the tail fades through. Defaults to the peach paper. */
  colorTo?: string
  /** Thickness of the lit edge, in px. */
  borderWidth?: number
  reverse?: boolean
}

/**
 * A beam of ink that travels around the border of its nearest positioned ancestor. Place it as
 * the last child of any `position: relative` container; it inherits the container's radius.
 */
export const BorderBeam = forwardRef<HTMLDivElement, BorderBeamProps>(
  (
    {
      size = 80,
      duration = 6,
      delay = 0,
      colorFrom,
      colorTo,
      borderWidth = 1.5,
      reverse = false,
      className,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const playing = usePlayback(local)

    // offset-path cannot inherit a radius, so copy the container's corner into the path.
    useIsomorphicLayoutEffect(() => {
      const node = local.current
      if (!node) return
      const sync = () => {
        const corner = getComputedStyle(node).borderTopLeftRadius
        node.style.setProperty("--_path-radius", corner.split(" ")[0] || "0px")
      }
      sync()
      const observer = new ResizeObserver(sync)
      observer.observe(node)
      return () => observer.disconnect()
    }, [])

    return (
      <div
        ref={ref}
        aria-hidden="true"
        className={cx(
          "kg-border-beam pointer-events-none absolute inset-0 rounded-[inherit] p-[var(--kg-beam-width,1.5px)] [--_from:var(--kg-beam-from,var(--kg-ink))] [--_to:var(--kg-beam-to,var(--kg-paper-peach))]",
          className,
        )}
        data-reverse={reverse || undefined}
        data-paused={!playing || undefined}
        style={
          {
            "--kg-beam-size": `${size}px`,
            "--kg-beam-duration": `${duration}s`,
            "--kg-beam-delay": `${-delay}s`,
            "--kg-beam-width": `${borderWidth}px`,
            ...(colorFrom ? { "--kg-beam-from": colorFrom } : null),
            ...(colorTo ? { "--kg-beam-to": colorTo } : null),
            ...style,
          } as CSSProperties
        }
        {...props}
      />
    )
  },
)

BorderBeam.displayName = "BorderBeam"
