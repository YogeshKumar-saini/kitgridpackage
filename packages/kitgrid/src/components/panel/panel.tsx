"use client"

import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { type VariantProps, variants } from "../../utils/variants.js"

/*
 * Paper Layers: a panel is a sheet in an ink frame; `raised` lifts it on an ink offset and
 * `inset` sinks it into the page. Inside a seam grid it drops its own frame and the grid's ink
 * seams take over. Registration marks are two ink corners drawn by the pseudo-elements.
 */
const panelVariants = variants({
  base: [
    "kg-panel relative flex min-h-0 min-w-0 flex-col rounded-(--_radius) border-2 text-kg-fg",
    "[.kg-panel-grid[data-variant=seam]>&]:rounded-none [.kg-panel-grid[data-variant=seam]>&]:border-0 [.kg-panel-grid[data-variant=seam]>&]:shadow-none",
    "data-marks:before:pointer-events-none data-marks:before:absolute data-marks:before:start-[7px] data-marks:before:top-[7px] data-marks:before:size-[7px] data-marks:before:border-s data-marks:before:border-t data-marks:before:border-kg-fg-faint",
    "data-marks:after:pointer-events-none data-marks:after:absolute data-marks:after:end-[7px] data-marks:after:bottom-[7px] data-marks:after:size-[7px] data-marks:after:border-e data-marks:after:border-b data-marks:after:border-kg-fg-faint",
  ],
  variants: {
    variant: {
      plain: "border-kg-ink bg-kg-surface",
      raised: "border-kg-ink bg-kg-surface shadow-kg-md",
      inset: "border-transparent bg-kg-surface-sunken",
    },
    padding: {
      none: "[--_pad:0px] [--_radius:var(--kg-radius-xl)]",
      sm: "[--_pad:calc(var(--kg-space)*3.5)] [--_radius:var(--kg-radius-lg)]",
      md: "[--_pad:calc(var(--kg-space)*5)] [--_radius:var(--kg-radius-xl)]",
      lg: "[--_pad:calc(var(--kg-space)*7)] [--_radius:var(--kg-radius-xl)]",
    },
  },
  defaults: { variant: "plain", padding: "md" },
})

type PanelVariantProps = VariantProps<typeof panelVariants>
export type PanelVariant = NonNullable<PanelVariantProps["variant"]>
export type PanelPadding = NonNullable<PanelVariantProps["padding"]>
export type PanelSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | "full"
export type PanelElement = "section" | "article" | "div" | "aside"
export type PanelTitleElement = "h2" | "h3" | "h4" | "h5" | "h6"

interface PanelContextValue {
  collapsible: boolean
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
  bodyId: string
  setTitled: (titled: boolean) => void
}

const PanelContext = createContext<PanelContextValue | null>(null)

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  variant?: PanelVariant
  /** Padding of the header, body and footer. */
  padding?: PanelPadding
  as?: PanelElement
  /** Columns taken in a `PanelGrid` on wide containers, out of 12. */
  span?: PanelSpan
  /** Columns taken on medium containers. Defaults to half for spans up to 6, else full. */
  spanMd?: PanelSpan
  /** Rows taken in a `PanelGrid`. */
  rowSpan?: 1 | 2 | 3
  /** Two corner registration marks, a quiet nod to print. */
  marks?: boolean
  /** The title becomes a disclosure button that folds the body away. */
  collapsible?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * A dashboard surface: header, body and footer parts on one of three materials. It names
 * itself after its `PanelTitle`, and lays itself out in a `PanelGrid` through `span`.
 */
export const Panel = forwardRef<HTMLElement, PanelProps>(
  (
    {
      variant = "plain",
      padding = "md",
      as: Root = "section",
      span,
      spanMd,
      rowSpan,
      marks = false,
      collapsible = false,
      open: openProp,
      defaultOpen = true,
      onOpenChange,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const id = useId()
    const [open, setOpen] = useControllableState({
      value: openProp,
      defaultValue: defaultOpen,
      onChange: onOpenChange,
    })
    const [titled, setTitled] = useState(false)
    const context = useMemo<PanelContextValue>(
      () => ({
        collapsible,
        open: collapsible ? open : true,
        setOpen,
        titleId: `${id}-title`,
        bodyId: `${id}-body`,
        setTitled,
      }),
      [collapsible, open, setOpen, id],
    )

    return (
      <Root
        ref={ref as never}
        className={panelVariants({ variant, padding, className: cx("group/panel", className) })}
        data-variant={variant}
        data-padding={padding}
        data-span={span}
        data-span-md={spanMd}
        data-row-span={rowSpan}
        data-marks={marks || undefined}
        data-state={collapsible ? (open ? "open" : "closed") : undefined}
        aria-labelledby={titled ? context.titleId : undefined}
        {...props}
      >
        <PanelContext.Provider value={context}>{children}</PanelContext.Provider>
      </Root>
    )
  },
)

Panel.displayName = "Panel"

export type PanelHeaderProps = HTMLAttributes<HTMLElement>

/** Title, meta and actions on one line, joined by a hairline. */
export const PanelHeader = forwardRef<HTMLElement, PanelHeaderProps>(
  ({ className, ...props }, ref) => (
    <header
      ref={ref}
      className={cx(
        "kg-panel__header flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-(--_pad) pt-[calc(var(--_pad)*0.8)] pb-0",
        "[.kg-panel[data-state=closed]>&]:pb-[calc(var(--_pad)*0.8)]",
        "after:order-1 after:h-px after:min-w-4 after:flex-[1_1_1rem] after:bg-kg-border after:content-['']",
        className,
      )}
      {...props}
    />
  ),
)

PanelHeader.displayName = "PanelHeader"

export interface PanelTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  /** Pick the level that fits the page outline. */
  as?: PanelTitleElement
}

