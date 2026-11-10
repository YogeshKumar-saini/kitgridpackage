"use client"

import { type RefObject, useEffect, useState } from "react"

/*
 * @internal Scrollspy shared by TableOfContents and AnchorNav. Reads geometry on a rAF-throttled
 * scroll listener rather than IntersectionObserver, so a short section between two tall ones is
 * still reported and the last section wins once the container hits bottom.
 */

export interface ScrollSpyOptions {
  /** Distance from the container top at which a section counts as current, in px. */
  offset: number
  /** Scrolling container. Defaults to the window. */
  root?: RefObject<HTMLElement | null> | undefined
}

export const useScrollSpy = (ids: readonly string[], { offset, root }: ScrollSpyOptions) => {
  const [active, setActive] = useState<string | null>(ids[0] ?? null)
  const key = ids.join("|")

  useEffect(() => {
    const container = root?.current ?? null
    const target: HTMLElement | Window = container ?? window
    let frame = 0

    const update = () => {
      const top = container ? container.getBoundingClientRect().top : 0
      const atBottom = container
        ? container.scrollTop + container.clientHeight >= container.scrollHeight - 2
        : window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      let current: string | null = ids[0] ?? null
      for (const id of ids) {
        const element = document.getElementById(id)
        if (!element) continue
        if (element.getBoundingClientRect().top - top <= offset + 1) current = id
      }
      if (atBottom && ids.length > 0) current = ids.at(-1) ?? current
      setActive(current)
    }

    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    update()
    target.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    return () => {
      cancelAnimationFrame(frame)
      target.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
    }
  }, [key, offset, root])

  return [active, setActive] as const
}

/** Scrolls a section to `offset` below the container top, smoothly unless motion is reduced. */
export const scrollToSection = (
  id: string,
  offset: number,
  reduced: boolean,
  root?: RefObject<HTMLElement | null>,
) => {
  const element = document.getElementById(id)
  if (!element) return
  const container = root?.current ?? null
  const behavior: ScrollBehavior = reduced ? "auto" : "smooth"
  if (container) {
    const delta =
      element.getBoundingClientRect().top - container.getBoundingClientRect().top - offset
    container.scrollTo?.({ top: container.scrollTop + delta, behavior })
  } else {
    const top = element.getBoundingClientRect().top + window.scrollY - offset
    window.scrollTo?.({ top, behavior })
  }
  // Move focus for keyboard and screen-reader users without a second jump.
  if (!element.hasAttribute("tabindex")) element.setAttribute("tabindex", "-1")
  element.focus({ preventScroll: true })
}
