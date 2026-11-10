"use client"

import { forwardRef, useRef } from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { CheckIcon, CopyIcon } from "../copy-field/copy-field.js"
import { useCopy } from "../copy-field/copy-text.js"
import { Input, type InputProps } from "../input/input.js"

export interface SecretInputProps extends Omit<InputProps, "type" | "trailing" | "onClear"> {
  revealed?: boolean
  defaultRevealed?: boolean
  onRevealedChange?: (revealed: boolean) => void
  /** Adds a copy button that copies the current value. */
  copyable?: boolean
  revealLabel?: string
  copyLabel?: string
  copiedLabel?: string
}

const EyeIcon = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
    <path
      className={cx(
        "kg-secret-input__slash [stroke-dasharray:24] [stroke-dashoffset:24]",
        "transition-[stroke-dashoffset] duration-(--kg-duration-base) ease-kg-out data-on:[stroke-dashoffset:0]",
      )}
      d="M4 4l16 16"
      strokeLinecap="round"
      data-on={off || undefined}
    />
  </svg>
)

const button = cx(
  "kg-secret-input__button inline-grid place-items-center size-[1.75rem] p-0",
  "border-0 rounded-kg-sm bg-transparent text-kg-fg-muted cursor-pointer",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "interactive:hover:bg-kg-muted interactive:hover:text-kg-fg data-copied:text-kg-success",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring",
)

/** A password-style field for tokens and secrets, with reveal and optional copy. */
export const SecretInput = forwardRef<HTMLInputElement, SecretInputProps>(
  (
    {
      revealed: revealedProp,
      defaultRevealed = false,
      onRevealedChange,
      copyable = false,
      revealLabel = "Show value",
      copyLabel = "Copy value",
      copiedLabel = "Copied",
      className,
      autoComplete = "off",
      spellCheck = false,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLInputElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const [revealed, setRevealed] = useControllableState({
      value: revealedProp,
      defaultValue: defaultRevealed,
      onChange: onRevealedChange,
    })
    const { copied, copy } = useCopy()

    return (
      <Input
        ref={ref}
        {...props}
        className={cx("kg-secret-input font-kg-mono tracking-[0.02em]", className)}
        type={revealed ? "text" : "password"}
        autoComplete={autoComplete}
        spellCheck={spellCheck}
        data-revealed={revealed || undefined}
        trailing={
          <span className="kg-secret-input__actions inline-flex items-center gap-0.5 -me-1.5">
            <button
              type="button"
              className={button}
              aria-label={revealLabel}
              aria-pressed={revealed}
              disabled={props.disabled}
              onClick={() => setRevealed(!revealed)}
            >
              <EyeIcon off={!revealed} />
            </button>
            {copyable && (
              <button
                type="button"
                className={button}
                aria-label={copyLabel}
                data-copied={copied || undefined}
                disabled={props.disabled}
                onClick={() => void copy(local.current?.value ?? "")}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            )}
            <span className="kg-visually-hidden" role="status">
              {copied ? copiedLabel : ""}
            </span>
          </span>
        }
      />
    )
  },
)

SecretInput.displayName = "SecretInput"
