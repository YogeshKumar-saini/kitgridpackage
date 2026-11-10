"use client"

import {
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { cx } from "../../utils/cx.js"
import { variants } from "../../utils/variants.js"

export type InlineEditSize = "sm" | "md" | "lg" | "xl"

export interface InlineEditProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: string
  defaultValue?: string
  /** Called on commit, not on every keystroke. */
  onValueChange?: (value: string) => void
  /** Names the field for assistive tech, e.g. "Project name". */
  label: string
  placeholder?: string
  size?: InlineEditSize
  /** Refuses to commit an empty value and restores the previous one. */
  required?: boolean
  /** Leaving the field commits; set false to make blur cancel instead. */
  commitOnBlur?: boolean
  maxLength?: number
  disabled?: boolean
  editing?: boolean
  onEditingChange?: (editing: boolean) => void
}

const inlineEditVariants = variants({
  base: "kg-inline-edit inline-flex max-w-full leading-[1.3]",
  variants: {
    size: {
      sm: "text-kg-sm font-[450]",
      md: "text-kg-base font-[450]",
      lg: "text-kg-lg font-semibold",
      xl: "text-(length:--kg-text-2xl) font-bold tracking-[-0.015em]",
    },
  },
  defaults: { size: "md" },
})

// Shared box so swapping text for the input never shifts the layout.
const box = "my-0 -mx-[0.45em] px-[0.45em] py-[0.25em] border-2 [font:inherit] text-kg-fg"

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path
      d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z M13.5 6.5l4 4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/**
 * Text that becomes an input when activated. Enter saves, Escape cancels and focus always
 * returns to the text, so keyboard users never lose their place.
 */
export const InlineEdit = forwardRef<HTMLDivElement, InlineEditProps>(
  (
    {
      value: valueProp,
      defaultValue = "",
      onValueChange,
      label,
      placeholder = "Empty",
      size = "md",
      required = false,
      commitOnBlur = true,
      maxLength,
      disabled,
      editing: editingProp,
      onEditingChange,
      className,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const [editing, setEditing] = useControllableState({
      value: editingProp,
      defaultValue: false,
      onChange: onEditingChange,
    })
    const [draft, setDraft] = useState(value)
    const inputRef = useRef<HTMLInputElement>(null)
    const buttonRef = useRef<HTMLButtonElement>(null)
    const returnFocus = useRef(false)

    useEffect(() => {
      if (editing) {
        inputRef.current?.focus()
        inputRef.current?.select()
      } else if (returnFocus.current) {
        returnFocus.current = false
        buttonRef.current?.focus()
      }
    }, [editing])

    const start = () => {
      if (disabled) return
      setDraft(value)
      setEditing(true)
    }
    const finish = (save: boolean, refocus: boolean) => {
      const next = draft.trim()
      if (save && !(required && next === "") && next !== value) setValue(next)
      returnFocus.current = refocus
      setEditing(false)
    }

    return (
      <div
        ref={ref}
        className={inlineEditVariants({ size, className })}
        data-size={size}
        data-editing={editing || undefined}
        data-disabled={disabled || undefined}
        {...props}
      >
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            aria-label={label}
            className={cx(
              "kg-inline-edit__input",
              box,
              "min-w-[8ch] [field-sizing:content] rounded-kg-md border-kg-ink bg-kg-surface caret-kg-accent-strong",
              "shadow-[3px_3px_0_var(--_lift,var(--kg-ink))] outline-none focus:outline-2 focus:outline-offset-2 focus:outline-kg-ring",
              "aria-invalid:border-kg-danger aria-invalid:[--_lift:var(--kg-danger)]",
              "placeholder:text-kg-fg-faint placeholder:opacity-100",
            )}
            value={draft}
            maxLength={maxLength}
            placeholder={placeholder}
            aria-invalid={(required && draft.trim() === "") || undefined}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                finish(true, true)
              } else if (event.key === "Escape") {
                event.preventDefault()
                finish(false, true)
              }
            }}
            onBlur={() => finish(commitOnBlur, false)}
          />
        ) : (
          <button
            ref={buttonRef}
            type="button"
            className={cx(
              "kg-inline-edit__display group/edit",
              box,
              "inline-flex items-center gap-[0.4em] max-w-full text-start rounded-kg-sm border-transparent",
              "bg-transparent cursor-text disabled:cursor-default",
              "decoration-kg-ink decoration-dashed decoration-2 underline-offset-[0.2em]",
              "interactive:hover:underline focus-visible:underline",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
            )}
            disabled={disabled}
            data-empty={value === "" || undefined}
            onClick={start}
          >
            <span className="kg-visually-hidden">{`Edit ${label}:`}</span>{" "}
            <span className="kg-inline-edit__text truncate [[data-empty]>&]:text-kg-fg-faint">{value || placeholder}</span>
            <span
              className={cx(
                "kg-inline-edit__icon inline-grid shrink-0 text-kg-fg-muted opacity-0 -rotate-20 scale-80",
                "transition-[opacity,rotate,scale] duration-(--kg-duration-base) ease-kg-out",
                "group-hover/edit:opacity-100 group-hover/edit:rotate-0 group-hover/edit:scale-100",
                "group-focus-visible/edit:opacity-100 group-focus-visible/edit:rotate-0 group-focus-visible/edit:scale-100",
                "group-disabled/edit:hidden",
                "[&_svg]:size-[0.85em] [&_svg]:min-w-[0.75rem] [&_svg]:min-h-[0.75rem]",
              )}
              aria-hidden="true"
            >
              <PencilIcon />
            </span>
          </button>
        )}
      </div>
    )
  },
)

InlineEdit.displayName = "InlineEdit"
