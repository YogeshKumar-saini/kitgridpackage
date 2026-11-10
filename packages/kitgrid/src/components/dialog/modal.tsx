"use client"

import {
  type ButtonHTMLAttributes,
  createContext,
  type DialogHTMLAttributes,
  type Dispatch,
  forwardRef,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useDismiss } from "../../hooks/use-dismiss.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { usePresence } from "../../hooks/use-presence.js"
import { useScrollLock } from "../../hooks/use-scroll-lock.js"
import { Slot } from "../../primitives/slot.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { IconButton } from "../icon-button/icon-button.js"
import { focusInto, shouldReclaimFocus } from "./focus.js"

/*
 * Shared machinery for every surface built on the native <dialog> element (Dialog, Drawer, and
 * the commerce QuickView / gallery built on them). Not part of the public API.
 */

export interface ModalContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  modal: boolean
  triggerRef: RefObject<HTMLElement | null>
  contentId: string
  titleId: string
  descriptionId: string
  hasTitle: boolean
  hasDescription: boolean
  setHasTitle: Dispatch<SetStateAction<boolean>>
  setHasDescription: Dispatch<SetStateAction<boolean>>
}

export const ModalContext = createContext<ModalContextValue | null>(null)

export const useModalContext = (part: string): ModalContextValue => {
  const context = useContext(ModalContext)
  if (!context)
    throw new Error(`<${part}> must be rendered inside its <Dialog> or <Drawer>.`)
  return context
}

export interface ModalRootProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Blocks and inerts the page and locks its scroll. Non-modal surfaces leave the page live. */
  modal?: boolean
  children?: ReactNode
}

export const ModalRoot = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  modal = true,
  children,
}: ModalRootProps) => {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  })
  const triggerRef = useRef<HTMLElement | null>(null)
  const id = useId()
  const [hasTitle, setHasTitle] = useState(false)
  const [hasDescription, setHasDescription] = useState(false)

  const value = useMemo<ModalContextValue>(
    () => ({
      open,
      setOpen,
      modal,
      triggerRef,
      contentId: `${id}-content`,
      titleId: `${id}-title`,
      descriptionId: `${id}-description`,
      hasTitle,
      hasDescription,
      setHasTitle,
      setHasDescription,
    }),
    [open, setOpen, modal, id, hasTitle, hasDescription],
  )

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
}

/** Lets a title or description wire `aria-labelledby` / `aria-describedby` only while it exists. */
export const useModalPart = (register: Dispatch<SetStateAction<boolean>>): void => {
  useIsomorphicLayoutEffect(() => {
    register(true)
    return () => register(false)
  }, [register])
}

export interface ModalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Merge behaviour onto the single child element (e.g. a kitgrid Button) instead. */
  asChild?: boolean
}

export const createModalTrigger = (displayName: string) => {
  const Trigger = forwardRef<HTMLButtonElement, ModalButtonProps>(
    ({ asChild = false, onClick, ...props }, forwardedRef) => {
      const context = useModalContext(displayName)
      const ref = useComposedRefs(context.triggerRef, forwardedRef)
      const shared = {
        ref,
        "aria-haspopup": "dialog" as const,
        "aria-expanded": context.open,
        "aria-controls": context.open ? context.contentId : undefined,
        "data-state": context.open ? "open" : "closed",
        onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
          onClick?.(event)
          if (!event.defaultPrevented) context.setOpen(!context.open)
        },
      }
      if (asChild) return <Slot {...shared} {...props} />
      return <button type="button" {...shared} {...props} />
    },
  )
  Trigger.displayName = displayName
  return Trigger
}

export const createModalClose = (displayName: string) => {
  const Close = forwardRef<HTMLButtonElement, ModalButtonProps>(
    ({ asChild = false, onClick, ...props }, ref) => {
      const context = useModalContext(displayName)
      const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (!event.defaultPrevented) context.setOpen(false)
      }
      if (asChild) return <Slot ref={ref} onClick={handleClick} {...props} />
      return <button ref={ref} type="button" onClick={handleClick} {...props} />
    },
  )
  Close.displayName = displayName
  return Close
}

