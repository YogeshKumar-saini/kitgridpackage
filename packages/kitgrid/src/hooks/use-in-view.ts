"use client"

import { type RefObject, useEffect, useState } from "react"

export interface InViewOptions {
  /** Stop observing after the first intersection. */
  once?: boolean
  /** Fraction of the element that must be visible. */
  amount?: number
  rootMargin?: string
}

export const useInView = (
  ref: RefObject<Element | null>,
  { once = true, amount = 0.15, rootMargin = "0px" }: InViewOptions = {},
): boolean => {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { threshold: amount, rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, once, amount, rootMargin])

  return inView
}
