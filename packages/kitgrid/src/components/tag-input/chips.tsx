"use client"

import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react"
import { cx } from "../../utils/cx.js"
import { XIcon } from "../combobox/internal.js"

/* Removable chips shared by TagInput and MultiSelect. Unexported from the package. */

/* Paper Layers: a small sage paper chip; the one about to go (or focused) turns ink. */
const chipClass = cx(
  "kg-tag-input__chip inline-flex items-center gap-0.5 max-w-full min-h-6 h-[calc(var(--_h)-var(--kg-space)*3)] ps-2.5 pe-0.75",
  "text-[0.92em] leading-none text-kg-fg bg-kg-paper-sage border-2 border-kg-ink rounded-full",
  "animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)] [--kg-enter-y:0px]",
  "transition-colors duration-(--kg-duration-fast) ease-kg-out",
  "data-pending:bg-kg-accent data-pending:text-kg-accent-fg",
  "has-focus-visible:bg-kg-accent has-focus-visible:text-kg-accent-fg",
)

const chipLabelClass =
  "kg-tag-input__chip-label inline-flex items-center gap-[0.15em] overflow-hidden text-ellipsis whitespace-nowrap"

const chipRemoveClass = cx(
  "kg-tag-input__chip-remove inline-grid place-items-center shrink-0 size-4.5 p-0 border-0 rounded-full",
  "bg-transparent text-inherit cursor-pointer [&_svg]:size-3",
  "transition-[background-color,color] duration-(--kg-duration-fast) ease-kg-out",
  "interactive:hover:bg-kg-surface interactive:hover:text-kg-fg disabled:cursor-not-allowed",
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring",
)

export interface ChipProps {
  label: ReactNode
  removeLabel: string
  index: number
  pending?: boolean
  disabled?: boolean
  onRemove: () => void
  onKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => void
}

export const Chip = ({
  label,
  removeLabel,
  index,
  pending,
  disabled,
  onRemove,
  onKeyDown,
}: ChipProps) => (
  <span className={chipClass} data-pending={pending || undefined}>
    <span className={chipLabelClass}>{label}</span>
    <button
      type="button"
      tabIndex={-1}
      data-chip={index}
      className={chipRemoveClass}
      aria-label={removeLabel}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onRemove}
      onKeyDown={(event) => onKeyDown(event, index)}
    >
      <XIcon />
    </button>
  </span>
)

/**
 * Arrow keys walk the chips from the input, Backspace and Delete remove the focused one, and
 * focus always lands somewhere sensible afterwards.
 */
export const useChipKeys = (
  groupRef: RefObject<HTMLElement | null>,
  inputRef: RefObject<HTMLInputElement | null>,
  count: number,
  remove: (index: number) => void,
) => {
  const focusChip = (index: number) => {
    const chip = groupRef.current?.querySelector<HTMLButtonElement>(`[data-chip="${index}"]`)
    chip?.focus()
  }
  const onChipKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault()
        focusChip(Math.max(0, index - 1))
        return
      case "ArrowRight":
        event.preventDefault()
        if (index >= count - 1) inputRef.current?.focus()
        else focusChip(index + 1)
        return
      case "Backspace":
      case "Delete":
        event.preventDefault()
        remove(index)
        if (count <= 1) inputRef.current?.focus()
        else requestAnimationFrame(() => focusChip(Math.max(0, Math.min(index - 1, count - 2))))
        return
      case "Escape":
        inputRef.current?.focus()
    }
  }
  return { focusChip, onChipKeyDown }
}
