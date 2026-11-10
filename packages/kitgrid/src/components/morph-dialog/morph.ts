const SPRING_FALLBACK = "cubic-bezier(0.22, 1.2, 0.36, 1)"

/** The library's spring curve from tokens, so the FLIP fallback lands like the native morph. */
export const readSpringEasing = (node: Element): string =>
  getComputedStyle(node).getPropertyValue("--kg-ease-spring").trim() ||
  SPRING_FALLBACK

/**
 * Keyframes that grow an element sitting at `to` out of the box at `from`. A uniform scale keeps
 * text and images undistorted; the clip-path crops it to `from`'s shape, the same way
 * `object-fit: cover` would, so the two boxes can have different aspect ratios.
 */
export const morphKeyframes = (
  from: DOMRect,
  to: DOMRect,
  fromRadius: string,
  toRadius: string,
): Keyframe[] => {
  const width = to.width || 1
  const height = to.height || 1
  const scale = Math.max(from.width / width, from.height / height) || 1
  const dx = from.left + from.width / 2 - (to.left + to.width / 2)
  const dy = from.top + from.height / 2 - (to.top + to.height / 2)
  const insetX = Math.max(0, (width - from.width / scale) / 2)
  const insetY = Math.max(0, (height - from.height / scale) / 2)
  const radius = (Number.parseFloat(fromRadius) || 0) / scale
  return [
    {
      transform: `translate(${dx}px, ${dy}px) scale(${scale})`,
      clipPath: `inset(${insetY}px ${insetX}px round ${radius}px)`,
    },
    {
      transform: "translate(0px, 0px) scale(1)",
      clipPath: `inset(0px 0px round ${toRadius || "0px"})`,
    },
  ]
}

/** Runs `commit` inside a view transition and resolves once the transition has settled. */
export const startMorphTransition = (commit: () => void): Promise<void> => {
  if (!("startViewTransition" in document)) {
    commit()
    return Promise.resolve()
  }
  const transition = document.startViewTransition(commit)
  // A skipped transition rejects `finished` even though the DOM update itself went through.
  return transition.finished.catch(() => undefined)
}
