"use client"

import {
  type ButtonHTMLAttributes,
  createContext,
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useMediaQuery } from "../../hooks/use-media-query.js"
import { cx } from "../../utils/cx.js"
import { Drawer, DrawerContent } from "../drawer/drawer.js"
import { SkipLink } from "../skip-link/skip-link.js"

export interface AppShellContextValue {
  /** True while the desktop sidebar is folded to its icon rail. Always false on mobile. */
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  /** True below `mobileQuery`, where the sidebar becomes an off-canvas drawer. */
  mobile: boolean
  mobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  sidebarId: string
  mainId: string
}

const AppShellContext = createContext<AppShellContextValue | null>(null)

/** The surrounding shell's state, or null outside an `AppShell`. */
export const useAppShell = (): AppShellContextValue | null =>
  useContext(AppShellContext)

const useAppShellContext = (part: string): AppShellContextValue => {
  const context = useContext(AppShellContext)
  if (!context) throw new Error(`<${part}> must be rendered inside <AppShell>.`)
  return context
}

export interface AppShellProps extends HTMLAttributes<HTMLDivElement> {
  collapsed?: boolean
  defaultCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
  mobileOpen?: boolean
  defaultMobileOpen?: boolean
  onMobileOpenChange?: (open: boolean) => void
  /** Below this media query the sidebar moves into a drawer. */
  mobileQuery?: string
  /** Sets `--kg-app-shell-sidebar`. Any CSS length. */
  sidebarWidth?: string
  /** Sets `--kg-app-shell-rail`, the collapsed width. */
  railWidth?: string
  /** Remembers the collapsed state in localStorage under this key. */
  storageKey?: string
  /** Text of the built-in skip link. Pass `false` to render your own. */
  skipLink?: ReactNode
  /** Id given to `AppShellMain`, which the skip link targets. */
  mainId?: string
}

const innerClass = cx(
  "kg-app-shell__sidebar-inner flex flex-col gap-3 h-full p-3 overflow-x-hidden overflow-y-auto",
  "overscroll-contain [scrollbar-width:thin]",
)

const readStored = (key: string): boolean | null => {
  try {
    const value = localStorage.getItem(key)
    return value === null ? null : value === "true"
  } catch {
    return null
  }
}

