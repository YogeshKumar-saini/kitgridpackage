"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useState,
} from "react"
import { usePresence } from "../../hooks/use-presence.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"

export interface FetchProgressProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether work is in flight. The bar fades out when this turns false. */
  active?: boolean
  /** 0 to 100 for known progress. Omit for an indeterminate sweep. */
  value?: number
  /** Wait this long before showing, in ms, so fast requests never flash a bar. */
  delay?: number
  /** Accessible name of the progress bar. */
  label?: string
  /** Pin to the viewport instead of the nearest positioned ancestor. */
  fixed?: boolean
}

/** A hairline progress bar along the top edge, for background fetches and route changes. */
export const FetchProgress = forwardRef<HTMLDivElement, FetchProgressProps>(
  (
    {
      active = true,
      value,
      delay = 300,
      label = "Loading",
      fixed = false,
      className,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const [late, setLate] = useState(delay <= 0)

    useEffect(() => {
      if (!active || delay <= 0) return
      const timer = setTimeout(() => setLate(true), delay)
      return () => {
        clearTimeout(timer)
        setLate(false)
      }
    }, [active, delay])

    const shown = active && late
    const { ref, present, state } = usePresence<HTMLDivElement>(shown)
    const composed = useComposedRefs(ref, forwardedRef)
    if (!present) return null

    const determinate = value !== undefined
    const percent = determinate ? clamp(value, 0, 100) : undefined

    return (
      <div
        ref={composed}
        role="progressbar"
        aria-label={label}
        aria-valuemin={determinate ? 0 : undefined}
        aria-valuemax={determinate ? 100 : undefined}
        aria-valuenow={percent !== undefined ? Math.round(percent) : undefined}
        className={cx(
          "kg-fetch-progress absolute inset-x-0 top-0 z-(--kg-z-sticky) h-[3px] overflow-hidden pointer-events-none",
          "data-fixed:fixed data-fixed:z-kg-toast",
          "data-[state=open]:animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]",
          "data-[state=closed]:animate-[kg-fade-out_var(--kg-duration-slow)_var(--kg-ease-out)_forwards]",
          className,
        )}
        data-state={state}
        data-mode={determinate ? "determinate" : "indeterminate"}
        data-fixed={fixed || undefined}
        style={
          {
            ...(percent !== undefined && { "--_value": percent / 100 }),
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        <div
          className={cx(
            "kg-fetch-progress__bar h-full bg-kg-accent rounded-e-full origin-left",
            determinate
              ? "[transform:scaleX(var(--_value,0))] transition-transform duration-(--kg-duration-slow) ease-kg-out"
              : cx(
                  "w-2/5 animate-[kg-fetch-progress-sweep_1.4s_var(--kg-ease-in-out)_infinite]",
                  "motion-reduce:[animation-duration:4s] in-data-[kg-motion=reduce]:[animation-duration:4s]",
                ),
          )}
        />
      </div>
    )
  },
)

FetchProgress.displayName = "FetchProgress"
