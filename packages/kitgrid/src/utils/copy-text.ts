"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/** Writes to the clipboard, falling back to a hidden textarea where the async API is blocked. */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Permission denied or insecure context: try the legacy path below.
  }
  if (typeof document === "undefined") return false
  const area = document.createElement("textarea")
  area.value = text
  area.setAttribute("readonly", "")
  area.style.position = "fixed"
  area.style.opacity = "0"
  document.body.appendChild(area)
  area.select()
  let ok = false
  try {
    ok = document.execCommand("copy")
  } catch {
    ok = false
  }
  area.remove()
  return ok
}

/** `copied` flips true for `resetMs` after a successful copy, for the button's confirmation. */
export const useCopy = (resetMs = 1600) => {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const copy = useCallback(
    async (text: string) => {
      const ok = await copyText(text)
      if (!ok) return false
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), resetMs)
      return true
    },
    [resetMs],
  )
  return { copied, copy }
}