export const AppShell = forwardRef<HTMLDivElement, AppShellProps>(
  (
    {
      collapsed: collapsedProp,
      defaultCollapsed = false,
      onCollapsedChange,
      mobileOpen: mobileOpenProp,
      defaultMobileOpen = false,
      onMobileOpenChange,
      mobileQuery = "(max-width: 767.98px)",
      sidebarWidth,
      railWidth,
      storageKey,
      skipLink = "Skip to content",
      mainId: mainIdProp,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const [collapsed, setCollapsed] = useControllableState({
      value: collapsedProp,
      defaultValue: defaultCollapsed,
      onChange: onCollapsedChange,
    })
    const [mobileOpen, setMobileOpen] = useControllableState({
      value: mobileOpenProp,
      defaultValue: defaultMobileOpen,
      onChange: onMobileOpenChange,
    })
    const mobile = useMediaQuery(mobileQuery)
    const id = useId()
    const mainId = mainIdProp ?? `${id}-main`
    const sidebarId = `${id}-sidebar`

    // Read after mount: the server can't see storage, and hydration must match its markup.
    useEffect(() => {
      if (!storageKey) return
      const stored = readStored(storageKey)
      if (stored !== null) setCollapsed(stored)
    }, [storageKey, setCollapsed])

    useEffect(() => {
      if (!storageKey) return
      try {
        localStorage.setItem(storageKey, String(collapsed))
      } catch {}
    }, [storageKey, collapsed])

    // Leaving the mobile layout must not leave an invisible drawer holding the page inert.
    useEffect(() => {
      if (!mobile) setMobileOpen(false)
    }, [mobile, setMobileOpen])

    const value = useMemo<AppShellContextValue>(
      () => ({
        collapsed: collapsed && !mobile,
        setCollapsed,
        mobile,
        mobileOpen: mobileOpen && mobile,
        setMobileOpen,
        sidebarId,
        mainId,
      }),
      [collapsed, setCollapsed, mobile, mobileOpen, setMobileOpen, sidebarId, mainId],
    )

    const vars = {
      ...(sidebarWidth && { "--kg-app-shell-sidebar": sidebarWidth }),
      ...(railWidth && { "--kg-app-shell-rail": railWidth }),
      ...style,
    } as CSSProperties

    return (
      <AppShellContext.Provider value={value}>
        <div
          ref={ref}
          className={cx(
            "kg-app-shell relative grid h-dvh min-h-0 text-kg-fg bg-kg-bg",
            "[--kg-app-shell-sidebar:16rem] [--kg-app-shell-rail:4.25rem]",
            mobile
              ? "grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] [grid-template-areas:'header'_'main']"
              : cx(
                  "grid-rows-[auto_minmax(0,1fr)] [grid-template-areas:'sidebar_header'_'sidebar_main']",
                  value.collapsed
                    ? "grid-cols-[var(--kg-app-shell-rail)_minmax(0,1fr)]"
                    : "grid-cols-[var(--kg-app-shell-sidebar)_minmax(0,1fr)]",
                ),
            className,
          )}
          data-layout={mobile ? "mobile" : "desktop"}
          data-collapsed={value.collapsed || undefined}
          style={vars}
          {...props}
        >
          {skipLink !== false && <SkipLink target={mainId}>{skipLink}</SkipLink>}
          {children}
        </div>
      </AppShellContext.Provider>
    )
  },
)

AppShell.displayName = "AppShell"

export interface AppShellSidebarProps extends HTMLAttributes<HTMLElement> {
  /** Accessible name of the sidebar landmark and of the mobile drawer. */
  label?: string
  /** Accessible name of the mobile drawer's close button. */
  closeLabel?: string
}

/** A complementary landmark on desktop; a left drawer on the native <dialog> on mobile. */
export const AppShellSidebar = forwardRef<HTMLElement, AppShellSidebarProps>(
  (
    {
      label = "Sidebar",
      closeLabel = "Close navigation",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const shell = useAppShellContext("AppShellSidebar")

    if (shell.mobile) {
      return (
        <Drawer open={shell.mobileOpen} onOpenChange={shell.setMobileOpen}>
          <DrawerContent
            side="left"
            aria-label={label}
            closeLabel={closeLabel}
            className={cx(
              "kg-app-shell__drawer [--_drawer-size:min(var(--kg-app-shell-sidebar,16rem),85vw)]",
              className,
            )}
          >
            <div className={cx(innerClass, "pt-3.5")}>{children}</div>
          </DrawerContent>
        </Drawer>
      )
    }

    return (
      <aside
        ref={ref}
        id={shell.sidebarId}
        aria-label={label}
        className={cx(
          "kg-app-shell__sidebar [grid-area:sidebar] min-w-0 min-h-0 bg-kg-surface border-e-2 border-kg-ink",
          className,
        )}
        data-collapsed={shell.collapsed || undefined}
        {...props}
      >
        <div className={cx(innerClass, shell.collapsed && "px-2 items-stretch")}>{children}</div>
      </aside>
    )
  },
)

AppShellSidebar.displayName = "AppShellSidebar"

export interface AppShellHeaderProps extends HTMLAttributes<HTMLElement> {}

export const AppShellHeader = forwardRef<HTMLElement, AppShellHeaderProps>(
  ({ className, ...props }, ref) => (
    <header
      ref={ref}
      className={cx(
        "kg-app-shell__header [grid-area:header] relative z-1 min-w-0 bg-kg-bg border-b-2 border-kg-ink",
        className,
      )}
      {...props}
    />
  ),
)

AppShellHeader.displayName = "AppShellHeader"

export interface AppShellMainProps extends Omit<HTMLAttributes<HTMLElement>, "id"> {}

/** The scrolling content region and the skip link's target. */
export const AppShellMain = forwardRef<HTMLElement, AppShellMainProps>(
  ({ className, ...props }, ref) => {
    const shell = useAppShellContext("AppShellMain")
    return (
      <main
        ref={ref}
        id={shell.mainId}
        tabIndex={-1}
        className={cx(
          "kg-app-shell__main [grid-area:main] min-w-0 min-h-0 overflow-auto overscroll-contain outline-none",
          className,
        )}
        {...props}
      />
    )
  },
)

AppShellMain.displayName = "AppShellMain"

export interface AppShellToggleProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  /** Accessible names for each state. */
  labels?: { collapse?: string; expand?: string; open?: string }
}

const PanelIcon = ({ flipped }: { flipped: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <path d="M9 4v16" />
    <path
      className={cx(
        "kg-app-shell__toggle-chevron [transform-box:fill-box] origin-center",
        "transition-[rotate] duration-(--kg-duration-slow) ease-kg-out",
        flipped && "rotate-180",
      )}
      d="m15 10-2 2 2 2"
    />
  </svg>
)

/** Folds the sidebar to its rail on desktop and opens the navigation drawer on mobile. */
export const AppShellToggle = forwardRef<HTMLButtonElement, AppShellToggleProps>(
  ({ labels, className, onClick, ...props }, ref) => {
    const shell = useAppShellContext("AppShellToggle")
    const label = shell.mobile
      ? (labels?.open ?? "Open navigation")
      : shell.collapsed
        ? (labels?.expand ?? "Expand sidebar")
        : (labels?.collapse ?? "Collapse sidebar")
    return (
      <button
        ref={ref}
        type="button"
        className={cx(
          "kg-app-shell__toggle inline-grid place-items-center shrink-0 h-kg-sm w-(--kg-control-sm) p-0 text-kg-fg-muted",
          "bg-transparent border-0 rounded-kg-md cursor-pointer [&_svg]:size-[1.125rem]",
          "transition-[color,background-color,scale] duration-(--kg-duration-fast) ease-kg-out",
          "interactive:hover:text-kg-fg interactive:hover:bg-kg-muted interactive:active:scale-94",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
          className,
        )}
        aria-label={label}
        aria-expanded={shell.mobile ? shell.mobileOpen : !shell.collapsed}
        aria-controls={shell.mobile ? undefined : shell.sidebarId}
        aria-haspopup={shell.mobile ? "dialog" : undefined}
        data-collapsed={shell.collapsed || undefined}
        onClick={(event) => {
          onClick?.(event)
          if (event.defaultPrevented) return
          if (shell.mobile) shell.setMobileOpen(true)
          else shell.setCollapsed(!shell.collapsed)
        }}
        {...props}
      >
        <PanelIcon flipped={shell.collapsed || shell.mobile} />
      </button>
    )
  },
)

AppShellToggle.displayName = "AppShellToggle"
