"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useInView } from "../../hooks/use-in-view.js"
import { useLocale } from "../../hooks/use-locale.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { createSpring, type Spring, type SpringConfig } from "../../hooks/use-spring.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"

export type NumberTickerVariant = "count" | "roll"
export type NumberTickerTrigger = "mount" | "view"

export interface NumberTickerProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> {
  value: number
  /** Where the first animation starts. Later changes animate from the current value. */
  from?: number
  /** `count` rewrites one text node; `roll` spins each digit on its own wheel, odometer style. */
  variant?: NumberTickerVariant
  /** Passed to Intl.NumberFormat: currency, percent, compact notation, units… */
  format?: Intl.NumberFormatOptions
  locale?: string
  /** Fixed number of fraction digits. Shorthand for minimum/maximumFractionDigits. */
  decimals?: number
  /** Tween for this many ms with an ease-out curve instead of using a spring. */
  duration?: number
  /** Spring used when `duration` is not set. */
  spring?: SpringConfig
  /** Wait before the first animation, in ms. */
  delay?: number
  /** `view` starts when the number scrolls into view; `mount` starts right away. */
  trigger?: NumberTickerTrigger
}

interface Motion {
  get: () => number
  set: (target: number) => void
  jump: (value: number) => void
  stop: () => void
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))

const createTween = (
  initial: number,
  onUpdate: (value: number) => void,
  duration: number,
) => {
  let value = initial
  let frame = 0
  const stop = () => {
    cancelAnimationFrame(frame)
    frame = 0
  }
  return {
    get: () => value,
    set: (target: number) => {
      stop()
      const origin = value
      // Anchored to the first frame: a frame's timestamp can precede a performance.now() read
      // taken just before it was requested.
      let start = -1
      const step = (now: number) => {
        if (start < 0) start = now
        const t = Math.min(1, (now - start) / duration)
        value = origin + (target - origin) * easeOutExpo(t)
        onUpdate(value)
        frame = t < 1 ? requestAnimationFrame(step) : 0
      }
      frame = requestAnimationFrame(step)
    },
    jump: (next: number) => {
      stop()
      value = next
      onUpdate(value)
    },
    stop,
  } satisfies Motion
}

const createMotion = (
  initial: number,
  onUpdate: (value: number) => void,
  duration: number | undefined,
  spring: SpringConfig,
): Motion | Spring =>
  duration
    ? createTween(initial, onUpdate, duration)
    : createSpring(initial, onUpdate, spring)

const COUNT_SPRING: SpringConfig = { stiffness: 100, damping: 22 }
// Slightly under-damped, so each wheel settles with a small mechanical overshoot.
const ROLL_SPRING: SpringConfig = { stiffness: 150, damping: 19, precision: 0.002 }

interface Slot {
  key: string
  text: string
  /** 0–9 for a digit wheel; undefined for symbols, separators and signs. */
  digit?: number
}

const mod10 = (value: number) => ((value % 10) + 10) % 10

const digitGlyphs = (formatter: Intl.NumberFormat): string[] => {
  const { locale, numberingSystem } = formatter.resolvedOptions()
  const plain = new Intl.NumberFormat(locale, { numberingSystem, useGrouping: false })
  return Array.from({ length: 10 }, (_, digit) => plain.format(digit))
}

// Digits are keyed by place value (i0 = ones, f0 = tenths), so a wheel keeps its identity when
// the number grows a digit on the left, and separators keyed by the digit after them stay put.
const toSlots = (parts: Intl.NumberFormatPart[], glyphs: string[]): Slot[] => {
  let place = parts
    .filter((part) => part.type === "integer")
    .reduce((count, part) => count + Array.from(part.value).length, 0)
  let fraction = 0
  const seen = new Map<string, number>()
  const slots: Slot[] = []
  for (const part of parts) {
    if (part.type === "integer" || part.type === "fraction") {
      for (const char of Array.from(part.value)) {
        const key = part.type === "integer" ? `i${--place}` : `f${fraction++}`
        const digit = glyphs.indexOf(char)
        slots.push(digit === -1 ? { key, text: char } : { key, text: char, digit })
      }
    } else if (part.type === "group") {
      slots.push({ key: `g${place}`, text: part.value })
    } else {
      const count = (seen.get(part.type) ?? -1) + 1
      seen.set(part.type, count)
      slots.push({ key: `${part.type}${count}`, text: part.value })
    }
  }
  return slots
}

const exponentOf = (key: string) =>
  key.startsWith("i") ? Number(key.slice(1)) : -(Number(key.slice(1)) + 1)

