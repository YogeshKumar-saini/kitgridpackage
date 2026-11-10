import type { CSSProperties } from "react"
import { cx } from "../../utils/cx.js"

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]

export interface RollingDigitsProps {
  value: string
  className?: string | undefined
}

/**
 * Odometer-style digits: each position is a 0–9 strip translated by CSS, so a change rolls
 * without JavaScript animation, renders its final frame on the server and snaps under reduced
 * motion (the transition uses duration tokens). Decorative: callers expose the value elsewhere.
 */
export const RollingDigits = ({ value, className }: RollingDigitsProps) => {
  const chars = Array.from(value)
  return (
    <span
      className={cx(
        "kg-rolling-digits inline-flex h-[1.25em] whitespace-nowrap align-top leading-[1.25em] tabular-nums",
        className,
      )}
      aria-hidden="true"
    >
      {chars.map((char, index) => {
        // Keyed from the right so the ones digit keeps its element when the length changes.
        const key = chars.length - index
        if (char < "0" || char > "9") {
          return (
            <span key={`c${key}`} className="kg-rolling-digits__char inline-block">
              {char}
            </span>
          )
        }
        return (
          <span
            key={`d${key}`}
            className="kg-rolling-digits__digit inline-block h-[1.25em] overflow-hidden [mask-image:linear-gradient(transparent,black_22%,black_78%,transparent)]"
            style={{ "--_digit": char } as CSSProperties}
          >
            <span className="kg-rolling-digits__strip flex translate-y-[calc(var(--_digit)*-1.25em)] flex-col transition-[translate] duration-(--kg-duration-slow) ease-kg-out">
              {DIGITS.map((digit) => (
                <span key={digit} className="h-[1.25em] text-center">
                  {digit}
                </span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}
