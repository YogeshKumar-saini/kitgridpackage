"use client"

import {
  type CSSProperties,
  type FormEvent,
  type FormHTMLAttributes,
  forwardRef,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useRef,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { SendIcon } from "../chat-message/internal/icons.js"

export interface PromptInputProps extends Omit<
  FormHTMLAttributes<HTMLFormElement>,
  "onSubmit" | "onChange" | "defaultValue"
> {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Called with the text on Enter or the send button. Empty drafts never submit. */
  onSubmit?: (value: string) => void
  /** An answer is being written: the send button becomes a stop button. */
  streaming?: boolean
  onStop?: () => void
  /** Accessible name of the textarea. */
  label?: string
  placeholder?: string
  disabled?: boolean
  /** The textarea grows with its text up to this many rows, then scrolls. */
  maxRows?: number
  maxLength?: number
  /** Files or context chips, shown above the text. */
  attachments?: ReactNode
  /** Controls at the start of the footer, e.g. an attach button or a model picker. */
  toolbar?: ReactNode
  /** Quiet text in the footer. Defaults to the keyboard hint. */
  hint?: ReactNode
  sendLabel?: string
  stopLabel?: string
  /** Clear the draft after it submits. Uncontrolled only. */
  clearOnSubmit?: boolean
  inputRef?: Ref<HTMLTextAreaElement>
}

const supportsFieldSizing = (): boolean =>
  typeof CSS !== "undefined" && typeof CSS.supports === "function"
    ? CSS.supports("field-sizing", "content")
    : false

const button = cx(
  "kg-prompt-input__button grid size-(--kg-control-sm) shrink-0 cursor-pointer place-items-center rounded-full border-2 p-0 text-[1rem]",
  "transition-[background-color,scale] duration-(--kg-duration-fast) ease-kg-out interactive:active:scale-90",
  "animate-[kg-pop-in_var(--kg-duration-spring)_var(--kg-ease-spring)] motion-reduce:animate-none",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
)

/**
 * The box a question is typed into. Enter sends, Shift+Enter adds a line, and Enter while an
 * IME is composing picks the candidate instead. While an answer streams, send turns into stop.
 */
export const PromptInput = forwardRef<HTMLFormElement, PromptInputProps>(
  (
    {
      value: valueProp,
      defaultValue = "",
      onValueChange,
      onSubmit,
      streaming = false,
      onStop,
      label = "Message",
      placeholder = "Ask anything",
      disabled = false,
      maxRows = 8,
      maxLength,
      attachments,
      toolbar,
      hint = "Enter to send, Shift+Enter for a new line",
      sendLabel = "Send",
      stopLabel = "Stop",
      clearOnSubmit = true,
      inputRef,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue,
      onChange: onValueChange,
    })
    const local = useRef<HTMLTextAreaElement>(null)
    const textareaRef = useComposedRefs(local, inputRef)
    const empty = value.trim().length === 0

    useIsomorphicLayoutEffect(() => {
      const node = local.current
      if (!node || supportsFieldSizing()) return
      const borders = node.offsetHeight - node.clientHeight
      node.style.height = "auto"
      node.style.height = `${node.scrollHeight + borders}px`
    }, [value])

    const send = () => {
      if (empty || streaming || disabled) return
      onSubmit?.(value)
      if (clearOnSubmit) setValue("")
    }

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      send()
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing)
        return
      event.preventDefault()
      send()
    }

    return (
      <form
        ref={ref}
        className={cx(
          "kg-prompt-input flex w-full min-w-0 flex-col rounded-kg-2xl border-2 border-kg-ink bg-kg-surface text-kg-base text-kg-fg shadow-kg-sm",
          "transition-[box-shadow,background-color] duration-(--kg-duration-base) ease-kg-out",
          "focus-within:not-data-disabled:shadow-kg-md focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-kg-ring",
          "data-disabled:bg-kg-muted data-disabled:opacity-60 data-disabled:shadow-none",
          className,
        )}
        data-disabled={disabled || undefined}
        data-streaming={streaming || undefined}
        style={{ "--kg-prompt-rows": maxRows, ...style } as CSSProperties}
        onSubmit={handleSubmit}
        {...props}
      >
        {attachments != null && (
          <div className="kg-prompt-input__attachments flex flex-wrap gap-1.5 px-3 pt-2.5">{attachments}</div>
        )}
        <textarea
          ref={textareaRef}
          className="kg-prompt-input__textarea m-0 block max-h-[calc(1.5em*var(--kg-prompt-rows,8)+var(--kg-space)*4)] min-h-[calc(1.5em+var(--kg-space)*4)] w-full resize-none overflow-y-auto border-0 bg-transparent px-3.5 pt-3 pb-1 [font:inherit] leading-[1.5em] text-inherit outline-none [field-sizing:content] placeholder:text-kg-fg-faint disabled:cursor-not-allowed"
          aria-label={label}
          rows={1}
          value={value}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => setValue(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="kg-prompt-input__footer flex items-center gap-2 px-2 pb-2">
          {toolbar != null && (
            <div className="kg-prompt-input__toolbar flex items-center gap-0.5">{toolbar}</div>
          )}
          <span className="kg-prompt-input__hint min-w-0 flex-1 truncate ps-1.5 text-kg-xs text-kg-fg-faint">{hint}</span>
          {maxLength !== undefined && value.length > maxLength * 0.8 && (
            <span className="kg-prompt-input__count text-kg-xs tabular-nums text-kg-fg-faint" aria-live="polite">
              {value.length}/{maxLength}
            </span>
          )}
          {streaming ? (
            <button
              type="button"
              className={cx(button, "border-kg-ink bg-kg-surface text-kg-fg interactive:hover:bg-kg-paper-sage")}
              data-action="stop"
              aria-label={stopLabel}
              onClick={onStop}
            >
              <span className="kg-prompt-input__stop size-[0.625rem] rounded-[3px] bg-current" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              className={cx(
                button,
                "border-kg-ink bg-kg-accent text-kg-accent-fg interactive:hover:bg-kg-accent-hover",
                "disabled:cursor-not-allowed disabled:border-kg-border disabled:bg-kg-muted disabled:text-kg-fg-faint",
              )}
              data-action="send"
              aria-label={sendLabel}
              disabled={empty || disabled}
            >
              <SendIcon />
            </button>
          )}
        </div>
      </form>
    )
  },
)

PromptInput.displayName = "PromptInput"
