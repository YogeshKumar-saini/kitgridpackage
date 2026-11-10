"use client"

import {
  type ChangeEvent,
  type CSSProperties,
  forwardRef,
  type TextareaHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"
import { resolveFieldControl, useField } from "../field/field.js"

/*
 * Paper Layers: the same white sheet as Input. Focus lifts it off the page with an offset in
 * ink, or in danger while invalid.
 */
export const textareaVariants = variants({
  base: [
    "kg-textarea flex flex-col w-full min-w-0 text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-kg-md",
    "transition-[background-color,border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
    "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-kg-ring",
    "focus-within:shadow-[3px_3px_0_var(--_lift,var(--kg-ink))]",
    "data-invalid:border-kg-danger data-invalid:[--_lift:var(--kg-danger)]",
    "data-readonly:bg-kg-surface-sunken",
    "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:shadow-none",
  ],
  variants: {
    size: {
      sm: "text-kg-sm",
      md: "text-kg-base",
      lg: "text-kg-md",
    },
  },
  defaults: { size: "md" },
})

export type TextareaSize = NonNullable<VariantProps<typeof textareaVariants>["size"]>

/** Block padding per size, in density units, so the row count sets the height. */
const PAD_Y: Record<TextareaSize, number> = { sm: 1.5, md: 2, lg: 3 }

const controlPad: Record<TextareaSize, string> = {
  sm: "px-2.5 py-1.5",
  md: "px-3 py-2",
  lg: "px-4 py-3",
}

const footerPad: Record<TextareaSize, string> = {
  sm: "px-2.5 pb-[calc(var(--kg-space)*1.125)] -mt-0.75",
  md: "px-3 pb-1.5 -mt-1",
  lg: "px-4 pb-[calc(var(--kg-space)*2.25)] -mt-1.5",
}

const LINE = "1.55em"

const rowsHeight = (rows: number, padY: number) =>
  `calc(${rows} * ${LINE} + var(--kg-space) * ${padY * 2})`

const dangerText = "text-[color-mix(in_oklab,var(--kg-danger),var(--kg-fg)_30%)]"

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  size?: TextareaSize
  invalid?: boolean
  /** Grow with the content between `minRows` and `maxRows`. */
  autoGrow?: boolean
  minRows?: number
  /** Scrolls beyond this many rows. Unlimited when omitted. */
  maxRows?: number
  /** Show a character count when `maxLength` is set. */
  showCount?: boolean
  /** Remaining characters at which the count starts being announced. Defaults to 10% of `maxLength`, at least 10. */
  countThreshold?: number
  /** Announcement text once the count is near the limit. */
  countLabel?: (remaining: number, max: number) => string
}

const defaultCountLabel = (remaining: number) =>
  remaining === 1 ? "1 character remaining" : `${remaining} characters remaining`

