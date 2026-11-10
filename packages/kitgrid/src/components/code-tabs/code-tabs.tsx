"use client"

import {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useId,
} from "react"
import { useControllableState } from "../../hooks/use-controllable-state.js"
import { useRovingFocus } from "../../hooks/use-roving-focus.js"
import { useCopy } from "../../utils/copy-text.js"
import { cx } from "../../utils/cx.js"
import { CodeBlock, type CodeBlockProps } from "../code-block/code-block.js"
import type { CodeBlockToken } from "../code-block/tokenize.js"

export interface CodeTabsItem {
  value: string
  label: ReactNode
  code: string
  language?: string
  icon?: ReactNode
  tokens?: CodeBlockToken[][]
}

export interface CodeTabsLabels {
  copy?: string
  copied?: string
}

export interface CodeTabsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  items: CodeTabsItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Names the tab list, e.g. “Install command”. */
  label?: string
  lineNumbers?: boolean
  maxHeight?: string
  highlight?: CodeBlockProps["highlight"]
  labels?: CodeTabsLabels
}

const CopyGlyph = ({ done }: { done: boolean }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {done ? (
      <path d="M3.5 8.5l3 3 6-7" />
    ) : (
      <>
        <rect x="5.5" y="5.5" width="8" height="8" rx="1.8" />
        <path d="M10.5 3.2A1.8 1.8 0 0 0 8.8 2H4a2 2 0 0 0-2 2v4.8a1.8 1.8 0 0 0 1.2 1.7" />
      </>
    )}
  </svg>
)

/** One code sample in several flavours (npm, pnpm, yarn; or file per tab), with a shared copy. */
export const CodeTabs = forwardRef<HTMLDivElement, CodeTabsProps>(
  (
    {
      items,
      value: valueProp,
      defaultValue,
      onValueChange,
      label,
      lineNumbers = false,
      maxHeight,
      highlight,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const [value, setValue] = useControllableState({
      value: valueProp,
      defaultValue: defaultValue ?? items[0]?.value ?? "",
      onChange: onValueChange,
    })
    const id = useId()
    const roving = useRovingFocus({ orientation: "horizontal" })
    const { copied, copy } = useCopy()
    const active = items.find((item) => item.value === value) ?? items[0]
    const words = { copy: "Copy code", copied: "Copied", ...labels }

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      const next = roving(event)
      const nextValue = next?.dataset.value
      if (nextValue) setValue(nextValue)
    }

    return (
      <div ref={ref} className={cx(
          "kg-code-tabs relative grid min-w-0 overflow-hidden rounded-kg-xl border-2 border-kg-ink bg-kg-bg shadow-kg-sm",
          className,
        )} {...props}>
        <div
          data-theme="dark"
          className="kg-code-tabs__header flex items-center gap-2 border-b-2 border-kg-border bg-kg-surface px-1.5 py-1"
        >
          <div
            role="tablist"
            aria-label={label}
            className="kg-code-tabs__list flex min-w-0 flex-1 gap-0.5 overflow-x-auto [scrollbar-width:none]"
            onKeyDown={onKeyDown}
          >
            {items.map((item) => {
              const selected = item.value === active?.value
              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  id={`${id}-tab-${item.value}`}
                  aria-selected={selected}
                  aria-controls={`${id}-panel`}
                  tabIndex={selected ? 0 : -1}
                  data-kg-item=""
                  data-value={item.value}
                  data-state={selected ? "active" : "inactive"}
                  className={cx(
                    "kg-code-tabs__tab relative inline-flex h-[1.875rem] cursor-pointer items-center gap-1.5 rounded-kg-md border-0 px-2.5 font-kg-mono text-kg-xs font-medium whitespace-nowrap transition-colors duration-(--kg-duration-fast) ease-kg-out",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
                    selected
                      ? "bg-kg-muted text-kg-fg after:absolute after:inset-x-2.5 after:-bottom-[calc(var(--kg-space)+2px)] after:h-[3px] after:rounded-full after:bg-kg-accent"
                      : "bg-transparent text-kg-fg-muted hover:text-kg-fg",
                  )}
                  onClick={() => setValue(item.value)}
                >
                  {item.icon && (
                    <span className="kg-code-tabs__icon inline-flex [&_svg]:size-3.5" aria-hidden="true">
                      {item.icon}
                    </span>
                  )}
                  {item.label}
                </button>
              )
            })}
          </div>
          {active && (
            <button
              type="button"
              className={cx(
                "kg-code-tabs__copy inline-grid size-[1.875rem] flex-none cursor-pointer place-items-center rounded-kg-md border-0 bg-transparent p-0 text-kg-fg-muted transition-colors duration-(--kg-duration-fast) ease-kg-out",
                "hover:bg-kg-muted hover:text-kg-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring data-[state=copied]:text-kg-success",
                "[&_svg]:size-[0.9375rem] [&_svg]:transition-transform [&_svg]:duration-(--kg-duration-spring) [&_svg]:ease-(--kg-ease-bounce) data-[state=copied]:[&_svg]:rotate-360",
              )}
              data-state={copied ? "copied" : "idle"}
              aria-label={copied ? words.copied : words.copy}
              onClick={() => void copy(active.code.replace(/\n$/, ""))}
            >
              <CopyGlyph done={copied} />
            </button>
          )}
        </div>
        {active && (
          <div
            role="tabpanel"
            id={`${id}-panel`}
            aria-labelledby={`${id}-tab-${active.value}`}
            className="kg-code-tabs__panel min-w-0"
          >
            <CodeBlock
              key={active.value}
              className="kg-code-tabs__block transition-[opacity,translate] duration-(--kg-duration-base) ease-kg-out starting:translate-y-0.5 starting:opacity-0 [--_edge:0px] [--_radius:0px] [--_shadow:none]"
              code={active.code}
              {...(active.language ? { "data-language": active.language } : null)}
              {...(active.tokens ? { tokens: active.tokens } : null)}
              {...(highlight ? { highlight } : null)}
              {...(maxHeight ? { maxHeight } : null)}
              lineNumbers={lineNumbers}
              bare
              hideCopy
            />
          </div>
        )}
        <span className="kg-code-tabs__status sr-only" role="status">
          {copied ? words.copied : ""}
        </span>
      </div>
    )
  },
)
CodeTabs.displayName = "CodeTabs"
