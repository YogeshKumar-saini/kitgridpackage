"use client"

import {
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { Button, type ButtonProps } from "../button/button.js"

export type ConfirmButtonMode = "click" | "hold"

export interface ConfirmButtonProps extends Omit<ButtonProps, "onClick" | "asChild"> {
  /** Runs once the action is confirmed. */
  onConfirm: () => void
  /** `click` asks for a second press; `hold` fills a ring while the button is held. */
  mode?: ConfirmButtonMode
  /** Shown while armed in `click` mode. */
  confirmLabel?: ReactNode
  /** Disarms an unanswered first press after this long, in ms. */
  timeout?: number
  /** How long to hold in `hold` mode, in ms. */
  holdDuration?: number
  /** Announced with the button in `hold` mode. */
  holdHint?: string
  /** Announced when a first press arms the button. */
  armedAnnouncement?: string
}

const KEYS = new Set(["Enter", " "])

export const ConfirmButton = forwardRef<HTMLButtonElement, ConfirmButtonProps>(
  (
    {
      onConfirm,
      mode = "click",
      confirmLabel = "Click again to confirm",
      timeout = 3000,
      holdDuration = 1200,
      holdHint = "Press and hold to confirm",
      armedAnnouncement = "Press again to confirm",
      variant = "danger",
      className,
      style,
      children,
      leading,
      disabled,
      onBlur,
      onKeyDown,
      onKeyUp,
      onPointerDown,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
      ...props
    },
    ref,
  ) => {
    const [armed, setArmed] = useState(false)
    const [holding, setHolding] = useState(false)
    const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
    const keyHeld = useRef(false)
    const hintId = useId()

    useEffect(() => {
      if (!armed) return
      const timer = setTimeout(() => setArmed(false), timeout)
      return () => clearTimeout(timer)
    }, [armed, timeout])

    useEffect(() => () => clearTimeout(holdTimer.current), [])

    const confirm = () => {
      setArmed(false)
      onConfirm()
    }

    const startHold = () => {
      if (disabled || holding) return
      setHolding(true)
      holdTimer.current = setTimeout(() => {
        setHolding(false)
        confirm()
      }, holdDuration)
    }

    const cancelHold = () => {
      clearTimeout(holdTimer.current)
      setHolding(false)
    }

    const twoStep = () => {
      if (armed) confirm()
      else setArmed(true)
    }

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      if (mode === "click") {
        twoStep()
        return
      }
      // Screen readers activate with a synthetic click (detail 0) and no key or pointer
      // press, so holding is impossible there; they get the two-step flow instead.
      if (event.detail === 0 && !keyHeld.current) twoStep()
    }

    const hold = mode === "hold"

    return (
      <>
        <Button
          ref={ref}
          variant={variant}
          className={cx(
            "kg-confirm-button",
            "data-armed:animate-[kg-confirm-button-nudge_var(--kg-duration-slow)_var(--kg-ease-out)]",
            "data-[mode=hold]:touch-manipulation data-[mode=hold]:select-none data-[mode=hold]:[-webkit-touch-callout:none]",
            "data-holding:scale-97",
            className,
          )}
          data-mode={mode}
          data-armed={armed || undefined}
          data-holding={holding || undefined}
          disabled={disabled}
          aria-describedby={hold ? hintId : undefined}
          style={style}
          leading={
            hold ? (
              <svg
                className="kg-confirm-button__ring shrink-0 size-[1.125em] -rotate-90 fill-none [stroke-width:2.5]"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <circle
                  className="kg-confirm-button__track stroke-current opacity-30"
                  cx="10"
                  cy="10"
                  r="8"
                />
                <circle
                  className={cx(
                    "kg-confirm-button__progress stroke-current [stroke-linecap:round] [stroke-dasharray:1]",
                    "transition-[stroke-dashoffset]",
                    holding ? "[stroke-dashoffset:0] ease-linear" : "[stroke-dashoffset:1] duration-(--kg-duration-base) ease-kg-out",
                  )}
                  style={holding ? { transitionDuration: `${holdDuration}ms` } : undefined}
                  cx="10"
                  cy="10"
                  r="8"
                  pathLength={1}
                />
              </svg>
            ) : (
              leading
            )
          }
          onClick={handleClick}
          onBlur={(event) => {
            onBlur?.(event)
            setArmed(false)
            cancelHold()
          }}
          onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
            onKeyDown?.(event)
            if (event.key === "Escape" && (armed || holding)) {
              event.preventDefault()
              setArmed(false)
              cancelHold()
              return
            }
            if (!hold || !KEYS.has(event.key) || event.repeat) return
            event.preventDefault()
            keyHeld.current = true
            startHold()
          }}
          onKeyUp={(event: KeyboardEvent<HTMLButtonElement>) => {
            onKeyUp?.(event)
            if (!hold || !KEYS.has(event.key)) return
            // Space would otherwise click on release, which reads as a screen reader press.
            event.preventDefault()
            keyHeld.current = false
            cancelHold()
          }}
          onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
            onPointerDown?.(event)
            if (hold && event.button === 0) startHold()
          }}
          onPointerUp={(event) => {
            onPointerUp?.(event)
            if (hold) cancelHold()
          }}
          onPointerLeave={(event) => {
            onPointerLeave?.(event)
            if (hold) cancelHold()
          }}
          onPointerCancel={(event) => {
            onPointerCancel?.(event)
            if (hold) cancelHold()
          }}
          {...props}
        >
          {armed ? confirmLabel : children}
        </Button>
        {hold && (
          <span id={hintId} className="kg-visually-hidden">
            {holdHint}
          </span>
        )}
        <span role="status" className="kg-visually-hidden">
          {armed ? armedAnnouncement : ""}
        </span>
      </>
    )
  },
)

ConfirmButton.displayName = "ConfirmButton"
