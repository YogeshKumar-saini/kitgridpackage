"use client"

import { forwardRef, type HTMLAttributes, type ReactNode, useState } from "react"
import { cx } from "../../utils/cx.js"

export interface JsonViewerLabels {
  /** Summary of a collapsed container, given its size. */
  items?: (count: number) => string
}

export interface JsonViewerProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  data: unknown
  /** Containers deeper than this start collapsed. 0 collapses the root. */
  defaultExpandDepth?: number
  /** Label for the root node. */
  rootName?: string
  sortKeys?: boolean
  /** Strings longer than this are cut with an ellipsis. */
  maxStringLength?: number
  labels?: JsonViewerLabels
}

type Kind = "object" | "array" | "string" | "number" | "boolean" | "null" | "other"

const kindOf = (value: unknown): Kind => {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  const type = typeof value
  if (type === "object") return "object"
  if (type === "string" || type === "number" || type === "boolean") return type
  return "other"
}

interface NodeProps {
  name: ReactNode
  value: unknown
  depth: number
  options: Required<Pick<JsonViewerProps, "defaultExpandDepth" | "sortKeys" | "maxStringLength">> & {
    labels: Required<JsonViewerLabels>
  }
  last: boolean
  ancestors: readonly object[]
}

const VALUE_INK: Record<Kind, string> = {
  string: "[overflow-wrap:anywhere] whitespace-pre-wrap text-[color-mix(in_oklab,var(--kg-success)_80%,var(--kg-fg))]",
  number: "text-[color-mix(in_oklab,var(--kg-info)_85%,var(--kg-fg))]",
  boolean: "text-kg-accent-strong",
  null: "italic text-kg-fg-faint",
  other: "italic text-kg-fg-faint",
  object: "",
  array: "",
}

const Primitive = ({ value, max }: { value: unknown; max: number }) => {
  const kind = kindOf(value)
  let text: string
  if (kind === "string") {
    const raw = value as string
    text = JSON.stringify(raw.length > max ? `${raw.slice(0, max)}…` : raw)
  } else if (kind === "other") text = String(value)
  else text = JSON.stringify(value)
  return (
    <span className={`kg-json-viewer__value ${VALUE_INK[kind]}`} data-kind={kind}>
      {text}
    </span>
  )
}

const JsonNode = ({ name, value, depth, options, last, ancestors }: NodeProps) => {
  const kind = kindOf(value)
  const container = kind === "object" || kind === "array"
  const [open, setOpen] = useState(depth < options.defaultExpandDepth)
  const comma = last ? null : <span className="kg-json-viewer__punct text-kg-fg-faint">,</span>
  const key =
    name === null ? null : (
      <>
        <span className="kg-json-viewer__key font-medium text-kg-fg">{name}</span>
        <span className="kg-json-viewer__punct text-kg-fg-faint">: </span>
      </>
    )

  if (!container) {
    return (
      <li className="kg-json-viewer__row ps-[1.125rem] whitespace-nowrap">
        {key}
        <Primitive value={value} max={options.maxStringLength} />
        {comma}
      </li>
    )
  }

  const circular = ancestors.includes(value as object)
  const entries: [string, unknown][] = circular
    ? []
    : kind === "array"
      ? (value as unknown[]).map((item, index) => [String(index), item])
      : Object.entries(value as Record<string, unknown>)
  if (kind === "object" && options.sortKeys) entries.sort(([a], [b]) => a.localeCompare(b))
  const [openBrace, closeBrace] = kind === "array" ? ["[", "]"] : ["{", "}"]
  const nextAncestors = [...ancestors, value as object]

  return (
    <li className="kg-json-viewer__row whitespace-nowrap" data-container="">
      <button
        type="button"
        className={cx(
          "kg-json-viewer__toggle -ms-0.5 inline-flex cursor-pointer items-baseline rounded-kg-xs border-0 bg-transparent py-0 ps-0 pe-1 text-start text-inherit [font:inherit] disabled:cursor-default",
          "interactive:hover:bg-kg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-kg-ring",
          "[&_svg]:me-1 [&_svg]:size-3.5 [&_svg]:flex-none [&_svg]:self-center [&_svg]:text-kg-fg-faint [&_svg]:transition-transform [&_svg]:duration-(--kg-duration-base) [&_svg]:ease-kg-spring disabled:[&_svg]:opacity-0",
          open && "[&_svg]:rotate-90",
        )}
        aria-expanded={open}
        disabled={entries.length === 0}
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M6 4l4 4-4 4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {key}
        <span className="kg-json-viewer__punct text-kg-fg-faint">{openBrace}</span>
        {(!open || entries.length === 0) && (
          <>
            {(entries.length > 0 || circular) && (
              <span className="kg-json-viewer__summary mx-1.5 rounded-full bg-kg-muted px-1.5 text-[0.85em] text-kg-fg-muted">
                {circular ? "circular" : options.labels.items(entries.length)}
              </span>
            )}
            <span className="kg-json-viewer__punct text-kg-fg-faint">{closeBrace}</span>
            {comma}
          </>
        )}
      </button>
      {open && entries.length > 0 && (
        <>
          <ul className="kg-json-viewer__children relative m-0 ms-2 list-none p-0 ps-4 transition-[opacity,translate] duration-(--kg-duration-base) ease-kg-out before:absolute before:inset-y-[0.15rem] before:start-0 before:w-px before:bg-kg-border starting:-translate-y-0.5 starting:opacity-0">
            {entries.map(([childKey, child], index) => (
              <JsonNode
                key={childKey}
                name={kind === "array" ? null : JSON.stringify(childKey)}
                value={child}
                depth={depth + 1}
                options={options}
                last={index === entries.length - 1}
                ancestors={nextAncestors}
              />
            ))}
          </ul>
          <span className="kg-json-viewer__close block ps-[1.125rem]">
            <span className="kg-json-viewer__punct text-kg-fg-faint">{closeBrace}</span>
            {comma}
          </span>
        </>
      )}
    </li>
  )
}

/** Collapsible, syntax-colored view of any JSON-like value. Each container is a native toggle. */
export const JsonViewer = forwardRef<HTMLDivElement, JsonViewerProps>(
  (
    {
      data,
      defaultExpandDepth = 2,
      rootName,
      sortKeys = false,
      maxStringLength = 120,
      labels,
      className,
      ...props
    },
    ref,
  ) => {
    const options = {
      defaultExpandDepth,
      sortKeys,
      maxStringLength,
      labels: {
        items: (count: number) => `${count} ${count === 1 ? "item" : "items"}`,
        ...labels,
      },
    }
    return (
      <div
        ref={ref}
        className={cx(
          "kg-json-viewer min-w-0 overflow-auto rounded-kg-xl border-2 border-kg-ink shadow-kg-sm",
          className,
        )}
        {...props}
      >
        <ul
          data-theme="dark"
          className="kg-json-viewer__root m-0 min-h-full w-max min-w-full list-none bg-kg-bg px-3.5 py-3 font-kg-mono text-kg-sm leading-[1.7] text-kg-fg"
        >
          <JsonNode
            name={rootName ?? null}
            value={data}
            depth={0}
            options={options}
            last
            ancestors={[]}
          />
        </ul>
      </div>
    )
  },
)
JsonViewer.displayName = "JsonViewer"
