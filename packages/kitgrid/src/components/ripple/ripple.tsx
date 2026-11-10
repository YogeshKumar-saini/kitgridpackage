"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  useEffect,
  useRef,
} from "react"
import { useEventCallback } from "../../hooks/use-event-callback.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { Slot } from "../../primitives/slot.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export interface RippleProps extends HTMLAttributes<HTMLElement> {
  /** A single interactive element: a button, link or anything that takes clicks. */
  children: ReactElement
  /** Ink colour. Defaults to the child's `currentColor`. */
  color?: string
  /** Milliseconds for the ink to spread. */
  duration?: number
  /** Peak ink opacity, 0–1. */
  opacity?: number
  disabled?: boolean
}

interface Wave {
  node: HTMLSpanElement
  release: () => void
  dispose: () => void
}

/**
 * Adds material ink to its child: a wave from the pointer on press, or from the centre on Enter
 * and Space. Waves live outside React and remove themselves once they fade.
 */
export const Ripple = forwardRef<HTMLElement, RippleProps>(
  (
    {
      children,
      color,
      duration = 550,
      opacity = 0.22,
      disabled = false,
      className,
      style,
      onPointerDown,
      onKeyDown,
      onKeyUp,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLElement | null>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const reduced = useReducedMotion()
    const waves = useRef(new Set<Wave>())
    const keyWave = useRef<Wave | null>(null)

    useEffect(() => {
      const live = waves.current
      return () => {
        for (const wave of live) wave.dispose()
        live.clear()
      }
    }, [])

    const spawn = (host: HTMLElement, clientX?: number, clientY?: number): Wave => {
      const rect = host.getBoundingClientRect()
      const x = clientX === undefined ? rect.width / 2 : clientX - rect.left
      const y = clientY === undefined ? rect.height / 2 : clientY - rect.top
      // Big enough to reach the farthest corner from the press point.
      const reach = Math.hypot(
        Math.max(x, rect.width - x),
        Math.max(y, rect.height - y),
      )

      const layer = document.createElement("span")
      layer.className =
        "kg-ripple__layer pointer-events-none absolute inset-0 -z-1 overflow-hidden rounded-[inherit]"
      layer.setAttribute("aria-hidden", "true")
      const ink = document.createElement("span")
      ink.className =
        "kg-ripple__wave absolute rounded-full bg-[var(--kg-ripple-color,currentColor)] opacity-0"
      layer.append(ink)

      if (reduced) {
        ink.style.inset = "0"
        ink.style.borderRadius = "inherit"
      } else {
        ink.style.left = `${x - reach}px`
        ink.style.top = `${y - reach}px`
        ink.style.width = ink.style.height = `${reach * 2}px`
      }
      host.append(layer)

      const peak = String(opacity)
      const canAnimate = typeof ink.animate === "function"
      let expanded = false
      let released = false
      let gone = false

      const dispose = () => {
        if (gone) return
        gone = true
        layer.remove()
        waves.current.delete(wave)
      }
      const fade = () => {
        if (!expanded || !released || gone) return
        if (!canAnimate) return dispose()
        const out = ink.animate([{ opacity: peak }, { opacity: "0" }], {
          duration: reduced ? 160 : duration * 0.75,
          easing: "ease-out",
          fill: "forwards",
        })
        out.finished.then(dispose, dispose)
      }

      if (canAnimate) {
        const grow = reduced
          ? ink.animate([{ opacity: "0" }, { opacity: peak }], {
              duration: 90,
              easing: "ease-out",
              fill: "forwards",
            })
          : ink.animate(
              [
                { scale: "0", opacity: peak },
                { scale: "1", opacity: peak },
              ],
              { duration, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "forwards" },
            )
        const done = () => {
          expanded = true
          fade()
        }
        grow.finished.then(done, done)
      } else {
        expanded = true
      }

      const wave: Wave = {
        node: layer,
        release: () => {
          released = true
          fade()
        },
        dispose,
      }
      waves.current.add(wave)
      return wave
    }

    const isInert = (host: HTMLElement) =>
      disabled ||
      host.getAttribute("aria-disabled") === "true" ||
      (host as HTMLButtonElement).disabled === true

    const handlePointerDown = useEventCallback((event: PointerEvent<HTMLElement>) => {
      onPointerDown?.(event)
      const host = event.currentTarget
      if (event.defaultPrevented || event.button !== 0 || isInert(host)) return
      const wave = spawn(host, event.clientX, event.clientY)
      const release = () => {
        wave.release()
        window.removeEventListener("pointerup", release)
        window.removeEventListener("pointercancel", release)
        window.removeEventListener("blur", release)
      }
      window.addEventListener("pointerup", release)
      window.addEventListener("pointercancel", release)
      window.addEventListener("blur", release)
      const dispose = wave.dispose
      wave.dispose = () => {
        release()
        dispose()
      }
    })

    const handleKeyDown = useEventCallback((event: KeyboardEvent<HTMLElement>) => {
      onKeyDown?.(event)
      const host = event.currentTarget
      if (event.defaultPrevented || event.repeat || isInert(host)) return
      if (event.target !== host || (event.key !== "Enter" && event.key !== " ")) return
      keyWave.current?.release()
      keyWave.current = spawn(host)
      // Enter activates on keydown, so its ink should not wait for a keyup.
      if (event.key === "Enter") keyWave.current.release()
    })

    const handleKeyUp = useEventCallback((event: KeyboardEvent<HTMLElement>) => {
      onKeyUp?.(event)
      keyWave.current?.release()
      keyWave.current = null
    })

    return (
      <Slot
        ref={ref}
        className={cx(
          "kg-ripple [:where(&)]:relative [:where(&)]:isolate [-webkit-tap-highlight-color:transparent]",
          className,
        )}
        style={
          {
            ...(color ? { "--kg-ripple-color": color } : null),
            ...style,
          } as CSSProperties
        }
        onPointerDown={handlePointerDown}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        {...props}
      >
        {children}
      </Slot>
    )
  },
)

Ripple.displayName = "Ripple"
