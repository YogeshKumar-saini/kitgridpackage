"use client"

import {
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { Layer } from "../../primitives/layer.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import {
  Highlight,
  listboxClass,
  matchesQuery,
  optionClass,
  optionDescriptionClass,
  optionLabelClass,
  optionTextClass,
  usePopup,
  useScrollActive,
} from "../combobox/internal.js"
import { joinIds, resolveFieldControl, useField } from "../field/field.js"

export interface MentionInputOption {
  /** Inserted after the trigger, e.g. a handle. No spaces. */
  value: string
  label: string
  description?: string
  avatar?: ReactNode
}

export interface MentionInputProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "defaultValue" | "onChange"
> {
  suggestions: readonly MentionInputOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  onMention?: (option: MentionInputOption) => void
  /** Character that opens suggestions. */
  trigger?: string
  maxSuggestions?: number
  invalid?: boolean
}

interface Query {
  start: number
  text: string
}

/* Paper Layers: the same white sheet as Input, lifted by an ink offset while focused. */
const rootClass = cx(
  "kg-mention-input relative grid w-full text-kg-base leading-[1.55] text-kg-fg",
  "rounded-kg-md border-2 border-kg-ink bg-kg-surface",
  "transition-[background-color,border-color,box-shadow] duration-(--kg-duration-fast) ease-kg-out",
  "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-kg-ring",
  "focus-within:shadow-[3px_3px_0_var(--_lift,var(--kg-ink))]",
  "data-invalid:border-kg-danger data-invalid:[--_lift:var(--kg-danger)]",
  "data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:bg-kg-muted data-disabled:shadow-none",
)

/* The backdrop and the textarea must share every metric so the tints line up. */
const mirror =
  "[grid-area:1/1] m-0 px-3 py-2.5 border-0 [font:inherit] tracking-[inherit] whitespace-pre-wrap [overflow-wrap:break-word]"

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * A textarea that suggests people after `@`. Known mentions are tinted in place through a
 * mirrored backdrop, so the text stays a plain, editable string.
 */
