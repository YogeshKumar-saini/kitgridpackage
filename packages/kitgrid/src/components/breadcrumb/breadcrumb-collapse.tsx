"use client"

import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react"
import { breadcrumbParts } from "./breadcrumb-parts.js"

interface BreadcrumbCollapseProps {
  label: string
  separator: ReactNode
  /** The hidden entries, already rendered (with their separators) by the server part. */
  children: ReactNode
}

const EllipsisIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.75" />
    <circle cx="12" cy="12" r="1.75" />
    <circle cx="19" cy="12" r="1.75" />
  </svg>
)

/**
 * @internal The only interactive piece of Breadcrumb, split out so a non-collapsing breadcrumb
 * ships no JavaScript in a server component tree.
 */
export const BreadcrumbCollapse = ({
  label,
  separator,
  children,
}: BreadcrumbCollapseProps) => {
  const [expanded, setExpanded] = useState(false)
  const restore = useRef<{ list: Element; index: number } | null>(null)

  // The button unmounts on expand, so focus moves to the first revealed link instead of <body>.
  useEffect(() => {
    const target = restore.current
    if (!expanded || !target) return
    restore.current = null
    const entries = Array.from(target.list.children).slice(target.index)
    for (const entry of entries) {
      const link = entry.querySelector<HTMLElement>("a[href], [tabindex]")
      if (link) {
        link.focus()
        return
      }
    }
  }, [expanded])

  if (expanded) return <>{children}</>

  const expand = (event: MouseEvent<HTMLButtonElement>) => {
    const item = event.currentTarget.parentElement
    const list = item?.parentElement
    if (item && list)
      restore.current = { list, index: Array.from(list.children).indexOf(item) }
    setExpanded(true)
  }

  return (
    <>
      <li className={breadcrumbParts.separator} role="presentation" aria-hidden="true">
        {separator}
      </li>
      <li className={breadcrumbParts.item}>
        <button
          type="button"
          className={[
            "kg-breadcrumb__ellipsis inline-grid h-6 w-7 cursor-pointer place-items-center rounded-kg-sm border-0 bg-transparent p-0 text-inherit",
            "transition-colors duration-(--kg-duration-fast) ease-kg-out hover:bg-kg-muted hover:text-kg-fg [&_svg]:size-4",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kg-ring",
          ].join(" ")}
          aria-label={label}
          onClick={expand}
        >
          <EllipsisIcon />
        </button>
      </li>
    </>
  )
}
