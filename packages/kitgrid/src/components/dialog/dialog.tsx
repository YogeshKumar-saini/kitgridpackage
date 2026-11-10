"use client"

import {
  type DialogHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type RefObject,
} from "react"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import {
  createModalClose,
  createModalTrigger,
  type ModalButtonProps,
  ModalCloseButton,
  ModalRoot,
  type ModalRootProps,
  useModalContext,
  useModalPart,
  useModalSurface,
} from "./modal.js"

export type DialogSize = "sm" | "md" | "lg" | "full"

/* A sheet set down on the page: it rises from flat and settles onto its offset. */
const contentClass = [
  "kg-dialog fixed inset-0 m-auto max-w-none overflow-hidden p-0 text-kg-fg bg-(--_dialog-bg,var(--kg-surface)) outline-none origin-[50%_100%] open:flex open:flex-col",
  "data-[state=open]:animate-[kg-dialog-in_var(--kg-duration-slow)_var(--kg-ease-out)]",
  "data-[state=closed]:pointer-events-none data-[state=closed]:animate-[kg-dialog-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
  "backdrop:bg-kg-overlay backdrop:animate-[kg-fade-in_var(--kg-duration-base)_var(--kg-ease-out)]",
  "data-[state=closed]:backdrop:animate-[kg-fade-out_var(--kg-duration-fast)_var(--kg-ease-in)_forwards]",
]

const sheet =
  "h-fit max-h-[calc(100dvh-var(--kg-space)*8)] border-2 border-kg-ink rounded-kg-xl shadow-kg-lg"

/* Set --_dialog-bg on the content to replace the surface colour. */
const sizeClass: Record<DialogSize, string> = {
  sm: `${sheet} w-[min(24rem,calc(100%-var(--kg-space)*8))]`,
  md: `${sheet} w-[min(32rem,calc(100%-var(--kg-space)*8))]`,
  lg: `${sheet} w-[min(44rem,calc(100%-var(--kg-space)*8))]`,
  full: "size-full max-h-none border-0",
}

const bodyClass =
  "kg-dialog__body min-h-0 flex-[1_1_auto] overflow-y-auto overscroll-contain px-6 py-4 text-kg-base leading-[1.55]"

const footerClass = [
  "kg-dialog__footer flex shrink-0 flex-wrap justify-end gap-2 px-6 pt-4 pb-6",
  String.raw`[.kg-dialog\_\_header+&]:pt-6`,
  "max-[30rem]:flex-col-reverse max-[30rem]:*:w-full",
]

export interface DialogProps extends ModalRootProps {}

/** Owns the open state. Renders no element of its own. */
export const Dialog = (props: DialogProps) => <ModalRoot {...props} />

Dialog.displayName = "Dialog"

export interface DialogTriggerProps extends ModalButtonProps {}

export const DialogTrigger = createModalTrigger("DialogTrigger")

export interface DialogCloseProps extends ModalButtonProps {}

export const DialogClose = createModalClose("DialogClose")

export interface DialogContentProps extends Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  "open"
> {
  size?: DialogSize
  /** Close when the backdrop is clicked. Escape always closes. */
  dismissible?: boolean
  /** Receives focus on open. Defaults to the first focusable element inside. */
  initialFocus?: RefObject<HTMLElement | null>
  /** Receives focus on close. Defaults to the element that was focused before opening. */
  finalFocus?: RefObject<HTMLElement | null>
  /** Show the built-in close button in the corner. */
  closeButton?: boolean
  /** Accessible name of the built-in close button. */
  closeLabel?: string
}

export const DialogContent = forwardRef<HTMLDialogElement, DialogContentProps>(
  (
    {
      size = "md",
      dismissible = true,
      initialFocus,
      finalFocus,
      closeButton = true,
      closeLabel = "Close",
      onCancel,
      onClose,
      onPointerDown,
      onClick,
      "aria-labelledby": labelledBy,
      "aria-describedby": describedBy,
      className,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const context = useModalContext("DialogContent")
    const surface = useModalSurface(context, {
      dismissible,
      initialFocus,
      finalFocus,
      onCancel,
      onClose,
      onPointerDown,
      onClick,
      "aria-labelledby": labelledBy,
      "aria-describedby": describedBy,
    })
    const ref = useComposedRefs(surface.ref, forwardedRef)
    if (!surface.present) return null

    return (
      <dialog
        ref={ref}
        className={cx(contentClass, sizeClass[size] ?? sizeClass.md, className)}
        data-size={size}
        data-state={surface.state}
        {...props}
        {...surface.props}
      >
        {children}
        {closeButton && (
          <div className="absolute end-3 top-3 z-1">
            <ModalCloseButton label={closeLabel} className="kg-dialog__close" />
          </div>
        )}
      </dialog>
    )
  },
)

DialogContent.displayName = "DialogContent"

export interface DialogHeaderProps extends HTMLAttributes<HTMLDivElement> {}

export const DialogHeader = forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cx("kg-dialog__header grid shrink-0 gap-1.5 ps-6 pe-12 pt-6", className)}
      {...props}
    />
  ),
)

DialogHeader.displayName = "DialogHeader"

export interface DialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

export const DialogTitle = forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => {
    const context = useModalContext("DialogTitle")
    useModalPart(context.setHasTitle)
    return (
      <h2
        ref={ref}
        className={cx("kg-dialog__title m-0 text-kg-lg leading-[1.3] font-semibold tracking-[-0.015em] text-kg-fg", className)}
        {...props}
        id={context.titleId}
      />
    )
  },
)

DialogTitle.displayName = "DialogTitle"

export interface DialogDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {}

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  DialogDescriptionProps
>(({ className, ...props }, ref) => {
  const context = useModalContext("DialogDescription")
  useModalPart(context.setHasDescription)
  return (
    <p
      ref={ref}
      className={cx(
        "kg-dialog__description m-0 text-kg-base leading-[1.55] text-kg-fg-muted",
        className,
      )}
      {...props}
      id={context.descriptionId}
    />
  )
})

DialogDescription.displayName = "DialogDescription"

export interface DialogBodyProps extends HTMLAttributes<HTMLDivElement> {}

/** The scrolling region between header and footer. */
export const DialogBody = forwardRef<HTMLDivElement, DialogBodyProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cx(bodyClass, className)} {...props} />
  ),
)

DialogBody.displayName = "DialogBody"

export interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {}

export const DialogFooter = forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cx(footerClass, className)} {...props} />
  ),
)

DialogFooter.displayName = "DialogFooter"
