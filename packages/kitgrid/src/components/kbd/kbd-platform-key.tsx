"use client"

import { useSyncExternalStore } from "react"

export type KbdPlatformToken = "mod" | "alt" | "ctrl"

const glyphs: Record<
  KbdPlatformToken,
  { apple: [string, string]; other: [string, string] }
> = {
  mod: { apple: ["⌘", "Command"], other: ["Ctrl", "Control"] },
  alt: { apple: ["⌥", "Option"], other: ["Alt", "Alt"] },
  ctrl: { apple: ["⌃", "Control"], other: ["Ctrl", "Control"] },
}

type UserAgentDataNavigator = Navigator & { userAgentData?: { platform?: string } }

const subscribe = () => () => {}

const isApplePlatform = () => {
  const nav = navigator as UserAgentDataNavigator
  return /mac|iphone|ipad|ipod/i.test(nav.userAgentData?.platform || nav.platform || "")
}

/**
 * Renders the non-Apple form on the server and during hydration, then upgrades in place, so
 * markup always matches and the swap never logs a hydration error.
 */
export const KbdPlatformKey = ({ token }: { token: KbdPlatformToken }) => {
  const apple = useSyncExternalStore(subscribe, isApplePlatform, () => false)
  const [glyph, label] = glyphs[token][apple ? "apple" : "other"]
  return glyph === label ? (
    <>{glyph}</>
  ) : (
    <>
      <span aria-hidden="true">{glyph}</span>
      <span className="kg-visually-hidden">{label}</span>
    </>
  )
}
