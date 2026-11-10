"use client"

import { useEffect, useMemo, useRef } from "react"
import { useEventCallback } from "./use-event-callback.js"
import { useReducedMotion } from "./use-reduced-motion.js"

export interface SpringConfig {
  stiffness?: number
  damping?: number
  mass?: number
  /** Settles once both distance and speed fall below this. */
  precision?: number
}

export interface Spring {
  get: () => number
  /** Animate toward `target`, keeping current velocity. */
  set: (target: number) => void
  /** Move to `value` immediately. */
  jump: (value: number) => void
  stop: () => void
}

const SUBSTEP = 1 / 240

export const createSpring = (
  initial: number,
  onUpdate: (value: number) => void,
  { stiffness = 170, damping = 26, mass = 1, precision = 0.01 }: SpringConfig = {},
): Spring => {
  let value = initial
  let target = initial
  let velocity = 0
  let frame = 0
  let last = 0

  const step = (now: number) => {
    // rAF timestamps can predate the performance.now() taken in set() (and use another clock in
    // some environments), so a non-positive delta falls back to one nominal frame.
    const elapsed = Math.min(Math.max((now - last) / 1000, 0), 0.064) || 1 / 60
    last = now
    const steps = Math.ceil(elapsed / SUBSTEP)
    const dt = elapsed / steps
    for (let i = 0; i < steps; i++) {
      const force = -stiffness * (value - target) - damping * velocity
      velocity += (force / mass) * dt
      value += velocity * dt
    }
    if (Math.abs(value - target) < precision && Math.abs(velocity) < precision) {
      value = target
      velocity = 0
      frame = 0
      onUpdate(value)
      return
    }
    onUpdate(value)
    frame = requestAnimationFrame(step)
  }

  const stop = () => {
    cancelAnimationFrame(frame)
    frame = 0
  }

  return {
    get: () => value,
    set: (next) => {
      target = next
      if (frame) return
      last = performance.now()
      frame = requestAnimationFrame(step)
    },
    jump: (next) => {
      stop()
      value = target = next
      velocity = 0
      onUpdate(value)
    },
    stop,
  }
}

/**
 * A rAF-driven spring that reports through `onUpdate` instead of state, so per-frame values can be
 * written straight to styles. Under reduced motion `set` jumps to the target.
 */
export const useSpring = (
  initial: number,
  onUpdate: (value: number) => void,
  config?: SpringConfig,
): Spring => {
  const reduced = useReducedMotion()
  const update = useEventCallback(onUpdate)
  const spring = useRef<Spring | null>(null)
  spring.current ??= createSpring(initial, (value) => update(value), config)

  useEffect(() => () => spring.current?.stop(), [])

  return useMemo(() => {
    const inner = spring.current as Spring
    return { ...inner, set: reduced ? inner.jump : inner.set }
  }, [reduced])
}
