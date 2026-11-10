import { isValidElement, type MouseEvent, type ReactNode } from "react"

/*
 * A module-level store, so `toast()` can be called from anywhere (event handlers, data
 * libraries, outside React) and every mounted <Toaster> renders the same queue.
 */

export type ToastTone = "default" | "success" | "error" | "warning" | "info" | "loading"

export interface ToastAction {
  label: ReactNode
  /** Call `event.preventDefault()` to keep the toast open after the click. */
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}

export interface ToastOptions {
  /** Reuse an id to update a toast in place instead of stacking a new one. */
  id?: string
  title?: ReactNode
  description?: ReactNode
  tone?: ToastTone
  /** Milliseconds before it closes itself. `Infinity` keeps it until dismissed. */
  duration?: number
  /** Replaces the tone icon. `null` hides it. */
  icon?: ReactNode
  action?: ToastAction
  /** Allow swipe, Escape and the close button to dismiss it. */
  dismissible?: boolean
  /** Interrupts the screen reader (role="alert"). Defaults to true for errors. */
  important?: boolean
  onDismiss?: (toast: ToastRecord) => void
  onAutoClose?: (toast: ToastRecord) => void
}

export interface ToastRecord extends ToastOptions {
  id: string
  title: ReactNode
  tone: ToastTone
  /** Bumped on every update so timers restart and the content re-announces. */
  version: number
  /** True while the exit animation runs. */
  closing: boolean
}

export type ToastMessage = ReactNode

export interface ToastPromiseMessages<T> {
  loading: ToastMessage
  success: ToastMessage | ((data: T) => ToastMessage)
  error: ToastMessage | ((error: unknown) => ToastMessage)
}

const EMPTY: readonly ToastRecord[] = []
let toasts: readonly ToastRecord[] = EMPTY
const listeners = new Set<() => void>()
let counter = 0

const emit = () => {
  for (const listener of listeners) listener()
}

const set = (next: readonly ToastRecord[]) => {
  toasts = next
  emit()
}

/** @internal Consumed by <Toaster> through useSyncExternalStore. */
export const toastStore = {
  subscribe: (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  getSnapshot: () => toasts,
  getServerSnapshot: () => EMPTY,
  remove: (id: string) => {
    if (toasts.some((entry) => entry.id === id))
      set(toasts.filter((entry) => entry.id !== id))
  },
  /** Starts the exit of a toast whose time ran out, without reporting a user dismissal. */
  expire: (id: string) => {
    set(toasts.map((entry) => (entry.id === id ? { ...entry, closing: true } : entry)))
  },
}

const upsert = (options: ToastOptions): string => {
  const id = options.id ?? `kg-toast-${++counter}`
  const existing = toasts.find((entry) => entry.id === id)
  if (existing) {
    set(
      toasts.map((entry) =>
        entry.id === id
          ? { ...entry, ...options, id, version: entry.version + 1, closing: false }
          : entry,
      ),
    )
  } else {
    const record: ToastRecord = {
      ...options,
      id,
      title: options.title ?? "",
      tone: options.tone ?? "default",
      version: 0,
      closing: false,
    }
    // Newest first: index 0 is the front of the stack.
    set([record, ...toasts])
  }
  return id
}

const isOptions = (value: unknown): value is ToastOptions =>
  typeof value === "object" &&
  value !== null &&
  !isValidElement(value) &&
  !Array.isArray(value)

const create =
  (tone: ToastTone) =>
  (message: ToastMessage | ToastOptions, options?: ToastOptions): string =>
    isOptions(message)
      ? upsert({ tone, ...message })
      : upsert({ tone, ...options, title: message })

const dismiss = (id?: string): void => {
  const targets = id === undefined ? toasts : toasts.filter((entry) => entry.id === id)
  for (const entry of targets) if (!entry.closing) entry.onDismiss?.(entry)
  // With no Toaster mounted nobody runs the exit animation, so drop them right away.
  if (listeners.size === 0) {
    set(id === undefined ? EMPTY : toasts.filter((entry) => entry.id !== id))
    return
  }
  set(
    toasts.map((entry) =>
      id === undefined || entry.id === id ? { ...entry, closing: true } : entry,
    ),
  )
}

const update = (id: string, options: Omit<ToastOptions, "id">): void => {
  if (toasts.some((entry) => entry.id === id)) upsert({ ...options, id })
}

const promise = <T>(
  task: Promise<T> | (() => Promise<T>),
  messages: ToastPromiseMessages<T>,
  options?: Omit<ToastOptions, "tone" | "title">,
): string => {
  const id = upsert({ ...options, tone: "loading", title: messages.loading })
  const run = typeof task === "function" ? task() : task
  run.then(
    (data) => {
      const title =
        typeof messages.success === "function"
          ? messages.success(data)
          : messages.success
      // duration resets so the success state times out normally after the loading phase.
      update(id, { ...options, tone: "success", title, duration: options?.duration })
    },
    (error: unknown) => {
      const title =
        typeof messages.error === "function" ? messages.error(error) : messages.error
      update(id, { ...options, tone: "error", title, duration: options?.duration })
    },
  )
  return id
}

type ToastFunction = ((
  message: ToastMessage | ToastOptions,
  options?: ToastOptions,
) => string) & {
  success: (message: ToastMessage | ToastOptions, options?: ToastOptions) => string
  error: (message: ToastMessage | ToastOptions, options?: ToastOptions) => string
  warning: (message: ToastMessage | ToastOptions, options?: ToastOptions) => string
  info: (message: ToastMessage | ToastOptions, options?: ToastOptions) => string
  loading: (message: ToastMessage | ToastOptions, options?: ToastOptions) => string
  promise: typeof promise
  /** Dismisses one toast, or all of them when called without an id. */
  dismiss: (id?: string) => void
  update: (id: string, options: Omit<ToastOptions, "id">) => void
}

/** Shows a toast and returns its id. Render one <Toaster> anywhere in the app to display them. */
export const toast: ToastFunction = Object.assign(create("default"), {
  success: create("success"),
  error: create("error"),
  warning: create("warning"),
  info: create("info"),
  loading: create("loading"),
  promise,
  dismiss,
  update,
})
