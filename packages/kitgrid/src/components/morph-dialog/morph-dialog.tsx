"use client"

import {
  type ButtonHTMLAttributes,
  createContext,
  type CSSProperties,
  type DialogHTMLAttributes,
  type ForwardedRef,
  forwardRef,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { flushSync } from "react-dom"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { useScrollLock } from "../../hooks/use-scroll-lock.js"
import { Slot } from "../../primitives/slot.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { focusInto, shouldReclaimFocus } from "../dialog/focus.js"
import { IconButton } from "../icon-button/icon-button.js"
import { morphKeyframes, readSpringEasing, startMorphTransition } from "./morph.js"

/** How the shared-element morph runs: native View Transitions, a FLIP fallback, or a fade. */
export type MorphDialogMotion = "view-transition" | "flip" | "fade"

type Scope = "trigger" | "content"
type Part = "surface" | "image" | "title"

interface MorphContextValue {
  open: boolean
  change: (open: boolean) => void
  /** Closes at once, for when the browser already closed the dialog itself. */
  dismiss: () => void
  triggerRef: RefObject<HTMLElement | null>
  contentRef: RefObject<HTMLDialogElement | null>
  /** `view-transition-name`s, one per shared element. */
  names: Record<Part, string>
  /** True only while this instance runs a view transition. */
  morphing: boolean
  titleId: string
  contentId: string
  motion: MorphDialogMotion
}

const MorphContext = createContext<MorphContextValue | null>(null)
const ScopeContext = createContext<Scope | null>(null)

const useMorph = (part: string): MorphContextValue => {
  const context = useContext(MorphContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <MorphDialog>.`)
  return context
}

const subscribeNever = () => () => {}
const supportsViewTransitions = () => "startViewTransition" in document

const CLOSE_ATTRIBUTE = "data-kg-morph-close"
const FLIP_CLOSE_MS = 380
const FADE_MS = 180

/**
 * A shared element carries its transition name only on the side that is currently showing.
 * Each part gets its own custom property because they inherit: one shared name would leak from
 * the card onto its image and title, and duplicate names abort a view transition.
 */
const useSharedName = (part: Part, ownScope?: Scope): CSSProperties | undefined => {
  const context = useContext(MorphContext)
  const inherited = useContext(ScopeContext)
  const scope = ownScope ?? inherited
  // Idle instances carry no names: every named element on the page is captured and drawn above
  // the page, so a grid of cards would paint its neighbours over the opening dialog.
  if (!context || !scope || !context.morphing) return undefined
  const showing = scope === "content" ? context.open : !context.open
  return showing
    ? ({ [`--_vt-${part}`]: context.names[part] } as CSSProperties)
    : undefined
}

export interface MorphDialogProps {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  children?: ReactNode
}

/**
 * A card that becomes its own dialog. The trigger's container, image and title travel to their
 * places in the dialog and back, through the View Transitions API where available and a FLIP
 * animation elsewhere. Underneath it is a native modal <dialog>: focus is trapped and returned,
 * the page is inert and its scroll locked, Escape closes. Reduced motion crossfades instead.
 */
export const MorphDialog = ({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
}: MorphDialogProps) => {
  const [open, setOpen] = useControllableState({
    value: openProp,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  })
  const reduced = useReducedMotion()
  const triggerRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLDialogElement | null>(null)
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const openRef = useRef(open)
  openRef.current = open
  const busy = useRef(false)
  const [morphing, setMorphing] = useState(false)
  useScrollLock(open)

  const native = useSyncExternalStore(
    subscribeNever,
    supportsViewTransitions,
    () => false,
  )
  const motion: MorphDialogMotion = reduced
    ? "fade"
    : native
      ? "view-transition"
      : "flip"

  const change = useCallback(
    (next: boolean) => {
      if (next === openRef.current || busy.current) return
      const commit = () => flushSync(() => setOpen(next))
      if (motion === "view-transition") {
        busy.current = true
        // Names go on first, synchronously, so the outgoing snapshot already sees them.
        flushSync(() => setMorphing(true))
        void startMorphTransition(commit).finally(() => {
          busy.current = false
          setMorphing(false)
        })
        return
      }
      const panel = contentRef.current
      if (next || !panel) {
        setOpen(next)
        return
      }
      // Closing without View Transitions: play the way back first, then unmount.
      busy.current = true
      const trigger = triggerRef.current
      const animation =
        motion === "flip" && trigger
          ? panel.animate(
              morphKeyframes(
                panel.getBoundingClientRect(),
                trigger.getBoundingClientRect(),
                getComputedStyle(panel).borderTopLeftRadius,
                getComputedStyle(trigger).borderTopLeftRadius,
              ),
              {
                duration: FLIP_CLOSE_MS,
                easing: "cubic-bezier(0.32, 0.72, 0, 1)",
                fill: "forwards",
              },
            )
          : panel.animate([{ opacity: 1 }, { opacity: 0 }], {
              duration: FADE_MS,
              easing: "ease-out",
              fill: "forwards",
            })
      panel.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: motion === "flip" ? FLIP_CLOSE_MS : FADE_MS,
        pseudoElement: "::backdrop",
        fill: "forwards",
      })
      panel.dataset.state = "closing"
      void animation.finished
        .catch(() => undefined)
        .then(() => {
          busy.current = false
          setOpen(false)
        })
    },
    [motion, setOpen],
  )

  const value = useMemo<MorphContextValue>(
    () => ({
      open,
      change,
      dismiss: () => {
        busy.current = false
        setOpen(false)
      },
      triggerRef,
      contentRef,
      names: {
        surface: `kg-morph-${id}`,
        image: `kg-morph-${id}-image`,
        title: `kg-morph-${id}-title`,
      },
      titleId: `${id}-title`,
      contentId: `${id}-content`,
      motion,
      morphing,
    }),
    [open, change, setOpen, id, motion, morphing],
  )

  return <MorphContext.Provider value={value}>{children}</MorphContext.Provider>
}

MorphDialog.displayName = "MorphDialog"

export interface MorphDialogTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Merge onto the single child element (for example a link-styled card) instead. */
  asChild?: boolean
}

/** The card the dialog grows out of. Put a `MorphDialogImage` and `MorphDialogTitle` inside. */
export const MorphDialogTrigger = forwardRef<
  HTMLButtonElement,
  MorphDialogTriggerProps
>(({ asChild = false, className, style, onClick, ...props }, forwardedRef) => {
  const context = useMorph("MorphDialogTrigger")
  const ref = useComposedRefs(context.triggerRef, forwardedRef)
  const shared = useSharedName("surface", "trigger")
  const merged = {
    ref,
    className: cx(
      "kg-morph-dialog__trigger relative m-0 block w-full cursor-pointer overflow-clip rounded-kg-xl border-2 border-kg-ink bg-kg-surface p-0",
      "text-[inherit] [font:inherit] [text-align:inherit] shadow-kg-sm",
      "[view-transition-class:kg-morph] [view-transition-name:var(--_vt-surface,none)]",
      "transition-[translate,box-shadow] duration-(--kg-duration-base) ease-kg-out",
      "[@media(hover:hover)]:hover:-translate-0.5 [@media(hover:hover)]:hover:shadow-kg-md",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
      "data-[state=open]:not-data-[motion=fade]:opacity-0 data-[state=open]:not-data-[motion=fade]:transition-none",
      className,
    ),
    style: { ...shared, ...style },
    "aria-haspopup": "dialog" as const,
    "aria-expanded": context.open,
    "aria-controls": context.open ? context.contentId : undefined,
    "data-state": context.open ? "open" : "closed",
    "data-motion": context.motion,
    onClick: (event: ReactMouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented) context.change(true)
    },
  }
  return (
    <ScopeContext.Provider value="trigger">
      {asChild ? (
        <Slot {...merged} {...props} />
      ) : (
        <button type="button" {...merged} {...props} />
      )}
    </ScopeContext.Provider>
  )
})

MorphDialogTrigger.displayName = "MorphDialogTrigger"

export interface MorphDialogContentProps extends Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  "open"
> {
  /** Close when the backdrop is clicked. Escape always closes. */
  dismissible?: boolean
  /** Receives focus on open. Defaults to the first focusable element that isn't the close button. */
  initialFocus?: RefObject<HTMLElement | null>
}

export const MorphDialogContent = forwardRef<
  HTMLDialogElement,
  MorphDialogContentProps
>((props, forwardedRef) => {
  const context = useMorph("MorphDialogContent")
  if (!context.open) return null
  return <MorphSurface {...props} context={context} forwardedRef={forwardedRef} />
})

MorphDialogContent.displayName = "MorphDialogContent"

const isOutside = (node: HTMLElement, point: { clientX: number; clientY: number }) => {
  const rect = node.getBoundingClientRect()
  return (
    point.clientX < rect.left ||
    point.clientX > rect.right ||
    point.clientY < rect.top ||
    point.clientY > rect.bottom
  )
}

const MorphSurface = ({
  context,
  forwardedRef,
  dismissible = true,
  initialFocus,
  className,
  style,
  children,
  onCancel,
  onClose,
  onPointerDown,
  onClick,
  ...props
}: MorphDialogContentProps & {
  context: MorphContextValue
  forwardedRef: ForwardedRef<HTMLDialogElement>
}) => {
  const ref = useComposedRefs(context.contentRef, forwardedRef)
  const shared = useSharedName("surface", "content")
  const pressedBackdrop = useRef(false)
  const { motion, triggerRef, contentRef, change } = context

  useIsomorphicLayoutEffect(() => {
    const node = contentRef.current
    if (!node) return
    const active = document.activeElement
    const returnTo =
      active instanceof HTMLElement && active !== document.body ? active : null
    if (!node.open) node.showModal()
    focusInto(node, initialFocus?.current, `[${CLOSE_ATTRIBUTE}]`)

    if (motion === "flip" && triggerRef.current) {
      const trigger = triggerRef.current
      const easing = readSpringEasing(node)
      node.animate(
        morphKeyframes(
          trigger.getBoundingClientRect(),
          node.getBoundingClientRect(),
          getComputedStyle(trigger).borderTopLeftRadius,
          getComputedStyle(node).borderTopLeftRadius,
        ),
        { duration: 560, easing },
      )
      for (const child of Array.from(node.children)) {
        if (child.hasAttribute("data-morph-image")) continue
        child.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: 280,
          delay: 140,
          easing: "ease-out",
          fill: "backwards",
        })
      }
      node.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 320,
        pseudoElement: "::backdrop",
      })
    } else if (motion === "fade") {
      node.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: FADE_MS,
        easing: "ease-out",
      })
      node.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: FADE_MS,
        pseudoElement: "::backdrop",
      })
    }

    return () => {
      // Decided before close(): browsers restore focus themselves, which would hide the trigger.
      const reclaim = shouldReclaimFocus(node)
      if (node.open) node.close()
      if (!reclaim) return
      const target = triggerRef.current?.isConnected ? triggerRef.current : returnTo
      target?.focus({ preventScroll: true })
    }
  }, [])

  return (
    <ScopeContext.Provider value="content">
      <dialog
        ref={ref}
        id={context.contentId}
        aria-labelledby={context.titleId}
        tabIndex={-1}
        className={cx(
          "kg-morph-dialog fixed inset-0 m-auto h-fit max-h-[calc(100dvh-var(--kg-space)*8)] w-[min(52rem,calc(100%-var(--kg-space)*8))] max-w-none",
          "overflow-auto overscroll-contain rounded-kg-2xl border-2 border-kg-ink bg-kg-surface p-0 text-kg-fg shadow-kg-lg outline-none",
          "[view-transition-class:kg-morph] [view-transition-name:var(--_vt-surface,none)]",
          "backdrop:bg-kg-overlay data-[state=closing]:pointer-events-none",
          className,
        )}
        data-motion={motion}
        data-state="open"
        style={{ ...shared, ...style }}
        {...props}
        onCancel={(event) => {
          onCancel?.(event)
          const vetoed = event.defaultPrevented
          // Kept open so the morph back can play; the state change closes it.
          event.preventDefault()
          if (!vetoed) change(false)
        }}
        onClose={(event) => {
          onClose?.(event)
          // A forced close (a second Escape the browser won't let us veto) skips the animation.
          if (context.open && !event.currentTarget.open) context.dismiss()
        }}
        onPointerDown={(event) => {
          onPointerDown?.(event)
          pressedBackdrop.current =
            event.target === event.currentTarget &&
            isOutside(event.currentTarget, event)
        }}
        onClick={(event) => {
          onClick?.(event)
          const pressed = pressedBackdrop.current
          pressedBackdrop.current = false
          if (!dismissible || !pressed || event.defaultPrevented) return
          // Requiring the press to start on the backdrop keeps a drag-select out of the panel
          // from closing it.
          if (
            event.target === event.currentTarget &&
            isOutside(event.currentTarget, event)
          )
            change(false)
        }}
      >
        {children}
      </dialog>
    </ScopeContext.Provider>
  )
}

const image =
  "kg-morph-dialog__image block w-full object-cover select-none [view-transition-class:kg-morph-image] [view-transition-name:var(--_vt-image,none)]"

const title =
  "kg-morph-dialog__title m-0 block w-fit leading-[1.2] font-[650] [view-transition-class:kg-morph-title] [view-transition-name:var(--_vt-title,none)]"

export interface MorphDialogImageProps extends ImgHTMLAttributes<HTMLImageElement> {}

/**
 * The picture that travels between card and dialog. Inside the trigger it is decorative
 * (`alt=""`), because the trigger's title already names the button; inside the dialog it keeps
 * its `alt`.
 */
export const MorphDialogImage = forwardRef<HTMLImageElement, MorphDialogImageProps>(
  ({ className, style, alt, src, ...props }, ref) => {
    useMorph("MorphDialogImage")
    const scope = useContext(ScopeContext)
    const shared = useSharedName("image")
    const label = scope === "trigger" ? "" : alt
    if (!src) {
      // No picture yet: a neutral placeholder that still travels with the morph.
      return (
        <span
          ref={ref as unknown as Ref<HTMLSpanElement>}
          className={cx(image, "min-h-[6rem] bg-kg-paper-sky", className)}
          data-morph-image=""
          data-placeholder=""
          role={label ? "img" : undefined}
          aria-label={label || undefined}
          aria-hidden={label ? undefined : true}
          style={{ ...shared, ...style }}
        />
      )
    }
    return (
      <img
        ref={ref}
        className={cx(image, className)}
        data-morph-image=""
        src={src}
        alt={label}
        draggable={false}
        style={{ ...shared, ...style }}
        {...props}
      />
    )
  },
)

MorphDialogImage.displayName = "MorphDialogImage"

export interface MorphDialogTitleProps extends HTMLAttributes<HTMLHeadingElement> {}

/** The name that travels with the card. In the dialog it is the heading that labels it. */
export const MorphDialogTitle = forwardRef<HTMLHeadingElement, MorphDialogTitleProps>(
  ({ className, style, ...props }, ref) => {
    const context = useMorph("MorphDialogTitle")
    const scope = useContext(ScopeContext)
    const shared = useSharedName("title")
    const merged = { ...shared, ...style }
    if (scope === "content") {
      return (
        <h2
          ref={ref}
          className={cx(title, "text-[length:var(--kg-text-2xl)] tracking-[-0.025em]", className)}
          style={merged}
          {...props}
          id={context.titleId}
        />
      )
    }
    return (
      <span
        ref={ref}
        className={cx(title, "tracking-[-0.015em]", className)}
        data-scope="trigger"
        style={merged}
        {...props}
      />
    )
  },
)

MorphDialogTitle.displayName = "MorphDialogTitle"

export interface MorphDialogCloseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name of the default icon button. */
  label?: string
  /** Merge behaviour onto your own single child element instead of the icon button. */
  asChild?: boolean
}

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

/** Closes the dialog, morphing it back into its card. Renders a corner icon button by default. */
export const MorphDialogClose = forwardRef<HTMLButtonElement, MorphDialogCloseProps>(
  (
    { label = "Close", asChild = false, className, onClick, children, ...props },
    ref,
  ) => {
    const context = useMorph("MorphDialogClose")
    const handleClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented) context.change(false)
    }
    if (asChild) {
      return (
        <Slot ref={ref} className={className} onClick={handleClick} {...props}>
          {children}
        </Slot>
      )
    }
    if (children !== undefined) {
      return (
        <button
          ref={ref}
          type="button"
          className={className}
          onClick={handleClick}
          {...props}
        >
          {children}
        </button>
      )
    }
    return (
      <div className="absolute end-3 top-3 z-2">
        <IconButton
          ref={ref}
          label={label}
          icon={<CloseIcon />}
          size="sm"
          variant="outline"
          round
          className={cx("kg-morph-dialog__close", className)}
          onClick={handleClick}
          {...{ [CLOSE_ATTRIBUTE]: "" }}
          {...props}
        />
      </div>
    )
  },
)

MorphDialogClose.displayName = "MorphDialogClose"
