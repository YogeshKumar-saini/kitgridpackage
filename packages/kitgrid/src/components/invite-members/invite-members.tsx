"use client"

import {
  type ClipboardEvent,
  type FormEvent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  useId,
  useRef,
  useState,
} from "react"
import { cx } from "../../utils/cx.js"
import { Button } from "../button/button.js"
import { Select, type SelectOption } from "../select/select.js"
import { Tag } from "../tag/tag.js"

export interface InviteMembersLabels {
  field?: string
  placeholder?: string
  role?: string
  submit?: string
  invalid?: string
  /** Live message after a send, receiving the count. */
  sent?: (count: number) => string
}

export interface InviteMembersProps
  extends Omit<HTMLAttributes<HTMLFormElement>, "onSubmit" | "defaultValue"> {
  roles?: readonly SelectOption[]
  defaultRole?: string
  /** Called with valid addresses and the chosen role. May return a promise. */
  onInvite?: (emails: string[], role: string) => void | Promise<void>
  /** Caps the number of chips. */
  max?: number
  labels?: InviteMembersLabels
}

const defaultRoles: SelectOption[] = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "viewer", label: "Viewer" },
]

const words = {
  field: "Email addresses",
  placeholder: "name@company.com",
  role: "Role",
  submit: "Send invites",
  invalid: "invalid",
  sent: (count: number) => `${count} ${count === 1 ? "invite" : "invites"} sent`,
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Email chips plus a role and a send button: the invite row of a members page. */
export const InviteMembers = forwardRef<HTMLFormElement, InviteMembersProps>(
  (
    { roles = defaultRoles, defaultRole, onInvite, max = 50, labels, className, ...props },
    ref,
  ) => {
    const t = { ...words, ...labels }
    const [emails, setEmails] = useState<string[]>([])
    const [draft, setDraft] = useState("")
    const [role, setRole] = useState(defaultRole ?? roles[0]?.value ?? "")
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    const fieldId = useId()

    const add = (raw: string) => {
      const parts = raw
        .split(/[\s,;]+/)
        .map((part) => part.trim().replace(/^<|>$/g, ""))
        .filter(Boolean)
      if (parts.length === 0) return
      setEmails((prev) => {
        const next = [...prev]
        for (const part of parts) {
          if (next.length >= max) break
          if (!next.some((email) => email.toLowerCase() === part.toLowerCase())) next.push(part)
        }
        return next
      })
      setDraft("")
    }

    const remove = (email: string) => {
      setEmails((prev) => prev.filter((item) => item !== email))
      inputRef.current?.focus()
    }

    const valid = emails.filter((email) => EMAIL.test(email))

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
      if ((event.key === "Enter" || event.key === "," || event.key === " ") && draft.trim()) {
        event.preventDefault()
        add(draft)
      } else if (event.key === "Backspace" && draft === "" && emails.length > 0) {
        event.preventDefault()
        setEmails((prev) => prev.slice(0, -1))
      }
    }

    const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
      const text = event.clipboardData.getData("text")
      if (!/[\s,;]/.test(text)) return
      event.preventDefault()
      add(draft + text)
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const pending = draft.trim() && EMAIL.test(draft.trim()) ? [draft.trim()] : []
      const list = [...valid, ...pending]
      if (list.length === 0 || busy) return
      setBusy(true)
      try {
        await onInvite?.(list, role)
        setEmails((prev) => prev.filter((email) => !EMAIL.test(email)))
        setDraft("")
        setMessage(t.sent(list.length))
      } finally {
        setBusy(false)
      }
    }

    return (
      <form
        ref={ref}
        className={cx(
          "kg-invite-members @container grid min-w-0 grid-cols-[minmax(0,1fr)_8.5rem_auto] items-start gap-2",
          className,
        )}
        onSubmit={handleSubmit}
        noValidate
        {...props}
      >
        {/* Clicking the padding focuses the input, like a native field. */}
        <div
          className={cx(
            "kg-invite-members__field flex min-h-kg-md cursor-text flex-wrap items-center gap-1.5 px-2 py-1.25 @max-[32rem]:col-span-full",
            "rounded-kg-md border-2 border-kg-ink bg-kg-surface",
            "transition-shadow duration-(--kg-duration-fast) ease-kg-out focus-within:shadow-[3px_3px_0_var(--kg-ink)]",
            "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-kg-ring",
          )}
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest("button, input")) return
            event.preventDefault()
            inputRef.current?.focus()
          }}
        >
          <ul className="kg-invite-members__chips contents list-none" aria-label={t.field}>
            {emails.map((email) => {
              const ok = EMAIL.test(email)
              return (
                <li
                  key={email}
                  className="inline-flex animate-[kg-pop-in_var(--kg-duration-base)_var(--kg-ease-spring)] motion-reduce:animate-none"
                >
                  <Tag
                    size="sm"
                    tone={ok ? "neutral" : "danger"}
                    data-invalid={ok ? undefined : ""}
                    onRemove={() => remove(email)}
                    removeLabel={`Remove ${email}`}
                  >
                    {email}
                    {!ok && <span className="kg-visually-hidden">, {t.invalid}</span>}
                  </Tag>
                </li>
              )
            })}
          </ul>
          <input
            ref={inputRef}
            id={fieldId}
            type="email"
            inputMode="email"
            autoComplete="off"
            className="kg-invite-members__input h-6.5 min-w-36 flex-1 border-0 bg-transparent px-1 py-0 [font-family:inherit] text-kg-sm text-kg-fg outline-none placeholder:text-kg-fg-faint"
            aria-label={t.field}
            placeholder={emails.length === 0 ? t.placeholder : undefined}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onBlur={() => draft.trim() && add(draft)}
          />
        </div>
        <Select
          className="kg-invite-members__role @max-[32rem]:col-span-2"
          aria-label={t.role}
          options={roles}
          value={role}
          onValueChange={setRole}
        />
        <Button
          type="submit"
          className="kg-invite-members__submit"
          loading={busy}
          disabled={valid.length === 0 && !EMAIL.test(draft.trim())}
        >
          {t.submit}
        </Button>
        <span className="kg-visually-hidden" role="status">
          {message}
        </span>
      </form>
    )
  },
)

InviteMembers.displayName = "InviteMembers"
