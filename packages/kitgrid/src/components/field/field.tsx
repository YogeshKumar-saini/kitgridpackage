"use client"

import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useId,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"

export interface FieldContextValue {
  /** Id the control should put on its focusable element so the label targets it. */
  id: string
  /** Id of the rendered label, for controls a `<label for>` cannot name (groups, sliders). */
  labelId: string | undefined
  /** Space-separated ids of the description and, while invalid, the error message. */
  describedBy: string | undefined
  /** Id of the error message while one is shown, for `aria-errormessage`. */
  errorId: string | undefined
  invalid: boolean
  disabled: boolean
  required: boolean
}

/** @internal Composite controls reset it to `null` so their items don't claim the field id. */
export const FieldContext = createContext<FieldContextValue | null>(null)

/** The surrounding Field's wiring, or `null` outside one. Use it to build custom controls. */
export const useField = (): FieldContextValue | null => useContext(FieldContext)

export interface FieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label?: ReactNode
  /** Helper text shown under the label and announced with the control. */
  description?: ReactNode
  /** Shown below the control. Any truthy value also marks the field invalid. */
  error?: ReactNode
  /** Marks the field invalid without a message, e.g. while the error is shown elsewhere. */
  invalid?: boolean
  required?: boolean
  disabled?: boolean
  /** Id for the control. Generated when omitted. */
  controlId?: string
  children?: ReactNode
}

// Danger pulled toward the text colour, so the message stays AA on the page as well as on sheets.
const errorClass = cx(
  "kg-field__error flex items-start gap-[0.4em] m-0 text-kg-sm font-medium leading-[1.45]",
  "text-[color-mix(in_oklab,var(--kg-danger),var(--kg-fg)_30%)]",
)

/** A glyph beside the text, so the state is never conveyed by colour alone. */
const ErrorIcon = () => (
  <svg
    className="kg-field__error-icon shrink-0 size-[1em] mt-[0.22em] text-kg-danger"
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
  >
    <circle cx="8" cy="8" r="8" fill="currentColor" />
    <path d="M8 4.2v4.6" stroke="var(--kg-danger-fg)" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="8" cy="11.6" r="1.1" fill="var(--kg-danger-fg)" />
  </svg>
)

const messageKey = (error: ReactNode): string =>
  typeof error === "string" || typeof error === "number" ? `m:${error}` : "message"

export const Field = forwardRef<HTMLDivElement, FieldProps>(
  (
    {
      label,
      description,
      error,
      invalid: invalidProp = false,
      required = false,
      disabled = false,
      controlId,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const generated = useId()
    const id = controlId ?? `${generated}-control`
    const labelId = label != null ? `${generated}-label` : undefined
    const descriptionId = description != null ? `${generated}-description` : undefined
    const hasError = error != null && error !== false && error !== ""
    const errorId = hasError ? `${generated}-error` : undefined
    const invalid = invalidProp || hasError

    // Keeps the last message on screen while the region collapses, so the exit can animate.
    const [lastError, setLastError] = useState<ReactNode>(hasError ? error : null)
    if (hasError && error !== lastError) setLastError(error)

    const value: FieldContextValue = {
      id,
      labelId,
      describedBy: [descriptionId, errorId].filter(Boolean).join(" ") || undefined,
      errorId,
      invalid,
      disabled,
      required,
    }

    return (
      <div
        ref={ref}
        className={cx("kg-field grid gap-1.5 min-w-0 text-kg-fg", className)}
        data-invalid={invalid || undefined}
        data-disabled={disabled || undefined}
        {...props}
      >
        {label != null && (
          <label
            id={labelId}
            htmlFor={id}
            className={cx(
              "kg-field__label inline-flex items-baseline gap-[0.2em] justify-self-start cursor-default",
              "text-kg-sm font-semibold leading-[1.35] tracking-[-0.005em] text-kg-fg",
              disabled && "opacity-50",
            )}
          >
            {label}
            {required && (
              <span className="kg-field__required font-semibold text-kg-danger" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        {description != null && (
          <p
            id={descriptionId}
            className={cx(
              "kg-field__description m-0 -mt-0.5 text-kg-sm leading-[1.45] text-kg-fg-muted",
              disabled && "opacity-50",
            )}
          >
            {description}
          </p>
        )}
        <FieldContext.Provider value={value}>{children}</FieldContext.Provider>
        <div
          className={cx(
            "kg-field__error-region grid transition-[grid-template-rows,margin-top,opacity,visibility] duration-(--kg-duration-base) ease-kg-out",
            hasError ? "grid-rows-[1fr] mt-0 opacity-100 visible" : "grid-rows-[0fr] -mt-1.5 opacity-0 invisible",
          )}
          data-state={hasError ? "open" : "closed"}
          aria-live="polite"
        >
          <div className="kg-field__error-clip min-h-0 overflow-hidden">
            {hasError ? (
              // A new key per message remounts the node, so the live region announces it again.
              <p key={messageKey(error)} id={errorId} className={errorClass}>
                <ErrorIcon />
                {error}
              </p>
            ) : (
              lastError != null && (
                <p key="stale" className={errorClass} aria-hidden="true">
                  <ErrorIcon />
                  {lastError}
                </p>
              )
            )}
          </div>
        </div>
      </div>
    )
  },
)

Field.displayName = "Field"

interface FieldControlInput {
  id?: string | undefined
  disabled?: boolean | undefined
  required?: boolean | undefined
  invalid?: boolean | undefined
  "aria-describedby"?: string | undefined
  "aria-errormessage"?: string | undefined
}

export interface ResolvedFieldControl {
  id: string | undefined
  labelId: string | undefined
  disabled: boolean
  required: boolean
  invalid: boolean
  describedBy: string | undefined
  errorMessage: string | undefined
}

export const joinIds = (
  ...ids: (string | undefined | false | null)[]
): string | undefined => ids.filter(Boolean).join(" ") || undefined

/**
 * @internal Merges a control's own props with the surrounding Field. Explicit props win, ids
 * are concatenated so both the control's and the field's descriptions are announced.
 */
export const resolveFieldControl = (
  field: FieldContextValue | null,
  props: FieldControlInput,
): ResolvedFieldControl => {
  const invalid = props.invalid ?? field?.invalid ?? false
  return {
    id: props.id ?? field?.id,
    labelId: field?.labelId,
    disabled: props.disabled ?? field?.disabled ?? false,
    required: props.required ?? field?.required ?? false,
    invalid,
    describedBy: joinIds(field?.describedBy, props["aria-describedby"]),
    errorMessage: props["aria-errormessage"] ?? (invalid ? field?.errorId : undefined),
  }
}
