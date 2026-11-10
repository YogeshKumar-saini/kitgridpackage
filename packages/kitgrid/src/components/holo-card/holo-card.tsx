"use client"

import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  useEffect,
  useRef,
} from "react"
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect.js"
import { useReducedMotion } from "../../hooks/use-reduced-motion.js"
import { createSpring } from "../../hooks/use-spring.js"
import { useComposedRefs } from "../../utils/compose-refs.js"
import { cx } from "../../utils/cx.js"
import { clamp } from "../../utils/math.js"

export type HoloCardFoil = "rainbow" | "gold" | "silver" | "accent"

export interface HoloCardProps extends HTMLAttributes<HTMLDivElement> {
  /** The ink of the foil. `accent` prints in the paper colours (sage, peach, sky, butter, rose). */
  foil?: HoloCardFoil
  /** 0 to 1: how strongly the foil and glitter show. */
  intensity?: number
  /** A bright highlight that tracks the light source. */
  glare?: boolean
  /** Glitter specks revealed around the reflection. */
  sparkle?: boolean
  /** Maximum rotation on each axis, in degrees. */
  maxTilt?: number
  /** Artwork printed under the foil. */
  image?: string
  /** Alternative text for `image`. Leave empty when the artwork is decorative. */
  imageAlt?: string
  /**
   * Tilt with the phone's gyroscope. iOS asks for permission on the first tap on the card;
   * other platforms start listening straight away.
   */
  deviceMotion?: boolean
}

type PermissionRequester = {
  requestPermission?: () => Promise<"granted" | "denied" | "default">
}

// The pose a card holds at rest, so the foil already reads as foil before anyone touches it.
const REST = { px: 34, py: 26 }
const SHOWCASE = { rx: 7, ry: -11, px: 28, py: 20 }
const GYRO_RANGE = 22

const layer = "pointer-events-none absolute inset-0 rounded-[inherit]"

/**
 * A holographic foil card for gift cards, loyalty tiers and limited drops. It tilts on springs,
 * shifts an iridescent foil with the viewing angle, lets glitter catch the light around the
 * reflection, and lifts children marked `data-depth="<px>"` off the surface.
 */