const digitsOf = (slots: Slot[]) => {
  const map = new Map<string, number>()
  for (const slot of slots) if (slot.digit !== undefined) map.set(slot.key, slot.digit)
  return map
}

/** The number formed by every digit at or above `exponent`, read in units of that place. */
const valueAbove = (digits: Map<string, number>, exponent: number) => {
  let total = 0
  for (const [key, digit] of digits) {
    const e = exponentOf(key)
    if (e >= exponent) total += digit * 10 ** (e - exponent)
  }
  return total
}

const reelOffset = (position: number) => `translateY(${(-mod10(position) * 100) / 11}%)`

/*
 * Roll: each digit is a window onto a reel of 0-9 plus a trailing 0, so 9 to 0 wraps. The window
 * reaches 0.14em past the 1.2em cell on each side, faded out by the mask.
 */
const digitClass = [
  "kg-number-ticker__digit relative inline-block -my-[0.14em] py-[0.14em] leading-[1.2]",
  "[mask-image:linear-gradient(transparent,#000_0.14em,#000_calc(100%_-_0.14em),transparent)]",
].join(" ")

interface Wheel {
  motion: Motion
  target: number
  reel: HTMLElement
}

/**
 * Counts up to a number when it scrolls into view, and animates every later change. `count`
 * rewrites a single text node through a spring; `roll` spins per-digit wheels like an odometer.
 * Both reserve their final width, use tabular figures and expose only the final value to
 * assistive tech.
 */
