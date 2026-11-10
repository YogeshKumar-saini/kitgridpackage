"use client"

import { createContext } from "react"

/** `user` follows the OS setting; `always` forces reduced motion for the subtree. */
export type ReducedMotionPreference = "user" | "always"

export const MotionContext = createContext<ReducedMotionPreference>("user")