export const HoloCard = forwardRef<HTMLDivElement, HoloCardProps>(
  (
    {
      foil = "rainbow",
      intensity = 0.7,
      glare = true,
      sparkle = true,
      maxTilt = 14,
      image,
      imageAlt = "",
      deviceMotion = false,
      className,
      style,
      children,
      ...props
    },
    forwardedRef,
  ) => {
    const local = useRef<HTMLDivElement>(null)
    const ref = useComposedRefs(local, forwardedRef)
    const bodyRef = useRef<HTMLDivElement>(null)
    const reduced = useReducedMotion()
    const enabled = !reduced
    const maxRef = useRef(maxTilt)
    maxRef.current = maxTilt

    useIsomorphicLayoutEffect(() => {
      const node = local.current
      if (!node) return
      for (const layer of node.querySelectorAll<HTMLElement>("[data-depth]")) {
        const depth = Number.parseFloat(layer.dataset.depth ?? "")
        layer.style.setProperty(
          "--_depth",
          Number.isFinite(depth) ? String(depth) : "0",
        )
      }
    })

    useEffect(() => {
      const node = local.current
      const body = bodyRef.current
      if (!node || !body || !enabled) return
      const config = { stiffness: 150, damping: 18, precision: 0.001 }

      const write = () => {
        const x = rx.get()
        const y = ry.get()
        const max = maxRef.current || 1
        body.style.transform = `rotateX(${x.toFixed(3)}deg) rotateY(${y.toFixed(3)}deg)`
        node.style.setProperty("--_px", px.get().toFixed(2))
        node.style.setProperty("--_py", py.get().toFixed(2))
        node.style.setProperty("--_tx", (y / max).toFixed(4))
        node.style.setProperty("--_ty", (x / max).toFixed(4))
        node.style.setProperty("--_lift", lift.get().toFixed(4))
        node.style.setProperty(
          "--_angle",
          `${((Math.atan2(px.get() - 50, -(py.get() - 50)) * 180) / Math.PI).toFixed(2)}deg`,
        )
      }

      const rx = createSpring(0, write, config)
      const ry = createSpring(0, write, config)
      const px = createSpring(REST.px, write, { ...config, precision: 0.05 })
      const py = createSpring(REST.py, write, { ...config, precision: 0.05 })
      const lift = createSpring(0, write, config)

      /** u and v run 0 to 1 across the card: where the light hits it. */
      const aim = (u: number, v: number, engaged: number) => {
        const max = maxRef.current
        rx.set((0.5 - v) * 2 * max)
        ry.set((u - 0.5) * 2 * max)
        px.set(u * 100)
        py.set(v * 100)
        lift.set(engaged)
      }
      const rest = () => {
        rx.set(0)
        ry.set(0)
        px.set(REST.px)
        py.set(REST.py)
        lift.set(0)
      }

      let frame = 0
      let last: PointerEvent | null = null
      const flush = () => {
        frame = 0
        if (!last) return
        // The rect of a tilted element is skewed but its centre is not, and offset sizes
        // ignore transforms, so this maps the pointer back onto the flat card.
        const rect = node.getBoundingClientRect()
        const width = node.offsetWidth || rect.width || 1
        const height = node.offsetHeight || rect.height || 1
        const u = clamp(
          (last.clientX - (rect.left + rect.width / 2)) / width + 0.5,
          0,
          1,
        )
        const v = clamp(
          (last.clientY - (rect.top + rect.height / 2)) / height + 0.5,
          0,
          1,
        )
        aim(u, v, 1)
      }
      const handleMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return
        last = event
        node.dataset.active = ""
        if (!frame) frame = requestAnimationFrame(flush)
      }
      const handleLeave = () => {
        cancelAnimationFrame(frame)
        frame = 0
        last = null
        delete node.dataset.active
        if (!node.matches(":focus-within")) rest()
      }
      // Keyboard users get the same reveal: the card turns to a showcase pose on focus.
      const handleFocusIn = () => {
        if (last) return
        node.dataset.active = ""
        rx.set(SHOWCASE.rx * (maxRef.current / 14))
        ry.set(SHOWCASE.ry * (maxRef.current / 14))
        px.set(SHOWCASE.px)
        py.set(SHOWCASE.py)
        lift.set(0.85)
      }
      const handleFocusOut = (event: FocusEvent) => {
        if (node.contains(event.relatedTarget as Node | null) || last) return
        delete node.dataset.active
        rest()
      }

      let baseline: { beta: number; gamma: number } | null = null
      const handleOrientation = (event: DeviceOrientationEvent) => {
        if (event.beta === null || event.gamma === null || last) return
        // Whatever angle the phone is held at when it starts is "flat".
        baseline ??= { beta: event.beta, gamma: event.gamma }
        const u = clamp(0.5 + (event.gamma - baseline.gamma) / (GYRO_RANGE * 2), 0, 1)
        const v = clamp(0.5 + (event.beta - baseline.beta) / (GYRO_RANGE * 2), 0, 1)
        aim(u, v, 0.9)
      }
      const listenToGyro = () =>
        window.addEventListener("deviceorientation", handleOrientation)
      const Orientation =
        typeof DeviceOrientationEvent === "undefined"
          ? undefined
          : (DeviceOrientationEvent as unknown as PermissionRequester)
      let askedForGyro = false
      const askForGyro = () => {
        if (askedForGyro || !Orientation?.requestPermission) return
        askedForGyro = true
        Orientation.requestPermission()
          .then((state) => {
            if (state === "granted") listenToGyro()
          })
          .catch(() => {
            // Denied or no user activation: the card keeps working with the pointer alone.
          })
      }
      if (deviceMotion && Orientation) {
        // iOS only grants motion access from inside a user gesture.
        if (Orientation.requestPermission) node.addEventListener("click", askForGyro)
        else listenToGyro()
      }

      node.addEventListener("pointermove", handleMove, { passive: true })
      node.addEventListener("pointerleave", handleLeave)
      node.addEventListener("pointercancel", handleLeave)
      node.addEventListener("focusin", handleFocusIn)
      node.addEventListener("focusout", handleFocusOut)
      return () => {
        cancelAnimationFrame(frame)
        for (const spring of [rx, ry, px, py, lift]) spring.stop()
        node.removeEventListener("pointermove", handleMove)
        node.removeEventListener("pointerleave", handleLeave)
        node.removeEventListener("pointercancel", handleLeave)
        node.removeEventListener("focusin", handleFocusIn)
        node.removeEventListener("focusout", handleFocusOut)
        node.removeEventListener("click", askForGyro)
        window.removeEventListener("deviceorientation", handleOrientation)
        body.style.transform = ""
        for (const name of ["--_px", "--_py", "--_tx", "--_ty", "--_lift", "--_angle"])
          node.style.removeProperty(name)
        delete node.dataset.active
      }
    }, [enabled, deviceMotion])

    return (
      <div
        ref={ref}
        className={cx(
          "kg-holo-card group/holo relative grid aspect-[var(--kg-holo-ratio,5/7)] rounded-kg-xl text-kg-fg perspective-[1100px] [-webkit-tap-highlight-color:transparent]",
          "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-kg-ring",
          className,
        )}
        data-foil={foil}
        data-static={!enabled || undefined}
        style={{ "--_intensity": clamp(intensity, 0, 1), ...style } as CSSProperties}
        {...props}
      >
        <div
          ref={bodyRef}
          className="kg-holo-card__body relative grid rounded-[inherit] transform-3d will-change-transform"
        >
          <div className="kg-holo-card__face relative isolate col-start-1 row-start-1 overflow-clip rounded-[inherit] [background:var(--kg-holo-face,var(--kg-paper-sky))]">
            {image && (
              <img
                className="kg-holo-card__image absolute inset-0 size-full object-cover select-none"
                src={image}
                alt={imageAlt}
                draggable={false}
              />
            )}
            <span className={cx(layer, "kg-holo-card__foil")} aria-hidden="true" />
            {sparkle && <span className={cx(layer, "kg-holo-card__sparkle")} aria-hidden="true" />}
            {glare && <span className={cx(layer, "kg-holo-card__glare")} aria-hidden="true" />}
            <span className={cx(layer, "kg-holo-card__rim border-2 border-kg-ink")} aria-hidden="true" />
          </div>
          <div
            className={cx(
              "kg-holo-card__content relative col-start-1 row-start-1 flex min-w-0 flex-col rounded-[inherit] p-5 transform-3d [transform:translateZ(1px)]",
              "[&_[data-depth]]:transition-[translate] [&_[data-depth]]:duration-(--kg-duration-spring) [&_[data-depth]]:ease-kg-spring",
              "group-data-active/holo:[&_[data-depth]]:[translate:0_0_calc(var(--_depth,0)*1px)]",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    )
  },
)

HoloCard.displayName = "HoloCard"
