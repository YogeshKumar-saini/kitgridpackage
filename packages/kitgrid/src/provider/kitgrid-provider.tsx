"use client"

import type { ReactNode } from "react"
import { MotionContext, type ReducedMotionPreference } from "./motion-context.js"

export interface KitgridProviderProps {
  /** `always` forces every effect below into its reduced-motion form. */
  reducedMotion?: ReducedMotionPreference
  children?: ReactNode
}

/** Optional. Components work without it; add it only to override the motion policy. */
export const KitgridProvider = ({
  reducedMotion = "user",
  children,
}: KitgridProviderProps) => (
  <MotionContext.Provider value={reducedMotion}>
    <div
      data-kg-motion={reducedMotion === "always" ? "reduce" : undefined}
      style={{ display: "contents" }}
    >
      {children}
    </div>
  </MotionContext.Provider>
)
