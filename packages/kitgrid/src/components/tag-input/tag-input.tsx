"use client"

import {
  type ClipboardEvent,
  forwardRef,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { resolveFieldControl, useField } from "../field/field.js"
import {
  type InputGroupSize,
  inputGroupControl,
  inputGroupVariants,
} from "../input-group/input-group.js"
import { Chip, useChipKeys } from "./chips.js"

export interface TagInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "size" | "type" | "name" | "prefix"
> {
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (tags: string[]) => void
  /** Keys besides Enter that turn the text into a tag. */
  delimiters?: string[]
  max?: number
  allowDuplicates?: boolean
  /** Return false to refuse a tag. */
  validate?: (tag: string, tags: readonly string[]) => boolean
  /** Shown before every tag, e.g. a hash. */
  prefix?: ReactNode
  removeLabel?: (tag: string) => string
  size?: InputGroupSize
  invalid?: boolean
  /** Submits the tags comma-separated through a hidden input. */
  name?: string
}

/**
 * Free-form tags. Enter or a delimiter commits, paste splits on commas and new lines,
 * Backspace on an empty field marks the last tag and a second press removes it.
 */
export const TagInput = forwardRef<HTMLInputElement, TagInputProps>(
  (
    {
      value: valueProp,
      defaultValue = [],
      onValueChange,
      delimiters = [","],
      max,
      allowDuplicates = false,
      validate,
      prefix,
      removeLabel = (tag) => `Remove ${tag}`,
      size = "md",
      invalid,
      disabled,
      required,
      name,
      placeholder,
      id,
      className,
      style,
      onKeyDown,
      onBlur,
      onPaste,
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
    const [tags, setTags] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const [text, setText] = useState("")
    const [pending, setPending] = useState(false)
    const groupRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const ref = useComposedRefs(inputRef, forwardedRef)
    const full = max !== undefined && tags.length >= max

    const remove = (index: number) => setTags(tags.filter((_, at) => at !== index))
    const { focusChip, onChipKeyDown } = useChipKeys(groupRef, inputRef, tags.length, remove)

    const add = (raw: readonly string[]) => {
      const next = [...tags]
      for (const piece of raw) {
        const tag = piece.trim()
        if (!tag) continue
        if (max !== undefined && next.length >= max) break
        if (!allowDuplicates && next.some((t) => t.toLowerCase() === tag.toLowerCase())) continue
        if (validate && !validate(tag, next)) continue
        next.push(tag)
      }
      if (next.length !== tags.length) setTags(next)
      return next.length !== tags.length
    }

    const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      const { key } = event
      if (key === "Enter" || delimiters.includes(key)) {
        if (!text.trim()) {
          if (key !== "Enter") event.preventDefault()
          return
        }
        event.preventDefault()
        // A tag that fails validation stays in the field so it can be corrected.
        if (validate && !validate(text.trim(), tags)) return
        add([text])
        setText("")
        return
      }
      const caretAtStart =
        event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0
      if (key === "Backspace" && text === "" && tags.length > 0) {
        event.preventDefault()
        if (pending) {
          remove(tags.length - 1)
          setPending(false)
        } else setPending(true)
        return
      }
      if (key === "ArrowLeft" && caretAtStart && tags.length > 0) {
        event.preventDefault()
        setPending(false)
        focusChip(tags.length - 1)
        return
      }
      setPending(false)
    }

    const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
      onPaste?.(event)
      const data = event.clipboardData.getData("text")
      if (!/[,\n]/.test(data)) return
      event.preventDefault()
      add(data.split(/[,\n]/))
    }

    return (
      <>
        <div
          ref={groupRef}
          className={inputGroupVariants({
            size,
            multiline: true,
            // The data variant outranks the group's own gap.
            className: cx("kg-tag-input data-multiline:gap-1", className),
          })}
          style={style}
          data-size={size}
          data-multiline=""
          data-invalid={control.invalid || undefined}
          data-disabled={control.disabled || undefined}
          onPointerDown={(event) => {
            if (event.target === groupRef.current) {
              event.preventDefault()
              inputRef.current?.focus()
            }
          }}
        >
          {tags.map((tag, index) => (
            <Chip
              // Tags are unique unless duplicates are allowed, so the index breaks ties.
              key={`${tag}-${index}`}
              index={index}
              label={
                <>
                  {prefix != null && (
                    <span className="kg-tag-input__prefix opacity-65" aria-hidden="true">
                      {prefix}
                    </span>
                  )}
                  {tag}
                </>
              }
              removeLabel={removeLabel(tag)}
              pending={pending && index === tags.length - 1}
              disabled={control.disabled}
              onRemove={() => {
                remove(index)
                inputRef.current?.focus()
              }}
              onKeyDown={onChipKeyDown}
            />
          ))}
          <input
            ref={ref}
            id={control.id}
            type="text"
            className={inputGroupControl}
            autoComplete="off"
            enterKeyHint="enter"
            disabled={control.disabled}
            readOnly={full}
            placeholder={tags.length === 0 ? placeholder : undefined}
            aria-describedby={control.describedBy}
            aria-invalid={control.invalid || undefined}
            aria-errormessage={control.errorMessage}
            aria-required={control.required || undefined}
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setPending(false)
            }}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={(event) => {
              onBlur?.(event)
              setPending(false)
              if (text.trim() && add([text])) setText("")
            }}
            {...props}
          />
        </div>
        {name !== undefined && <input type="hidden" name={name} value={tags.join(",")} />}
      </>
    )
  },
)

TagInput.displayName = "TagInput"
