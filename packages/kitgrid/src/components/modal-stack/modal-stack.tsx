"use client"

import { type CSSProperties, forwardRef, useState } from "react"
import { cx } from "../../utils/cx.js"
import {
  DialogBody,
  type DialogBodyProps,
  DialogClose,
  type DialogCloseProps,
  DialogContent,
  type DialogContentProps,
  DialogDescription,
  type DialogDescriptionProps,
  DialogFooter,
  type DialogFooterProps,
  DialogHeader,
  type DialogHeaderProps,
  DialogTitle,
  type DialogTitleProps,
  DialogTrigger,
  type DialogTriggerProps,
} from "../dialog/dialog.js"
import { ModalRoot, type ModalRootProps } from "../dialog/modal.js"
import { StackLevel, useStackLevel } from "./stack-level.js"

/*
 * A covered layer recedes on the individual translate/scale properties, which compose with the
 * entry animation that owns transform. Child layers clear the overlay token their ::backdrop
 * inherits: one scrim is enough.
 */
const stackClass = [
  "kg-modal-stack [transition:translate_var(--kg-duration-slow)_var(--kg-ease-out),scale_var(--kg-duration-slow)_var(--kg-ease-out),filter_var(--kg-duration-base)_var(--kg-ease-out)]",
  "data-behind:pointer-events-none data-behind:translate-y-(--_ty) data-behind:scale-(--_scale)",
  "data-behind:brightness-92 data-behind:saturate-90",
  "[&:not([data-depth='0'])]:[--kg-overlay:transparent]",
]

export interface ModalStackProps extends ModalRootProps {}

/**
 * A dialog that can open another dialog on top of itself. Nest a ModalStack inside a
 * ModalStackContent: the parent recedes, the child takes focus, and Escape peels one layer off.
 */
export const ModalStack = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: ModalStackProps) => {
  const [internal, setInternal] = useState(defaultOpen)
  const open = openProp ?? internal
  return (
    <StackLevel open={open}>
      <ModalRoot
        {...props}
        open={open}
        onOpenChange={(next) => {
          if (openProp === undefined) setInternal(next)
          onOpenChange?.(next)
        }}
      />
    </StackLevel>
  )
}

ModalStack.displayName = "ModalStack"

export interface ModalStackContentProps extends DialogContentProps {}

export const ModalStackContent = forwardRef<HTMLDialogElement, ModalStackContentProps>(
  ({ className, style, ...props }, ref) => {
    const { depth, above } = useStackLevel()
    return (
      <DialogContent
        ref={ref}
        className={cx(stackClass, className)}
        data-depth={depth}
        data-behind={above > 0 || undefined}
        style={
          {
            "--_above": above,
            "--_ty": `${above * -18}px`,
            "--_scale": 1 - above * 0.06,
            ...style,
          } as CSSProperties
        }
        {...props}
      />
    )
  },
)

ModalStackContent.displayName = "ModalStackContent"

export interface ModalStackTriggerProps extends DialogTriggerProps {}
export const ModalStackTrigger = DialogTrigger

export interface ModalStackCloseProps extends DialogCloseProps {}
export const ModalStackClose = DialogClose

export interface ModalStackHeaderProps extends DialogHeaderProps {}
export const ModalStackHeader = DialogHeader

export interface ModalStackTitleProps extends DialogTitleProps {}
export const ModalStackTitle = DialogTitle

export interface ModalStackDescriptionProps extends DialogDescriptionProps {}
export const ModalStackDescription = DialogDescription

export interface ModalStackBodyProps extends DialogBodyProps {}
export const ModalStackBody = DialogBody

export interface ModalStackFooterProps extends DialogFooterProps {}
export const ModalStackFooter = DialogFooter