export const NumberTicker = forwardRef<HTMLSpanElement, NumberTickerProps>(
  (
    {
      value,
      from = 0,
      variant = "count",
      format,
      locale: localeProp,
      decimals,
      duration,
      spring,
      delay = 0,
      trigger = "view",
      className,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLSpanElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const countRef = useRef<HTMLSpanElement>(null)
    const valueRef = useRef<HTMLSpanElement>(null)
    const reduced = useReducedMotion()
    const locale = useLocale(localeProp)
    const inView = useInView(local, { once: true, amount: 0.5 })
    const [armed, setArmed] = useState(false)
    const triggered = trigger === "mount" || inView

    const formatKey = JSON.stringify(format ?? null)
    // Intl defaults to three fraction digits, which would print 24.234 on the way to 95. Unless
    // the caller decides, in-between frames carry as many decimals as the target itself.
    const fractionDigits =
      decimals ??
      (format?.maximumFractionDigits === undefined &&
      format?.style !== "currency" &&
      format?.style !== "percent"
        ? (String(value).split(".")[1] ?? "").length
        : undefined)
    const formatter = useMemo(
      () =>
        new Intl.NumberFormat(locale, {
          ...(fractionDigits === undefined
            ? null
            : {
                minimumFractionDigits: fractionDigits,
                maximumFractionDigits: fractionDigits,
              }),
          ...format,
        }),
      // `formatKey` stands in for `format`, which is usually an inline object literal.
      [locale, fractionDigits, formatKey],
    )
    const glyphs = useMemo(() => digitGlyphs(formatter), [formatter])
    const finalText = formatter.format(value)
    const fromText = formatter.format(from)
    const slots = useMemo(
      () => (variant === "roll" ? toSlots(formatter.formatToParts(value), glyphs) : []),
      [variant, formatter, glyphs, value],
    )

    useEffect(() => {
      if (!triggered || armed) return
      if (delay <= 0) {
        setArmed(true)
        return
      }
      const timer = setTimeout(() => setArmed(true), delay)
      return () => clearTimeout(timer)
    }, [triggered, armed, delay])

    // What should be on screen: the start value until triggered, then the real one.
    const target = reduced || armed ? value : from
    const springConfig = spring ?? (variant === "roll" ? ROLL_SPRING : COUNT_SPRING)
    const springRef = useRef(springConfig)
    springRef.current = springConfig

    const count = useRef<{
      motion: Motion
      duration: number | undefined
      target: number
    } | null>(null)

    useIsomorphicLayoutEffect(() => {
      const node = countRef.current
      if (variant !== "count" || !node) return
      const write = (current: number) => {
        node.textContent = formatter.format(current)
      }
      let state = count.current
      if (!state || state.duration !== duration) {
        const start = state ? state.motion.get() : target
        state?.motion.stop()
        const fraction = formatter.resolvedOptions().maximumFractionDigits ?? 0
        const unit = (format?.style === "percent" ? 0.01 : 1) * 10 ** -fraction
        state = count.current = {
          motion: createMotion(start, write, duration, {
            precision: unit / 2,
            ...springRef.current,
          }),
          duration,
          target: start,
        }
      }
      // React may have just written the final value into the node; put the live one back first.
      write(state.motion.get())
      if (state.target === target) return
      state.target = target
      if (reduced) state.motion.jump(target)
      else state.motion.set(target)
    }, [variant, target, reduced, duration, formatter, format?.style])

    const wheels = useRef(new Map<string, Wheel>())
    const shown = useRef<Map<string, number> | null>(null)

    useIsomorphicLayoutEffect(() => {
      const root = valueRef.current
      if (variant !== "roll" || !root) {
        for (const wheel of wheels.current.values()) wheel.motion.stop()
        wheels.current.clear()
        shown.current = null
        return
      }
      const next = digitsOf(toSlots(formatter.formatToParts(target), glyphs))
      const previous = shown.current ?? next
      shown.current = next
      const present = new Set<string>()

      for (const node of root.querySelectorAll<HTMLElement>("[data-place]")) {
        const key = node.dataset.place as string
        const reel = node.lastElementChild as HTMLElement
        const digit = next.get(key) ?? 0
        present.add(key)
        let wheel = wheels.current.get(key)
        if (!wheel) {
          const start = previous.get(key) ?? 0
          const created: Wheel = {
            target: start,
            reel,
            motion: createMotion(
              start,
              (position) => {
                created.reel.style.transform = reelOffset(position)
              },
              duration,
              springRef.current,
            ),
          }
          wheel = created
          wheels.current.set(key, wheel)
        }
        wheel.reel = reel

        // A wheel turns once per unit change at its place, as on a real odometer, capped at one
        // extra revolution so the ones column doesn't strobe through thousands of turns.
        const exponent = exponentOf(key)
        let steps = valueAbove(next, exponent) - valueAbove(previous, exponent)
        if (Math.abs(steps) > 10)
          steps = Math.sign(steps) * (mod10(Math.abs(steps)) + 10)
        if (mod10(wheel.target + steps) !== digit) steps = digit - mod10(wheel.target)
        wheel.target += steps

        // React may have just reset the inline transform to the final digit: restore the live one
        // before paint, then move.
        wheel.reel.style.transform = reelOffset(wheel.motion.get())
        if (reduced) wheel.motion.jump(wheel.target)
        else if (steps !== 0) wheel.motion.set(wheel.target)
      }

      for (const [key, wheel] of wheels.current) {
        if (present.has(key)) continue
        wheel.motion.stop()
        wheels.current.delete(key)
      }
    }, [variant, target, reduced, slots, formatter, glyphs, duration])

    useEffect(
      () => () => {
        count.current?.motion.stop()
        for (const wheel of wheels.current.values()) wheel.motion.stop()
      },
      [],
    )

    return (
      <span
        ref={ref}
        className={cx("kg-number-ticker tabular-nums whitespace-nowrap", className)}
        data-variant={variant}
        style={style as CSSProperties}
        {...props}
      >
        <span className="kg-visually-hidden kg-number-ticker__label select-none">
          {finalText}
        </span>
        {variant === "count" ? (
          <span
            ref={valueRef}
            className="kg-number-ticker__value inline-grid justify-items-end *:[grid-area:1/1]"
            aria-hidden="true"
          >
            <span className="kg-number-ticker__sizer invisible">{finalText}</span>
            <span className="kg-number-ticker__sizer invisible">{fromText}</span>
            <span ref={countRef} className="kg-number-ticker__count">
              {finalText}
            </span>
          </span>
        ) : (
          <span ref={valueRef} className="kg-number-ticker__value" aria-hidden="true">
            {slots.map((slot) =>
              slot.digit === undefined ? (
                <span key={slot.key} className="kg-number-ticker__symbol">
                  {slot.text}
                </span>
              ) : (
                <span
                  key={slot.key}
                  className={digitClass}
                  data-place={slot.key}
                >
                  <span className="kg-number-ticker__sizer invisible">{slot.text}</span>
                  <span
                    className="kg-number-ticker__reel absolute inset-x-0 top-[0.14em] flex flex-col text-center will-change-transform *:block"
                    style={{ transform: reelOffset(slot.digit) }}
                  >
                    {glyphs.map((glyph, index) => (
                      <span key={index}>{glyph}</span>
                    ))}
                    <span>{glyphs[0]}</span>
                  </span>
                </span>
              ),
            )}
          </span>
        )}
      </span>
    )
  },
)

NumberTicker.displayName = "NumberTicker"
