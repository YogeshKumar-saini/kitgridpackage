"use client"

import {
  type DialogHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useMemo,
  useRef,
} from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { Button, type ButtonProps } from "../button/button.js"
import {
  createModalTrigger,
  type ModalButtonProps,
  ModalRoot,
  type ModalRootProps,
  useModalContext,
  useModalPart,
  useModalSurface,
} from "../dialog/modal.js"

export type AlertDialogTone = "neutral" | "danger" | "warning"

/* A centred sheet set down on a flat overlay; it rises from flat and settles onto its offset. */
const contentClass = [
  "kg-alert-dialog fixed inset-0 m-auto h-fit max-h-[calc(100dvh-var(--kg-space)*8)] w-[min(26rem,calc(100%-var(--kg-space)*8))] max-w-none",
  "overflow-hidden p-0 text-kg-fg bg-kg-surface border-2 border-kg-ink rounded-kg-xl shadow-kg-lg outline-none origin-[50%_100%]",
  "open:flex open:flex-col open:items-center open:gap-2 open:px-6 open:pt-7 open:pb-6 open:text-center",
  "data-[state=open]:animate-[kg-dialog-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
  "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-dialog-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
  "backdrop:bg-kg-overlay backdrop:animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]",
  "data-[state=closed]:backdrop:animate-[kg-fade-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
]

const iconTone: Record<AlertDialogTone, string> = {
  neutral: "bg-kg-paper-sage text-kg-fg",
  danger: "bg-kg-danger text-kg-danger-fg",
  warning: "bg-kg-paper-butter text-kg-fg",
}

export interface AlertDialogProps extends Omit<ModalRootProps, "modal"> {}

/** A modal that interrupts for a decision. It never closes on a backdrop click. */
export const AlertDialog = (props: AlertDialogProps) => <ModalRoot {...props} modal />

AlertDialog.displayName = "AlertDialog"

export interface AlertDialogTriggerProps extends ModalButtonProps {}

export const AlertDialogTrigger = createModalTrigger("AlertDialogTrigger")

export interface AlertDialogContentProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open"> {
  tone?: AlertDialogTone
  /** A glyph shown in the disc above the title. */
  icon?: ReactNode
}

export const AlertDialogContent = forwardRef<HTMLDialogElement, AlertDialogContentProps>(
  (
    {
      tone = "neutral",
      icon,
      onCancel,
      onClose,
      className,
      children,
      "aria-labelledby": labelledBy,
      "aria-describedby": describedBy,
      ...props
    },
    forwardedRef,
  ) => {
    const context = useModalContext("AlertDialogContent")
    const node = useRef<HTMLDialogElement | null>(null)
    const cancelFocus = useMemo<RefObject<HTMLElement | null>>(
      () => ({
        get current() {
          return node.current?.querySelector<HTMLElement>("[data-kg-alert-cancel]") ?? null
        },
      }),
      [],
    )
    const surface = useModalSurface(context, {
      dismissible: false,
      initialFocus: cancelFocus,
      onCancel,
      onClose,
      "aria-labelledby": labelledBy,
      "aria-describedby": describedBy,
    })
    const ref = useComposedRefs(surface.ref, node, forwardedRef)
    if (!surface.present) return null
    return (
      <dialog
        ref={ref}
        role="alertdialog"
        className={cx(contentClass, className)}
        data-size="sm"
        data-tone={tone}
        data-state={surface.state}
        {...props}
        {...surface.props}
      >
        {icon != null && (
          <span
            className={cx(
              "kg-alert-dialog__icon mb-2 grid size-[3rem] place-items-center rounded-full border-2 border-kg-ink shadow-kg-xs [&_svg]:size-[1.375rem]",
              iconTone[tone],
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        {children}
      </dialog>
    )
  },
)

AlertDialogContent.displayName = "AlertDialogContent"

export interface AlertDialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const AlertDialogTitle = forwardRef<HTMLHeadingElement, AlertDialogTitleProps>(
  ({ className, ...props }, ref) => {
    const context = useModalContext("AlertDialogTitle")
    useModalPart(context.setHasTitle)
    return (
      <h2
        ref={ref}
        className={cx("kg-alert-dialog__title m-0 text-kg-lg leading-[1.3] font-semibold tracking-[-0.015em]", className)}
        {...props}
        id={context.titleId}
      />
    )
  },
)

AlertDialogTitle.displayName = "AlertDialogTitle"

export interface AlertDialogDescriptionProps
  extends HTMLAttributes<HTMLParagraphElement> {}

export const AlertDialogDescription = forwardRef<
  HTMLParagraphElement,
  AlertDialogDescriptionProps
>(({ className, ...props }, ref) => {
  const context = useModalContext("AlertDialogDescription")
  useModalPart(context.setHasDescription)
  return (
    <p
      ref={ref}
      className={cx("kg-alert-dialog__description m-0 max-w-[34ch] text-kg-base leading-[1.55] text-kg-fg-muted", className)}
      {...props}
      id={context.descriptionId}
    />
  )
})

AlertDialogDescription.displayName = "AlertDialogDescription"

export interface AlertDialogFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const AlertDialogFooter = forwardRef<HTMLDivElement, AlertDialogFooterProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cx("kg-alert-dialog__footer mt-4 grid w-full auto-cols-fr grid-flow-col gap-2", className)} {...props} />
  ),
)

AlertDialogFooter.displayName = "AlertDialogFooter"

export interface AlertDialogCancelProps extends ButtonProps {}

/** Closes without acting. Receives focus on open: the safe choice is the default. */
export const AlertDialogCancel = forwardRef<HTMLButtonElement, AlertDialogCancelProps>(
  ({ onClick, variant = "outline", ...props }, ref) => {
    const context = useModalContext("AlertDialogCancel")
    return (
      <Button
        ref={ref}
        variant={variant}
        data-kg-alert-cancel=""
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) context.setOpen(false)
        }}
        {...props}
      />
    )
  },
)

AlertDialogCancel.displayName = "AlertDialogCancel"

export interface AlertDialogActionProps extends ButtonProps {
  /** Keep the dialog open after the click, for async actions that close it themselves. */
  keepOpen?: boolean
}

export const AlertDialogAction = forwardRef<HTMLButtonElement, AlertDialogActionProps>(
  ({ onClick, keepOpen = false, ...props }, ref) => {
    const context = useModalContext("AlertDialogAction")
    return (
      <Button
        ref={ref}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented && !keepOpen) context.setOpen(false)
        }}
        {...props}
      />
    )
  },
)

AlertDialogAction.displayName = "AlertDialogAction"
