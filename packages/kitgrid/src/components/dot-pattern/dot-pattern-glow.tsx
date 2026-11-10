"use client"

import { useId, useRef } from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { usePointerVars } from "../../hooks/use-pointer-vars.js"
import { svgId } from "../aurora/internal/backdrop.js"
import { DotPatternSvg } from "./dot-pattern-svg.js"

interface DotPatternGlowProps {
  gap: number
  radius: number
}

/**
 * The bright copy of the dots, revealed by a radial mask at the pointer. The pattern itself is
 * inert, so the pointer is tracked on the element the pattern fills (or on the pattern when it
 * wraps content) and its CSS variables cascade down into the mask.
 */
export const DotPatternGlow = ({ gap, radius }: DotPatternGlowProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const target = useRef<HTMLElement | null>(null)
  const id = svgId("kg-dots-glow", useId())

  useIsomorphicLayoutEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".kg-dot-pattern")
    target.current = root?.hasAttribute("data-wrapper")
      ? root
      : (root?.parentElement ?? null)
  }, [])

  usePointerVars(target, {
    onMove: () => {
      if (ref.current) ref.current.dataset.active = ""
    },
    onLeave: () => {
      if (ref.current) delete ref.current.dataset.active
    },
  })

  return (
    <div
      ref={ref}
      className="kg-dot-pattern__glow absolute inset-0 text-[var(--_glow)] opacity-0 transition-opacity duration-[var(--kg-duration-slower)] ease-kg-out data-active:opacity-100"
    >
      <DotPatternSvg
        id={id}
        gap={gap}
        radius={Math.min(radius * 1.6, gap / 2)}
        className="kg-dot-pattern__svg absolute inset-0 block"
      />
    </div>
  )
}