export const MODAL_CLOSE_ATTRIBUTE = "data-kg-modal-close"

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    aria-hidden="true"
  >
    <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export const ModalCloseButton = ({
  label,
  className,
}: {
  label: string
  className: string
}) => {
  const context = useModalContext("ModalCloseButton")
  return (
    <IconButton
      label={label}
      icon={<CloseIcon />}
      size="sm"
      className={className}
      {...{ [MODAL_CLOSE_ATTRIBUTE]: "" }}
      onClick={() => context.setOpen(false)}
    />
  )
}

type DialogHandlers = Pick<
  DialogHTMLAttributes<HTMLDialogElement>,
  | "onCancel"
  | "onClose"
  | "onPointerDown"
  | "onClick"
  | "aria-labelledby"
  | "aria-describedby"
>

export interface ModalSurfaceOptions extends DialogHandlers {
  /** Close on a backdrop click. Escape always closes, as the dialog pattern requires. */
  dismissible: boolean
  initialFocus?: RefObject<HTMLElement | null> | undefined
  finalFocus?: RefObject<HTMLElement | null> | undefined
}

const isOutside = (
  node: HTMLElement,
  point: { clientX: number; clientY: number },
): boolean => {
  const rect = node.getBoundingClientRect()
  return (
    point.clientX < rect.left ||
    point.clientX > rect.right ||
    point.clientY < rect.top ||
    point.clientY > rect.bottom
  )
}

/**
 * Drives a native <dialog>: showModal() on open, exit animation before close(), scroll lock,
 * Escape through the `cancel` event, backdrop dismissal, initial focus and focus return.
 */
export const useModalSurface = (
  context: ModalContextValue,
  options: ModalSurfaceOptions,
) => {
  const { open, setOpen, modal, triggerRef } = context
  const presence = usePresence<HTMLDialogElement>(open)
  const { ref, present } = presence
  const pressedBackdrop = useRef(false)
  const { initialFocus, finalFocus, dismissible } = options
  useScrollLock(present && modal)

  useIsomorphicLayoutEffect(() => {
    const node = ref.current
    if (!present || !node) return
    const active = document.activeElement
    const returnTo =
      active instanceof HTMLElement && active !== document.body ? active : null
    if (!node.open) {
      if (modal) node.showModal()
      else node.show()
    }
    focusInto(node, initialFocus?.current, `[${MODAL_CLOSE_ATTRIBUTE}]`)
    return () => {
      // Decided before close(): browsers restore focus themselves, which would mask `finalFocus`.
      const reclaim = shouldReclaimFocus(node)
      if (node.open) node.close()
      if (!reclaim) return
      const target =
        finalFocus?.current ?? (returnTo?.isConnected ? returnTo : triggerRef.current)
      target?.focus()
    }
  }, [present])

  // Native non-modal dialogs ignore Escape and outside clicks, so those come from useDismiss.
  useDismiss({
    enabled: open && !modal,
    refs: [ref, triggerRef],
    outside: dismissible,
    onDismiss: () => setOpen(false),
  })

  const props: DialogHTMLAttributes<HTMLDialogElement> = {
    id: context.contentId,
    tabIndex: -1,
    "aria-labelledby":
      options["aria-labelledby"] ?? (context.hasTitle ? context.titleId : undefined),
    "aria-describedby":
      options["aria-describedby"] ??
      (context.hasDescription ? context.descriptionId : undefined),
    onCancel: (event) => {
      options.onCancel?.(event)
      const vetoed = event.defaultPrevented
      // Keep the element open so the exit animation can run; close() follows the state change.
      event.preventDefault()
      if (!vetoed) setOpen(false)
    },
    onClose: (event) => {
      options.onClose?.(event)
      // A close event queued by a StrictMode remount can land after the dialog reopened.
      if (!event.currentTarget.open) setOpen(false)
    },
    onPointerDown: (event) => {
      options.onPointerDown?.(event)
      pressedBackdrop.current =
        event.target === event.currentTarget && isOutside(event.currentTarget, event)
    },
    onClick: (event) => {
      options.onClick?.(event)
      const pressed = pressedBackdrop.current
      pressedBackdrop.current = false
      if (!dismissible || !modal || !pressed || event.defaultPrevented) return
      // Backdrop clicks target the <dialog> itself, outside its box. Requiring the press to start
      // there too keeps a text selection dragged out of the panel from closing it.
      if (
        event.target === event.currentTarget &&
        isOutside(event.currentTarget, event)
      ) {
        setOpen(false)
      }
    },
  }

  return { ...presence, props }
}
