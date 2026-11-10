"use client"

import { useContext } from "react"
import { MotionContext } from "../provider/motion-context.js"
import { useMediaQuery } from "./use-media-query.js"

/** Live: flips when the OS setting changes, not just on mount. */
export const useReducedMotion = (): boolean => {
  const preference = useContext(MotionContext)
  const system = useMediaQuery("(prefers-reduced-motion: reduce)")
  return preference === "always" || system
}