const toggleClass = [
  "kg-panel__toggle -mx-1.5 -my-1 inline-flex max-w-full cursor-pointer items-center gap-1.5 rounded-kg-sm border-0 bg-transparent px-1.5 py-1",
  "text-start font-[inherit] tracking-[inherit] text-inherit transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
].join(" ")

const Chevron = () => (
  <svg
    className="kg-panel__chevron size-[0.875rem] shrink-0 text-kg-fg-muted transition-[rotate] duration-(--kg-duration-base) ease-kg-out group-data-[state=closed]/panel:-rotate-90"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m4 6 4 4 4-4" />
  </svg>
)

export const PanelTitle = forwardRef<HTMLHeadingElement, PanelTitleProps>(
  ({ as: Tag = "h2", className, children, id: idProp, ...props }, ref) => {
    const context = useContext(PanelContext)
    const setTitled = context?.setTitled
    useIsomorphicLayoutEffect(() => {
      if (!setTitled) return
      setTitled(true)
      return () => setTitled(false)
    }, [setTitled])
    return (
      <Tag
        ref={ref}
        className={cx(
          "kg-panel__title m-0 min-w-0 text-kg-base font-[620] leading-[1.35] tracking-[-0.01em] text-balance text-kg-fg",
          className,
        )}
        id={idProp ?? context?.titleId}
        {...props}
      >
        {context?.collapsible ? (
          <button
            type="button"
            className={toggleClass}
            aria-expanded={context.open}
            aria-controls={context.bodyId}
            onClick={() => context.setOpen(!context.open)}
          >
            <span className="kg-panel__toggle-text">{children}</span>
            <Chevron />
          </button>
        ) : (
          children
        )}
      </Tag>
    )
  },
)

PanelTitle.displayName = "PanelTitle"

export type PanelMetaProps = HTMLAttributes<HTMLSpanElement>

/** A short, quiet readout beside the title: "last 30 days", "updated 2 min ago". */
export const PanelMeta = forwardRef<HTMLSpanElement, PanelMetaProps>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cx("kg-panel__meta min-w-0 text-kg-xs leading-[1.4] tabular-nums text-kg-fg-faint", className)}
      {...props}
    />
  ),
)

PanelMeta.displayName = "PanelMeta"

export type PanelActionsProps = HTMLAttributes<HTMLDivElement>

export const PanelActions = forwardRef<HTMLDivElement, PanelActionsProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cx("kg-panel__actions order-2 -my-1 flex shrink-0 items-center gap-1.5", className)}
      {...props}
    />
  ),
)

PanelActions.displayName = "PanelActions"

export interface PanelBodyProps extends HTMLAttributes<HTMLDivElement> {
  /** Let the content run to the panel edges, for charts and tables. */
  bleed?: boolean
  /** Caps the body height; taller content scrolls inside it. Any CSS length. */
  maxHeight?: string
  children?: ReactNode
}

const inset = "pt-(--_top) pb-(--_pad)"

export const PanelBody = forwardRef<HTMLDivElement, PanelBodyProps>(
  ({ bleed = false, maxHeight, className, style, children, ...props }, forwardedRef) => {
    const context = useContext(PanelContext)
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const closed = Boolean(context?.collapsible && !context.open)

    // Folded content stays mounted for the height transition, so take it out of the tab order.
    useIsomorphicLayoutEffect(() => {
      if (local.current) local.current.inert = closed
    }, [closed])

    return (
      <div
        ref={ref}
        id={context?.collapsible ? context.bodyId : undefined}
        className={cx(
          "kg-panel__body min-h-0 min-w-0 flex-auto text-kg-base leading-[1.55] [--_top:var(--_pad)]",
          String.raw`[.kg-panel\_\_header+&]:[--_top:calc(var(--_pad)*0.8)]`,
          context?.collapsible
            ? cx(
                "grid p-0 transition-[grid-template-rows,opacity] duration-[var(--kg-duration-slow)] ease-kg-out",
                closed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr]",
              )
            : cx(inset, bleed ? "px-0" : "px-(--_pad)"),
          className,
        )}
        data-bleed={bleed || undefined}
        data-state={context?.collapsible ? (closed ? "closed" : "open") : undefined}
        style={maxHeight ? { ...style, maxHeight, overflowY: "auto" } : style}
        {...props}
      >
        {context?.collapsible ? (
          <div className="kg-panel__fold min-h-0 min-w-0 overflow-clip [overflow-clip-margin:4px]">
            <div className={cx("kg-panel__body-inner", inset, bleed ? "px-0" : "px-(--_pad)")}>
              {children}
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    )
  },
)

PanelBody.displayName = "PanelBody"

export type PanelFooterProps = HTMLAttributes<HTMLElement>

export const PanelFooter = forwardRef<HTMLElement, PanelFooterProps>(
  ({ className, ...props }, ref) => {
    const context = useContext(PanelContext)
    return (
      <footer
        ref={ref}
        className={cx(
          "kg-panel__footer flex flex-wrap items-center gap-2 border-t border-kg-border px-(--_pad) py-[calc(var(--_pad)*0.7)] text-kg-sm text-kg-fg-muted [&[hidden]]:hidden",
          className,
        )}
        hidden={context?.collapsible && !context.open ? true : undefined}
        {...props}
      />
    )
  },
)

PanelFooter.displayName = "PanelFooter"
