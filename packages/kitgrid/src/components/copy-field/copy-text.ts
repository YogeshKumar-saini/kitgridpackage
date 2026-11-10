"use client"

import { useCallback, useEffect, useRef, useState } from "react"

/** Writes to the clipboard, falling back to a hidden textarea where the async API is blocked. */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Permission denied or insecure context: fall through to the legacy path.
  }
  try {
    const area = document.createElement("textarea")
    area.value = text
    area.setAttribute("readonly", "")
    area.style.position = "fixed"
    area.style.opacity = "0"
    document.body.append(area)
    area.select()
    const ok = document.execCommand?.("copy") ?? false
    area.remove()
    return ok
  } catch {
    return false
  }
}

/** Copies and holds a `copied` flag for `resetAfter` ms, clearing its timer on unmount. */
export const useCopy = (resetAfter = 1600) => {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(
    async (text: string) => {
      const ok = await copyText(text)
      setCopied(ok)
      clearTimeout(timer.current)
      if (ok) timer.current = setTimeout(() => setCopied(false), resetAfter)
      return ok
    },
    [resetAfter],
  )

  return { copied, copy }
}
