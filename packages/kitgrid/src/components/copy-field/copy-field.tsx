"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"
import { useCopy } from "./copy-text.js"

/* Paper Layers: the value sits in a sunken well with an ink edge; the copy glyph turns into a check. */
export const copyFieldVariants = variants({
  base: "kg-copy-field group/copy grid gap-1.5 min-w-0",
  variants: {
    variant: { field: "", command: "" },
    size: {
      sm: "[--_h:var(--kg-control-sm)]",
      md: "[--_h:var(--kg-control-md)]",
    },
  },
  defaults: { variant: "field", size: "md" },
})

type CopyFieldVariantProps = VariantProps<typeof copyFieldVariants>
export type CopyFieldVariant = NonNullable<CopyFieldVariantProps["variant"]>
export type CopyFieldSize = NonNullable<CopyFieldVariantProps["size"]>

const icon = cx(
  "kg-copy-field__icon col-start-1 row-start-1 grid size-4 [&_svg]:size-full",
  "transition-[opacity,rotate,scale] duration-(--kg-duration-base) ease-kg-out",
)

export interface CopyFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "onCopy"> {
  value: string
  /** Visible label above the value. Also names the copy button. */
  label?: ReactNode
  /** Names the copy button when there is no visible label. */
  "aria-label"?: string
  /** `command` prints a shell prompt and uses mono type. */
  variant?: CopyFieldVariant
  size?: CopyFieldSize
  /** Prompt glyph for the command variant. */
  prompt?: string
  /** What is shown, when it differs from what is copied (a truncated URL, say). */
  display?: ReactNode
  onCopy?: (value: string) => void
  copyLabel?: string
  copiedLabel?: string
}

export const CopyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M5 15V5.5A2.5 2.5 0 0 1 7.5 3H15" strokeLinecap="round" />
  </svg>
)

export const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** A read-only value with a copy button: install commands, IDs, URLs. */
export const CopyField = forwardRef<HTMLDivElement, CopyFieldProps>(
  (
    {
      value,
      label,
      variant = "field",
      size = "md",
      prompt = "$",
      display,
      onCopy,
      copyLabel = "Copy",
      copiedLabel = "Copied",
      className,
      "aria-label": ariaLabel,
      ...props
    },
    ref,
  ) => {
    const labelId = useId()
    const { copied, copy } = useCopy()
    const name = typeof label === "string" ? label : ariaLabel

    const handleCopy = async () => {
      if (await copy(value)) onCopy?.(value)
    }

    return (
      <div
        ref={ref}
        className={copyFieldVariants({ variant, size, className })}
        data-variant={variant}
        data-size={size}
        data-state={copied ? "copied" : "idle"}
        {...props}
      >
        {label != null && (
          <span id={labelId} className="kg-copy-field__label text-kg-xs font-[560] text-kg-fg-muted">
            {label}
          </span>
        )}
        <div
          className={cx(
            "kg-copy-field__box relative flex items-center gap-2 min-w-0 h-(--_h) ps-3 pe-1",
            "bg-kg-surface-sunken border-2 border-kg-ink rounded-kg-md",
          )}
        >
          {variant === "command" && (
            <span
              className="kg-copy-field__prompt shrink-0 font-kg-mono text-kg-sm text-kg-accent-strong select-none"
              aria-hidden="true"
            >
              {prompt}
            </span>
          )}
          <code
            className={cx(
              "kg-copy-field__value flex-1 min-w-0 overflow-hidden p-0 bg-transparent rounded-none",
              "font-kg-mono text-kg-sm text-kg-fg whitespace-nowrap text-ellipsis",
            )}
            aria-labelledby={label != null ? labelId : undefined}
          >
            {display ?? value}
          </code>
          <button
            type="button"
            className={cx(
              "kg-copy-field__button relative grid shrink-0 place-items-center size-[calc(var(--_h)-0.5rem)] p-0",
              "border-0 rounded-kg-sm bg-transparent text-kg-fg-muted cursor-pointer",
              "transition-colors duration-(--kg-duration-fast) ease-kg-out",
              "interactive:hover:bg-kg-muted interactive:hover:text-kg-fg",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
            )}
            aria-label={name ? `${copyLabel} ${name}` : copyLabel}
            onClick={handleCopy}
          >
            <span
              className={cx(
                icon,
                "group-data-[state=copied]/copy:opacity-0 group-data-[state=copied]/copy:rotate-90 group-data-[state=copied]/copy:scale-50",
              )}
              data-icon="copy"
            >
              <CopyIcon />
            </span>
            <span
              className={cx(
                icon,
                "text-kg-success opacity-0 -rotate-90 scale-50",
                "group-data-[state=copied]/copy:opacity-100 group-data-[state=copied]/copy:rotate-0 group-data-[state=copied]/copy:scale-100",
              )}
              data-icon="check"
            >
              <CheckIcon />
            </span>
          </button>
          <span className="kg-visually-hidden" role="status">
            {copied ? copiedLabel : ""}
          </span>
        </div>
      </div>
    )
  },
)

CopyField.displayName = "CopyField"
