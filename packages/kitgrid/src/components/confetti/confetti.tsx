"use client"

import { forwardRef, type MouseEvent, useCallback, useRef } from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { Button, type ButtonProps } from "../button/button.js"
import {
  type ConfettiOptions,
  type ConfettiOrigin,
  launchConfetti,
} from "./confetti-engine.js"

export type ConfettiFire = (
  origin?: ConfettiOrigin,
  options?: ConfettiOptions,
) => Promise<void>

/**
 * Returns a stable `fire(origin?, options?)`. `origin` is an element (bursts from its
 * centre) or a point in client pixels. Respects reduced motion, including a
 * `KitgridProvider` override.
 */
export const useConfetti = (defaults?: ConfettiOptions): ConfettiFire => {
  const reduced = useReducedMotion()
  const latest = useRef({ defaults, reduced })
  useIsomorphicLayoutEffect(() => {
    latest.current = { defaults, reduced }
  })

  return useCallback((origin, options) => {
    const { defaults: base, reduced: skip } = latest.current
    const merged = { ...base, ...options }
    if (skip && merged.disableForReducedMotion !== false) return Promise.resolve()
    return launchConfetti(merged, origin)
  }, [])
}

export interface ConfettiButtonProps extends ButtonProps {
  /** Options for the burst, which always starts from the button. */
  options?: ConfettiOptions
}

/** A `Button` that celebrates its own click with a burst from its centre. */
export const ConfettiButton = forwardRef<HTMLButtonElement, ConfettiButtonProps>(
  ({ options, onClick, ...props }, ref) => {
    const fire = useConfetti(options)
    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented) void fire(event.currentTarget)
    }
    return <Button ref={ref} onClick={handleClick} {...props} />
  },
)

ConfettiButton.displayName = "ConfettiButton"
