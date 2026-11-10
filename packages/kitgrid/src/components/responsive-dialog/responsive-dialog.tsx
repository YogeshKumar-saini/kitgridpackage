"use client"

import {
  type ComponentType,
  createContext,
  type DialogHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type RefAttributes,
  useContext,
} from "react"
import { useMediaQuery } from "../../hooks/use-media-query.js"
import { cx } from "../../utils/cx.js"
import {
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../dialog/dialog.js"
import {
  createModalClose,
  createModalTrigger,
  type ModalButtonProps,
  ModalRoot,
  type ModalRootProps,
} from "../dialog/modal.js"
import {
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../drawer/drawer.js"

/* The sheet keeps footer buttons stacked and full width for thumbs. */
const sheetFooterClass = String.raw`data-[surface=sheet]:[&_.kg-drawer\_\_footer]:flex-col-reverse data-[surface=sheet]:[&_.kg-drawer\_\_footer>*]:w-full`

const DesktopContext = createContext(true)

export interface ResponsiveDialogProps extends ModalRootProps {
  /** Media query that selects the centred dialog; otherwise a bottom sheet is used. */
  query?: string
}

/**
 * One dialog API, two surfaces: a centred dialog on wide screens and a draggable bottom sheet
 * on narrow ones. The open state survives crossing the breakpoint.
 */
export const ResponsiveDialog = ({
  query = "(min-width: 40rem)",
  ...props
}: ResponsiveDialogProps) => {
  const desktop = useMediaQuery(query, true)
  return (
    <DesktopContext.Provider value={desktop}>
      <ModalRoot {...props} />
    </DesktopContext.Provider>
  )
}

ResponsiveDialog.displayName = "ResponsiveDialog"

export interface ResponsiveDialogTriggerProps extends ModalButtonProps {}
export const ResponsiveDialogTrigger = createModalTrigger("ResponsiveDialogTrigger")

export interface ResponsiveDialogCloseProps extends ModalButtonProps {}
export const ResponsiveDialogClose = createModalClose("ResponsiveDialogClose")

export interface ResponsiveDialogContentProps
  extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open"> {
  /** Close on backdrop click (and drag on mobile). Escape always closes. */
  dismissible?: boolean
  closeButton?: boolean
  closeLabel?: string
}

export const ResponsiveDialogContent = forwardRef<
  HTMLDialogElement,
  ResponsiveDialogContentProps
>(({ className, closeButton, ...props }, ref) => {
  const desktop = useContext(DesktopContext)
  const classes = cx("kg-responsive-dialog", sheetFooterClass, className)
  return desktop ? (
    <DialogContent
      ref={ref}
      className={classes}
      data-surface="dialog"
      closeButton={closeButton}
      {...props}
    />
  ) : (
    <DrawerContent
      ref={ref}
      side="bottom"
      className={classes}
      data-surface="sheet"
      closeButton={closeButton ?? false}
      {...props}
    />
  )
})

ResponsiveDialogContent.displayName = "ResponsiveDialogContent"

const pick = <E extends HTMLElement, P extends HTMLAttributes<E>>(
  name: string,
  Desktop: ComponentType<P & RefAttributes<E>>,
  Mobile: ComponentType<P & RefAttributes<E>>,
) => {
  const Part = forwardRef<E, P>((props, ref) => {
    const desktop = useContext(DesktopContext)
    const Surface = desktop ? Desktop : Mobile
    return <Surface {...(props as P)} ref={ref} />
  })
  Part.displayName = name
  return Part
}

export interface ResponsiveDialogHeaderProps extends HTMLAttributes<HTMLDivElement> {}
export const ResponsiveDialogHeader = pick<HTMLDivElement, ResponsiveDialogHeaderProps>(
  "ResponsiveDialogHeader",
  DialogHeader,
  DrawerHeader,
)

export interface ResponsiveDialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {}
export const ResponsiveDialogTitle = pick<HTMLHeadingElement, ResponsiveDialogTitleProps>(
  "ResponsiveDialogTitle",
  DialogTitle,
  DrawerTitle,
)

export interface ResponsiveDialogDescriptionProps
  extends HTMLAttributes<HTMLParagraphElement> {}
export const ResponsiveDialogDescription = pick<HTMLParagraphElement, ResponsiveDialogDescriptionProps>(
  "ResponsiveDialogDescription",
  DialogDescription,
  DrawerDescription,
)

export interface ResponsiveDialogBodyProps extends HTMLAttributes<HTMLDivElement> {}
export const ResponsiveDialogBody = pick<HTMLDivElement, ResponsiveDialogBodyProps>(
  "ResponsiveDialogBody",
  DialogBody,
  DrawerBody,
)

export interface ResponsiveDialogFooterProps extends HTMLAttributes<HTMLDivElement> {}
export const ResponsiveDialogFooter = pick<HTMLDivElement, ResponsiveDialogFooterProps>(
  "ResponsiveDialogFooter",
  DialogFooter,
  DrawerFooter,
)