export const MentionInput = forwardRef<HTMLTextAreaElement, MentionInputProps>(
  (
    {
      suggestions,
      value: valueProp,
      defaultValue = "",
      onValueChange,
      onMention,
      trigger = "@",
      maxSuggestions = 6,
      invalid,
      disabled,
      required,
      rows = 3,
      id,
      className,
      style,
      onKeyDown,
      onBlur,
      onSelect,
      "aria-describedby": describedBy,
      "aria-errormessage": errorMessage,
      ...props
    },
    forwardedRef,
  ) => {
    const control = resolveFieldControl(useField(), {
      id,
      disabled,
      required,
      invalid,
      "aria-describedby": describedBy,
      "aria-errormessage": errorMessage,
    })
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const [query, setQuery] = useState<Query | null>(null)
    const [active, setActive] = useState(0)
    const rootRef = useRef<HTMLDivElement>(null)
    const areaRef = useRef<HTMLTextAreaElement>(null)
    const backdropRef = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(areaRef, forwardedRef)
    const baseId = useId()
    const listId = `${baseId}-listbox`
    const statusId = `${baseId}-status`
    const optionId = (index: number) => `${baseId}-option-${index}`

    const items = useMemo(
      () =>
        query
          ? suggestions
              .filter(
                (option) =>
                  matchesQuery(option.label, query.text) || matchesQuery(option.value, query.text),
              )
              .slice(0, maxSuggestions)
          : [],
      [suggestions, query, maxSuggestions],
    )
    const open = query !== null && items.length > 0
    const close = () => setQuery(null)
    const { ref: listRef, present, state } = usePopup({
      open,
      anchorRef: rootRef,
      onDismiss: close,
    })
    useScrollActive(listRef, active, open)

    const detect = (text: string, caret: number) => {
      const before = text.slice(0, caret)
      const match = new RegExp(`(^|\\s)${escape(trigger)}([\\w.-]*)$`).exec(before)
      if (!match) return close()
      const next = { start: caret - (match[2]?.length ?? 0) - trigger.length, text: match[2] ?? "" }
      if (query?.start !== next.start || query.text !== next.text) setActive(0)
      setQuery(next)
    }

    const insert = (option: MentionInputOption | undefined) => {
      const area = areaRef.current
      if (!option || !query || !area) return
      const end = query.start + trigger.length + query.text.length
      const mention = `${trigger}${option.value} `
      const next = value.slice(0, query.start) + mention + value.slice(end)
      setValue(next)
      onMention?.(option)
      close()
      const caret = query.start + mention.length
      requestAnimationFrame(() => {
        area.focus()
        area.setSelectionRange(caret, caret)
      })
    }

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented || !open) return
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault()
          setActive((index) => (index + 1) % items.length)
          return
        case "ArrowUp":
          event.preventDefault()
          setActive((index) => (index - 1 + items.length) % items.length)
          return
        case "Enter":
        case "Tab":
          event.preventDefault()
          insert(items[active])
          return
        case "Escape":
          event.preventDefault()
          close()
      }
    }

    const known = useMemo(() => new Set(suggestions.map((option) => option.value)), [suggestions])
    const backdrop = useMemo(() => {
      const pattern = new RegExp(`(${escape(trigger)}[\\w.-]+)`, "g")
      return value.split(pattern).map((piece, index) =>
        index % 2 === 1 && known.has(piece.slice(trigger.length)) ? (
          <mark key={index} className="kg-mention-input__mention text-transparent bg-kg-paper-sage rounded-kg-xs shadow-[0_0_0_1px_var(--kg-ink)]">
            {piece}
          </mark>
        ) : (
          piece
        ),
      )
    }, [value, trigger, known])

    return (
      <>
        <div
          ref={rootRef}
          className={cx(rootClass, className)}
          style={style}
          data-state={open ? "open" : "closed"}
          data-invalid={control.invalid || undefined}
          data-disabled={control.disabled || undefined}
        >
          <div ref={backdropRef} className={cx("kg-mention-input__backdrop overflow-hidden text-transparent pointer-events-none", mirror)} aria-hidden="true">
            {backdrop}
            {"​"}
          </div>
          <textarea
            ref={ref}
            id={control.id}
            rows={rows}
            className={cx(
              "kg-mention-input__control relative min-h-0 text-inherit bg-transparent outline-none resize-y caret-kg-accent-strong",
              "placeholder:text-kg-fg-faint placeholder:opacity-100 disabled:cursor-not-allowed",
              mirror,
            )}
            disabled={control.disabled}
            aria-autocomplete="list"
            aria-controls={present ? listId : undefined}
            aria-activedescendant={open ? optionId(active) : undefined}
            aria-describedby={joinIds(control.describedBy, statusId)}
            aria-invalid={control.invalid || undefined}
            aria-errormessage={control.errorMessage}
            aria-required={control.required || undefined}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              detect(event.target.value, event.target.selectionStart)
            }}
            onSelect={(event) => {
              onSelect?.(event)
              const area = event.currentTarget
              if (area.selectionStart === area.selectionEnd) detect(area.value, area.selectionStart)
            }}
            onScroll={(event) => {
              if (backdropRef.current) backdropRef.current.scrollTop = event.currentTarget.scrollTop
            }}
            onKeyDown={handleKeyDown}
            onBlur={(event) => {
              onBlur?.(event)
              close()
            }}
            {...props}
          />
        </div>
        <span id={statusId} className="kg-visually-hidden" aria-live="polite">
          {open ? `${items.length} ${items.length === 1 ? "suggestion" : "suggestions"}` : ""}
        </span>
        {present && (
          <Layer
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Mentions"
            className={cx(listboxClass(), "kg-mention-input__listbox max-w-88")}
            data-state={state}
            onMouseDown={(event) => event.preventDefault()}
          >
            {items.map((option, index) => (
              <div
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                data-active={index === active || undefined}
                data-index={index}
                className={optionClass}
                onPointerMove={() => setActive(index)}
                onClick={() => insert(option)}
              >
                {option.avatar != null && (
                  <span className="kg-mention-input__avatar inline-grid place-items-center shrink-0 size-7 overflow-hidden rounded-full border-2 border-kg-ink bg-kg-paper-sage text-kg-xs font-semibold text-kg-fg [&_img]:size-full [&_img]:object-cover" aria-hidden="true">
                    {option.avatar}
                  </span>
                )}
                <span className={optionTextClass}>
                  <span className={optionLabelClass}>
                    <Highlight text={option.label} query={query?.text ?? ""} />
                  </span>
                  {option.description && (
                    <span className={optionDescriptionClass}>{option.description}</span>
                  )}
                </span>
                <span className="kg-mention-input__handle shrink-0 text-kg-xs font-normal text-kg-fg-muted">
                  {trigger}
                  {option.value}
                </span>
              </div>
            ))}
          </Layer>
        )}
      </>
    )
  },
)

MentionInput.displayName = "MentionInput"
