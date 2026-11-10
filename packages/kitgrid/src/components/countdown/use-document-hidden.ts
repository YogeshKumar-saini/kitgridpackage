"use client"

import { useEffect, useState } from "react"

/** Live `document.hidden`; `false` on the server and the first client render. */
export const useDocumentHidden = (): boolean => {
  const [hidden, setHidden] = useState(false)
  useEffect(() => {
    const update = () => setHidden(document.hidden)
    update()
    document.addEventListener("visibilitychange", update)
    return () => document.removeEventListener("visibilitychange", update)
  }, [])
  return hidden
}