const supportsFieldSizing = (): boolean =>
  typeof CSS !== "undefined" && typeof CSS.supports === "function"
    ? CSS.supports("field-sizing", "content")
    : false

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      size = "md",
      invalid: invalidProp,
      autoGrow = true,
      minRows = 3,
      maxRows,
      showCount = true,
      countThreshold,
      countLabel = defaultCountLabel,
      maxLength,
      className,
      style,
      id: idProp,
      disabled: disabledProp,
      required: requiredProp,
      readOnly = false,
      value,
      defaultValue,
      onChange,
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
      ...props
    },
    forwardedRef,
  ) => {
    const field = useField()
    const control = resolveFieldControl(field, {
      id: idProp,
      disabled: disabledProp,
      required: requiredProp,
      invalid: invalidProp,
      "aria-describedby": ariaDescribedBy,
      "aria-errormessage": ariaErrorMessage,
    })
    const local = useRef<HTMLTextAreaElement>(null)
    const ref = useComposedRefs(local, forwardedRef)

    const controlled = value !== undefined
    const [uncontrolledLength, setUncontrolledLength] = useState(
      defaultValue === undefined ? 0 : String(defaultValue).length,
    )
    const length = controlled ? String(value ?? "").length : uncontrolledLength
    const counting = showCount && maxLength !== undefined && maxLength > 0
    const remaining = counting ? Math.max(0, maxLength - length) : 0
    const threshold = countThreshold ?? Math.max(10, Math.ceil((maxLength ?? 0) * 0.1))
    const near = counting && remaining <= threshold

    // Browsers without `field-sizing: content` get the classic measure-and-set fallback.
    const resize = () => {
      const node = local.current
      if (!node || !autoGrow || supportsFieldSizing()) return
      const borders = node.offsetHeight - node.clientHeight
      node.style.height = "auto"
      node.style.height = `${node.scrollHeight + borders}px`
    }

    useIsomorphicLayoutEffect(resize, [value, autoGrow, minRows, maxRows])

    useEffect(() => {
      const node = local.current
      if (!node || !autoGrow || supportsFieldSizing()) return
      let width = node.clientWidth
      const observer = new ResizeObserver(() => {
        if (node.clientWidth === width) return
        width = node.clientWidth
        resize()
      })
      observer.observe(node)
      return () => observer.disconnect()
    }, [autoGrow])

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      if (!controlled) {
        setUncontrolledLength(event.currentTarget.value.length)
        resize()
      }
      onChange?.(event)
    }

    const padY = PAD_Y[size]

    return (
      <div
        className={textareaVariants({ size, className })}
        style={
          {
            "--_min-h": rowsHeight(minRows, padY),
            ...(maxRows ? { "--_max-h": rowsHeight(maxRows, padY) } : null),
            ...style,
          } as CSSProperties
        }
        data-size={size}
        data-auto-grow={autoGrow || undefined}
        data-invalid={control.invalid || undefined}
        data-disabled={control.disabled || undefined}
        data-readonly={readOnly || undefined}
      >
        <textarea
          ref={ref}
          id={control.id}
          className={cx(
            "kg-textarea__control block w-full min-h-(--_min-h) max-h-(--_max-h) m-0 [font:inherit] leading-[1.55em] text-inherit",
            "bg-transparent border-0 rounded-[inherit] outline-none caret-kg-accent-strong [scrollbar-width:thin]",
            "placeholder:text-kg-fg-faint placeholder:opacity-100 disabled:cursor-not-allowed disabled:resize-none",
            autoGrow ? "[field-sizing:content] resize-none overflow-y-auto" : "resize-y",
            controlPad[size],
          )}
          rows={minRows}
          maxLength={maxLength}
          disabled={control.disabled}
          required={control.required}
          readOnly={readOnly}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          aria-invalid={control.invalid || undefined}
          aria-describedby={control.describedBy}
          aria-errormessage={control.errorMessage}
          {...props}
        />
        {counting && (
          <div className={cx("kg-textarea__footer flex justify-end pointer-events-none", footerPad[size])}>
            <span
              className={cx(
                "kg-textarea__count kg-tabular text-kg-xs leading-[1.2] transition-colors duration-(--kg-duration-fast) ease-kg-out",
                remaining === 0
                  ? cx(dangerText, "font-[550]")
                  : near
                    ? "text-[color-mix(in_oklab,var(--kg-warning),var(--kg-fg)_35%)] font-[550]"
                    : "text-kg-fg-muted",
              )}
              data-near={near || undefined}
              data-full={remaining === 0 || undefined}
              aria-hidden="true"
            >
              {length}/{maxLength}
            </span>
            {/* Announced only near the limit, so every keystroke isn't read out. */}
            <span className="kg-visually-hidden" aria-live="polite">
              {near ? countLabel(remaining, maxLength) : ""}
            </span>
          </div>
        )}
      </div>
    )
  },
)

Textarea.displayName = "Textarea"
