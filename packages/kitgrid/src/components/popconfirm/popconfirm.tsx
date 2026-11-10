"use client"

import {
  type FocusEvent as ReactFocusEvent,
  forwardRef,
  type HTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useDismiss } from "../../hooks/use-dismiss.js"
import { type Align, type Side, useFloating } from "../../hooks/use-floating.js"
import { usePresence } from "../../hooks/use-presence.js"
import { Layer } from "../../primitives/layer.js"
import { Slot } from "../../primitives/slot.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { Button } from "../button/button.js"

export type PopconfirmTone = "neutral" | "danger"

/* A small lifted sheet, settling onto its offset as it opens. */
const sheetClass = [
  "kg-popconfirm grid w-max max-w-[min(18rem,calc(100vw-1rem))] grid-cols-[auto_1fr] gap-x-3 gap-y-1 p-3.5",
  "text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-kg-lg shadow-kg-md",
  "origin-[var(--kg-origin,center_bottom)] [--kg-enter-y:0px] data-[side=top]:[--kg-enter-y:4px] data-[side=bottom]:[--kg-enter-y:-4px]",
  "data-[state=open]:animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-out)]",
  "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-pop-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
]

const markClass: Record<PopconfirmTone, string> = {
  neutral: "bg-kg-paper-butter text-kg-fg",
  danger: "bg-kg-danger text-kg-danger-fg",
}

export interface PopconfirmProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title" | "children"> {
  /** The trigger: a single element, usually a Button. */
  children: ReactElement
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: PopconfirmTone
  side?: Side
  align?: Align
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** May return a promise: the confirm button shows a spinner until it settles. */
  onConfirm?: () => void | Promise<unknown>
  onCancel?: () => void
}

/** A small anchored confirmation for low-stakes destructive actions on a single item. */
export const Popconfirm = forwardRef<HTMLDivElement, PopconfirmProps>(
  (
    {
      children,
      title,
      description,
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      tone = "neutral",
      side = "top",
      align = "center",
      open: openProp,
      defaultOpen = false,
      onOpenChange,
      onConfirm,
      onCancel,
      className,
      ...props
    },
    forwardedRef,
  ) => {
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const [busy, setBusy] = useState(false)
    const triggerRef = useRef<HTMLElement | null>(null)
    const cancelRef = useRef<HTMLButtonElement>(null)
    const { ref, present, state } = usePresence<HTMLDivElement>(open)
    const composed = useComposedRefs(ref, forwardedRef)
    const id = useId()
    const titleId = `${id}-title`
    const descriptionId = `${id}-description`

    const close = (returnFocus: boolean) => {
      setOpen(false)
      if (returnFocus) triggerRef.current?.focus()
    }

    useFloating(triggerRef, ref, { open, side, align, offset: 10 })
    useDismiss({
      enabled: open,
      refs: [ref, triggerRef],
      onDismiss: (reason) => {
        onCancel?.()
        close(reason === "escape")
      },
    })

    useEffect(() => {
      if (open) cancelRef.current?.focus()
    }, [open])

    const confirm = async () => {
      const result = onConfirm?.()
      if (result instanceof Promise) {
        setBusy(true)
        try {
          await result
        } finally {
          setBusy(false)
        }
      }
      close(true)
    }

    return (
      <>
        <Slot
          ref={triggerRef}
          aria-haspopup="dialog"
          aria-expanded={open}
          data-state={open ? "open" : "closed"}
          onClick={(event: ReactMouseEvent<HTMLElement>) => {
            if (!event.defaultPrevented) setOpen(!open)
          }}
        >
          {children}
        </Slot>
        {present && (
          <Layer
            ref={composed}
            role="alertdialog"
            aria-labelledby={titleId}
            aria-describedby={description != null ? descriptionId : undefined}
            className={cx(sheetClass, className)}
            data-state={state}
            data-tone={tone}
            onBlur={(event: ReactFocusEvent<HTMLDivElement>) => {
              const next = event.relatedTarget as Node | null
              if (next && !event.currentTarget.contains(next) && !triggerRef.current?.contains(next))
                close(false)
            }}
            {...props}
          >
            <span className={cx("kg-popconfirm__mark mt-px grid size-[1.25rem] place-items-center rounded-full text-kg-xs font-bold", markClass[tone])} aria-hidden="true">
              !
            </span>
            <div className="kg-popconfirm__text grid gap-[2px]">
              <p id={titleId} className="kg-popconfirm__title m-0 text-kg-sm leading-[1.4] font-semibold">
                {title}
              </p>
              {description != null && (
                <p id={descriptionId} className="kg-popconfirm__description m-0 text-kg-xs leading-[1.45] text-kg-fg-muted">
                  {description}
                </p>
              )}
            </div>
            <div className="kg-popconfirm__actions col-span-full mt-2 flex justify-end gap-1.5">
              <Button
                ref={cancelRef}
                size="sm"
                variant="ghost"
                onClick={() => {
                  onCancel?.()
                  close(true)
                }}
              >
                {cancelLabel}
              </Button>
              <Button
                size="sm"
                variant={tone === "danger" ? "danger" : "solid"}
                loading={busy}
                onClick={() => void confirm()}
              >
                {confirmLabel}
              </Button>
            </div>
          </Layer>
        )}
      </>
    )
  },
)

Popconfirm.displayName = "Popconfirm"
